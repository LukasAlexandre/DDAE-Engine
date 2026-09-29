import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  planBrainWorkspace,
  declareBrainViews,
  DEFAULT_VIEW_PRODUCERS,
  BrainOrchestrationError,
} from '../src/workspace/orchestrator.js';
import { validateBrainWorkspace } from '../src/workspace/validator.js';
import { BRAIN_DIR, BRAIN_RENDERER_VIEW_PATHS } from '../src/workspace/renderer.js';
import { CONTEXT_PACKAGES_VIEW_PATH, collectContextPackageState } from '../src/workspace/context-packages.js';
import { discoverWorkspaceState } from '../src/workspace/discover.js';
import { buildBrainFingerprintPayload, computeBrainFingerprint } from '../src/workspace/fingerprint.js';
import { makeSnapshot, ENGINE_VERSION } from './brain-fixtures.js';
import { REPO_ROOT } from './helpers.js';

const MISSING_STATE = Object.freeze({
  availability: 'missing',
  status: null,
  reasons: Object.freeze([]),
  schema_version: null,
  engine_version: null,
  goal_hash: null,
  budget: null,
  fingerprint: null,
  counts: null,
  relevant_files: Object.freeze([]),
});

const PRESENT_STATE = Object.freeze({
  availability: 'present',
  status: 'STALE',
  reasons: Object.freeze([Object.freeze({ code: 'SOURCE_FRESHNESS_UNVERIFIED' })]),
  schema_version: 'context-manifest-v1',
  engine_version: '0.3.0',
  goal_hash: 'g'.repeat(8),
  budget: Object.freeze({ profile: 'standard', max_chars: 1000 }),
  fingerprint: Object.freeze({ algorithm: 'sha256', value: 'f'.repeat(64) }),
  counts: Object.freeze({ sources: 1, relevant_files: 1, excluded_sources: 0 }),
  relevant_files: Object.freeze([Object.freeze({ path: 'Docs/a.md', score: 1, char_cost: 10 })]),
});

const input = (overrides = {}) => ({
  snapshot: makeSnapshot(),
  contextPackageState: MISSING_STATE,
  engineVersion: ENGINE_VERSION,
  ...overrides,
});

const plan = (overrides, options) => planBrainWorkspace(input(overrides), options);
const clone = (value) => JSON.parse(JSON.stringify(value));
const contentOf = (result, name) => result.files.find((f) => f.path === `${BRAIN_DIR}/${name}.md`).content;

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

function producer(name, paths, render) {
  return { name, paths, render };
}

const codeOf = (fn) => {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof BrainOrchestrationError, `expected BrainOrchestrationError, got ${error?.constructor?.name}: ${error?.message}`);
    return error.code;
  }
  assert.fail('expected a BrainOrchestrationError');
  return null;
};

// ───────────────────────── 1. API ─────────────────────────

test('1. exports the expected API', () => {
  assert.equal(typeof planBrainWorkspace, 'function');
  assert.equal(typeof declareBrainViews, 'function');
  assert.ok(Array.isArray(DEFAULT_VIEW_PRODUCERS));
  assert.ok(Object.isFrozen(DEFAULT_VIEW_PRODUCERS));
  assert.ok(new BrainOrchestrationError('X', 'm') instanceof Error);
});

// ───────────────────────── 2. view declarations ─────────────────────────

test('2. expectedViews are derived from the producers\' own declarations, never from a magic number', () => {
  const declared = declareBrainViews();
  const fromProducers = DEFAULT_VIEW_PRODUCERS.flatMap((p) => [...p.paths]);
  assert.equal(declared.length, fromProducers.length);
  assert.deepEqual([...declared], [...fromProducers].sort());
  assert.deepEqual([...declared], [...[...BRAIN_RENDERER_VIEW_PATHS, CONTEXT_PACKAGES_VIEW_PATH]].sort());
  assert.equal(declared.length, BRAIN_RENDERER_VIEW_PATHS.length + 1);
});

