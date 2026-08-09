import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSource } from '../src/context/authority.js';
import { compileContext } from '../src/context/compiler.js';
import { renderContextMarkdown } from '../src/context/renderer.js';
import { validateContextState } from '../src/context/validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALIDATOR_FILE = path.join(__dirname, '..', 'src', 'context', 'validator.js');

function gitFixture(overrides = {}) {
  return { available: true, repository: true, branch: 'main', head: 'a'.repeat(40), working_tree: 'clean', ...overrides };
}

function ddaeFixture(overrides = {}) {
  return {
    available: true,
    sessions: [{ name: 'session_02_context_compiler_0_3_0' }],
    current_session: { name: 'session_02_context_compiler_0_3_0', path: 'Docs/05_sessions/session_02_context_compiler_0_3_0' },
    selection: { requested: null, selected: 'session_02_context_compiler_0_3_0', reason: 'latest_canonical' },
    ...overrides,
  };
}

function buildPair({ gitContext = gitFixture(), ddaeContext = ddaeFixture(), candidates = [] } = {}) {
  const manifest = compileContext({
    engineVersion: '0.2.0',
    project: { name: 'DDAE Engine', root_kind: 'ddae' },
    goal: 'audit users',
    gitContext,
    ddaeContext,
    candidates,
  });
  const contextMarkdown = renderContextMarkdown(manifest);
  return { manifest, contextMarkdown };
}

// 1. valid manifest/context -> VALID
test('1. a fresh, unmodified manifest/context pair is VALID', () => {
  const { manifest, contextMarkdown } = buildPair();
  const result = validateContextState({ manifest, contextMarkdown, currentGitContext: gitFixture(), currentDdaeContext: ddaeFixture() });
  assert.equal(result.status, 'VALID');
  assert.deepEqual(result.reasons, []);
});

// 2. malformed/invalid manifest -> INVALID
test('2. a manifest missing the schema_version entirely is INVALID (caught as SCHEMA_VERSION_MISMATCH)', () => {
  const result = validateContextState({ manifest: { not: 'a manifest' } });
  assert.equal(result.status, 'INVALID');
  assert.equal(result.reasons[0].code, 'SCHEMA_VERSION_MISMATCH');
});

test('2c. a manifest with the right schema_version but otherwise malformed is INVALID with MANIFEST_INVALID', () => {
  const result = validateContextState({ manifest: { schema_version: '1', not: 'a real manifest' } });
  assert.equal(result.status, 'INVALID');
  assert.equal(result.reasons[0].code, 'MANIFEST_INVALID');
});

test('2b. a missing manifest is INVALID', () => {
  const result = validateContextState({ manifest: null });
  assert.equal(result.status, 'INVALID');
  assert.equal(result.reasons[0].code, 'MANIFEST_INVALID');
});

// 3. schema mismatch -> INVALID
test('3. an unknown schema_version is INVALID with SCHEMA_VERSION_MISMATCH', () => {
  const { manifest } = buildPair();
  const tampered = { ...manifest, schema_version: '999' };
  const result = validateContextState({ manifest: tampered });
  assert.equal(result.status, 'INVALID');
  assert.equal(result.reasons[0].code, 'SCHEMA_VERSION_MISMATCH');
});

// 4. goal hash mismatch -> INVALID
test('4. a tampered goal.hash is INVALID with GOAL_HASH_CHANGED', () => {
  const { manifest, contextMarkdown } = buildPair();
  const tampered = { ...manifest, goal: { ...manifest.goal, hash: `sha256:${'0'.repeat(64)}` } };
  const result = validateContextState({ manifest: tampered, contextMarkdown });
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reasons.some((r) => r.code === 'GOAL_HASH_CHANGED'));
});

// 5. fingerprint mismatch -> INVALID
test('5. a tampered fingerprint is INVALID with FINGERPRINT_MISMATCH', () => {
  const { manifest, contextMarkdown } = buildPair();
  const tampered = { ...manifest, fingerprint: { algorithm: 'sha256', value: '0'.repeat(64) } };
  const result = validateContextState({ manifest: tampered, contextMarkdown });
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reasons.some((r) => r.code === 'FINGERPRINT_MISMATCH'));
});

// 6. CONTEXT.md mismatch -> INVALID
test('6. a CONTEXT.md that does not match the Renderer output is INVALID', () => {
  const { manifest } = buildPair();
  const result = validateContextState({ manifest, contextMarkdown: '# Tampered\n' });
  assert.equal(result.status, 'INVALID');
  assert.ok(result.reasons.some((r) => r.code === 'CONTEXT_MARKDOWN_MISMATCH'));
});

