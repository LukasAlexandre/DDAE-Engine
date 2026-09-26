import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { compileBrainManifest } from '../src/workspace/compiler.js';
import { discoverWorkspaceState } from '../src/workspace/discover.js';
import { validateBrainManifest, BRAIN_SCHEMA_VERSION } from '../src/schemas/brain-schema.js';
import { computeBrainFingerprint, buildBrainFingerprintPayload } from '../src/workspace/fingerprint.js';
import { makeSnapshot, ENGINE_VERSION } from './brain-fixtures.js';
import { REPO_ROOT, makeTempDir, cleanup } from './helpers.js';

const compile = (overrides, options = {}) => compileBrainManifest(makeSnapshot(overrides), { engineVersion: ENGINE_VERSION, ...options });

test('produces a schema-valid Brain Manifest v1 from a snapshot', () => {
  const manifest = compile();
  assert.equal(manifest.schema_version, BRAIN_SCHEMA_VERSION);
  assert.equal(manifest.engine_version, ENGINE_VERSION);
  assert.deepEqual(validateBrainManifest(manifest), { valid: true, errors: [] });
});

test('git is reduced to { available, head } (D1)', () => {
  assert.deepEqual(compile().git, { available: true, head: 'a'.repeat(40) });
});

test('ddae is carried over from the snapshot, never recomputed (D2)', () => {
  const manifest = compile();
  assert.deepEqual(manifest.ddae.current_session.counts, { blocks: 2, prompts: 1, feedbacks: 1 });
  assert.equal(manifest.ddae.sessions.length, 2);
  assert.deepEqual(manifest.current_session, { id: 'session_02_beta', selection_reason: 'latest_canonical' });
});

test('views is an empty list — nothing is rendered in this block (D3)', () => {
  assert.deepEqual(compile().views, []);
});

test('entities are exactly the six contract entities, no memory (D5)', () => {
  assert.deepEqual(Object.keys(compile().entities).sort(), ['current_tasks', 'decisions', 'open_bugs', 'recent_changes', 'release_state', 'risks']);
});

test('entity references keep only { id, source_path, summary } and are canonically ordered', () => {
  const { entities } = compile();
  assert.deepEqual(entities.decisions.map((d) => d.id), ['RD-01', 'RD-02']);
  assert.deepEqual(Object.keys(entities.risks[0]), ['id', 'source_path', 'summary']);
  assert.deepEqual(entities.risks[0], { id: 'MR-01', source_path: 'Docs/04_governance/matriz_riscos.md', summary: 'A risk' });
  // same id in two sessions: ties broken by source_path
  assert.deepEqual(entities.open_bugs.map((b) => b.summary), ['Bug in alpha', 'Bug in beta']);
});

test('Git-derived entries have source_path null and are sorted by sha', () => {
  const { entities } = compile();
  assert.deepEqual(entities.recent_changes.map((c) => c.id), ['a'.repeat(40), 'b'.repeat(40)]);
  assert.ok(entities.recent_changes.every((c) => c.source_path === null));
});

test('release_state becomes references: package version from package.json, tag from git', () => {
  assert.deepEqual(compile().entities.release_state, [
    { id: 'latest_tag', source_path: null, summary: 'v1.2.3' },
    { id: 'package_version', source_path: 'package.json', summary: '1.2.3' },
  ]);
  assert.deepEqual(compile({ release_state: { version: null, latest_tag: null } }).entities.release_state, []);
});

test('current_tasks get stable zero-padded ids per block', () => {
  const { current_tasks: tasks } = compile().entities;
  assert.deepEqual(tasks.map((t) => [t.id, t.summary]), [['bloco_02_x#001', 'Write tests'], ['bloco_02_x#002', 'Write code']]);
});

test('sources record provenance (path, entity), deduplicated and sorted, excluding Git-only entries', () => {
  const { sources } = compile();
  const keys = sources.map((s) => `${s.path}|${s.entity}`);
  assert.deepEqual(keys, [...keys].sort());
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(sources.every((s) => typeof s.path === 'string' && s.path.length > 0));
  assert.ok(sources.some((s) => s.path === 'package.json' && s.entity === 'release_state'));
  assert.ok(!sources.some((s) => s.entity === 'recent_changes'));
});

test('determinism: two compilations are deepEqual with the same fingerprint', () => {
  const a = compile();
  const b = compile();
  assert.deepEqual(a, b);
  assert.equal(a.fingerprint.value, b.fingerprint.value);
});

test('determinism is independent of the snapshot array order', () => {
  const base = makeSnapshot();
  const reordered = makeSnapshot({
    decisions: [...base.decisions].reverse(),
    open_bugs: [...base.open_bugs].reverse(),
    recent_changes: [...base.recent_changes].reverse(),
  });
  assert.deepEqual(compileBrainManifest(reordered, { engineVersion: ENGINE_VERSION }), compile());
});

test('fingerprint in the manifest matches the fingerprint module', () => {
  const manifest = compile();
  assert.equal(computeBrainFingerprint(buildBrainFingerprintPayload(manifest)).value, manifest.fingerprint.value);
});

test('generated_at appears only when explicitly supplied — the compiler never reads the clock', () => {
  assert.equal('generated_at' in compile(), false);
  assert.equal(compile({}, { generatedAt: '2026-09-26T00:00:00.000Z' }).generated_at, '2026-09-26T00:00:00.000Z');
});