test('2b. the declaration is frozen, sorted by code point, all under DDAE-Brain/ as .md', () => {
  const declared = declareBrainViews();
  assert.ok(Object.isFrozen(declared));
  assert.deepEqual([...declared], [...declared].sort());
  for (const view of declared) {
    assert.ok(view.startsWith(`${BRAIN_DIR}/`) && view.endsWith('.md'), view);
  }
});

test('2c. the default producers are exactly the Brain Renderer and Context Packages', () => {
  assert.deepEqual(DEFAULT_VIEW_PRODUCERS.map((p) => p.name), ['brain-renderer', 'context-packages']);
});

test('3. an exact duplicate declaration (two producers) is rejected before anything is compiled', () => {
  const producers = [
    producer('a', ['DDAE-Brain/Home.md'], () => []),
    producer('b', ['DDAE-Brain/Home.md'], () => []),
  ];
  assert.equal(codeOf(() => declareBrainViews(producers)), 'VIEW_PATH_DUPLICATE');
  assert.equal(codeOf(() => plan({}, { producers })), 'VIEW_PATH_DUPLICATE');
});

test('3b. a duplicate inside a single producer is rejected too', () => {
  const producers = [producer('a', ['DDAE-Brain/Home.md', 'DDAE-Brain/Home.md'], () => [])];
  assert.equal(codeOf(() => declareBrainViews(producers)), 'VIEW_PATH_DUPLICATE');
});

test('4. case-insensitive collisions (Windows/macOS portability) are rejected', () => {
  const producers = [
    producer('a', ['DDAE-Brain/Home.md'], () => []),
    producer('b', ['DDAE-Brain/home.md'], () => []),
  ];
  assert.equal(codeOf(() => declareBrainViews(producers)), 'VIEW_PATH_CASE_COLLISION');
  assert.equal(codeOf(() => plan({}, { producers })), 'VIEW_PATH_CASE_COLLISION');
});

test('4b. a declared path outside DDAE-Brain/ or not a .md file is rejected', () => {
  for (const bad of ['Docs/Home.md', '.ddae/brain/manifest.json', 'DDAE-Brain/Home.txt', 'DDAE-Brain/sub/Home.md']) {
    assert.equal(codeOf(() => declareBrainViews([producer('x', [bad], () => [])])), 'VIEW_PATH_INVALID', bad);
  }
});

test('4c. malformed producers are rejected (input contract)', () => {
  assert.throws(() => declareBrainViews([{ name: 'x', paths: 'nope', render: () => [] }]), /producer/i);
  assert.throws(() => declareBrainViews([{ name: 'x', paths: [], render: 'nope' }]), /producer/i);
  assert.throws(() => declareBrainViews('nope'), /producers/i);
});

// ───────────────────────── 5. plan: manifest ─────────────────────────

test('5. the Compiler receives the declared views: manifest.views equals the derived declaration', () => {
  const result = plan();
  assert.deepEqual([...result.manifest.views], [...declareBrainViews()]);
});

test('5b. views are part of the fingerprint BEFORE it is computed: the stored fingerprint matches the final payload', () => {
  const { manifest } = plan();
  assert.equal(manifest.fingerprint.value, computeBrainFingerprint(buildBrainFingerprintPayload(manifest)).value);
  assert.deepEqual(buildBrainFingerprintPayload(manifest).views, [...declareBrainViews()]);
});

test('5c. the Workspace Validator approves the planned manifest with expectedViews (VALID)', () => {
  const { manifest, validation } = plan();
  assert.deepEqual(validation, { status: 'VALID', reasons: [] });
  assert.deepEqual(validateBrainWorkspace(manifest, { expectedViews: [...declareBrainViews()] }), { status: 'VALID', reasons: [] });
});

test('5d. generated_at is never persisted (idempotency): same input → same manifest', () => {
  const { manifest } = plan();
  assert.ok(!('generated_at' in manifest));
  assert.deepEqual(plan().manifest, manifest);
});

test('5e. engineVersion is carried into the manifest', () => {
  assert.equal(plan({ engineVersion: '0.4.0-x' }).manifest.engine_version, '0.4.0-x');
});

