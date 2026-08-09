import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSource } from '../src/context/authority.js';
import { computeContextFingerprint } from '../src/context/fingerprint.js';
import { CONTEXT_SCHEMA_VERSION, createContextManifest } from '../src/context/manifest.js';

function validGoal() {
  return { text: 'Implementar auditoria', normalized: 'implementar auditoria', hash: `sha256:${'a'.repeat(64)}` };
}

function validSession() {
  return { id: 'session_02_context_compiler_0_3_0', path: 'Docs/05_sessions/session_02_context_compiler_0_3_0', selection_reason: 'latest_canonical' };
}

function validGit() {
  return { available: true, repository: true, branch: 'main', head: 'a'.repeat(40), working_tree: 'clean' };
}

function validBudget() {
  return { profile: 'standard', max_chars: 60000, used_chars: 100 };
}

function validCompiler() {
  return { name: 'ddae-context-compiler', contract_version: '1', engine_version: '0.2.0' };
}

function validProject() {
  return { name: 'DDAE Engine', root_kind: 'ddae' };
}

function validFingerprint() {
  return computeContextFingerprint({ marker: 'test' });
}

function baseInput(overrides = {}) {
  return {
    compiler: validCompiler(),
    project: validProject(),
    goal: validGoal(),
    session: validSession(),
    budget: validBudget(),
    git: validGit(),
    sources: [],
    decisions: [],
    constraints: [],
    bugs: [],
    validation: [],
    relevant_files: [],
    excluded_sources: [],
    conflicts: [],
    fingerprint: validFingerprint(),
    ...overrides,
  };
}

function sourceFixture(idSeed, extra = {}) {
  return createSource({ kind: 'documentation', domain: 'history', identity: idSeed, ...extra });
}

// 1. Manifest shape v1 válida
test('1. a fully-populated valid input produces a valid Manifest v1 shape', () => {
  const manifest = createContextManifest(baseInput());
  assert.deepEqual(Object.keys(manifest).sort(), [
    'budget', 'bugs', 'compiler', 'conflicts', 'constraints', 'decisions',
    'excluded_sources', 'fingerprint', 'git', 'goal', 'project',
    'relevant_files', 'schema_version', 'session', 'sources', 'validation',
  ].sort());
});

// 2. schema_version = "1"
test('2. schema_version is always "1"', () => {
  const manifest = createContextManifest(baseInput());
  assert.equal(manifest.schema_version, '1');
  assert.equal(manifest.schema_version, CONTEXT_SCHEMA_VERSION);
});

// 3. compiler metadata
test('3. compiler metadata is passed through', () => {
  const manifest = createContextManifest(baseInput());
  assert.deepEqual(manifest.compiler, validCompiler());
});

// 4. project metadata
test('4. project metadata is passed through', () => {
  const manifest = createContextManifest(baseInput());
  assert.deepEqual(manifest.project, validProject());
});

// 5. goal model
test('5. goal model is passed through', () => {
  const manifest = createContextManifest(baseInput());
  assert.deepEqual(manifest.goal, validGoal());
});

// 6. session normal
test('6. a present session is passed through', () => {
  const manifest = createContextManifest(baseInput());
  assert.deepEqual(manifest.session, validSession());
});

// 7. session=null válido
test('7. session.id = null with a valid null-session reason is accepted', () => {
  const manifest = createContextManifest(baseInput({ session: { id: null, path: null, selection_reason: 'none' } }));
  assert.equal(manifest.session.id, null);
});

// 8. Git normal
test('8. an available Git state is passed through', () => {
  const manifest = createContextManifest(baseInput());
  assert.deepEqual(manifest.git, validGit());
});

// 9. git.available=false válido
test('9. git.available = false is accepted as a valid degraded state', () => {
  const manifest = createContextManifest(baseInput({
    git: { available: false, repository: false, branch: null, head: null, working_tree: null },
  }));
  assert.equal(manifest.git.available, false);
});

// 10. sources deterministicamente ordenados
test('10. sources are ordered by id ASC regardless of input order', () => {
  const s1 = sourceFixture('alpha');
  const s2 = sourceFixture('beta');
  const s3 = sourceFixture('gamma');
  const sorted = [s1, s2, s3].sort((a, b) => (a.id < b.id ? -1 : 1)).map((s) => s.id);
  const manifest = createContextManifest(baseInput({ sources: [s3, s1, s2] }));
  assert.deepEqual(manifest.sources.map((s) => s.id), sorted);
});

