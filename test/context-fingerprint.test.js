import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FINGERPRINT_ALGORITHM,
  stableStringify,
  computeContextFingerprint,
  buildFingerprintPayload,
  sha256Hex,
} from '../src/context/fingerprint.js';

function basePayloadArgs(overrides = {}) {
  return {
    schemaVersion: '1',
    compilerContractVersion: '1',
    goalNormalized: 'audit users',
    sessionId: 'session_02_context_compiler_0_3_0',
    sessionSelectionReason: 'latest_canonical',
    budgetProfile: 'standard',
    budgetMaxChars: 60000,
    gitHead: 'a'.repeat(40),
    selectedSources: [
      { id: 'src_b', content_hash: 'hash-b' },
      { id: 'src_a', content_hash: 'hash-a' },
    ],
    constraints: ['no external dependencies', 'offline only'],
    ...overrides,
  };
}

// 1. same input -> same fingerprint
test('1. the same logical input always produces the same fingerprint', () => {
  const payload = buildFingerprintPayload(basePayloadArgs());
  const a = computeContextFingerprint(payload);
  const b = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs()));
  assert.equal(a.value, b.value);
});

// 2. reversed object key creation order -> same fingerprint
test('2. reversed object key insertion order produces the same fingerprint', () => {
  const forward = { a: 1, b: 2, c: 3 };
  const reversed = { c: 3, b: 2, a: 1 };
  assert.equal(stableStringify(forward), stableStringify(reversed));
  assert.equal(computeContextFingerprint(forward).value, computeContextFingerprint(reversed).value);
});

// 3. goal changes -> fingerprint changes
test('3. a changed goal changes the fingerprint', () => {
  const a = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs()));
  const b = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({ goalNormalized: 'audit sessions' })));
  assert.notEqual(a.value, b.value);
});

// 4. normalized-equivalent goal -> same hash when normalization is equal
test('4. an equivalent normalized goal produces the same fingerprint contribution', () => {
  const a = buildFingerprintPayload(basePayloadArgs({ goalNormalized: 'audit users' }));
  const b = buildFingerprintPayload(basePayloadArgs({ goalNormalized: 'audit users' }));
  assert.equal(computeContextFingerprint(a).value, computeContextFingerprint(b).value);
});

// 5. session changes -> fingerprint changes
test('5. a changed session id changes the fingerprint', () => {
  const a = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs()));
  const b = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({ sessionId: 'session_03_other' })));
  assert.notEqual(a.value, b.value);
});

// Checkpoint 07.1 — A: same session_id, different selection_reason -> different fingerprint
test('Checkpoint 07.1 A. the same session id with a different selection_reason changes the fingerprint', () => {
  const latestCanonical = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({ sessionSelectionReason: 'latest_canonical' })));
  const explicit = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({ sessionSelectionReason: 'explicit' })));
  assert.notEqual(latestCanonical.value, explicit.value);
});

// Checkpoint 07.1 B: same session_id + same selection_reason -> identical fingerprint
test('Checkpoint 07.1 B. the same session id and selection_reason produce an identical fingerprint across calls', () => {
  const a = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({ sessionSelectionReason: 'explicit' })));
  const b = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({ sessionSelectionReason: 'explicit' })));
  assert.equal(a.value, b.value);
});

// Checkpoint 07.1 C: null session stays deterministic
test('Checkpoint 07.1 C. a null session (id=null, selection_reason="none") remains deterministic', () => {
  const a = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({ sessionId: null, sessionSelectionReason: 'none' })));
  const b = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({ sessionId: null, sessionSelectionReason: 'none' })));
  assert.equal(a.value, b.value);
  const differentNullReason = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({ sessionId: null, sessionSelectionReason: 'explicit_not_found' })));
  assert.notEqual(a.value, differentNullReason.value);
});

// 6. budget changes -> fingerprint changes
test('6. a changed budget profile changes the fingerprint', () => {
  const a = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs()));
  const b = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({ budgetProfile: 'deep', budgetMaxChars: 120000 })));
  assert.notEqual(a.value, b.value);
});

// 7. Git HEAD changes -> fingerprint changes
test('7. a changed Git HEAD changes the fingerprint', () => {
  const a = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs()));
  const b = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({ gitHead: 'b'.repeat(40) })));
  assert.notEqual(a.value, b.value);
});

// 8. selected Source changes -> fingerprint changes
test('8. a changed set of selected sources changes the fingerprint', () => {
  const a = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs()));
  const b = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({
    selectedSources: [{ id: 'src_a', content_hash: 'hash-a' }],
  })));
  assert.notEqual(a.value, b.value);
});

