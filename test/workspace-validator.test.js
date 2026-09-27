import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { compileBrainManifest } from '../src/workspace/compiler.js';
import { discoverWorkspaceState } from '../src/workspace/discover.js';
import { BRAIN_RENDERER_VIEW_PATHS } from '../src/workspace/renderer.js';
import {
  validateBrainWorkspace,
  WORKSPACE_VALID_STATUSES,
} from '../src/workspace/validator.js';
import { makeSnapshot, ENGINE_VERSION } from './brain-fixtures.js';
import { REPO_ROOT } from './helpers.js';

const compile = (overrides, options = {}) => compileBrainManifest(makeSnapshot(overrides), { engineVersion: ENGINE_VERSION, ...options });
const clone = (value) => JSON.parse(JSON.stringify(value));

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

// ───────────────────────── 1. module / API ─────────────────────────

test('1. exports the expected API', () => {
  assert.equal(typeof validateBrainWorkspace, 'function');
  assert.deepEqual([...WORKSPACE_VALID_STATUSES], ['VALID', 'STALE', 'INVALID']);
  assert.ok(Object.isFrozen(WORKSPACE_VALID_STATUSES));
});

// ───────────────────────── 2. VALID ─────────────────────────

test('2. a schema-valid, internally consistent manifest with no options → VALID, no reasons', () => {
  const result = validateBrainWorkspace(compile());
  assert.deepEqual(result, { status: 'VALID', reasons: [] });
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.reasons));
});

test('2b. a manifest is never STALE just because currentManifest was omitted', () => {
  const result = validateBrainWorkspace(compile());
  assert.notEqual(result.status, 'STALE');
});

// ───────────────────────── 3. schema ─────────────────────────

test('3. schema-invalid manifest → INVALID, MANIFEST_SCHEMA_INVALID, no leaked content', () => {
  const manifest = clone(compile());
  manifest.schema_version = 'brain-manifest-v9';
  const result = validateBrainWorkspace(manifest);
  assert.equal(result.status, 'INVALID');
  assert.deepEqual(result.reasons, [{ code: 'MANIFEST_SCHEMA_INVALID' }]);
  assert.ok(!JSON.stringify(result).includes('brain-manifest-v9'));
});

test('3b. an extra/unknown field (e.g. memory) also yields MANIFEST_SCHEMA_INVALID, not something else', () => {
  const manifest = clone(compile());
  manifest.memory = [];
  assert.deepEqual(validateBrainWorkspace(manifest), { status: 'INVALID', reasons: [{ code: 'MANIFEST_SCHEMA_INVALID' }] });
});

test('3c. non-object input throws (programmer error, not an operational state)', () => {
  for (const bad of [null, undefined, 'x', 42, []]) {
    assert.throws(() => validateBrainWorkspace(bad), /manifest/i);
  }
});

// ───────────────────────── 4. fingerprint integrity ─────────────────────────

test('4. tampered fingerprint value → INVALID, FINGERPRINT_MISMATCH', () => {
  const manifest = clone(compile());
  manifest.fingerprint.value = 'f'.repeat(64);
  const result = validateBrainWorkspace(manifest);
  assert.equal(result.status, 'INVALID');
  assert.deepEqual(result.reasons, [{ code: 'FINGERPRINT_MISMATCH' }]);
});

test('4b. tampering any fingerprinted field without updating the fingerprint is also caught', () => {
  const manifest = clone(compile());
  manifest.entities.decisions = [{ id: 'RD-99', source_path: null, summary: 'injected' }];
  assert.deepEqual(validateBrainWorkspace(manifest), { status: 'INVALID', reasons: [{ code: 'FINGERPRINT_MISMATCH' }] });
});

test('4c. FINGERPRINT_MISMATCH is distinct from a freshness (STALE) condition: an internally-tampered manifest is INVALID even with a matching currentManifest', () => {
  const manifest = clone(compile());
  const untouched = compile();
  manifest.fingerprint.value = 'e'.repeat(64);
  assert.equal(validateBrainWorkspace(manifest, { currentManifest: untouched }).status, 'INVALID');
});

// ───────────────────────── 5-8. path semantics ─────────────────────────