// ───────────────────────── 6. plan: composed files ─────────────────────────

test('6. exactly the 7 Brain views + Context-Packages are produced, sorted, one per declared view', () => {
  const { files, manifest } = plan();
  assert.equal(files.length, BRAIN_RENDERER_VIEW_PATHS.length + 1);
  assert.deepEqual(files.map((f) => f.path), [...manifest.views]);
  assert.ok(files.some((f) => f.path === CONTEXT_PACKAGES_VIEW_PATH));
  for (const entry of BRAIN_RENDERER_VIEW_PATHS) assert.ok(files.some((f) => f.path === entry), entry);
});

test('6b. Home ⇄ Context-Packages navigation is complete', () => {
  const result = plan();
  assert.ok(contentOf(result, 'Home').includes('[Context Packages](./Context-Packages.md)'));
  assert.ok(contentOf(result, 'Context-Packages').includes('[Home](./Home.md)'));
});

test('6c. a missing Context Package still yields the view (empty state) and the same 8 declared paths', () => {
  const result = plan({ contextPackageState: MISSING_STATE });
  assert.equal(result.files.length, 8);
  assert.match(contentOf(result, 'Context-Packages'), /No Context Package is currently available/);
  assert.deepEqual([...result.manifest.views], [...declareBrainViews()]);
});

test('6d. a present or corrupt Context Package state is rendered without changing the declared set', () => {
  const present = plan({ contextPackageState: PRESENT_STATE });
  assert.match(contentOf(present, 'Context-Packages'), /STALE/);
  const corrupt = plan({ contextPackageState: { ...MISSING_STATE, availability: 'present', status: 'CORRUPT', reasons: [{ code: 'MANIFEST_JSON_INVALID' }] } });
  assert.match(contentOf(corrupt, 'Context-Packages'), /CORRUPT/);
  assert.equal(present.manifest.fingerprint.value, corrupt.manifest.fingerprint.value, 'the Brain fingerprint does not depend on the Context Package state');
});

test('6e. every file has a path/content pair, LF only, one final newline, the generated marker', () => {
  for (const file of plan().files) {
    assert.deepEqual(Object.keys(file).sort(), ['content', 'path']);
    assert.ok(!file.content.includes('\r'));
    assert.ok(file.content.endsWith('\n') && !file.content.endsWith('\n\n'));
    assert.ok(file.content.includes('_Generated by DDAE. Derived from Docs/ and Git. Do not edit directly._'));
  }
});

// ───────────────────────── 7. composition invariants ─────────────────────────

test('7. declared == generated: a producer that fails to emit a declared path → OUTPUT_MISSING', () => {
  const [brain, context] = DEFAULT_VIEW_PRODUCERS;
  const lazy = producer('context-packages', context.paths, () => []);
  assert.equal(codeOf(() => plan({}, { producers: [brain, lazy] })), 'OUTPUT_MISSING');
});

test('7b. a producer that emits a path nobody declared → OUTPUT_UNEXPECTED', () => {
  const [brain, context] = DEFAULT_VIEW_PRODUCERS;
  const greedy = producer('context-packages', context.paths, (ctx) => [
    ...context.render(ctx),
    { path: 'DDAE-Brain/Extra.md', content: '# Extra\n' },
  ]);
  assert.equal(codeOf(() => plan({}, { producers: [brain, greedy] })), 'OUTPUT_UNEXPECTED');
});

test('7c. a producer that emits another producer\'s declared path → an error, never a silent overwrite', () => {
  const [brain, context] = DEFAULT_VIEW_PRODUCERS;
  const thief = producer('context-packages', context.paths, () => [{ path: 'DDAE-Brain/Home.md', content: '# Stolen\n' }]);
  const code = codeOf(() => plan({}, { producers: [brain, thief] }));
  assert.ok(['OUTPUT_UNEXPECTED', 'OUTPUT_DUPLICATE', 'OUTPUT_MISSING'].includes(code), code);
});

