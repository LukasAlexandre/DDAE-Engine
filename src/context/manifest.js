import { CONTEXT_SCHEMA_VERSION, assertContextManifest } from '../schemas/context-schema.js';

export { CONTEXT_SCHEMA_VERSION };

function sortById(list) {
  return [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function freezeDeep(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((entry) => freezeDeep(entry)));
  }
  if (value !== null && typeof value === 'object') {
    const frozen = {};
    for (const key of Object.keys(value)) {
      frozen[key] = freezeDeep(value[key]);
    }
    return Object.freeze(frozen);
  }
  return value;
}

/**
 * Assembles the canonical Context Manifest v1 shape (legacy/sessions/
 * session_12_context_compiler_foundation/contrato_context_manifest_v1.md,
 * Section 18) from already-prepared pieces. This function does no I/O, no
 * source deduplication, and makes no authority or relevance decisions of
 * its own — those happen upstream, in compiler.js. Its job is narrow:
 * canonical ordering, attaching the caller-supplied fingerprint verbatim
 * (it never computes one — see fingerprint.js), and validating the
 * assembled result against context-schema.js before returning, so an
 * invalid manifest can never leave this function.
 *
 * `sources` is ordered by `id` ASC — the documented canonical order for
 * this collection (Bloco 05 contract). `relevant_files` is never re-sorted
 * here: it must already carry the Relevance Engine's own selection order
 * (score DESC, path ASC, source id ASC).
 */
export function createContextManifest(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('createContextManifest requires an input object');
  }

  const manifest = {
    schema_version: CONTEXT_SCHEMA_VERSION,
    compiler: input.compiler,
    project: input.project,
    goal: input.goal,
    session: input.session,
    budget: input.budget,
    git: input.git,
    sources: sortById(input.sources ?? []),
    decisions: input.decisions ?? [],
    constraints: input.constraints ?? [],
    bugs: input.bugs ?? [],
    validation: input.validation ?? [],
    relevant_files: input.relevant_files ?? [],
    excluded_sources: input.excluded_sources ?? [],
    conflicts: input.conflicts ?? [],
    fingerprint: input.fingerprint,
  };

  assertContextManifest(manifest);

  return freezeDeep(manifest);
}
