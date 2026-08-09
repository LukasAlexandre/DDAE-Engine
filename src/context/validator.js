import { CONTEXT_SCHEMA_VERSION, validateContextManifest } from '../schemas/context-schema.js';
import { sha256Hex, buildFingerprintPayload, computeContextFingerprint } from './fingerprint.js';
import { renderContextMarkdown } from './renderer.js';

// Context Package Validator — a pure, read-only kernel that classifies an
// already-built Context Package (manifest + CONTEXT.md) as VALID, STALE, or
// INVALID. It never writes, never touches the network, never scans the
// filesystem, and never opens `source.path` on its own — every snapshot it
// compares against (current Git state, current DDAE state, current source
// hashes) is handed in explicitly by the caller (the CLI's `context
// validate` command). This keeps the security boundary established by the
// Compiler (Bloco 05) intact: the Validator only ever reasons about data it
// was given, never data it went and fetched itself.

export const VALID_STATUSES = Object.freeze(['VALID', 'STALE', 'INVALID']);

function freezeReasons(reasons) {
  return Object.freeze(reasons.map((reason) => Object.freeze({ ...reason })));
}

function result(status, reasons) {
  return Object.freeze({ status, reasons: freezeReasons(reasons) });
}

function rebuildGoalHash(manifest) {
  return `sha256:${sha256Hex(manifest.goal.normalized)}`;
}

function rebuildFingerprintPayload(manifest) {
  const sourceById = new Map(manifest.sources.map((source) => [source.id, source]));
  const selectedSources = manifest.relevant_files
    .map((entry) => sourceById.get(entry.source_id))
    .filter(Boolean);
  return buildFingerprintPayload({
    schemaVersion: manifest.schema_version,
    compilerContractVersion: manifest.compiler.contract_version,
    goalNormalized: manifest.goal.normalized,
    sessionId: manifest.session.id,
    sessionSelectionReason: manifest.session.selection_reason,
    budgetProfile: manifest.budget.profile,
    budgetMaxChars: manifest.budget.max_chars,
    gitHead: manifest.git.head,
    selectedSources,
    constraints: manifest.constraints.map((entry) => entry.value),
  });
}

/**
 * Internal-consistency checks: does the Manifest agree with itself? These
 * never consult anything outside the Manifest/CONTEXT.md pair the caller
 * handed in, so they can run offline against a fixture with no live project
 * at all. Any failure here means the package is INVALID — a STALE
 * package is still internally trustworthy; an INVALID one is not.
 */
function checkIntegrity(manifest, contextMarkdown) {
  const reasons = [];

  if (rebuildGoalHash(manifest) !== manifest.goal.hash) {
    reasons.push({ code: 'GOAL_HASH_CHANGED' });
  }

  const recomputedFingerprint = computeContextFingerprint(rebuildFingerprintPayload(manifest));
  if (recomputedFingerprint.value !== manifest.fingerprint.value) {
    reasons.push({ code: 'FINGERPRINT_MISMATCH' });
  }

  if (typeof contextMarkdown === 'string') {
    const expectedMarkdown = renderContextMarkdown(manifest);
    if (contextMarkdown !== expectedMarkdown) {
      reasons.push({ code: 'CONTEXT_MARKDOWN_MISMATCH' });
    }
  }

  return reasons;
}

/** Git freshness: only meaningful when both the Manifest and the current
 * snapshot agree Git is available — Git being unavailable never makes a
 * package invalid or stale on its own (Manifest v1 contract, Section 10). */
function checkGitStaleness(manifest, currentGitContext) {
  if (!manifest.git.available || !currentGitContext?.available || !currentGitContext.repository) {
    return [];
  }
  if (currentGitContext.head !== manifest.git.head) {
    return [{ code: 'GIT_HEAD_CHANGED' }];
  }
  return [];
}

/** Session freshness: an explicitly-selected session that no longer exists,
 * or a `latest_canonical` selection that a newer session has since
 * superseded, both mean the package no longer reflects "the current
 * session" — never silently treated as still current. */
