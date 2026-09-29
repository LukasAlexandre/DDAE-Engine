import { validateBrainManifest, BRAIN_ENTITY_KEYS, compareStrings } from '../schemas/brain-schema.js';
import { buildBrainFingerprintPayload, computeBrainFingerprint } from './fingerprint.js';

// Workspace Validator — a pure classifier: it receives a Brain Manifest v1
// (and, optionally, a second Manifest and/or an expected view set that the
// caller already produced) and reports VALID/STALE/INVALID. It never
// collects anything itself — Discovery collects, Compiler compiles,
// Renderer presents, this module only judges data it was handed. It never
// imports from `src/context/**`: the Brain domain already carries its own
// schema (brain-schema.js) and fingerprint (workspace/fingerprint.js), so
// nothing from the Context Compiler is needed here.
//
// Contract: contrato_workspace_project_brain.md, Seção H (Drift Contract).
// Model reused conceptually from src/context/validator.js (same enum, same
// INVALID > STALE > VALID precedence) — never imported, never refactored
// (Bloco 07, Decisão 1: ID-07/RS-07 evaluated, not extracted — the common
// surface is a three-value enum and a precedence rule; the actual staleness
// logic differs structurally between the two domains).

export const WORKSPACE_VALID_STATUSES = Object.freeze(['VALID', 'STALE', 'INVALID']);

function fail(message) {
  throw new Error(`validateBrainWorkspace: ${message}`);
}

function result(status, reasons) {
  return Object.freeze({ status, reasons: Object.freeze(reasons.map((reason) => Object.freeze({ ...reason }))) });
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * `currentManifest`/`expectedViews` are caller-supplied options, not
 * external/operational data — a malformed one is a bug in the calling code
 * (e.g. the Orchestrator passed something other than a real Brain
 * Manifest), never a state to degrade gracefully for. Failing loudly here
 * matches Decisão 2 of the block: never derive freshness from data that
 * hasn't itself been confirmed structurally valid.
 */
function assertOptions(currentManifest, expectedViews) {
  if (currentManifest !== null && currentManifest !== undefined) {
    if (!isPlainObject(currentManifest) || !validateBrainManifest(currentManifest).valid) {
      fail('options.currentManifest must be a schema-valid Brain Manifest v1 when provided');
    }
  }
  if (expectedViews !== null && expectedViews !== undefined) {
    if (!Array.isArray(expectedViews) || expectedViews.some((v) => typeof v !== 'string')) {
      fail('options.expectedViews must be an array of strings when provided');
    }
  }
}

// ─────────────────────── integrity (always evaluated) ───────────────────────

function checkFingerprintIntegrity(manifest) {
  const recomputed = computeBrainFingerprint(buildBrainFingerprintPayload(manifest));
  if (recomputed.value !== manifest.fingerprint.value) {
    return [{ code: 'FINGERPRINT_MISMATCH' }];
  }
  return [];
}

const UNSAFE_SEGMENT = new Set(['', '.', '..']);

/**
 * Lexical/semantic path containment — never touches the filesystem (no
 * `realpath`, no `resolve` against cwd, no `stat`). A value is safe only
 * when every `/`-separated segment is a plain path component: rejects
 * traversal (`.`/`..`/empty segments) and scheme-like values (anything
 * with a `:` before the first `/`, e.g. `http://`, `javascript:`, a
 * Windows drive) — none of those represent a location inside the project
 * root, which is the only thing a project-relative Manifest field may
 * contractually hold. Independent, small, deliberately not reusing the
 * Renderer's private `docsDestination` (a different layer: presentation
 * fallback, not Manifest-level semantic validation) nor the I/O-bound
 * Sensitive Data Guard (wrong layer for a pure validator) — the same
 * "each module keeps a small copy" precedent already used across this
 * codebase (Blocos 02/04).
 */
function pathEscapesRoot(value) {
  if (typeof value !== 'string' || value === '') {
    return true;
  }
  const schemeEnd = value.indexOf(':');
  const firstSlash = value.indexOf('/');
  if (schemeEnd !== -1 && (firstSlash === -1 || schemeEnd < firstSlash)) {
    return true;
  }
  return value.split('/').some((segment) => UNSAFE_SEGMENT.has(segment));
}

/**
 * Every Brain Manifest v1 field that holds a project-relative path — the one
 * place to extend when the schema gains a new path field. Each descriptor is
 * `{ field, value, index?, allowRootMarker? }`: `field`/`index` are the only
 * things a reason may carry (never `value`). Fields are listed explicitly —
 * never by walking arbitrary strings (`summary`, `id`, `selection_reason`, ...
 * are not paths). `allowRootMarker` admits the canonical `'.'` (the project
 * root itself) and is set only for `project.root_relative_path`, the sole
 * field whose contract defines it (brain-schema.js, checkProject).
 */
function collectPathFields(manifest) {
  const fields = [{ field: 'project.root_relative_path', value: manifest.project.root_relative_path, allowRootMarker: true }];
  for (const key of ['docs_root', 'sessions_root']) {
    if (manifest.ddae[key] !== null) {
      fields.push({ field: `ddae.${key}`, value: manifest.ddae[key] });
    }
  }
  manifest.ddae.sessions.forEach((session, index) => {
    fields.push({ field: 'ddae.sessions', index, value: session.path });
  });
  if (manifest.ddae.current_session !== null && manifest.ddae.current_session !== undefined) {
    fields.push({ field: 'ddae.current_session.path', value: manifest.ddae.current_session.path });
  }
  manifest.sources.forEach((source, index) => {
    fields.push({ field: 'sources', index, value: source.path });
  });
  for (const key of BRAIN_ENTITY_KEYS) {
    manifest.entities[key].forEach((entry, index) => {
      if (entry.source_path !== null) {
        fields.push({ field: `entities.${key}`, index, value: entry.source_path });
      }
    });
  }
  manifest.views.forEach((view, index) => {
    fields.push({ field: 'views', index, value: view });
  });
  return fields;
}

function checkPathContainment(manifest) {
  return collectPathFields(manifest)
    .filter(({ value, allowRootMarker }) => !(allowRootMarker && value === '.') && pathEscapesRoot(value))
    .map(({ field, index }) => (index === undefined
      ? { code: 'PATH_ESCAPES_ROOT', field }
      : { code: 'PATH_ESCAPES_ROOT', field, index }));
}

function checkViewsCoherence(manifest, expectedViews) {
  if (expectedViews === null || expectedViews === undefined) {
    return [];
  }
  const expected = [...expectedViews].sort(compareStrings);
  const actual = [...manifest.views].sort(compareStrings);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    return [{ code: 'VIEWS_MISMATCH' }];
  }
  return [];
}

