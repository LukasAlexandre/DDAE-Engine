import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSource } from '../src/context/authority.js';
import { sha256Hex } from '../src/context/fingerprint.js';
import { compileContext } from '../src/context/compiler.js';
import { validateContextManifest } from '../src/schemas/context-schema.js';

function gitFixture(overrides = {}) {
  return {
    available: true,
    repository: true,
    branch: 'main',
    head: 'a'.repeat(40),
    working_tree: 'clean',
    modified_files: [],
    untracked_files: [],
    recent_commits: [],
    tags: [],
    warnings: [],
    ...overrides,
  };
}

function ddaeFixture(overrides = {}) {
  return {
    available: true,
    current_session: { name: 'session_02_context_compiler_0_3_0', path: 'Docs/05_sessions/session_02_context_compiler_0_3_0' },
    selection: { requested: null, selected: 'session_02_context_compiler_0_3_0', reason: 'latest_canonical' },
    ...overrides,
  };
}

function candidateWithContent(idSeed, content, extra = {}) {
  const source = createSource({
    kind: 'documentation',
    domain: 'history',
    identity: idSeed,
    content,
    ...extra,
  });
  return { source, content, signals: extra.signals };
}

function baseCompileInput(overrides = {}) {
  return {
    engineVersion: '0.2.0',
    project: { name: 'DDAE Engine', root_kind: 'ddae' },
    goal: 'audit users',
    gitContext: gitFixture(),
    ddaeContext: ddaeFixture(),
    candidates: [candidateWithContent('audit_service', 'implements audit logic for users')],
    ...overrides,
  };
}

// 1. goal obrigatório
test('1. goal is required', () => {
  assert.throws(() => compileContext(baseCompileInput({ goal: undefined })), /normalizeGoal requires a non-empty goal string/);
});

// 2. engineVersion obrigatório
test('2. engineVersion is required', () => {
  assert.throws(() => compileContext(baseCompileInput({ engineVersion: undefined })), /engineVersion is required/);
});

// 3. project obrigatório
test('3. project is required', () => {
  assert.throws(() => compileContext(baseCompileInput({ project: undefined })), /project is required/);
});

// 4. budget default standard
test('4. budget defaults to standard when not provided', () => {
  const manifest = compileContext(baseCompileInput());
  assert.equal(manifest.budget.profile, 'standard');
});

// 5. Relevance Engine realmente utilizado
test('5. the Relevance Engine actually ranks and filters candidates', () => {
  const relevant = candidateWithContent('relevant_doc', 'audit users content');
  const irrelevant = candidateWithContent('irrelevant_doc', 'totally unrelated topic');
  const manifest = compileContext(baseCompileInput({ candidates: [irrelevant, relevant], goal: 'audit users' }));
  const relevantScore = manifest.relevant_files.find((f) => f.source_id === relevant.source.id).score;
  const irrelevantScore = manifest.relevant_files.find((f) => f.source_id === irrelevant.source.id).score;
  assert.ok(relevantScore > irrelevantScore);
});

// 6. ranking preservado no relevant_files
test('6. relevant_files preserves the Relevance Engine selection order (score DESC)', () => {
  const low = candidateWithContent('low_doc', 'nothing');
  const high = candidateWithContent('high_doc', 'audit users audit users');
  const manifest = compileContext(baseCompileInput({ candidates: [low, high], goal: 'audit users' }));
  assert.equal(manifest.relevant_files[0].source_id, high.source.id);
});

// 7. candidate content recuperado via source.id
test('7. relevant_files carries the candidate content, looked up by source.id', () => {
  const candidate = candidateWithContent('content_lookup', 'audit users specific text');
  const manifest = compileContext(baseCompileInput({ candidates: [candidate], goal: 'audit users' }));
  assert.equal(manifest.relevant_files[0].content, 'audit users specific text');
});

// 8. candidate content/hash match aprovado
test('8. a candidate whose content matches its source content_hash is accepted', () => {
  assert.doesNotThrow(() => compileContext(baseCompileInput()));
});

// 9. candidate content/hash mismatch rejeitado
test('9. a candidate whose content diverges from its source content_hash is rejected', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', identity: 'mismatch', content: 'original content' });
  const candidate = { source, content: 'tampered content' };
  assert.throws(() => compileContext(baseCompileInput({ candidates: [candidate] })), /content hash mismatch/);
});