test('7d. the same path rendered twice → OUTPUT_DUPLICATE', () => {
  const [brain, context] = DEFAULT_VIEW_PRODUCERS;
  const twice = producer('context-packages', context.paths, (ctx) => [...context.render(ctx), ...context.render(ctx)]);
  assert.equal(codeOf(() => plan({}, { producers: [brain, twice] })), 'OUTPUT_DUPLICATE');
});

test('7e. a rendered path that only differs by case from another → OUTPUT_DUPLICATE (case-insensitive)', () => {
  const [brain, context] = DEFAULT_VIEW_PRODUCERS;
  const shouty = producer('context-packages', context.paths, () => [{ path: 'DDAE-Brain/CONTEXT-PACKAGES.md', content: '# X\n' }]);
  const code = codeOf(() => plan({}, { producers: [brain, shouty] }));
  assert.ok(['OUTPUT_DUPLICATE', 'OUTPUT_UNEXPECTED', 'OUTPUT_MISSING'].includes(code), code);
});

test('7f. malformed producer output (not an array, missing path, non-string content) → OUTPUT_MALFORMED', () => {
  const [brain, context] = DEFAULT_VIEW_PRODUCERS;
  for (const bad of [() => 'nope', () => [{ content: 'x' }], () => [{ path: context.paths[0], content: 42 }], () => [null]]) {
    assert.equal(codeOf(() => plan({}, { producers: [brain, producer('context-packages', context.paths, bad)] })), 'OUTPUT_MALFORMED');
  }
});

test('7g. the checks run before any result exists: no plan is returned when an invariant fails', () => {
  const [brain, context] = DEFAULT_VIEW_PRODUCERS;
  let result = null;
  assert.throws(() => { result = plan({}, { producers: [brain, producer('context-packages', context.paths, () => [])] }); });
  assert.equal(result, null);
});

// ───────────────────────── 8. validation gate ─────────────────────────

test('8. an INVALID manifest never yields a plan: MANIFEST_INVALID carries the validator reasons and no content', () => {
  const snapshot = makeSnapshot({ decisions: [{ id: 'RD-01', summary: 'LEAKY_SUMMARY', source_path: '../outside.md' }] });
  let error = null;
  try {
    planBrainWorkspace({ snapshot, contextPackageState: MISSING_STATE, engineVersion: ENGINE_VERSION });
  } catch (caught) {
    error = caught;
  }
  assert.ok(error instanceof BrainOrchestrationError);
  assert.equal(error.code, 'MANIFEST_INVALID');
  assert.ok(error.details.reasons.some((r) => r.code === 'PATH_ESCAPES_ROOT'));
  assert.ok(!JSON.stringify(error.details).includes('LEAKY_SUMMARY'));
  assert.ok(!String(error.message).includes('LEAKY_SUMMARY'));
});

// ───────────────────────── 9. input contract ─────────────────────────

test('9. missing or malformed inputs throw (programmer error), never a partial plan', () => {
  assert.throws(() => planBrainWorkspace(), /input/i);
  assert.throws(() => planBrainWorkspace(null), /input/i);
  assert.throws(() => plan({ snapshot: null }), /snapshot/i);
  assert.throws(() => plan({ contextPackageState: null }), /contextPackageState/i);
  assert.throws(() => plan({ engineVersion: '' }), /engineVersion/i);
  assert.throws(() => plan({ engineVersion: undefined }), /engineVersion/i);
});

// ───────────────────────── 10. determinism / immutability / purity ─────────────────────────

test('10. same inputs → the same plan, byte for byte', () => {
  const a = plan();
  const b = plan();
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('10b. the plan is deeply frozen', () => {
  const result = plan();
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.files) && Object.isFrozen(result.validation));
  for (const file of result.files) assert.ok(Object.isFrozen(file));
});

test('10c. inputs are never mutated, including deeply frozen ones', () => {
  const snapshot = deepFreeze(clone(makeSnapshot()));
  const state = deepFreeze(clone(PRESENT_STATE));
  const before = JSON.stringify([snapshot, state]);
  planBrainWorkspace({ snapshot, contextPackageState: state, engineVersion: ENGINE_VERSION });
  assert.equal(JSON.stringify([snapshot, state]), before);
});

