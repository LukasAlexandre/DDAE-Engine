import crypto from 'node:crypto';

// Reproducible SHA-256 fingerprinting for the Context Manifest v1 —
// legacy/sessions/session_12_context_compiler_foundation/
// contrato_context_manifest_v1.md, Section 9. This module has no knowledge
// of the manifest shape: it exposes a generic, deterministic serializer and
// hasher, and a payload-builder that encodes exactly the fields the
// contract designates as fingerprint-relevant. compiler.js decides what
// goes in; this module only guarantees that the same logical input always
// produces the same output.

export const FINGERPRINT_ALGORITHM = 'sha256';

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, '\n');
}

/** Public SHA-256 helper reused by compiler.js for goal hashing and for
 * verifying a RelevanceCandidate's content against its Source's
 * content_hash (Section 4 — content_hash is always computed this way,
 * mirrored from the private helper in authority.js). */
export function sha256Hex(text) {
  return crypto.createHash('sha256').update(normalizeLineEndings(text), 'utf8').digest('hex');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function serialize(value) {
  if (value === undefined) {
    throw new Error('stableStringify: undefined is not allowed in a canonical payload');
  }
  if (typeof value === 'function') {
    throw new Error('stableStringify: functions are not allowed in a canonical payload');
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    // Arrays keep the order given — this function never re-sorts an array.
    // The caller owns canonical array order (e.g. buildFingerprintPayload
    // sorts selected sources by id before this is ever called).
    return `[${value.map((entry) => serialize(entry)).join(',')}]`;
  }
  if (value instanceof Map || value instanceof Set) {
    throw new Error('stableStringify: Map/Set are not allowed in a canonical payload');
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${serialize(value[key])}`).join(',')}}`;
  }
  throw new Error(`stableStringify: unsupported value type: ${typeof value}`);
}

/**
 * Serializes a plain-data value into a canonical string: object keys sorted
 * ascending, arrays preserved in caller-given order, no `undefined`, no
 * functions, no Map/Set. The same logical value always serializes to the
 * exact same string, independent of the property insertion order used to
 * build it.
 */
export function stableStringify(value) {
  return serialize(value);
}

/**
 * Hashes an arbitrary canonical payload with SHA-256. This function has no
 * opinion about what the payload should contain — see
 * `buildFingerprintPayload` for the Manifest v1-specific field selection.
 */
export function computeContextFingerprint(payload) {
  const canonical = stableStringify(payload);
  const value = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
  return Object.freeze({ algorithm: FINGERPRINT_ALGORITHM, value });
}

/**
 * Builds the canonical fingerprint payload per the Manifest v1 contract
 * (Section 9): schema version, compiler contract version, normalized goal,
 * session id and selection reason, budget profile/max_chars, Git HEAD when
 * available, the selected Source ids + their content_hash (sorted by id —
 * independent of whatever order the Relevance Engine selected them in,
 * which is a relevance concern, not an identity concern), and relevant
 * constraints. Never includes: the manifest's own fingerprint value,
 * absolute paths, timestamps, mtime/ctime, or filesystem enumeration order.
 *
 * `sessionSelectionReason` is included alongside `sessionId` deliberately:
 * `session.id` alone doesn't capture *why* that session was selected
 * (`explicit` vs `latest_canonical`), and that distinction is itself part
 * of the canonical state the Manifest records (Checkpoint 07.1) — two
 * builds naming the same session for different reasons are not the same
 * logical state, and must not collide onto the same fingerprint.
 */
export function buildFingerprintPayload({
  schemaVersion,
  compilerContractVersion,
  goalNormalized,
  sessionId,
  sessionSelectionReason,
  budgetProfile,
  budgetMaxChars,
  gitHead,
  selectedSources,
  constraints,
}) {
  const sortedSources = [...(selectedSources ?? [])]
    .map((source) => ({ id: source.id, content_hash: source.content_hash ?? null }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const sortedConstraints = [...(constraints ?? [])].sort();

  return {
    schema_version: schemaVersion,
    compiler_contract_version: compilerContractVersion,
    goal_normalized: goalNormalized,
    session_id: sessionId ?? null,
    session_selection_reason: sessionSelectionReason ?? null,
    budget_profile: budgetProfile,
    budget_max_chars: budgetMaxChars,
    git_head: gitHead ?? null,
    selected_sources: sortedSources,
    constraints: sortedConstraints,
  };
}
