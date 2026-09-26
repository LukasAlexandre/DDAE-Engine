import { computeContextFingerprint } from '../context/fingerprint.js';
import { compareRefs, compareSources, compareByName, compareStrings } from '../schemas/brain-schema.js';

// Brain Manifest v1 fingerprint — the identity of the canonical state the
// manifest was compiled from, so a later validator can tell VALID from
// STALE/INVALID (contrato_workspace_project_brain.md, Seções B e H).
//
// The serializer and hash are the Context Compiler's own generic ones
// (`stableStringify` + sha256 via `computeContextFingerprint`), reused
// unmodified — this module only decides *what* goes into the payload.
//
// Included: everything the manifest states except the exclusions below,
// notably `engine_version` (an engine upgrade may change schema, semantics
// or rendering, so an older Brain is deliberately reported STALE).
//
// Excluded, because they are volatile or machine-specific and would break
// reproducibility across equivalent runs: the fingerprint itself,
// `generated_at`, and `project.name` (a local clone-folder name).
//
// Arrays are re-sorted here with the same canonical comparators the schema
// enforces, so the fingerprint never depends on incidental input order.

const sorted = (list, compare) => [...list].sort(compare);

/** Builds the canonical payload to fingerprint from a manifest (with or without its own fingerprint). */
export function buildBrainFingerprintPayload(manifest) {
  const entities = {};
  for (const key of Object.keys(manifest.entities).sort()) {
    entities[key] = sorted(manifest.entities[key], compareRefs).map((ref) => ({
      id: ref.id,
      source_path: ref.source_path,
      summary: ref.summary,
    }));
  }
  const ddaeSession = manifest.ddae.current_session;
  return {
    schema_version: manifest.schema_version,
    engine_version: manifest.engine_version,
    project: { root_relative_path: manifest.project.root_relative_path },
    git: { available: manifest.git.available, head: manifest.git.head },
    ddae: {
      available: manifest.ddae.available,
      docs_root: manifest.ddae.docs_root,
      sessions_root: manifest.ddae.sessions_root,
      sessions: sorted(manifest.ddae.sessions, compareByName).map((s) => ({ name: s.name, path: s.path })),
      current_session: ddaeSession === null
        ? null
        : {
          name: ddaeSession.name,
          path: ddaeSession.path,
          status: ddaeSession.status,
          modules: sorted(ddaeSession.modules, compareByName).map((m) => ({ name: m.name, exists: m.exists })),
          counts: { ...ddaeSession.counts },
        },
    },
    current_session: manifest.current_session === null
      ? null
      : { id: manifest.current_session.id, selection_reason: manifest.current_session.selection_reason },
    sources: sorted(manifest.sources, compareSources).map((s) => ({ path: s.path, entity: s.entity })),
    entities,
    views: sorted(manifest.views, compareStrings),
  };
}

/** Hashes a canonical payload → `{ algorithm: 'sha256', value }`. */
export function computeBrainFingerprint(payload) {
  return computeContextFingerprint(payload);
}
