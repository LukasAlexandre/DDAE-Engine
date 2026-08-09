import { AUTHORITY_DOMAINS, resolveAuthorityConflict } from './authority.js';
import { normalizeGoal, rankRelevantSources } from './relevance.js';
import { sha256Hex, buildFingerprintPayload, computeContextFingerprint } from './fingerprint.js';
import { CONTEXT_SCHEMA_VERSION, createContextManifest } from './manifest.js';

export const CONTEXT_COMPILER_NAME = 'ddae-context-compiler';
export const CONTEXT_COMPILER_CONTRACT_VERSION = '1';

const NULL_SESSION_REASONS = new Set(['none', 'explicit_not_found']);

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`compileContext: ${label} is required and must be a non-empty string`);
  }
}

function requirePlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`compileContext: ${label} is required and must be an object`);
  }
}

/**
 * Builds the `session` manifest piece from a `collectDdaeContext()`
 * snapshot. Preserves the collector's own selection semantics verbatim
 * (`explicit`/`latest_canonical`/`none`/`explicit_not_found`) — an explicit
 * session that wasn't found is never silently reported as "none".
 */
function buildSession(ddaeContext) {
  const available = Boolean(ddaeContext?.available);
  const currentSession = available ? ddaeContext.current_session : null;
  const reason = ddaeContext?.selection?.reason ?? 'none';

  if (currentSession) {
    return { id: currentSession.name, path: currentSession.path, selection_reason: reason };
  }
  return { id: null, path: null, selection_reason: NULL_SESSION_REASONS.has(reason) ? reason : 'none' };
}

/** Builds the `git` manifest piece from a `collectGitContext()` snapshot —
 * only factual repository state, never remote URLs, commit messages, or
 * author identity (those were never collected in the first place). */
function buildGit(gitContext) {
  if (!gitContext || !gitContext.available || !gitContext.repository) {
    return { available: false, repository: false, branch: null, head: null, working_tree: null };
  }
  return {
    available: true,
    repository: true,
    branch: gitContext.branch ?? null,
    head: gitContext.head ?? null,
    working_tree: gitContext.working_tree ?? null,
  };
}

/**
 * Verifies each candidate's `content` against its Source's `content_hash`
 * (Section 4 of the Manifest v1 contract: a Source's content_hash is a
 * claim about what content it represents). A candidate carrying non-empty
 * content whose Source has no content_hash, or whose hash doesn't match, is
 * a contradiction between provenance and payload — refused outright rather
 * than silently trusted.
 */
function assertContentHashIntegrity(candidates) {
  for (const candidate of candidates) {
    const content = candidate.content ?? '';
    if (content === '') {
      continue;
    }
    const sourceId = candidate.source?.id ?? '(unknown)';
    if (!candidate.source?.content_hash) {
      throw new Error(`compileContext: candidate for source "${sourceId}" has content but source.content_hash is null`);
    }
    if (sha256Hex(content) !== candidate.source.content_hash) {
      throw new Error(`compileContext: content hash mismatch for source "${sourceId}" — candidate.content does not match source.content_hash`);
    }
  }
}

/**
 * Unions Sources drawn from candidates and from claim entries, deduplicated
 * by id. Two Sources sharing an id must be canonically identical — a
 * divergence (same id, different content_hash/path/etc.) is a contract
 * violation the Compiler refuses to silently resolve by picking one.
 */
function unionSources(candidateSources, claimSources) {
  const byId = new Map();
  for (const source of [...candidateSources, ...claimSources]) {
    if (!source || typeof source.id !== 'string') {
      throw new Error('compileContext: encountered an entry without a valid Source');
    }
    const existing = byId.get(source.id);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(source)) {
        throw new Error(`compileContext: source id "${source.id}" was provided with divergent canonical content — refusing to silently pick one`);
      }
      continue;
    }
    byId.set(source.id, source);
  }
  return byId;
}

/**
 * Resolves explicit claim groups via the Authority Model. The Compiler
 * never discovers conflicting claims by comparing text — every claim group
 * is handed in explicitly by the caller, naming exactly which Sources are
 * claims about the same fact (Bloco 05 contract: no NLP claim discovery).
 */
function resolveClaims(claims) {
  const conflicts = [];
  const claimSources = [];

  for (const claim of claims) {
    if (!claim || typeof claim.id !== 'string' || claim.id.trim() === '') {
      throw new Error('compileContext: each claim requires a non-empty id');
    }
    if (!AUTHORITY_DOMAINS.includes(claim.domain)) {
      throw new Error(`compileContext: claim "${claim.id}" has an invalid domain "${claim.domain}"`);
    }
    if (!Array.isArray(claim.entries) || claim.entries.length < 2) {
      throw new Error(`compileContext: claim "${claim.id}" requires at least 2 entries to resolve a conflict`);
    }

    const sources = claim.entries.map((entry, index) => {
      if (!entry || !entry.source || typeof entry.source.id !== 'string') {
        throw new Error(`compileContext: claim "${claim.id}" entry [${index}] does not carry a valid Source`);
      }
      return entry.source;
    });
    claimSources.push(...sources);

    const result = resolveAuthorityConflict(sources);
    conflicts.push({
      claim_id: claim.id,
      domain: claim.domain,
      status: result.status,
      winner: result.status === 'resolved' ? { source_id: result.winner.source_id } : null,
      conflicting_sources: result.conflicting_sources.map((entry) => ({
        source_id: entry.source_id,
        reason_superseded: entry.reason_superseded ?? null,
      })),
    });
  }

  return { conflicts, claimSources };
}