// 10. content sem content_hash rejeitado
test('10. non-empty content paired with a null source.content_hash is rejected', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', identity: 'no-hash' });
  assert.equal(source.content_hash, null);
  const candidate = { source, content: 'some content that was never hashed' };
  assert.throws(() => compileContext(baseCompileInput({ candidates: [candidate] })), /content_hash is null/);
});

// 11. excluded budget sources mapeados
test('11. an oversized candidate is mapped into excluded_sources with reason budget_exceeded', () => {
  const oversized = candidateWithContent('oversized', 'x'.repeat(20001));
  const manifest = compileContext(baseCompileInput({ candidates: [oversized], budget: 'minimal', goal: 'audit users' }));
  assert.equal(manifest.excluded_sources.length, 1);
  assert.equal(manifest.excluded_sources[0].reason, 'budget_exceeded');
});

// 12. explicit facts incluídos
test('12. explicit facts (decisions) are included when their source exists', () => {
  const decisionSource = createSource({ kind: 'decision', domain: 'architecture_intent', identity: 'dec-1', content: 'use HttpOnly cookies' });
  const candidate = { source: decisionSource, content: 'use HttpOnly cookies' };
  const manifest = compileContext(baseCompileInput({
    candidates: [candidate],
    facts: { decisions: [{ value: 'use HttpOnly cookies', source_id: decisionSource.id }] },
  }));
  assert.equal(manifest.decisions.length, 1);
});

// 13. orphan fact rejeitado
test('13. a fact referencing a source outside the union is rejected', () => {
  assert.throws(
    () => compileContext(baseCompileInput({ facts: { decisions: [{ value: 'x', source_id: 'src_never_seen' }] } })),
    /not found in sources/,
  );
});

// 14. explicit claims resolvidos via Authority Model
test('14. explicit claims are resolved via the Authority Model', () => {
  const gitSource = createSource({ kind: 'git', domain: 'repository_state', identity: 'HEAD', content: 'current-sha' });
  const staleDoc = createSource({ kind: 'documentation', domain: 'history', identity: 'stale-doc', content: 'old head claim' });
  const manifest = compileContext(baseCompileInput({
    claims: [{ id: 'claim-git', domain: 'repository_state', entries: [{ source: gitSource, value: 'old' }, { source: staleDoc, value: 'stale' }] }],
  }));
  assert.equal(manifest.conflicts[0].status, 'resolved');
  assert.equal(manifest.conflicts[0].winner.source_id, gitSource.id);
});

// 15. JWT vs HttpOnly preservado no Manifest
test('15. the JWT-vs-HttpOnly authority conflict is preserved end-to-end in the manifest', () => {
  const jwtRoadmap = createSource({ kind: 'documentation', domain: 'history', identity: 'jwt-roadmap', content: 'use JWT in the browser' });
  const httpOnlyDecision = createSource({ kind: 'decision', domain: 'architecture_intent', identity: 'httponly-decision', content: 'use HttpOnly session cookie' });
  const manifest = compileContext(baseCompileInput({
    claims: [{ id: 'claim-auth', domain: 'architecture_intent', entries: [{ source: jwtRoadmap, value: 'jwt' }, { source: httpOnlyDecision, value: 'httponly' }] }],
  }));
  const conflict = manifest.conflicts.find((c) => c.claim_id === 'claim-auth');
  assert.equal(conflict.status, 'resolved');
  assert.equal(conflict.winner.source_id, httpOnlyDecision.id);
  assert.equal(conflict.conflicting_sources[0].source_id, jwtRoadmap.id);
  assert.equal(conflict.conflicting_sources[0].reason_superseded, 'current_architecture_intent_over_history');
});

// 16. unresolved authority conflict preservado
test('16. an unresolved authority conflict is preserved with winner: null', () => {
  const decisionA = createSource({ kind: 'decision', domain: 'architecture_intent', identity: 'dec-a', content: 'use REST' });
  const decisionB = createSource({ kind: 'decision', domain: 'architecture_intent', identity: 'dec-b', content: 'use GraphQL' });
  const manifest = compileContext(baseCompileInput({
    claims: [{ id: 'claim-unresolved', domain: 'architecture_intent', entries: [{ source: decisionA, value: 'a' }, { source: decisionB, value: 'b' }] }],
  }));
  assert.equal(manifest.conflicts[0].status, 'unresolved');
  assert.equal(manifest.conflicts[0].winner, null);
});