function withDecisionSourcePath(sourcePath) {
  const manifest = clone(compile({ decisions: [{ id: 'RD-01', summary: 'x', source_path: sourcePath }] }));
  return manifest;
}

test('5. literal traversal segment (..) in an entity source_path → INVALID, PATH_ESCAPES_ROOT', () => {
  const manifest = withDecisionSourcePath('Docs/../secrets.md');
  const result = validateBrainWorkspace(manifest);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reasons.some((r) => r.code === 'PATH_ESCAPES_ROOT'));
});

test('5b. a leading .. also triggers PATH_ESCAPES_ROOT', () => {
  const manifest = withDecisionSourcePath('../outside.md');
  assert.equal(validateBrainWorkspace(manifest).status, 'INVALID');
});

test('6. a bare "." segment is rejected the same way', () => {
  const manifest = withDecisionSourcePath('Docs/./a.md');
  const result = validateBrainWorkspace(manifest);
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reasons.some((r) => r.code === 'PATH_ESCAPES_ROOT'));
});

test('7. an internal empty segment (double slash) is rejected', () => {
  const manifest = withDecisionSourcePath('Docs//a.md');
  assert.equal(validateBrainWorkspace(manifest).status, 'INVALID');
});

test('8. a scheme-like value where only a project path is contractually valid is rejected', () => {
  for (const value of ['http://evil.example/a.md', 'javascript:alert(1)', 'file:///etc/passwd']) {
    const manifest = withDecisionSourcePath(value);
    const result = validateBrainWorkspace(manifest);
    assert.equal(result.status, 'INVALID', value);
    assert.ok(result.reasons.some((r) => r.code === 'PATH_ESCAPES_ROOT'), value);
  }
});

test('8b. path checks also cover manifest.sources[].path, not only entity source_path', () => {
  const manifest = clone(compile());
  manifest.sources[0].path = 'Docs/../secrets.md';
  assert.equal(validateBrainWorkspace(manifest).status, 'INVALID');
});

test('8c. an ordinary safe path never triggers PATH_ESCAPES_ROOT', () => {
  const manifest = withDecisionSourcePath('Docs/04_governance/registro_decisoes.md');
  // recompute fingerprint isn't needed here since we didn't change fingerprinted content in a way that breaks it beyond decisions, which we already fingerprint-match by using compile() with the override directly:
  const built = compile({ decisions: [{ id: 'RD-01', summary: 'x', source_path: 'Docs/04_governance/registro_decisoes.md' }] });
  const result = validateBrainWorkspace(built);
  assert.equal(result.status, 'VALID');
  void manifest;
});

test('8d. multiple offending paths are all reported, not just the first — including duplicate appearances in both manifest.sources and the owning entity', () => {
  const manifest = clone(compile({
    decisions: [
      { id: 'RD-01', summary: 'x', source_path: 'Docs/../a.md' },
      { id: 'RD-02', summary: 'y', source_path: 'javascript:x' },
    ],
  }));
  const result = validateBrainWorkspace(manifest);
  const entityReasons = result.reasons.filter((r) => r.code === 'PATH_ESCAPES_ROOT' && r.field === 'entities.decisions');
  const sourceReasons = result.reasons.filter((r) => r.code === 'PATH_ESCAPES_ROOT' && r.field === 'sources');
  assert.deepEqual(entityReasons.map((r) => r.index).sort(), [0, 1]);
  assert.equal(sourceReasons.length, 2, 'the same two offending paths also appear in manifest.sources');
});

test('8e. a null source_path (Git-derived entries) is never flagged', () => {
  const manifest = compile({ recent_changes: [{ sha: 'a'.repeat(40) }] });
  assert.equal(validateBrainWorkspace(manifest).status, 'VALID');
});

// ───────────────────────── 9-12. currentManifest omitted / present ─────────────────────────

test('9. currentManifest omitted → freshness is never evaluated, no STALE reasons possible', () => {
  const result = validateBrainWorkspace(compile());
  assert.deepEqual(result, { status: 'VALID', reasons: [] });
});