// ─────────────────────── freshness (only with currentManifest) ───────────────────────

function checkEngineFreshness(manifest, currentManifest) {
  if (manifest.engine_version !== currentManifest.engine_version) {
    return [{ code: 'ENGINE_VERSION_CHANGED' }];
  }
  return [];
}

/** Mirrors src/context/validator.js's checkGitStaleness semantics exactly
 * (same reason name, same rule): Git being unavailable on either side never
 * makes the package stale on its own — only a HEAD divergence when both
 * sides agree Git is available does. */
function checkGitFreshness(manifest, currentManifest) {
  if (!manifest.git.available || !currentManifest.git.available) {
    return [];
  }
  if (manifest.git.head !== currentManifest.git.head) {
    return [{ code: 'GIT_HEAD_CHANGED' }];
  }
  return [];
}

function sameSession(a, b) {
  if (a === null || b === null) {
    return a === b;
  }
  return a.id === b.id && a.selection_reason === b.selection_reason;
}

function checkSessionFreshness(manifest, currentManifest) {
  if (!sameSession(manifest.current_session, currentManifest.current_session)) {
    return [{ code: 'SESSION_SOURCE_CHANGED' }];
  }
  return [];
}

/**
 * Docs/entity freshness: reuses the fingerprint module's own canonical,
 * already-sorted entity extraction (`buildBrainFingerprintPayload`) and
 * compares it structurally — an exact equality check over data both
 * Manifests already carry, never a textual similarity heuristic over
 * `summary` prose. When the canonicalized reference list for an entity
 * differs at all (an item added, removed, or any of its fields changed),
 * that entity is reported once, by name — this cannot distinguish *why*
 * it changed (a real edit vs. reordering upstream), a known, documented
 * limitation rather than invented precision.
 */
function checkEntityFreshness(manifest, currentManifest) {
  const before = buildBrainFingerprintPayload(manifest).entities;
  const after = buildBrainFingerprintPayload(currentManifest).entities;
  const reasons = [];
  for (const key of BRAIN_ENTITY_KEYS) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      reasons.push({ code: 'DOCS_CONTENT_CHANGED', entity: key });
    }
  }
  return reasons;
}

/**
 * Classifies a Brain Manifest v1 as VALID, STALE, or INVALID (contrato,
 * Seção H). Pure: no filesystem, no Git, no `Docs/`, no network, no clock,
 * no randomness — every comparand is an explicit argument.
 *
 * `options.currentManifest`, when given, is a second Brain Manifest v1 the
 * caller has already recompiled from the current project state (this
 * module never recompiles anything itself); its absence never produces a
 * STALE reason, only a narrower set of checks. `options.expectedViews`,
 * when given, is the view-path set the caller expects `manifest.views` to
 * equal; its absence preserves compatibility with the Bloco 03 transitional
 * state (`manifest.views = []`) — never a false INVALID.
 *
 * INVALID always takes priority over STALE: when any integrity check
 * fails, freshness is never evaluated (mirrors src/context/validator.js).
 */
export function validateBrainWorkspace(manifest, options = {}) {
  if (!isPlainObject(manifest)) {
    fail('manifest must be an object');
  }
  const { currentManifest = null, expectedViews = null } = options ?? {};
  assertOptions(currentManifest, expectedViews);

  const schemaCheck = validateBrainManifest(manifest);
  if (!schemaCheck.valid) {
    return result('INVALID', [{ code: 'MANIFEST_SCHEMA_INVALID' }]);
  }

  const invalidReasons = [
    ...checkFingerprintIntegrity(manifest),
    ...checkPathContainment(manifest),
    ...checkViewsCoherence(manifest, expectedViews),
  ];
  if (invalidReasons.length > 0) {
    return result('INVALID', invalidReasons);
  }

  if (currentManifest === null) {
    return result('VALID', []);
  }

  const staleReasons = [
    ...checkEngineFreshness(manifest, currentManifest),
    ...checkGitFreshness(manifest, currentManifest),
    ...checkSessionFreshness(manifest, currentManifest),
    ...checkEntityFreshness(manifest, currentManifest),
  ];
  if (staleReasons.length > 0) {
    return result('STALE', staleReasons);
  }

  return result('VALID', []);
}
