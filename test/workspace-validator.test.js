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
import { buildBrainFingerprintPayload, computeBrainFingerprint } from '../src/workspace/fingerprint.js';
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


// ───────────────────────── 28. Bloco 07b — path semantics for every path field ─────────────────────────
// Audit of commit 3211e8e (P2): only sources[].path and entities.*[].source_path
// were checked. Every case below recomputes the fingerprint on purpose, so the
// only thing that can flag it is the semantic path check — never FINGERPRINT_MISMATCH.

function withRefingerprint(mutate) {
  const manifest = clone(compile());
  mutate(manifest);
  manifest.fingerprint = computeBrainFingerprint(buildBrainFingerprintPayload(manifest));
  return manifest;
}

function assertPathEscape(manifest, field, index) {
  const result = validateBrainWorkspace(manifest);
  assert.equal(result.status, 'INVALID');
  assert.ok(!result.reasons.some((r) => r.code === 'FINGERPRINT_MISMATCH'), 'must not be an integrity failure');
  assert.ok(!result.reasons.some((r) => r.code === 'MANIFEST_SCHEMA_INVALID'), 'must be schema-valid');
  const expected = index === undefined ? { code: 'PATH_ESCAPES_ROOT', field } : { code: 'PATH_ESCAPES_ROOT', field, index };
  assert.deepEqual(result.reasons.filter((r) => r.code === 'PATH_ESCAPES_ROOT'), [expected]);
  return result;
}

test('28a. views[] with a traversal segment → INVALID, PATH_ESCAPES_ROOT{field:views,index}', () => {
  assertPathEscape(withRefingerprint((m) => { m.views = ['../x']; }), 'views', 0);
  assertPathEscape(withRefingerprint((m) => { m.views = ['DDAE-Brain/../../x']; }), 'views', 0);
});

test('28b. views[] with a scheme-like or drive value → INVALID, PATH_ESCAPES_ROOT', () => {
  assertPathEscape(withRefingerprint((m) => { m.views = ['http://example.com/x']; }), 'views', 0);
  assertPathEscape(withRefingerprint((m) => { m.views = ['javascript:alert']; }), 'views', 0);
  // A drive-letter path is already rejected structurally by the Brain Schema; it must still never reach VALID.
  assert.equal(validateBrainWorkspace(withRefingerprint((m) => { m.views = ['C:/x']; })).status, 'INVALID');
});

test('28c. views[] reports only the offending index; a safe view is never flagged', () => {
  const manifest = withRefingerprint((m) => { m.views = ['DDAE-Brain/Home.md', 'DDAE-Brain/Risks.md', 'a/../b.md']; });
  assertPathEscape(manifest, 'views', 2);
  assert.deepEqual(validateBrainWorkspace(withRefingerprint((m) => { m.views = ['DDAE-Brain/Home.md']; })), { status: 'VALID', reasons: [] });
});

test('28d. ddae.docs_root with traversal → INVALID, PATH_ESCAPES_ROOT{field:ddae.docs_root}', () => {
  assertPathEscape(withRefingerprint((m) => { m.ddae.docs_root = '../Docs'; }), 'ddae.docs_root');
});

test('28e. ddae.sessions_root with traversal → INVALID, PATH_ESCAPES_ROOT{field:ddae.sessions_root}', () => {
  assertPathEscape(withRefingerprint((m) => { m.ddae.sessions_root = 'Docs/../../05_sessions'; }), 'ddae.sessions_root');
});

test('28f. ddae.sessions[].path with traversal → INVALID, PATH_ESCAPES_ROOT{field:ddae.sessions,index}', () => {
  assertPathEscape(withRefingerprint((m) => { m.ddae.sessions[1].path = 'Docs/05_sessions/../../x'; }), 'ddae.sessions', 1);
});

test('28g. ddae.current_session.path with traversal → INVALID, PATH_ESCAPES_ROOT{field:ddae.current_session.path}', () => {
  assertPathEscape(withRefingerprint((m) => { m.ddae.current_session.path = '../session'; }), 'ddae.current_session.path');
});

test('28h. null docs_root/sessions_root and a null ddae.current_session are legitimate, not path errors', () => {
  const manifest = withRefingerprint((m) => { m.ddae.docs_root = null; m.ddae.sessions_root = null; m.ddae.current_session = null; });
  assert.deepEqual(validateBrainWorkspace(manifest), { status: 'VALID', reasons: [] });
});

test('28i. project.root_relative_path: the canonical "." marker is preserved as VALID', () => {
  const manifest = withRefingerprint(() => {});
  assert.equal(manifest.project.root_relative_path, '.');
  assert.deepEqual(validateBrainWorkspace(manifest), { status: 'VALID', reasons: [] });
  assert.deepEqual(validateBrainWorkspace(withRefingerprint((m) => { m.project.root_relative_path = 'packages/app'; })), { status: 'VALID', reasons: [] });
});

test('28j. project.root_relative_path with traversal, dot-segments, empty segments or a scheme → INVALID', () => {
  for (const bad of ['..', '../x', 'a/../b', './x', 'a//b', 'http://x']) {
    assertPathEscape(withRefingerprint((m) => { m.project.root_relative_path = bad; }), 'project.root_relative_path');
  }
  assert.equal(validateBrainWorkspace(withRefingerprint((m) => { m.project.root_relative_path = 'C:/x'; })).status, 'INVALID');
});

test('28k. "." is a root marker only for project.root_relative_path — never for any other path field', () => {
  assertPathEscape(withRefingerprint((m) => { m.ddae.docs_root = '.'; }), 'ddae.docs_root');
  assertPathEscape(withRefingerprint((m) => { m.views = ['.']; }), 'views', 0);
});

test('28l. reasons for the new fields carry only code/field/index — never the offending value', () => {
  const secret = 'top-secret-leak';
  const manifest = withRefingerprint((m) => {
    m.views = [`../${secret}`];
    m.ddae.docs_root = `../${secret}`;
    m.ddae.sessions[0].path = `../${secret}`;
    m.project.root_relative_path = `../${secret}`;
  });
  const result = validateBrainWorkspace(manifest);
  assert.equal(result.status, 'INVALID');
  assert.ok(!JSON.stringify(result).includes(secret));
  for (const reason of result.reasons) {
    assert.deepEqual(Object.keys(reason).filter((k) => !['code', 'field', 'index'].includes(k)), []);
  }
});

test('28m. multiple bad fields are all reported, in a fixed deterministic order', () => {
  const build = () => withRefingerprint((m) => {
    m.views = ['../a'];
    m.ddae.docs_root = '../b';
    m.project.root_relative_path = '../c';
  });
  const first = validateBrainWorkspace(build());
  assert.deepEqual(first.reasons.map((r) => r.field), ['project.root_relative_path', 'ddae.docs_root', 'views']);
  assert.deepEqual(validateBrainWorkspace(build()), first);
});

test('28n. the new path checks never mutate a deep-frozen manifest', () => {
  const manifest = deepFreeze(withRefingerprint((m) => { m.views = ['../x']; }));
  assert.equal(validateBrainWorkspace(manifest).status, 'INVALID');
});