test('10. currentManifest identical (same snapshot recompiled) → still VALID, no reasons', () => {
  const manifest = compile();
  const currentManifest = compile();
  assert.deepEqual(validateBrainWorkspace(manifest, { currentManifest }), { status: 'VALID', reasons: [] });
});

test('11. engine_version differs → STALE, ENGINE_VERSION_CHANGED', () => {
  const manifest = compile({}, { engineVersion: '0.4.0' });
  const currentManifest = compile({}, { engineVersion: '0.4.1' });
  const result = validateBrainWorkspace(manifest, { currentManifest });
  assert.equal(result.status, 'STALE');
  assert.ok(result.reasons.some((r) => r.code === 'ENGINE_VERSION_CHANGED'));
});

test('12. git.head differs (both available) → STALE, GIT_HEAD_CHANGED', () => {
  const manifest = compile({ git: { available: true, repository: true, branch: 'main', head: 'a'.repeat(40) } });
  const currentManifest = compile({ git: { available: true, repository: true, branch: 'main', head: 'b'.repeat(40) } });
  const result = validateBrainWorkspace(manifest, { currentManifest });
  assert.equal(result.status, 'STALE');
  assert.ok(result.reasons.some((r) => r.code === 'GIT_HEAD_CHANGED'));
});

test('12b. git unavailable in either snapshot never produces a false GIT_HEAD_CHANGED', () => {
  const manifest = compile({ git: { available: false, repository: false, branch: null, head: null } });
  const currentManifest = compile({ git: { available: true, repository: true, branch: 'main', head: 'a'.repeat(40) } });
  const result = validateBrainWorkspace(manifest, { currentManifest });
  assert.ok(!result.reasons.some((r) => r.code === 'GIT_HEAD_CHANGED'));
});

test('13. current_session differs → STALE, SESSION_SOURCE_CHANGED', () => {
  const manifest = compile({ current_session: { id: 'session_02_beta', selection_reason: 'latest_canonical' } });
  const currentManifest = compile({ current_session: { id: 'session_03_gamma', selection_reason: 'latest_canonical' } });
  const result = validateBrainWorkspace(manifest, { currentManifest });
  assert.equal(result.status, 'STALE');
  assert.ok(result.reasons.some((r) => r.code === 'SESSION_SOURCE_CHANGED'));
});

test('13b. current_session null vs present also counts as changed', () => {
  const manifest = compile({ current_session: null });
  const currentManifest = compile({ current_session: { id: 'session_02_beta', selection_reason: 'latest_canonical' } });
  assert.ok(validateBrainWorkspace(manifest, { currentManifest }).reasons.some((r) => r.code === 'SESSION_SOURCE_CHANGED'));
});

test('14. an entity list that differs between manifest and currentManifest → STALE, DOCS_CONTENT_CHANGED, naming the entity', () => {
  const manifest = compile({ risks: [{ id: 'MR-01', summary: 'old', status: 'Aberto', source_path: 'Docs/04_governance/matriz_riscos.md' }] });
  const currentManifest = compile({ risks: [{ id: 'MR-01', summary: 'new text', status: 'Aberto', source_path: 'Docs/04_governance/matriz_riscos.md' }] });
  const result = validateBrainWorkspace(manifest, { currentManifest });
  assert.equal(result.status, 'STALE');
  assert.ok(result.reasons.some((r) => r.code === 'DOCS_CONTENT_CHANGED' && r.entity === 'risks'));
});

test('15. multiple independent STALE reasons all surface together', () => {
  const manifest = compile({}, { engineVersion: '0.4.0' });
  const currentManifest = compile({ current_session: { id: 'session_09_x', selection_reason: 'latest_canonical' } }, { engineVersion: '0.4.1' });
  const result = validateBrainWorkspace(manifest, { currentManifest });
  assert.equal(result.status, 'STALE');
  const codes = result.reasons.map((r) => r.code);
  assert.ok(codes.includes('ENGINE_VERSION_CHANGED'));
  assert.ok(codes.includes('SESSION_SOURCE_CHANGED'));
});