// 17. compiler não agrupa claims sozinho
test('17. the compiler never groups claims on its own — an empty claims array yields zero conflicts even with related sources present', () => {
  const gitSource = createSource({ kind: 'git', domain: 'repository_state', identity: 'HEAD2', content: 'sha' });
  const staleDoc = createSource({ kind: 'documentation', domain: 'history', identity: 'stale-doc-2', content: 'stale sha claim' });
  const manifest = compileContext(baseCompileInput({
    candidates: [{ source: gitSource, content: 'sha' }, { source: staleDoc, content: 'stale sha claim' }],
    claims: [],
  }));
  assert.equal(manifest.conflicts.length, 0);
});

// 18. no session válido
test('18. a null session (no DDAE session available) is a valid manifest state', () => {
  const manifest = compileContext(baseCompileInput({ ddaeContext: { available: true, current_session: null, selection: { requested: null, selected: null, reason: 'none' } } }));
  assert.equal(manifest.session.id, null);
  assert.equal(manifest.session.selection_reason, 'none');
});

// 19. Git unavailable válido
test('19. git.available = false is a valid manifest state', () => {
  const manifest = compileContext(baseCompileInput({ gitContext: { available: false, repository: false, branch: null, head: null, working_tree: null } }));
  assert.equal(manifest.git.available, false);
  assert.equal(manifest.git.head, null);
});

// 20. source union deterministic
test('20. the source union is deterministic regardless of candidate/claim input order', () => {
  const a = candidateWithContent('union_a', 'audit users a');
  const b = candidateWithContent('union_b', 'audit users b');
  const forward = compileContext(baseCompileInput({ candidates: [a, b] }));
  const reversed = compileContext(baseCompileInput({ candidates: [b, a] }));
  assert.deepEqual(forward.sources.map((s) => s.id), reversed.sources.map((s) => s.id));
});

// 21. duplicate candidate source id rejeitado se ambíguo
test('21. two candidates carrying divergent Sources under the same id are rejected', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', identity: 'dup-candidate', content: 'original' });
  const divergent = { ...source, content_hash: 'forced-divergent-hash' };
  const candidates = [
    { source, content: 'original' },
    { source: divergent, content: '' },
  ];
  assert.throws(() => compileContext(baseCompileInput({ candidates })), /divergent canonical content/);
});

// 22. authority não influencia relevance score
test('22. authority_class never influences relevance score inside the compiler', () => {
  const historySource = createSource({ kind: 'documentation', domain: 'history', identity: 'auth-independence-history', content: 'audit users content' });
  const decisionSource = createSource({ kind: 'decision', domain: 'architecture_intent', identity: 'auth-independence-decision', content: 'audit users content' });
  const manifest = compileContext(baseCompileInput({
    candidates: [{ source: historySource, content: 'audit users content' }, { source: decisionSource, content: 'audit users content' }],
    goal: 'audit users',
  }));
  const scores = manifest.relevant_files.map((f) => f.score);
  assert.equal(scores[0], scores[1]);
});

// 23. output schema valid
test('23. the compiled manifest always validates against context-schema.js', () => {
  const manifest = compileContext(baseCompileInput());
  const { valid, errors } = validateContextManifest(manifest);
  assert.equal(valid, true, JSON.stringify(errors));
});

// 24. fingerprint presente
test('24. the compiled manifest always carries a fingerprint', () => {
  const manifest = compileContext(baseCompileInput());
  assert.equal(manifest.fingerprint.algorithm, 'sha256');
  assert.match(manifest.fingerprint.value, /^[0-9a-f]{64}$/);
});

// Checkpoint 07.1 — session selection reason is bound to the fingerprint
test('Checkpoint 07.1. the same session id selected for a different reason (explicit vs latest_canonical) produces a different fingerprint', () => {
  const manifestA = compileContext(baseCompileInput({
    ddaeContext: ddaeFixture({ selection: { requested: null, selected: 'session_02_context_compiler_0_3_0', reason: 'latest_canonical' } }),
  }));
  const manifestB = compileContext(baseCompileInput({
    ddaeContext: ddaeFixture({ selection: { requested: 'session_02_context_compiler_0_3_0', selected: 'session_02_context_compiler_0_3_0', reason: 'explicit' } }),
  }));
  assert.equal(manifestA.session.id, manifestB.session.id);
  assert.notEqual(manifestA.session.selection_reason, manifestB.session.selection_reason);
  assert.notEqual(manifestA.fingerprint.value, manifestB.fingerprint.value);
});