// 7. same Git HEAD -> VALID
test('7. an unchanged Git HEAD keeps the package VALID', () => {
  const head = 'b'.repeat(40);
  const { manifest, contextMarkdown } = buildPair({ gitContext: gitFixture({ head }) });
  const result = validateContextState({ manifest, contextMarkdown, currentGitContext: gitFixture({ head }), currentDdaeContext: ddaeFixture() });
  assert.equal(result.status, 'VALID');
});

// 8. changed Git HEAD -> STALE
test('8. a changed Git HEAD makes the package STALE', () => {
  const { manifest, contextMarkdown } = buildPair({ gitContext: gitFixture({ head: 'b'.repeat(40) }) });
  const result = validateContextState({ manifest, contextMarkdown, currentGitContext: gitFixture({ head: 'c'.repeat(40) }), currentDdaeContext: ddaeFixture() });
  assert.equal(result.status, 'STALE');
  assert.ok(result.reasons.some((r) => r.code === 'GIT_HEAD_CHANGED'));
});

// 9. Git unavailable consistently -> not automatically invalid
test('9. Git unavailable in both the manifest and the current snapshot never causes STALE/INVALID by itself', () => {
  const { manifest, contextMarkdown } = buildPair({ gitContext: { available: false, repository: false, branch: null, head: null, working_tree: null } });
  const result = validateContextState({ manifest, contextMarkdown, currentGitContext: { available: false, repository: false, branch: null, head: null, working_tree: null }, currentDdaeContext: ddaeFixture() });
  assert.equal(result.status, 'VALID');
});

// 10. session unchanged -> VALID
test('10. an unchanged session keeps the package VALID', () => {
  const { manifest, contextMarkdown } = buildPair();
  const result = validateContextState({ manifest, contextMarkdown, currentGitContext: gitFixture(), currentDdaeContext: ddaeFixture() });
  assert.equal(result.status, 'VALID');
});

// 11. session changed/missing -> STALE
test('11a. a session that no longer exists makes the package STALE', () => {
  const { manifest, contextMarkdown } = buildPair();
  const result = validateContextState({
    manifest,
    contextMarkdown,
    currentGitContext: gitFixture(),
    currentDdaeContext: ddaeFixture({ sessions: [], current_session: null, selection: { requested: null, selected: null, reason: 'none' } }),
  });
  assert.equal(result.status, 'STALE');
  assert.ok(result.reasons.some((r) => r.code === 'SESSION_SOURCE_CHANGED'));
});

test('11b. a newer latest_canonical session supersedes the built one, making it STALE', () => {
  const { manifest, contextMarkdown } = buildPair();
  const result = validateContextState({
    manifest,
    contextMarkdown,
    currentGitContext: gitFixture(),
    currentDdaeContext: ddaeFixture({
      sessions: [{ name: 'session_02_context_compiler_0_3_0' }, { name: 'session_03_newer' }],
      current_session: { name: 'session_03_newer', path: 'Docs/05_sessions/session_03_newer' },
      selection: { requested: null, selected: 'session_03_newer', reason: 'latest_canonical' },
    }),
  });
  assert.equal(result.status, 'STALE');
  assert.ok(result.reasons.some((r) => r.code === 'SESSION_SOURCE_CHANGED'));
});

// 12. selected textual sources with no safe current hashes -> never false VALID
test('12. selected textual sources without currentSourceHashes are never falsely reported VALID', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'audit users content' });
  const { manifest, contextMarkdown } = buildPair({ candidates: [{ source, content: 'audit users content' }] });
  assert.ok(manifest.relevant_files.length > 0, 'fixture must actually select a relevant file');
  const result = validateContextState({ manifest, contextMarkdown, currentGitContext: gitFixture(), currentDdaeContext: ddaeFixture() });
  assert.equal(result.status, 'STALE');
  assert.ok(result.reasons.some((r) => r.code === 'SOURCE_FRESHNESS_UNVERIFIED'));
});

test('12b. selected textual sources with matching currentSourceHashes remain VALID', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'audit users content' });
  const { manifest, contextMarkdown } = buildPair({ candidates: [{ source, content: 'audit users content' }] });
  const currentSourceHashes = { [source.id]: source.content_hash };
  const result = validateContextState({ manifest, contextMarkdown, currentGitContext: gitFixture(), currentDdaeContext: ddaeFixture(), currentSourceHashes });
  assert.equal(result.status, 'VALID');
});