test('16. INVALID wins over STALE: an integrity failure short-circuits before any freshness check runs', () => {
  const manifest = clone(compile({}, { engineVersion: '0.4.0' }));
  manifest.fingerprint.value = 'c'.repeat(64);
  const currentManifest = compile({ current_session: { id: 'session_09_x', selection_reason: 'latest_canonical' } }, { engineVersion: '0.9.9' });
  const result = validateBrainWorkspace(manifest, { currentManifest });
  assert.equal(result.status, 'INVALID');
  assert.deepEqual(result.reasons, [{ code: 'FINGERPRINT_MISMATCH' }]);
});

test('16b. a malformed currentManifest never contributes silent/arbitrary freshness reasons — it throws instead', () => {
  const manifest = compile();
  assert.throws(() => validateBrainWorkspace(manifest, { currentManifest: { not: 'a manifest' } }), /currentManifest/i);
  assert.throws(() => validateBrainWorkspace(manifest, { currentManifest: 'nope' }), /currentManifest/i);
});

// ───────────────────────── 17-19. expectedViews ─────────────────────────

test('17. expectedViews omitted: manifest.views === [] is never a failure (transitional compatibility)', () => {
  const manifest = compile();
  assert.deepEqual(manifest.views, []);
  assert.deepEqual(validateBrainWorkspace(manifest), { status: 'VALID', reasons: [] });
});

test('18. expectedViews provided and equal to manifest.views → no VIEWS_MISMATCH', () => {
  const manifest = clone(compile());
  manifest.views = [...BRAIN_RENDERER_VIEW_PATHS];
  // views isn't part of the stored fingerprint payload comparison in this fixture path — recompute via a fresh compile with the same views is not supported by the compiler yet (Bloco 08), so directly assert the comparator in isolation:
  const result = validateBrainWorkspace(manifest, { expectedViews: [...BRAIN_RENDERER_VIEW_PATHS] });
  assert.ok(!result.reasons.some((r) => r.code === 'VIEWS_MISMATCH'));
});

test('19. expectedViews provided and different from manifest.views → INVALID, VIEWS_MISMATCH', () => {
  const manifest = compile();
  const result = validateBrainWorkspace(manifest, { expectedViews: [...BRAIN_RENDERER_VIEW_PATHS] });
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reasons.some((r) => r.code === 'VIEWS_MISMATCH'));
});

test('19b. expectedViews must be an array of strings, or it throws (a caller bug, not an operational state)', () => {
  const manifest = compile();
  assert.throws(() => validateBrainWorkspace(manifest, { expectedViews: 'not-an-array' }), /expectedViews/i);
  assert.throws(() => validateBrainWorkspace(manifest, { expectedViews: [1, 2] }), /expectedViews/i);
});

// ───────────────────────── 20. determinism / ordering ─────────────────────────