/**
 * Orchestrates collectors' output, the Source/Authority Model, and the
 * Relevance Engine into a validated Context Manifest v1. Pure in-memory
 * kernel: never scans the filesystem, never opens `source.path`, never
 * calls the network, and never writes anything. Every candidate the
 * Compiler considers must already have been gathered by an authorized
 * caller — the Sensitive Data Guard (src/context/sensitive-files.js)
 * polices that gathering step, upstream of this function. The Compiler
 * itself still never touches the filesystem: `input.securityExclusions`
 * (paths the Guard already refused to ingest) is just data handed in, the
 * same as `input.candidates`.
 */
export function compileContext(input) {
  requirePlainObject(input, 'input');
  requireNonEmptyString(input.engineVersion, 'input.engineVersion');
  requirePlainObject(input.project, 'input.project');
  requirePlainObject(input.gitContext, 'input.gitContext');
  requirePlainObject(input.ddaeContext, 'input.ddaeContext');
  if (!Array.isArray(input.candidates)) {
    throw new Error('compileContext: input.candidates is required and must be an array');
  }

  const normalizedGoal = normalizeGoal(input.goal);
  const goalHash = `sha256:${sha256Hex(normalizedGoal.normalized)}`;

  assertContentHashIntegrity(input.candidates);

  const budgetProfile = input.budget ?? 'standard';
  const ranking = rankRelevantSources(input.candidates, { goal: normalizedGoal, budget: budgetProfile });

  const candidateBySourceId = new Map(input.candidates.map((candidate) => [candidate.source.id, candidate]));

  const relevantFiles = ranking.selected.map((entry) => {
    const candidate = candidateBySourceId.get(entry.source.id);
    return {
      source_id: entry.source.id,
      path: entry.path || null,
      section: entry.source.section ?? null,
      score: entry.score,
      breakdown: entry.breakdown,
      char_cost: entry.char_cost,
      content: candidate ? (candidate.content ?? '') : '',
    };
  });

  const relevanceExclusions = ranking.skipped.map((entry) => ({
    source_id: entry.source.id,
    path: entry.path || null,
    score: entry.score,
    char_cost: entry.char_cost,
    reason: entry.reason,
  }));

  // Security exclusions (files the Guard refused before they ever became a
  // Source) never carry a source_id — see checkExcludedSources in
  // context-schema.js. Ordered by path ASC / reason ASC, independent of
  // whatever order the Guard's own traversal produced them in, and kept
  // after the relevance exclusions rather than interleaved with them.
  const securityExclusions = [...(input.securityExclusions ?? [])]
    .map((entry) => ({ path: entry.path, reason: entry.reason }))
    .sort((a, b) => {
      if (a.path !== b.path) {
        return a.path < b.path ? -1 : 1;
      }
      return a.reason < b.reason ? -1 : a.reason > b.reason ? 1 : 0;
    });

  const excludedSources = [...relevanceExclusions, ...securityExclusions];

  const facts = input.facts ?? {};
  const decisions = facts.decisions ?? [];
  const constraints = facts.constraints ?? [];
  const bugs = facts.bugs ?? [];
  const validation = facts.validation ?? [];

  const { conflicts, claimSources } = resolveClaims(input.claims ?? []);

  const candidateSources = input.candidates.map((candidate) => candidate.source);
  const sourceById = unionSources(candidateSources, claimSources);
  const sources = [...sourceById.values()];

  const session = buildSession(input.ddaeContext);
  const git = buildGit(input.gitContext);

  const fingerprintPayload = buildFingerprintPayload({
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    compilerContractVersion: CONTEXT_COMPILER_CONTRACT_VERSION,
    goalNormalized: normalizedGoal.normalized,
    sessionId: session.id,
    sessionSelectionReason: session.selection_reason,
    budgetProfile: ranking.budget.profile,
    budgetMaxChars: ranking.budget.max_chars,
    gitHead: git.head,
    selectedSources: ranking.selected.map((entry) => entry.source),
    constraints: constraints.map((entry) => entry.value),
  });
  const fingerprint = computeContextFingerprint(fingerprintPayload);

  return createContextManifest({
    compiler: {
      name: CONTEXT_COMPILER_NAME,
      contract_version: CONTEXT_COMPILER_CONTRACT_VERSION,
      engine_version: input.engineVersion,
    },
    project: input.project,
    goal: { text: normalizedGoal.text, normalized: normalizedGoal.normalized, hash: goalHash },
    session,
    budget: { profile: ranking.budget.profile, max_chars: ranking.budget.max_chars, used_chars: ranking.budget.used_chars },
    git,
    sources,
    decisions,
    constraints,
    bugs,
    validation,
    relevant_files: relevantFiles,
    excluded_sources: excludedSources,
    conflicts,
    fingerprint,
  });
}