// 25. repeated calls deepEqual
test('25. repeated compiles with the same input produce deepEqual manifests', () => {
  const input = baseCompileInput();
  const a = compileContext(input);
  const b = compileContext(input);
  assert.deepEqual(a, b);
});

// 26. reversed candidate input → semanticamente igual
test('26. reversing candidate input order produces a semantically identical manifest', () => {
  const a = candidateWithContent('reverse_a', 'audit users a');
  const b = candidateWithContent('reverse_b', 'audit users b');
  const forward = compileContext(baseCompileInput({ candidates: [a, b] }));
  const reversed = compileContext(baseCompileInput({ candidates: [b, a] }));
  assert.equal(forward.fingerprint.value, reversed.fingerprint.value);
});

// 27. input não mutado
test('27. compileContext never mutates its input', () => {
  const input = baseCompileInput();
  const before = JSON.stringify(input.candidates);
  compileContext(input);
  assert.equal(JSON.stringify(input.candidates), before);
});

// 28. nenhum filesystem access
test('28-30. compiler.js performs no filesystem, network, or write access', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'context', 'compiler.js'), 'utf8');
  const code = source.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
  assert.ok(!/readFileSync|writeFileSync|readdirSync|readdir\(/.test(code));
  assert.ok(!/node:https?|node:net|node:dgram|\bfetch\(/.test(code));
  assert.ok(!/node:fs/.test(code));
});

// 31. nenhum .ddae output
test('31. compiler.js never references .ddae output', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'context', 'compiler.js'), 'utf8');
  const code = source.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
  // `.ddae` as a filesystem output path (e.g. ".ddae/context") — not
  // `ddaeContext`/`ddaeContext`-shaped identifiers, which legitimately name
  // the collectDdaeContext() snapshot parameter.
  assert.ok(!/\.ddae(?![a-zA-Z])/.test(code));
});

// 32. nenhum Renderer
test('32. compiler.js implements no Renderer/Markdown-generation logic', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'context', 'compiler.js'), 'utf8');
  const code = source.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
  assert.ok(!/CONTEXT\.md|renderMarkdown|renderer/i.test(code));
});

// 33. nenhum CLI
test('33. compiler.js implements no CLI logic', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'context', 'compiler.js'), 'utf8');
  const code = source.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
  assert.ok(!/process\.argv|commander|program\.command/.test(code));
});

// --- extra coverage -------------------------------------------------------

test('candidates must be an array', () => {
  assert.throws(() => compileContext(baseCompileInput({ candidates: 'nope' })), /candidates is required and must be an array/);
});

test('a claim with fewer than 2 entries is rejected', () => {
  const source = createSource({ kind: 'decision', domain: 'architecture_intent', identity: 'lonely', content: 'x' });
  assert.throws(
    () => compileContext(baseCompileInput({ claims: [{ id: 'lonely-claim', domain: 'architecture_intent', entries: [{ source, value: 'x' }] }] })),
    /requires at least 2 entries/,
  );
});

test('a claim with an invalid domain is rejected', () => {
  const a = createSource({ kind: 'decision', domain: 'architecture_intent', identity: 'inv-a', content: 'a' });
  const b = createSource({ kind: 'decision', domain: 'architecture_intent', identity: 'inv-b', content: 'b' });
  assert.throws(
    () => compileContext(baseCompileInput({ claims: [{ id: 'bad-domain', domain: 'not_a_domain', entries: [{ source: a, value: 'a' }, { source: b, value: 'b' }] }] })),
    /invalid domain/,
  );
});

test('goal.hash is derived from the normalized goal via sha256Hex', () => {
  const manifest = compileContext(baseCompileInput({ goal: 'Auditoria de Usuarios' }));
  assert.equal(manifest.goal.hash, `sha256:${sha256Hex(manifest.goal.normalized)}`);
});

test('session/git are never auto-collected — compileContext trusts the caller-provided snapshots verbatim', () => {
  const manifest = compileContext(baseCompileInput({ gitContext: gitFixture({ head: 'b'.repeat(40) }) }));
  assert.equal(manifest.git.head, 'b'.repeat(40));
});