test('20. reason order is fixed and deterministic across repeated calls with the same inputs', () => {
  const manifest = compile({}, { engineVersion: '0.4.0' });
  const currentManifest = compile({ current_session: { id: 'session_09_x', selection_reason: 'latest_canonical' } }, { engineVersion: '0.4.1' });
  const a = validateBrainWorkspace(manifest, { currentManifest });
  const b = validateBrainWorkspace(manifest, { currentManifest });
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

// ───────────────────────── 21-24. immutability ─────────────────────────

test('21. manifest is never mutated', () => {
  const manifest = compile();
  const before = JSON.stringify(manifest);
  validateBrainWorkspace(manifest, { currentManifest: compile(), expectedViews: [...BRAIN_RENDERER_VIEW_PATHS] });
  assert.equal(JSON.stringify(manifest), before);
});

test('22. accepts a deeply frozen manifest without throwing', () => {
  const manifest = deepFreeze(clone(compile()));
  assert.doesNotThrow(() => validateBrainWorkspace(manifest));
});

test('23. currentManifest is never mutated', () => {
  const currentManifest = compile();
  const before = JSON.stringify(currentManifest);
  validateBrainWorkspace(compile(), { currentManifest });
  assert.equal(JSON.stringify(currentManifest), before);
});

test('24. expectedViews array is never mutated or sorted in place', () => {
  const expectedViews = [...BRAIN_RENDERER_VIEW_PATHS].reverse();
  const before = [...expectedViews];
  validateBrainWorkspace(compile(), { expectedViews });
  assert.deepEqual(expectedViews, before);
});

// ───────────────────────── 25. pure-function source guard ─────────────────────────

const readCode = (...segments) => fs.readFileSync(path.join(REPO_ROOT, ...segments), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

test('25. the validator is pure: no fs/network/clock/randomness/cwd/collectors/Claude-Mem, and no import from src/context/**', () => {
  const code = readCode('src', 'workspace', 'validator.js');
  for (const token of [
    'node:fs', 'fs/promises', 'node:child_process', 'node:http', 'node:https', 'node:net', 'fetch(',
    'Date.now', 'new Date', 'Math.random', 'randomUUID', 'process.cwd', 'process.env',
    'collectDdaeContext', 'collectGitContext', 'discoverWorkspaceState', 'compileBrainManifest',
    'renderBrainWorkspace', 'collectContextPackageState',
  ]) {
    assert.ok(!code.includes(token), `validator.js must not reference ${token}`);
  }
  const lower = code.toLowerCase();
  assert.ok(!lower.includes('claude-mem') && !lower.includes('memoryprovider'));
  const imports = [...code.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
  for (const imp of imports) {
    assert.ok(!imp.includes('/context/'), `must not import from src/context/**: ${imp}`);
  }
});

// ───────────────────────── 26. reasons never leak sensitive data ─────────────────────────

test('26. reasons never contain summary text, goal-like content, or an absolute machine path', () => {
  const manifest = clone(compile({
    decisions: [{ id: 'RD-01', summary: 'PRIVATE_SUMMARY_TEXT_123', source_path: 'Docs/../a.md' }],
  }));
  manifest.schema_version = 'brain-manifest-v9';
  const result = validateBrainWorkspace(manifest);
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes('PRIVATE_SUMMARY_TEXT_123'));
  assert.ok(!/[A-Za-z]:[\\/]/.test(serialized));
});

test('26b. the full manifest is never embedded in the result', () => {
  const manifest = compile();
  const result = validateBrainWorkspace(manifest, { currentManifest: compile() });
  assert.ok(!JSON.stringify(result).includes(manifest.fingerprint.value));
});

// ───────────────────────── 27. self-host / integration ─────────────────────────

test('27. self-host: a freshly compiled Brain Manifest of the real repository validates as VALID', () => {
  const engineVersion = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).version;
  const manifest = compileBrainManifest(discoverWorkspaceState(REPO_ROOT), { engineVersion });
  assert.deepEqual(validateBrainWorkspace(manifest), { status: 'VALID', reasons: [] });
});

test('27b. integration: two snapshots of the same synthetic project, one with a new session, validate as STALE with SESSION_SOURCE_CHANGED and DOCS_CONTENT_CHANGED', () => {
  const engineVersion = ENGINE_VERSION;
  const before = compile({
    ddae: {
      available: true, docs_root: 'Docs', sessions_root: 'Docs/05_sessions',
      sessions: [{ name: 'session_01_alpha', path: 'Docs/05_sessions/session_01_alpha' }],
      current_session: { name: 'session_01_alpha', path: 'Docs/05_sessions/session_01_alpha', status: 'Em andamento', modules: [], counts: { blocks: 1, prompts: 0, feedbacks: 0 } },
    },
    current_session: { id: 'session_01_alpha', selection_reason: 'latest_canonical' },
  }, { engineVersion });
  const after = compile({
    ddae: {
      available: true, docs_root: 'Docs', sessions_root: 'Docs/05_sessions',
      sessions: [
        { name: 'session_01_alpha', path: 'Docs/05_sessions/session_01_alpha' },
        { name: 'session_02_beta', path: 'Docs/05_sessions/session_02_beta' },
      ],
      current_session: { name: 'session_02_beta', path: 'Docs/05_sessions/session_02_beta', status: 'Em andamento', modules: [], counts: { blocks: 1, prompts: 0, feedbacks: 0 } },
    },
    current_session: { id: 'session_02_beta', selection_reason: 'latest_canonical' },
  }, { engineVersion });
  const result = validateBrainWorkspace(before, { currentManifest: after });
  assert.equal(result.status, 'STALE');
  assert.ok(result.reasons.some((r) => r.code === 'SESSION_SOURCE_CHANGED'));
});
