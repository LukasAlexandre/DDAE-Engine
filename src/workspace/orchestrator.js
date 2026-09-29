import { compareStrings } from '../schemas/brain-schema.js';
import { compileBrainManifest } from './compiler.js';
import { validateBrainWorkspace } from './validator.js';
import { renderBrainWorkspace, BRAIN_DIR, BRAIN_RENDERER_VIEW_PATHS } from './renderer.js';
import { renderContextPackagesView, CONTEXT_PACKAGES_VIEW_PATH } from './context-packages.js';

// Brain Orchestrator (pure core) — connects the already-separate, already-
// approved pieces in memory and returns a build plan. It owns no logic of its
// own beyond the wiring and the composition invariants:
//
//   producers declare their view paths (constants, no I/O)
//        ↓  duplicate / case-collision / location checks
//   expectedViews
//        ↓
//   compileBrainManifest(snapshot, { engineVersion, views })   views BEFORE the fingerprint
//        ↓
//   validateBrainWorkspace(manifest, { expectedViews })        INVALID ⇒ no plan
//        ↓
//   producers render (Brain views + Context Packages)          pure
//        ↓
//   declared == generated, no duplicates                       ⇒ files
//
// It never discovers (the caller passes the snapshot and the Context Package
// state it already collected), never writes, never reads `Docs/`/Git/the
// clock, and never prints. Persisting `files` and the Manifest is the
// Writer's job, exposing this through a command is the CLI's job (Bloco 08,
// Fases B e C). Contract: contrato_workspace_project_brain.md, Seção B.1.