test('10d. custom producers are given the frozen manifest and the state, and cannot mutate the plan input', () => {
  const [brain, context] = DEFAULT_VIEW_PRODUCERS;
  let seen = null;
  const spy = producer('context-packages', context.paths, (ctx) => {
    seen = ctx;
    return context.render(ctx);
  });
  plan({}, { producers: [brain, spy] });
  assert.ok(Object.isFrozen(seen.manifest));
  assert.equal(seen.contextPackageState, MISSING_STATE);
  assert.deepEqual(Object.keys(seen).sort(), ['contextPackageState', 'manifest']);
});

test('11. pure source guard: only pure workspace/schema imports, no I/O, clock, randomness, cwd, console or Claude-Mem/LLM', () => {
  const source = fs.readFileSync(path.join(REPO_ROOT, 'src', 'workspace', 'orchestrator.js'), 'utf8');
  const imports = [...source.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]).sort();
  assert.deepEqual(imports, [
    '../schemas/brain-schema.js',
    './compiler.js',
    './context-packages.js',
    './renderer.js',
    './validator.js',
  ]);
  const code = source.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const forbidden of [/\bnode:/, /\bfs\b/, /child_process/, /\bfetch\b/, /\bhttps?\b/, /\bnet\b/, /Date\b/, /Math\.random/, /process\./, /console\./, /claude-mem/i, /\bLLM\b/, /src\/context/]) {
    assert.ok(!forbidden.test(code), String(forbidden));
  }
});

test('12. no filesystem effect: planning creates no DDAE-Brain/ or .ddae/brain/ anywhere it could', () => {
  const originalWrite = fs.writeFileSync;
  const originalMkdir = fs.mkdirSync;
  fs.writeFileSync = () => { throw new Error('unexpected write'); };
  fs.mkdirSync = () => { throw new Error('unexpected mkdir'); };
  try {
    plan();
  } finally {
    fs.writeFileSync = originalWrite;
    fs.mkdirSync = originalMkdir;
  }
  assert.ok(!fs.existsSync(path.join(REPO_ROOT, 'DDAE-Brain')));
  assert.ok(!fs.existsSync(path.join(REPO_ROOT, '.ddae', 'brain')));
});

// ───────────────────────── 13. freshness integration ─────────────────────────

test('13. a plan validated against a later plan of a changed project is STALE (canonical drift, D3)', () => {
  const before = plan();
  const after = plan({ snapshot: makeSnapshot({ current_session: { id: 'session_09_new', selection_reason: 'latest_canonical' } }) });
  const expectedViews = [...declareBrainViews()];
  const result = validateBrainWorkspace(before.manifest, { currentManifest: after.manifest, expectedViews });
  assert.equal(result.status, 'STALE');
  assert.deepEqual(validateBrainWorkspace(before.manifest, { currentManifest: plan().manifest, expectedViews }), { status: 'VALID', reasons: [] });
});

// ───────────────────────── 14. self-host ─────────────────────────

test('14. self-host: the real repository plans to a VALID manifest with 8 views, entirely in memory', () => {
  const snapshot = discoverWorkspaceState(REPO_ROOT);
  const contextPackageState = collectContextPackageState(REPO_ROOT);
  const first = planBrainWorkspace({ snapshot, contextPackageState, engineVersion: ENGINE_VERSION });
  const second = planBrainWorkspace({ snapshot, contextPackageState, engineVersion: ENGINE_VERSION });
  assert.equal(first.validation.status, 'VALID');
  assert.equal(first.files.length, BRAIN_RENDERER_VIEW_PATHS.length + 1);
  assert.deepEqual(first, second);
  assert.ok(contentOf(first, 'Home').includes('[Context Packages](./Context-Packages.md)'));
  assert.ok(!fs.existsSync(path.join(REPO_ROOT, 'DDAE-Brain')));
});
