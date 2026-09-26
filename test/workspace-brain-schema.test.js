import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRAIN_SCHEMA_VERSION,
  validateBrainManifest,
  assertBrainManifest,
} from '../src/schemas/brain-schema.js';
import { compileBrainManifest } from '../src/workspace/compiler.js';
import { makeSnapshot, ENGINE_VERSION } from './brain-fixtures.js';

const valid = () => JSON.parse(JSON.stringify(compileBrainManifest(makeSnapshot(), { engineVersion: ENGINE_VERSION })));

function mutate(fn) {
  const manifest = valid();
  fn(manifest);
  return validateBrainManifest(manifest);
}

test('schema version constant is brain-manifest-v1', () => {
  assert.equal(BRAIN_SCHEMA_VERSION, 'brain-manifest-v1');
});

test('a compiled manifest is valid', () => {
  assert.deepEqual(validateBrainManifest(valid()), { valid: true, errors: [] });
  assert.doesNotThrow(() => assertBrainManifest(valid()));
});

test('non-object input is rejected', () => {
  for (const input of [null, undefined, 'x', 42, []]) {
    assert.equal(validateBrainManifest(input).valid, false);
  }
});

test('every required top-level field is enforced', () => {
  for (const field of ['schema_version', 'engine_version', 'project', 'git', 'ddae', 'current_session', 'sources', 'entities', 'views', 'fingerprint']) {
    const result = mutate((m) => { delete m[field]; });
    assert.equal(result.valid, false, `missing ${field} must be invalid`);
    assert.ok(result.errors.some((e) => e.startsWith(field)), `error should name ${field}`);
  }
});

test('incompatible schema_version is rejected', () => {
  assert.equal(mutate((m) => { m.schema_version = 'brain-manifest-v2'; }).valid, false);
});

test('unknown top-level fields (outside the v1 contract) are rejected — including a memory field', () => {
  for (const field of ['memory', 'memory_provider', 'branch', 'extra']) {
    const result = mutate((m) => { m[field] = 'x'; });
    assert.equal(result.valid, false, field);
    assert.ok(result.errors.some((e) => e.includes(field)));
  }
});

test('git contains exactly { available, head } — branch/repository are not part of v1', () => {
  assert.equal(mutate((m) => { m.git.branch = 'main'; }).valid, false);
  assert.equal(mutate((m) => { m.git.repository = true; }).valid, false);
  assert.equal(mutate((m) => { m.git.available = 'yes'; }).valid, false);
  assert.equal(mutate((m) => { m.git.head = 123; }).valid, false);
  assert.equal(mutate((m) => { m.git = { available: false, head: null }; }).valid, true);
});

test('project requires non-empty name and a relative root path', () => {
  assert.equal(mutate((m) => { m.project.name = ''; }).valid, false);
  assert.equal(mutate((m) => { m.project.root_relative_path = '/abs/path'; }).valid, false);
  assert.equal(mutate((m) => { m.project.root_relative_path = 'C:\\x'; }).valid, false);
});

test('entities has exactly the six v1 keys, each an array of { id, source_path, summary }', () => {
  const keys = Object.keys(valid().entities).sort();
  assert.deepEqual(keys, ['current_tasks', 'decisions', 'open_bugs', 'recent_changes', 'release_state', 'risks']);
  assert.equal(mutate((m) => { m.entities.memory = []; }).valid, false);
  assert.equal(mutate((m) => { delete m.entities.risks; }).valid, false);
  assert.equal(mutate((m) => { m.entities.risks = 'x'; }).valid, false);
  assert.equal(mutate((m) => { m.entities.risks[0].id = ''; }).valid, false);
  assert.equal(mutate((m) => { m.entities.risks[0].summary = 5; }).valid, false);
  assert.equal(mutate((m) => { m.entities.risks[0].status = 'Aberto'; }).valid, false);
});

test('absolute or backslash paths are rejected everywhere the contract forbids them', () => {
  assert.equal(mutate((m) => { m.entities.risks[0].source_path = '/home/x/Docs/a.md'; }).valid, false);
  assert.equal(mutate((m) => { m.entities.risks[0].source_path = 'C:/Users/x/a.md'; }).valid, false);
  assert.equal(mutate((m) => { m.entities.risks[0].source_path = 'Docs\\a.md'; }).valid, false);
  assert.equal(mutate((m) => { m.sources[0].path = '/abs'; }).valid, false);
  assert.equal(mutate((m) => { m.ddae.sessions[0].path = 'D:\\x'; }).valid, false);
  assert.equal(mutate((m) => { m.entities.recent_changes[0].source_path = null; }).valid, true);
});

test('arrays must be in canonical order', () => {
  assert.equal(mutate((m) => { m.entities.decisions.reverse(); }).valid, false);
  assert.equal(mutate((m) => { m.sources.reverse(); }).valid, false);
  assert.equal(mutate((m) => { m.ddae.sessions.reverse(); }).valid, false);
});

test('current_session is null or { id, selection_reason }', () => {
  assert.equal(mutate((m) => { m.current_session = null; }).valid, true);
  assert.equal(mutate((m) => { m.current_session = { id: 'x' }; }).valid, false);
  assert.equal(mutate((m) => { m.current_session.selection_reason = 7; }).valid, false);
});

test('views is an array of relative path strings', () => {
  assert.equal(mutate((m) => { m.views = 'x'; }).valid, false);
  assert.equal(mutate((m) => { m.views = ['/abs/Home.md']; }).valid, false);
  assert.equal(mutate((m) => { m.views = ['.ddae/brain/Home.md']; }).valid, true);
});

test('fingerprint must be sha256 with a 64-char hex value', () => {
  assert.equal(mutate((m) => { m.fingerprint.algorithm = 'md5'; }).valid, false);
  assert.equal(mutate((m) => { m.fingerprint.value = 'abc'; }).valid, false);
  assert.equal(mutate((m) => { m.fingerprint = null; }).valid, false);
});

test('generated_at is optional, informative and must be a string when present', () => {
  assert.equal(mutate((m) => { m.generated_at = '2026-01-01T00:00:00.000Z'; }).valid, true);
  assert.equal(mutate((m) => { m.generated_at = 5; }).valid, false);
});

test('errors are collected (not first-error-only) and assert throws with all of them', () => {
  const manifest = valid();
  manifest.schema_version = 'nope';
  manifest.engine_version = '';
  const { errors } = validateBrainManifest(manifest);
  assert.ok(errors.length >= 2);
  assert.throws(() => assertBrainManifest(manifest), /schema_version[\s\S]*engine_version/);
});
