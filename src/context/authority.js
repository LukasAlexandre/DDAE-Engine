import crypto from 'node:crypto';

// Section 4 of legacy/sessions/session_12_context_compiler_foundation/
// contrato_context_manifest_v1.md — the kind vocabulary is fixed by that
// contract, not invented here. Adding a kind requires evidence of real need,
// documented before implementation, per this bloco's own contract.
export const SOURCE_KINDS = [
  'git',
  'session',
  'decision',
  'architecture',
  'bug',
  'validation',
  'test',
  'project_metadata',
  'source_code',
  'documentation',
];

// The seven domains from contrato_context_manifest_v1.md Section 5 — a
// claim's *domain* (what category of truth it claims to state), never a
// numeric rank. `kind` and domain are deliberately independent: the same
// `kind` (e.g. `decision`) can be `architecture_intent` (current, approved)
// or `history` (superseded) depending on what the caller formally knows —
// never inferred from prose.
export const AUTHORITY_DOMAINS = [
  'repository_state',
  'runtime_metadata',
  'architecture_intent',
  'test_result',
  'active_bug_state',
  'future_intent',
  'history',
];

// "Intenção futura" and "História" are explicitly, unconditionally never
// authoritative over the present (Section 5). The other five domains *are*
// the authority for their respective category of claim. This partition is
// the only rule this module uses to resolve a conflict — never a cross-
// domain numeric ranking, which the contract explicitly rejects.
const PRESENT_AUTHORITATIVE_DOMAINS = AUTHORITY_DOMAINS.filter(
  (domain) => domain !== 'future_intent' && domain !== 'history',
);

function assertValidKind(kind) {
  if (!SOURCE_KINDS.includes(kind)) {
    throw new Error(`createSource: invalid kind "${kind}". Expected one of: ${SOURCE_KINDS.join(', ')}`);
  }
}

function assertValidDomain(domain) {
  if (!AUTHORITY_DOMAINS.includes(domain)) {
    throw new Error(`createSource: invalid domain "${domain}". Expected one of: ${AUTHORITY_DOMAINS.join(', ')}`);
  }
}

/**
 * Rejects (never silently rewrites) a path that isn't already project-
 * relative with forward slashes — the caller owns turning an absolute path
 * into a project-relative one, because only the caller knows the real
 * project root; this module never assumes a cwd.
 */
function assertProjectRelativePath(candidatePath) {
  if (candidatePath === undefined || candidatePath === null) {
    return;
  }
  const looksAbsolute = candidatePath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(candidatePath);
  const hasBackslash = candidatePath.includes('\\');
  if (looksAbsolute || hasBackslash) {
    throw new Error(`createSource: path must be project-relative with forward slashes, got "${candidatePath}"`);
  }
}

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, '\n');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Normalizes a piece of collected evidence into a canonical Source, per
 * Section 4 of the Manifest v1 contract: `{ id, kind, path, section,
 * authority_class, content_hash }`.
 *
 * `domain` (-> `authority_class`) is always required from the caller,
 * for every kind, with no default inference from `kind` — the same `kind`
 * can carry different domains depending on formally-known state (e.g. a
 * `decision` is `architecture_intent` only when the caller formally knows
 * it's current and approved; otherwise it's `history`). Guessing that from
 * prose would be exactly the kind of NLP this bloco's contract forbids.
 *
 * `identity` stands in for `path` when a source has no file path (e.g. a
 * `git` source identified by "HEAD" or "branch:main") — one of the two is
 * required, to derive a stable id.
 *
 * The id is derived deterministically from `kind` + identity + `section` —
 * never from Date.now(), mtime, array position, or randomUUID() — so the
 * same logical source always produces the same id.
 */
export function createSource({ kind, domain, path, section = null, identity, content = null }) {
  assertValidKind(kind);
  assertValidDomain(domain);
  assertProjectRelativePath(path);

  const stableIdentity = path ?? identity;
  if (!stableIdentity) {
    throw new Error('createSource requires either "path" or "identity" to derive a stable id');
  }

  const id = `src_${sha256(`${kind}:${stableIdentity}:${section ?? ''}`).slice(0, 16)}`;
  const contentHash = content === null ? null : sha256(normalizeLineEndings(content));

  return Object.freeze({
    id,
    kind,
    path: path ?? null,
    section,
    authority_class: domain,
    content_hash: contentHash,
  });
}

/**
 * Resolves which of two or more conflicting Sources (claims about the same
 * fact) is authoritative, using only the domain partition from Section 5 —
 * never a numeric score, never input order, never "newest wins" without a
 * formal signal.
 *
 * Rule: `future_intent` and `history` are never authoritative over the
 * present (Section 5, unconditionally). If exactly one source belongs to a
 * present-authoritative domain, it wins; every other source is preserved in
 * `conflicting_sources` with a categorical `reason_superseded`, never
 * dropped.
 *
 * If zero or more-than-one sources are present-authoritative, this module
 * has no objective criterion to pick a winner (that would require inventing
 * a cross-domain or same-domain ranking the contract explicitly rejects) —
 * the conflict is returned `unresolved`, `winner: null`, with every source
 * preserved, sorted deterministically by id.
 *
 * Never mutates the input sources.
 */
export function resolveAuthorityConflict(sources) {
  if (!Array.isArray(sources) || sources.length < 2) {
    throw new Error('resolveAuthorityConflict requires an array of at least 2 sources');
  }

  const byId = [...sources].sort((a, b) => a.id.localeCompare(b.id));
  const presentAuthoritative = byId.filter((source) => PRESENT_AUTHORITATIVE_DOMAINS.includes(source.authority_class));

  if (presentAuthoritative.length !== 1) {
    return Object.freeze({
      status: 'unresolved',
      winner: null,
      conflicting_sources: byId.map((source) => Object.freeze({ source_id: source.id, value: source })),
    });
  }

  const winner = presentAuthoritative[0];
  const losers = byId.filter((source) => source.id !== winner.id);

  return Object.freeze({
    status: 'resolved',
    winner: Object.freeze({ source_id: winner.id, value: winner }),
    conflicting_sources: losers.map((source) => Object.freeze({
      source_id: source.id,
      value: source,
      reason_superseded: `current_${winner.authority_class}_over_${source.authority_class}`,
    })),
  });
}