/** Failure of an orchestration invariant. `code` is machine-readable; `details` carries only codes/paths, never content. */
export class BrainOrchestrationError extends Error {
  constructor(code, message, details = {}) {
    super(`planBrainWorkspace: ${code}: ${message}`);
    this.name = 'BrainOrchestrationError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

function invalidInput(message) {
  throw new Error(`planBrainWorkspace: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * A view producer: `{ name, paths, render }` where `paths` are the view paths
 * it declares and `render({ manifest, contextPackageState })` returns
 * `[{ path, content }]`. The list below is the single, auditable place where
 * the producers are composed — there is no plugin discovery.
 */
export const DEFAULT_VIEW_PRODUCERS = Object.freeze([
  Object.freeze({
    name: 'brain-renderer',
    paths: BRAIN_RENDERER_VIEW_PATHS,
    render: ({ manifest }) => renderBrainWorkspace(manifest),
  }),
  Object.freeze({
    name: 'context-packages',
    paths: Object.freeze([CONTEXT_PACKAGES_VIEW_PATH]),
    render: ({ contextPackageState }) => [renderContextPackagesView(contextPackageState)],
  }),
]);

function assertProducers(producers) {
  if (!Array.isArray(producers)) {
    invalidInput('options.producers must be an array of view producers');
  }
  for (const entry of producers) {
    if (!isPlainObject(entry) || typeof entry.name !== 'string' || !Array.isArray(entry.paths) || typeof entry.render !== 'function') {
      invalidInput('each producer must be { name: string, paths: string[], render: function }');
    }
  }
}

function isBrainViewPath(value) {
  const prefix = `${BRAIN_DIR}/`;
  return typeof value === 'string'
    && value.startsWith(prefix)
    && value.endsWith('.md')
    && value.length > prefix.length + '.md'.length
    && !value.slice(prefix.length).includes('/');
}

/** Rejects exact and case-insensitive duplicates within a list of paths. */
function assertNoCollisions(paths, exactCode, caseCode, what) {
  const exact = new Set();
  const folded = new Map();
  for (const entry of paths) {
    if (exact.has(entry)) {
      throw new BrainOrchestrationError(exactCode, `${what} declared or produced more than once: ${entry}`, { path: entry });
    }
    exact.add(entry);
    const key = entry.toLowerCase();
    if (folded.has(key)) {
      throw new BrainOrchestrationError(caseCode, `${what} collide when compared case-insensitively: ${folded.get(key)} / ${entry}`, { paths: [folded.get(key), entry] });
    }
    folded.set(key, entry);
  }
}

/**
 * Derives the view set (`expectedViews`) from the producers' own
 * declarations: every path sits directly under `DDAE-Brain/` as a Markdown
 * file, and none is declared twice (also compared case-insensitively). Returns
 * a frozen array in canonical code-point order. Nothing is compiled or
 * rendered here.
 */
export function declareBrainViews(producers = DEFAULT_VIEW_PRODUCERS) {
  assertProducers(producers);
  const declared = producers.flatMap((entry) => entry.paths);
  for (const declaredPath of declared) {
    if (!isBrainViewPath(declaredPath)) {
      throw new BrainOrchestrationError('VIEW_PATH_INVALID', `a producer declared a path that is not ${BRAIN_DIR}/<Name>.md: ${String(declaredPath)}`, { path: String(declaredPath) });
    }
  }
  assertNoCollisions(declared, 'VIEW_PATH_DUPLICATE', 'VIEW_PATH_CASE_COLLISION', 'view path');
  return Object.freeze([...declared].sort(compareStrings));
}

function collectOutputs(producers, context) {
  const outputs = [];
  for (const entry of producers) {
    const rendered = entry.render(context);
    if (!Array.isArray(rendered)) {
      throw new BrainOrchestrationError('OUTPUT_MALFORMED', `producer "${entry.name}" did not return an array of { path, content }`, { producer: entry.name });
    }
    const allowed = new Set(entry.paths);
    for (const file of rendered) {
      if (!isPlainObject(file) || typeof file.path !== 'string' || typeof file.content !== 'string') {
        throw new BrainOrchestrationError('OUTPUT_MALFORMED', `producer "${entry.name}" returned an entry that is not { path: string, content: string }`, { producer: entry.name });
      }
      outputs.push({ producer: entry.name, path: file.path, content: file.content, declaredByProducer: allowed.has(file.path) });
    }
  }
  return outputs;
}

/**
 * Composition invariants after rendering — everything here happens before any
 * result exists, so a failure can never leave a half-usable plan behind:
 * no duplicate output (exact or case-insensitive), no output a producer did
 * not declare, no declared view without an output, and the produced path set
 * equal to `manifest.views`.
 */
function composeFiles(manifest, outputs) {
  assertNoCollisions(outputs.map((file) => file.path), 'OUTPUT_DUPLICATE', 'OUTPUT_DUPLICATE', 'rendered file');
  for (const file of outputs) {
    if (!file.declaredByProducer) {
      throw new BrainOrchestrationError('OUTPUT_UNEXPECTED', `producer "${file.producer}" rendered a path it did not declare: ${file.path}`, { producer: file.producer, path: file.path });
    }
  }
  const produced = new Set(outputs.map((file) => file.path));
  const declared = new Set(manifest.views);
  for (const view of manifest.views) {
    if (!produced.has(view)) {
      throw new BrainOrchestrationError('OUTPUT_MISSING', `a declared view was not rendered: ${view}`, { path: view });
    }
  }
  for (const file of outputs) {
    if (!declared.has(file.path)) {
      throw new BrainOrchestrationError('OUTPUT_UNEXPECTED', `a rendered file is not in manifest.views: ${file.path}`, { path: file.path });
    }
  }
  return Object.freeze(
    outputs
      .map((file) => Object.freeze({ path: file.path, content: file.content }))
      .sort((a, b) => compareStrings(a.path, b.path)),
  );
}

/**
 * Plans a Project Brain build entirely in memory.
 *
 * @param {object} input
 * @param {object} input.snapshot            result of `discoverWorkspaceState`
 * @param {object} input.contextPackageState result of `collectContextPackageState`
 * @param {string} input.engineVersion       version of the running ddae-engine
 * @param {object} [options]
 * @param {object[]} [options.producers]     view producers (defaults to `DEFAULT_VIEW_PRODUCERS`)
 * @returns {{ manifest: object, validation: object, files: object[] }} a frozen plan;
 *          throws `BrainOrchestrationError` when any invariant fails (no partial plan)
 */
export function planBrainWorkspace(input, options = {}) {
  if (!isPlainObject(input)) {
    invalidInput('input must be { snapshot, contextPackageState, engineVersion }');
  }
  const { snapshot, contextPackageState, engineVersion } = input;
  if (!isPlainObject(snapshot)) {
    invalidInput('input.snapshot must be a workspace discovery snapshot object');
  }
  if (!isPlainObject(contextPackageState)) {
    invalidInput('input.contextPackageState must be a Context Package safe state object');
  }
  if (typeof engineVersion !== 'string' || engineVersion.length === 0) {
    invalidInput('input.engineVersion is required (a non-empty string)');
  }
  const producers = options?.producers ?? DEFAULT_VIEW_PRODUCERS;

  const expectedViews = declareBrainViews(producers);
  const manifest = compileBrainManifest(snapshot, { engineVersion, views: expectedViews });

  const validation = validateBrainWorkspace(manifest, { expectedViews });
  if (validation.status !== 'VALID') {
    throw new BrainOrchestrationError('MANIFEST_INVALID', `the compiled manifest is ${validation.status}`, { status: validation.status, reasons: validation.reasons });
  }

  const files = composeFiles(manifest, collectOutputs(producers, Object.freeze({ manifest, contextPackageState })));
  return Object.freeze({ manifest, validation, files });
}