test('12c. a changed current source hash is reported STALE with SOURCE_CONTENT_CHANGED', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'audit users content' });
  const { manifest, contextMarkdown } = buildPair({ candidates: [{ source, content: 'audit users content' }] });
  const currentSourceHashes = { [source.id]: '0'.repeat(64) };
  const result = validateContextState({ manifest, contextMarkdown, currentGitContext: gitFixture(), currentDdaeContext: ddaeFixture(), currentSourceHashes });
  assert.equal(result.status, 'STALE');
  assert.ok(result.reasons.some((r) => r.code === 'SOURCE_CONTENT_CHANGED'));
});

// 13. deterministic reasons ordering
test('13. reasons are ordered deterministically (Git, then session, then source freshness)', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'audit users content' });
  const { manifest, contextMarkdown } = buildPair({ gitContext: gitFixture({ head: 'b'.repeat(40) }), candidates: [{ source, content: 'audit users content' }] });
  const result = validateContextState({
    manifest,
    contextMarkdown,
    currentGitContext: gitFixture({ head: 'c'.repeat(40) }),
    currentDdaeContext: ddaeFixture({ sessions: [], current_session: null, selection: { requested: null, selected: null, reason: 'none' } }),
  });
  assert.deepEqual(result.reasons.map((r) => r.code), ['GIT_HEAD_CHANGED', 'SESSION_SOURCE_CHANGED', 'SOURCE_FRESHNESS_UNVERIFIED']);
});

// 14. repeated validation deepEqual
test('14. repeated validation calls with the same input are deepEqual', () => {
  const { manifest, contextMarkdown } = buildPair();
  const input = { manifest, contextMarkdown, currentGitContext: gitFixture(), currentDdaeContext: ddaeFixture() };
  const a = validateContextState(input);
  const b = validateContextState(input);
  assert.deepEqual(a, b);
});

// 15-16. no writes, no network — structural check
test('15-17. validator.js performs no filesystem writes, no network access, and never reads source.path', () => {
  const source = fs.readFileSync(VALIDATOR_FILE, 'utf8');
  const code = source.replace(/\/\/.*$/gm, '');
  assert.ok(!/readFileSync|writeFileSync|readdirSync/.test(code));
  assert.ok(!/node:https?|node:net|node:dgram|\bfetch\(/.test(code));
  assert.ok(!/from ['"]node:fs['"]/.test(code));
  assert.ok(!/\.source\.path\)|fs\./.test(code));
});

// 18. input not mutated
test('18. validateContextState never mutates its input', () => {
  const { manifest, contextMarkdown } = buildPair();
  const currentGitContext = gitFixture();
  const currentDdaeContext = ddaeFixture();
  const beforeManifest = JSON.stringify(manifest);
  const beforeGit = JSON.stringify(currentGitContext);
  const beforeDdae = JSON.stringify(currentDdaeContext);
  validateContextState({ manifest, contextMarkdown, currentGitContext, currentDdaeContext });
  assert.equal(JSON.stringify(manifest), beforeManifest);
  assert.equal(JSON.stringify(currentGitContext), beforeGit);
  assert.equal(JSON.stringify(currentDdaeContext), beforeDdae);
});

// --- extra coverage ---------------------------------------------------

test('VALID_STATUSES exports exactly the three known statuses', async () => {
  const { VALID_STATUSES } = await import('../src/context/validator.js');
  assert.deepEqual([...VALID_STATUSES], ['VALID', 'STALE', 'INVALID']);
});

test('INVALID always takes priority over STALE (a tampered fingerprint with a changed HEAD is still INVALID)', () => {
  const { manifest, contextMarkdown } = buildPair({ gitContext: gitFixture({ head: 'b'.repeat(40) }) });
  const tampered = { ...manifest, fingerprint: { algorithm: 'sha256', value: '0'.repeat(64) } };
  const result = validateContextState({ manifest: tampered, contextMarkdown, currentGitContext: gitFixture({ head: 'c'.repeat(40) }), currentDdaeContext: ddaeFixture() });
  assert.equal(result.status, 'INVALID');
});

test('the result is frozen', () => {
  const { manifest, contextMarkdown } = buildPair();
  const result = validateContextState({ manifest, contextMarkdown });
  assert.ok(Object.isFrozen(result));
});