function checkSessionStaleness(manifest, currentDdaeContext) {
  const sessionId = manifest.session.id;
  if (sessionId === null || !currentDdaeContext?.available) {
    return [];
  }
  const stillExists = (currentDdaeContext.sessions ?? []).some((session) => session.name === sessionId);
  if (!stillExists) {
    return [{ code: 'SESSION_SOURCE_CHANGED' }];
  }
  if (manifest.session.selection_reason === 'latest_canonical') {
    const currentLatest = currentDdaeContext.current_session?.name ?? null;
    if (currentLatest !== sessionId) {
      return [{ code: 'SESSION_SOURCE_CHANGED' }];
    }
  }
  return [];
}

/**
 * Source freshness: this Validator never opens `source.path` to check for
 * itself (that boundary belongs to the future Sensitive Data Guard). If the
 * Manifest carries selected textual sources, freshness can only be
 * confirmed when the caller hands in `currentSourceHashes` (a plain
 * `{ [source_id]: content_hash }` map it already computed safely) — absent
 * that, this never claims VALID by omission; it reports the freshness as
 * unverified.
 */
function checkSourceFreshness(manifest, currentSourceHashes) {
  if (manifest.relevant_files.length === 0) {
    return [];
  }
  if (!currentSourceHashes || typeof currentSourceHashes !== 'object') {
    return [{ code: 'SOURCE_FRESHNESS_UNVERIFIED' }];
  }
  const reasons = [];
  const sourceById = new Map(manifest.sources.map((source) => [source.id, source]));
  for (const entry of manifest.relevant_files) {
    const source = sourceById.get(entry.source_id);
    const currentHash = currentSourceHashes[entry.source_id];
    if (currentHash === undefined) {
      reasons.push({ code: 'SOURCE_FRESHNESS_UNVERIFIED', source_id: entry.source_id });
    } else if (source?.content_hash !== currentHash) {
      reasons.push({ code: 'SOURCE_CONTENT_CHANGED', source_id: entry.source_id });
    }
  }
  return reasons;
}

/**
 * Classifies a Context Package as VALID, STALE, or INVALID.
 *
 * `manifest` and `contextMarkdown` describe the package as built.
 * `currentGitContext`/`currentDdaeContext`/`currentSourceHashes` are
 * optional current-state snapshots the caller has already collected —
 * their absence never causes a false VALID, only a narrower set of
 * staleness checks (or, for sources, an explicit "unverified" reason).
 *
 * INVALID takes priority over STALE: a package that fails its own internal
 * consistency checks is never merely "stale". Reason order is fixed and
 * deterministic, independent of which specific checks happen to fail.
 */
export function validateContextState({
  manifest,
  contextMarkdown,
  currentGitContext = null,
  currentDdaeContext = null,
  currentSourceHashes = null,
} = {}) {
  if (!manifest || typeof manifest !== 'object') {
    return result('INVALID', [{ code: 'MANIFEST_INVALID', errors: ['manifest must be an object'] }]);
  }

  if (manifest.schema_version !== CONTEXT_SCHEMA_VERSION) {
    return result('INVALID', [{ code: 'SCHEMA_VERSION_MISMATCH', expected: CONTEXT_SCHEMA_VERSION, actual: manifest.schema_version ?? null }]);
  }

  const schemaCheck = validateContextManifest(manifest);
  if (!schemaCheck.valid) {
    return result('INVALID', [{ code: 'MANIFEST_INVALID', errors: schemaCheck.errors }]);
  }

  const invalidReasons = checkIntegrity(manifest, contextMarkdown);
  if (invalidReasons.length > 0) {
    return result('INVALID', invalidReasons);
  }

  const staleReasons = [
    ...checkGitStaleness(manifest, currentGitContext),
    ...checkSessionStaleness(manifest, currentDdaeContext),
    ...checkSourceFreshness(manifest, currentSourceHashes),
  ];
  if (staleReasons.length > 0) {
    return result('STALE', staleReasons);
  }

  return result('VALID', []);
}