// 11. duplicate source ID idêntico dedup — manifest.js itself does not dedup
// (compiler.js owns dedup); createContextManifest just rejects true duplicate
// ids via the schema, so an identical duplicate passed straight through is
// still rejected here — dedup must happen before this layer.
test('11. manifest.js does not silently dedup — identical duplicate source ids are still rejected by schema', () => {
  const s = sourceFixture('dup');
  assert.throws(() => createContextManifest(baseInput({ sources: [s, s] })), /duplicate source id/);
});

// 12. duplicate source ID divergente rejeitado (same as above; manifest.js
// treats any duplicate id as invalid, divergent or not — divergence
// detection is compiler.js's job, upstream of manifest assembly).
test('12. a genuinely divergent duplicate id is also rejected (never silently picked)', () => {
  const a = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md' });
  const b = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/x.md' });
  // Force the same id to simulate a pathological direct-construction case.
  const forcedB = { ...b, id: a.id };
  assert.throws(() => createContextManifest(baseInput({ sources: [a, forcedB] })), /duplicate source id/);
});

// 13. relevant_file source existente
test('13. a relevant_file referencing an existing source is accepted', () => {
  const s = sourceFixture('rel');
  const manifest = createContextManifest(baseInput({
    sources: [s],
    relevant_files: [{ source_id: s.id, path: null, section: null, score: 5, breakdown: {}, char_cost: 10, content: 'x' }],
  }));
  assert.equal(manifest.relevant_files.length, 1);
});

// 14. relevant_file órfão rejeitado
test('14. a relevant_file referencing a non-existent source is rejected', () => {
  assert.throws(
    () => createContextManifest(baseInput({
      relevant_files: [{ source_id: 'src_does_not_exist', path: null, section: null, score: 5, breakdown: {}, char_cost: 10, content: 'x' }],
    })),
    /not found in sources/,
  );
});

// 15. facts source existente
test('15. a fact (decision) referencing an existing source is accepted', () => {
  const s = sourceFixture('fact');
  const manifest = createContextManifest(baseInput({
    sources: [s],
    decisions: [{ value: 'use HttpOnly cookies', source_id: s.id }],
  }));
  assert.equal(manifest.decisions.length, 1);
});

// 16. fact órfão rejeitado
test('16. a fact referencing a non-existent source is rejected', () => {
  assert.throws(
    () => createContextManifest(baseInput({ decisions: [{ value: 'x', source_id: 'src_missing' }] })),
    /not found in sources/,
  );
});

// 17. conflicts preservados
test('17. a resolved conflict referencing an existing winner source is preserved', () => {
  const winner = sourceFixture('winner');
  const loser = sourceFixture('loser');
  const manifest = createContextManifest(baseInput({
    sources: [winner, loser],
    conflicts: [{
      claim_id: 'claim-1',
      domain: 'architecture_intent',
      status: 'resolved',
      winner: { source_id: winner.id },
      conflicting_sources: [{ source_id: loser.id, reason_superseded: 'current_architecture_intent_over_history' }],
    }],
  }));
  assert.equal(manifest.conflicts[0].status, 'resolved');
  assert.equal(manifest.conflicts[0].winner.source_id, winner.id);
});

// 18. unresolved preservado
test('18. an unresolved conflict (winner: null) is preserved', () => {
  const a = sourceFixture('a-side');
  const b = sourceFixture('b-side');
  const manifest = createContextManifest(baseInput({
    sources: [a, b],
    conflicts: [{
      claim_id: 'claim-2',
      domain: 'architecture_intent',
      status: 'unresolved',
      winner: null,
      conflicting_sources: [{ source_id: a.id, reason_superseded: null }, { source_id: b.id, reason_superseded: null }],
    }],
  }));
  assert.equal(manifest.conflicts[0].status, 'unresolved');
  assert.equal(manifest.conflicts[0].winner, null);
});

// 19. excluded sources preservados
test('19. excluded_sources referencing an existing source are preserved', () => {
  const s = sourceFixture('excl');
  const manifest = createContextManifest(baseInput({
    sources: [s],
    excluded_sources: [{ source_id: s.id, path: null, score: 1, char_cost: 99999, reason: 'budget_exceeded' }],
  }));
  assert.equal(manifest.excluded_sources.length, 1);
});

