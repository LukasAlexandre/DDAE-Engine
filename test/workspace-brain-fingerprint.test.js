import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBrainFingerprintPayload, computeBrainFingerprint } from '../src/workspace/fingerprint.js';
import { compileBrainManifest } from '../src/workspace/compiler.js';
import { makeSnapshot, ENGINE_VERSION } from './brain-fixtures.js';

const compile = (overrides, options = {}) => compileBrainManifest(makeSnapshot(overrides), { engineVersion: ENGINE_VERSION, ...options });
const clone = (value) => JSON.parse(JSON.stringify(value));
const fp = (manifest) => computeBrainFingerprint(buildBrainFingerprintPayload(manifest)).value;

test('same input → same fingerprint, sha256 hex', () => {
  const a = compile();
  const b = compile();
  assert.equal(a.fingerprint.value, b.fingerprint.value);
  assert.equal(a.fingerprint.algorithm, 'sha256');
  assert.match(a.fingerprint.value, /^[0-9a-f]{64}$/);
});

test('the manifest fingerprint equals recomputing it from the manifest', () => {
  const manifest = compile();
  assert.equal(fp(manifest), manifest.fingerprint.value);
});

test('the payload never contains the fingerprint itself', () => {
  assert.equal('fingerprint' in buildBrainFingerprintPayload(compile()), false);
});

test('a relevant change to any canonical input changes the fingerprint', () => {
  const base = compile().fingerprint.value;
  const variants = [
    { git: { available: true, repository: true, branch: 'main', head: 'c'.repeat(40) } },
    { decisions: [{ id: 'RD-01', summary: 'Changed', source_path: 'Docs/04_governance/registro_decisoes.md' }] },
    { risks: [] },
    { open_bugs: [] },
    { recent_changes: [{ sha: 'd'.repeat(40) }] },
    { current_tasks: [] },
    { release_state: { version: '9.9.9', latest_tag: 'v1.2.3' } },
    { current_session: null },
    { current_session: { id: 'session_02_beta', selection_reason: 'explicit' } },
  ];
  for (const overrides of variants) {
    assert.notEqual(compile(overrides).fingerprint.value, base, JSON.stringify(Object.keys(overrides)));
  }
});

test('engine_version participates in the fingerprint', () => {
  const a = compile({}, { engineVersion: '0.4.0' });
  const b = compile({}, { engineVersion: '0.4.1' });
  assert.notEqual(a.fingerprint.value, b.fingerprint.value);
});

test('input order of arrays is irrelevant — payload is canonically ordered', () => {
  const manifest = compile();
  const shuffled = clone(manifest);
  shuffled.entities.decisions.reverse();
  shuffled.entities.open_bugs.reverse();
  shuffled.sources.reverse();
  shuffled.ddae.sessions.reverse();
  assert.equal(fp(shuffled), fp(manifest));
});

test('volatile fields do not affect the fingerprint: generated_at and project.name', () => {
  const manifest = compile();
  const withTime = { ...clone(manifest), generated_at: '2030-01-01T00:00:00.000Z' };
  const renamed = clone(manifest);
  renamed.project.name = 'some-other-clone-folder';
  assert.equal(fp(withTime), manifest.fingerprint.value);
  assert.equal(fp(renamed), manifest.fingerprint.value);
  assert.equal(compile({}, { generatedAt: '2031-01-01T00:00:00.000Z' }).fingerprint.value, manifest.fingerprint.value);
});

test('git.branch never reaches the fingerprint (not part of the v1 manifest)', () => {
  const a = compile().fingerprint.value;
  const b = compile({ git: { available: true, repository: true, branch: 'feature/x', head: 'a'.repeat(40) } }).fingerprint.value;
  assert.equal(a, b);
});

test('the payload contains no absolute path', () => {
  const text = JSON.stringify(buildBrainFingerprintPayload(compile()));
  assert.ok(!/[A-Za-z]:[\\/]/.test(text));
  assert.ok(!text.includes('\\\\'));
});

test('a payload with undefined values is rejected by the canonical serializer (no silent coercion)', () => {
  assert.throws(() => computeBrainFingerprint({ a: undefined }), /undefined/);
});