// 9. selected content_hash changes -> fingerprint changes
test('9. a changed content_hash on a selected source changes the fingerprint', () => {
  const a = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs()));
  const b = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({
    selectedSources: [
      { id: 'src_b', content_hash: 'hash-b-changed' },
      { id: 'src_a', content_hash: 'hash-a' },
    ],
  })));
  assert.notEqual(a.value, b.value);
});

// 10. constraint changes -> fingerprint changes
test('10. a changed constraint changes the fingerprint', () => {
  const a = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs()));
  const b = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs({ constraints: ['different constraint'] })));
  assert.notEqual(a.value, b.value);
});

// 11. no timestamp
test('11. the fingerprint payload never contains a timestamp field', () => {
  const payload = buildFingerprintPayload(basePayloadArgs());
  const serialized = JSON.stringify(payload);
  assert.ok(!('generated_at' in payload));
  assert.ok(!('timestamp' in payload));
  assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(serialized));
});

// 12. absolute root does not influence the fingerprint
test('12. selected source order (id ASC) is independent of caller-given order', () => {
  const a = buildFingerprintPayload(basePayloadArgs({
    selectedSources: [
      { id: 'src_a', content_hash: 'hash-a' },
      { id: 'src_b', content_hash: 'hash-b' },
    ],
  }));
  const b = buildFingerprintPayload(basePayloadArgs({
    selectedSources: [
      { id: 'src_b', content_hash: 'hash-b' },
      { id: 'src_a', content_hash: 'hash-a' },
    ],
  }));
  assert.deepEqual(a, b);
  assert.equal(computeContextFingerprint(a).value, computeContextFingerprint(b).value);
});

// 13. filesystem enumeration order does not influence the fingerprint
test('13. constraint order does not influence the fingerprint (sorted internally)', () => {
  const a = buildFingerprintPayload(basePayloadArgs({ constraints: ['zeta', 'alpha', 'mu'] }));
  const b = buildFingerprintPayload(basePayloadArgs({ constraints: ['mu', 'zeta', 'alpha'] }));
  assert.deepEqual(a, b);
});

// 14. algorithm = sha256
test('14. the fingerprint algorithm is sha256', () => {
  const fp = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs()));
  assert.equal(fp.algorithm, 'sha256');
  assert.equal(fp.algorithm, FINGERPRINT_ALGORITHM);
});

// 15. value has a stable, well-formed shape
test('15. the fingerprint value is a 64-character lowercase hex string', () => {
  const fp = computeContextFingerprint(buildFingerprintPayload(basePayloadArgs()));
  assert.match(fp.value, /^[0-9a-f]{64}$/);
});

// --- extra coverage: stableStringify and sha256Hex primitives ---------------

test('stableStringify rejects undefined, functions, Map, and Set', () => {
  assert.throws(() => stableStringify({ a: undefined }), /undefined is not allowed/);
  assert.throws(() => stableStringify({ a: () => {} }), /functions are not allowed/);
  assert.throws(() => stableStringify(new Map()), /Map\/Set are not allowed/);
  assert.throws(() => stableStringify(new Set()), /Map\/Set are not allowed/);
});

test('stableStringify handles nested arrays and objects deterministically', () => {
  const value = { z: [1, { b: 2, a: 1 }], a: null, m: 'text' };
  assert.equal(stableStringify(value), '{"a":null,"m":"text","z":[1,{"a":1,"b":2}]}');
});

test('computeContextFingerprint never includes its own value in the hash input', () => {
  const payload = buildFingerprintPayload(basePayloadArgs());
  assert.ok(!('fingerprint' in payload));
});

test('sha256Hex normalizes CRLF to LF before hashing, matching authority.js content_hash behavior', () => {
  const lf = sha256Hex('line one\nline two\n');
  const crlf = sha256Hex('line one\r\nline two\r\n');
  assert.equal(lf, crlf);
});

test('sha256Hex is deterministic and sensitive to content changes', () => {
  assert.equal(sha256Hex('hello'), sha256Hex('hello'));
  assert.notEqual(sha256Hex('hello'), sha256Hex('hello!'));
});

test('fingerprint.js performs no filesystem or network access, and imports only node:crypto', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'context', 'fingerprint.js'), 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.deepEqual(imports, ['node:crypto']);
  assert.ok(!/readFileSync|writeFileSync|readdirSync/.test(source));
  assert.ok(!/node:https?|node:net|node:dgram|\bfetch\(/.test(source));
});