test('the compiler does not mutate its input snapshot', () => {
  const snapshot = makeSnapshot();
  const before = JSON.stringify(snapshot);
  compileBrainManifest(snapshot, { engineVersion: ENGINE_VERSION });
  assert.equal(JSON.stringify(snapshot), before);
});

test('accepts a frozen snapshot and returns a frozen manifest', () => {
  const manifest = compileBrainManifest(Object.freeze(makeSnapshot()), { engineVersion: ENGINE_VERSION });
  assert.ok(Object.isFrozen(manifest));
  assert.ok(Object.isFrozen(manifest.entities));
});

test('engineVersion is required', () => {
  assert.throws(() => compileBrainManifest(makeSnapshot(), {}), /engineVersion/);
  assert.throws(() => compileBrainManifest(makeSnapshot()), /engineVersion/);
  assert.throws(() => compileBrainManifest(makeSnapshot(), { engineVersion: '' }), /engineVersion/);
});

test('rejects a non-snapshot input instead of guessing', () => {
  for (const bad of [null, undefined, 'x', {}, { git: {} }]) {
    assert.throws(() => compileBrainManifest(bad, { engineVersion: ENGINE_VERSION }), /snapshot/i);
  }
});

test('degraded snapshot (no Docs, no git) still compiles to a valid manifest', () => {
  const manifest = compile({
    git: { available: false, repository: false, branch: null, head: null },
    ddae: { available: false, docs_root: null, sessions_root: null, sessions: [], current_session: null },
    current_session: null,
    decisions: [],
    risks: [],
    open_bugs: [],
    recent_changes: [],
    current_tasks: [],
    release_state: { version: null, latest_tag: null },
  });
  assert.deepEqual(validateBrainManifest(manifest), { valid: true, errors: [] });
  assert.deepEqual(manifest.git, { available: false, head: null });
  assert.deepEqual(manifest.sources, []);
});

test('no absolute machine path leaks into the manifest', () => {
  const text = JSON.stringify(compile());
  assert.ok(!/[A-Za-z]:[\\/]/.test(text));
  assert.ok(!text.includes('\\'));
});

// Code only: comments may legitimately name the modules they must not use.
const readCode = (...segments) => fs.readFileSync(path.join(REPO_ROOT, ...segments), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

test('the compiler performs no I/O: no fs/child_process/network/collector imports, no clock or randomness', () => {
  const forbidden = ['node:fs', 'node:child_process', 'node:http', 'node:https', 'node:net', 'fetch(', 'Date.now', 'new Date', 'Math.random', 'randomUUID'];
  const compilerSource = readCode('src', 'workspace', 'compiler.js');
  for (const token of [...forbidden, 'collectDdaeContext', 'collectGitContext', 'discoverWorkspaceState']) {
    assert.ok(!compilerSource.includes(token), `compiler.js must not reference ${token}`);
  }
  for (const file of [['src', 'schemas', 'brain-schema.js'], ['src', 'workspace', 'fingerprint.js']]) {
    const text = readCode(...file);
    for (const token of forbidden) {
      assert.ok(!text.includes(token), `${file.join('/')} must not reference ${token}`);
    }
  }
});

test('the Brain modules never mention memory providers or Claude-Mem in runtime code', () => {
  for (const file of [['src', 'schemas', 'brain-schema.js'], ['src', 'workspace', 'fingerprint.js'], ['src', 'workspace', 'compiler.js']]) {
    const text = fs.readFileSync(path.join(REPO_ROOT, ...file), 'utf8').toLowerCase();
    assert.ok(!text.includes('claude-mem') && !text.includes('memoryprovider'), file.join('/'));
  }
});

test('integration: discovery → compiler on a real temp project writes nothing and leaks no path', () => {
  const dir = makeTempDir();
  try {
    fs.mkdirSync(path.join(dir, 'Docs', '05_sessions', 'session_01_demo'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'demo', version: '3.1.4' }));
    const list = () => fs.readdirSync(dir, { recursive: true }).sort();
    const before = list();
    const a = compileBrainManifest(discoverWorkspaceState(dir), { engineVersion: ENGINE_VERSION });
    const b = compileBrainManifest(discoverWorkspaceState(dir), { engineVersion: ENGINE_VERSION });
    assert.deepEqual(list(), before);
    assert.ok(!fs.existsSync(path.join(dir, '.ddae')));
    assert.deepEqual(a, b);
    assert.deepEqual(validateBrainManifest(a), { valid: true, errors: [] });
    assert.equal(a.project.name, path.basename(dir));
    assert.equal(a.entities.release_state.find((r) => r.id === 'package_version').summary, '3.1.4');
    assert.ok(!JSON.stringify(a).includes(dir.split(path.sep).join('/')));
  } finally {
    cleanup(dir);
  }
});

test('integration: the DDAE self-host compiles to a valid, deterministic manifest', () => {
  const engineVersion = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version;
  const a = compileBrainManifest(discoverWorkspaceState(REPO_ROOT), { engineVersion });
  const b = compileBrainManifest(discoverWorkspaceState(REPO_ROOT), { engineVersion });
  assert.deepEqual(validateBrainManifest(a), { valid: true, errors: [] });
  assert.deepEqual(a, b);
  assert.ok(a.ddae.sessions.length >= 3);
});