// Bloco 08 — A: relevance exclusion (with source_id) continues valid
test('Bloco 08 A. a relevance exclusion (source_id present, referencing an existing source) remains valid', () => {
  const s = sourceFixture('relevance-excl');
  const manifest = createContextManifest(baseInput({
    sources: [s],
    excluded_sources: [{ source_id: s.id, path: s.path, score: 1, char_cost: 99999, reason: 'budget_exceeded' }],
  }));
  assert.equal(manifest.excluded_sources[0].source_id, s.id);
});

// Bloco 08 — B: security exclusion ({path, reason}, no source_id) is valid
test('Bloco 08 B. a security exclusion ({path, reason}, no source_id) is valid', () => {
  const manifest = createContextManifest(baseInput({
    excluded_sources: [{ path: 'config/.env', reason: 'sensitive_name' }],
  }));
  assert.deepEqual(manifest.excluded_sources[0], { path: 'config/.env', reason: 'sensitive_name' });
});

// Bloco 08 — C: a security exclusion carrying content/value/snippet/match/secret is rejected
test('Bloco 08 C. a security exclusion carrying a forbidden field (content/value/snippet/match/secret) is rejected', () => {
  for (const forbiddenField of ['content', 'value', 'snippet', 'match', 'secret']) {
    assert.throws(
      () => createContextManifest(baseInput({
        excluded_sources: [{ path: 'config/.env', reason: 'sensitive_name', [forbiddenField]: 'API_KEY=leaked' }],
      })),
      new RegExp(`must never carry "${forbiddenField}"`),
      `expected rejection for forbidden field "${forbiddenField}"`,
    );
  }
});

// Bloco 08 — a security exclusion with an absolute or backslash path is rejected
test('Bloco 08. a security exclusion with a non-project-relative path is rejected', () => {
  assert.throws(
    () => createContextManifest(baseInput({ excluded_sources: [{ path: 'C:\\Users\\x\\.env', reason: 'sensitive_name' }] })),
    /excluded_sources\[0\]\.path/,
  );
});

// Bloco 08 — a security exclusion missing path or reason is rejected
test('Bloco 08. a security exclusion missing path or reason is rejected', () => {
  assert.throws(() => createContextManifest(baseInput({ excluded_sources: [{ reason: 'sensitive_name' }] })), /must include a non-empty path/);
  assert.throws(() => createContextManifest(baseInput({ excluded_sources: [{ path: 'config/.env' }] })), /must include a non-empty reason/);
});

// 20. zero timestamp
test('20. the manifest never carries a timestamp field', () => {
  const manifest = createContextManifest(baseInput());
  const serialized = JSON.stringify(manifest);
  assert.ok(!/generated_at|created_at|updated_at|"timestamp"/.test(serialized));
  assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(serialized));
});

// 21. zero absolute path
test('21. an absolute session.path is rejected', () => {
  assert.throws(
    () => createContextManifest(baseInput({ session: { id: 's', path: 'C:\\Users\\x\\Docs', selection_reason: 'explicit' } })),
    /session\.path/,
  );
});

// 22. slash normalization contract
test('22. a source path with a backslash is rejected', () => {
  assert.throws(
    () => createContextManifest(baseInput({ sources: [{ ...sourceFixture('bs'), path: 'Docs\\x.md' }] })),
    /sources\[0\]\.path/,
  );
});

// 23. repeated calls deepEqual
test('23. repeated calls with the same input produce deepEqual manifests', () => {
  const input = baseInput();
  const a = createContextManifest(input);
  const b = createContextManifest(input);
  assert.deepEqual(a, b);
});

// --- extra coverage -----------------------------------------------------

test('createContextManifest requires an input object', () => {
  assert.throws(() => createContextManifest(null), /requires an input object/);
  assert.throws(() => createContextManifest('nope'), /requires an input object/);
});

test('the returned manifest is deeply frozen', () => {
  const manifest = createContextManifest(baseInput());
  assert.ok(Object.isFrozen(manifest));
  assert.ok(Object.isFrozen(manifest.compiler));
  assert.ok(Object.isFrozen(manifest.sources));
});

test('an invalid manifest (missing goal) throws with a clear field-scoped message', () => {
  assert.throws(() => createContextManifest(baseInput({ goal: null })), /goal:/);
});
