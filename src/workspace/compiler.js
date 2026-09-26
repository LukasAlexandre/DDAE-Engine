import {
  BRAIN_SCHEMA_VERSION,
  BRAIN_ENTITY_KEYS,
  assertBrainManifest,
  compareRefs,
  compareSources,
  compareByName,
} from '../schemas/brain-schema.js';
import { buildBrainFingerprintPayload, computeBrainFingerprint } from './fingerprint.js';

// Brain Compiler — a deterministic transformation:
//
//   WorkspaceSnapshot (discoverWorkspaceState) ──► Brain Manifest v1
//
// Discovery collects; the compiler only transforms. It therefore takes the
// snapshot as an argument and does nothing else: no filesystem, no Git, no
// collectors, no network, no clock, no randomness, and it never writes.
// Anything it needs that the snapshot does not carry is a gap in
// Discovery's boundary to fix there, never a hidden read here.
//
// Two values are *inputs*, not discoveries: `engineVersion` (the running
// ddae-engine's version — the caller knows it) and, optionally,
// `generatedAt` (informative only, excluded from the fingerprint).

const pad3 = (n) => String(n).padStart(3, '0');

function fail(message) {
  throw new Error(`compileBrainManifest: ${message}`);
}

function assertSnapshot(snapshot) {
  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  if (!isObject(snapshot)) {
    fail('snapshot must be a workspace discovery snapshot object');
  }
  const arrays = ['decisions', 'risks', 'open_bugs', 'recent_changes', 'current_tasks'];
  const objects = ['project', 'git', 'ddae', 'release_state'];
  for (const key of arrays) {
    if (!Array.isArray(snapshot[key])) fail(`snapshot.${key} must be an array (not a workspace discovery snapshot?)`);
  }
  for (const key of objects) {
    if (!isObject(snapshot[key])) fail(`snapshot.${key} must be an object (not a workspace discovery snapshot?)`);
  }
  if (snapshot.current_session !== null && !isObject(snapshot.current_session)) {
    fail('snapshot.current_session must be an object or null');
  }
}

const ref = (id, sourcePath, summary) => ({ id, source_path: sourcePath, summary: summary ?? '' });

function buildEntities(snapshot) {
  const fallbackId = (prefix, index) => `${prefix}-${pad3(index + 1)}`;
  const release = [];
  if (snapshot.release_state.latest_tag) {
    release.push(ref('latest_tag', null, snapshot.release_state.latest_tag));
  }
  if (snapshot.release_state.version) {
    release.push(ref('package_version', 'package.json', snapshot.release_state.version));
  }

  const taskCounters = new Map();
  const tasks = snapshot.current_tasks.map((task) => {
    const next = (taskCounters.get(task.block) ?? 0) + 1;
    taskCounters.set(task.block, next);
    return ref(`${task.block}#${pad3(next)}`, task.source_path, task.text);
  });

  const entities = {
    current_tasks: tasks,
    decisions: snapshot.decisions.map((d, i) => ref(d.id ?? fallbackId('decision', i), d.source_path, d.summary)),
    open_bugs: snapshot.open_bugs.map((b, i) => ref(b.id ?? fallbackId('bug', i), b.source_path, b.summary)),
    recent_changes: snapshot.recent_changes.map((c) => ref(c.sha, null, c.sha)),
    release_state: release,
    risks: snapshot.risks.map((r, i) => ref(r.id ?? fallbackId('risk', i), r.source_path, r.summary)),
  };
  for (const key of BRAIN_ENTITY_KEYS) {
    entities[key] = Object.freeze(entities[key].sort(compareRefs).map(Object.freeze));
  }
  return Object.freeze(entities);
}

function buildSources(entities) {
  const seen = new Set();
  const sources = [];
  for (const key of BRAIN_ENTITY_KEYS) {
    for (const entry of entities[key]) {
      if (entry.source_path === null) continue;
      const id = `${entry.source_path}\u0000${key}`;
      if (!seen.has(id)) {
        seen.add(id);
        sources.push({ path: entry.source_path, entity: key });
      }
    }
  }
  return Object.freeze(sources.sort(compareSources).map(Object.freeze));
}

function buildDdae(ddae) {
  const session = ddae.current_session;
  return Object.freeze({
    available: ddae.available,
    docs_root: ddae.docs_root,
    sessions_root: ddae.sessions_root,
    sessions: Object.freeze([...ddae.sessions].map((s) => Object.freeze({ name: s.name, path: s.path })).sort(compareByName)),
    current_session: session === null
      ? null
      : Object.freeze({
        name: session.name,
        path: session.path,
        status: session.status,
        modules: Object.freeze([...session.modules].map((m) => Object.freeze({ name: m.name, exists: m.exists })).sort(compareByName)),
        counts: Object.freeze({ blocks: session.counts.blocks, prompts: session.counts.prompts, feedbacks: session.counts.feedbacks }),
      }),
  });
}

/**
 * Compiles a Workspace snapshot into a validated, fingerprinted Brain
 * Manifest v1 (in memory only — persistence belongs to the CLI block).
 *
 * @param {object} snapshot  result of `discoverWorkspaceState`
 * @param {object} options
 * @param {string} options.engineVersion  version of the running ddae-engine (required)
 * @param {string} [options.generatedAt]  informative timestamp, excluded from the fingerprint
 */
export function compileBrainManifest(snapshot, options = {}) {
  const engineVersion = options?.engineVersion;
  if (typeof engineVersion !== 'string' || engineVersion.length === 0) {
    fail('options.engineVersion is required (a non-empty string)');
  }
  assertSnapshot(snapshot);

  const entities = buildEntities(snapshot);
  const manifest = {
    schema_version: BRAIN_SCHEMA_VERSION,
    engine_version: engineVersion,
    project: Object.freeze({ name: snapshot.project.name, root_relative_path: snapshot.project.root_relative_path }),
    git: Object.freeze({ available: snapshot.git.available, head: snapshot.git.head ?? null }),
    ddae: buildDdae(snapshot.ddae),
    current_session: snapshot.current_session === null
      ? null
      : Object.freeze({ id: snapshot.current_session.id, selection_reason: snapshot.current_session.selection_reason }),
    sources: buildSources(entities),
    entities,
    // Nothing is rendered in this block (Renderer = Bloco 04): no view was
    // generated by this build, and the contract defines `views` as exactly that.
    views: Object.freeze([]),
  };

  const fingerprint = computeBrainFingerprint(buildBrainFingerprintPayload(manifest));
  const result = { ...manifest, fingerprint };
  if (options.generatedAt !== undefined) {
    result.generated_at = options.generatedAt;
  }
  assertBrainManifest(result);
  return Object.freeze(result);
}
