import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SOURCE_KINDS,
  AUTHORITY_DOMAINS,
  createSource,
  resolveAuthorityConflict,
} from '../src/context/authority.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTHORITY_FILE = path.join(__dirname, '..', 'src', 'context', 'authority.js');

// --- Source creation -------------------------------------------------------

test('createSource produces a deterministic canonical shape', () => {
  const source = createSource({ kind: 'git', domain: 'repository_state', identity: 'HEAD', content: 'abc123' });

  assert.deepEqual(Object.keys(source).sort(), ['authority_class', 'content_hash', 'id', 'kind', 'path', 'section']);
  assert.equal(source.kind, 'git');
  assert.equal(source.authority_class, 'repository_state');
});

test('createSource accepts all 10 official kinds', () => {
  for (const kind of SOURCE_KINDS) {
    const source = createSource({ kind, domain: 'history', identity: `test-${kind}` });
    assert.equal(source.kind, kind);
  }
  assert.equal(SOURCE_KINDS.length, 10);
});

test('createSource rejects an invalid kind deterministically', () => {
  assert.throws(
    () => createSource({ kind: 'not_a_real_kind', domain: 'history', identity: 'x' }),
    /invalid kind/,
  );
});

test('createSource rejects an invalid domain deterministically', () => {
  assert.throws(
    () => createSource({ kind: 'documentation', domain: 'not_a_real_domain', identity: 'x' }),
    /invalid domain/,
  );
});

test('createSource accepts a project-relative forward-slash path', () => {
  const source = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/04_governance/registro_decisoes.md' });
  assert.equal(source.path, 'Docs/04_governance/registro_decisoes.md');
});

test('createSource rejects an absolute path rather than silently rewriting it', () => {
  assert.throws(
    () => createSource({ kind: 'documentation', domain: 'history', path: 'C:\\Users\\x\\Docs\\y.md' }),
    /project-relative/,
  );
  assert.throws(
    () => createSource({ kind: 'documentation', domain: 'history', path: '/home/user/Docs/y.md' }),
    /project-relative/,
  );
});

test('createSource rejects a path containing a backslash', () => {
  assert.throws(
    () => createSource({ kind: 'documentation', domain: 'history', path: 'Docs\\04_governance\\x.md' }),
    /project-relative/,
  );
});

test('the same logical source always produces the same id', () => {
  const a = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/04_governance/registro_decisoes.md', section: 'DEC-05' });
  const b = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/04_governance/registro_decisoes.md', section: 'DEC-05' });
  assert.equal(a.id, b.id);
});

test('a semantically different source produces a different id', () => {
  const a = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/04_governance/registro_decisoes.md', section: 'DEC-05' });
  const b = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/04_governance/registro_decisoes.md', section: 'DEC-06' });
  assert.notEqual(a.id, b.id);
});

test('content_hash is stable for identical content', () => {
  const a = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'hello world' });
  const b = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'hello world' });
  assert.equal(a.content_hash, b.content_hash);
});

test('a content change alters content_hash', () => {
  const a = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'hello world' });
  const b = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'hello there' });
  assert.notEqual(a.content_hash, b.content_hash);
});

test('CRLF vs LF line endings do not change the semantic content_hash', () => {
  const lf = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'line one\nline two\n' });
  const crlf = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'line one\r\nline two\r\n' });
  assert.equal(lf.content_hash, crlf.content_hash);
});

test('a Source never carries a timestamp field', () => {
  const source = createSource({ kind: 'git', domain: 'repository_state', identity: 'HEAD', content: 'abc123' });
  const serialized = JSON.stringify(source);
  assert.ok(!('timestamp' in source));
  assert.ok(!('createdAt' in source));
  assert.ok(!('generated_at' in source));
  assert.ok(!('mtime' in source));
  assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(serialized));
});

// --- Authority domains -------------------------------------------------------

test('all seven authority domains from the contract are implemented', () => {
  assert.deepEqual(
    [...AUTHORITY_DOMAINS].sort(),
    [
      'active_bug_state',
      'architecture_intent',
      'future_intent',
      'history',
      'repository_state',
      'runtime_metadata',
      'test_result',
    ],
  );
});

test('no domain is represented as a numeric authority score', () => {
  for (const domain of AUTHORITY_DOMAINS) {
    assert.equal(typeof domain, 'string');
  }
  const source = createSource({ kind: 'git', domain: 'repository_state', identity: 'HEAD' });
  assert.ok(!('authority_score' in source));
  assert.ok(!('priority' in source));
  assert.ok(!('weight' in source));
});

// --- Conflict resolution by domain -------------------------------------------------------

test('current Git state wins over conflicting documentation about repository state', () => {
  const git = createSource({ kind: 'git', domain: 'repository_state', identity: 'HEAD', content: 'sha-current' });
  const staleDoc = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/old.md', content: 'HEAD is something else' });

  const result = resolveAuthorityConflict([staleDoc, git]);

  assert.equal(result.status, 'resolved');
  assert.equal(result.winner.source_id, git.id);
  assert.equal(result.conflicting_sources[0].source_id, staleDoc.id);
});

test('current runtime metadata wins over historical documentation', () => {
  const pkg = createSource({ kind: 'project_metadata', domain: 'runtime_metadata', path: 'package.json', content: '{"version":"0.2.0"}' });
  const staleDoc = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/old.md', content: 'the version is 0.1.0' });

  const result = resolveAuthorityConflict([pkg, staleDoc]);

  assert.equal(result.winner.source_id, pkg.id);
  assert.equal(result.conflicting_sources[0].reason_superseded, 'current_runtime_metadata_over_history');
});

test('a current approved architectural decision wins over historical roadmap documentation (JWT vs HttpOnly)', () => {
  const jwtRoadmap = createSource({
    kind: 'documentation',
    domain: 'history',
    path: 'Docs/02_architecture/decisoes_tecnicas.md',
    section: 'Autenticação (histórico)',
    content: 'usar JWT no browser',
  });
  const httpOnlyDecision = createSource({
    kind: 'decision',
    domain: 'architecture_intent',
    path: 'Docs/04_governance/registro_decisoes.md',
    section: 'DEC-05',
    content: 'usar sessão opaca com cookie HttpOnly, sem JWT no navegador',
  });

  const result = resolveAuthorityConflict([jwtRoadmap, httpOnlyDecision]);

  assert.equal(result.status, 'resolved');
  assert.equal(result.winner.source_id, httpOnlyDecision.id);
  assert.equal(result.conflicting_sources.length, 1);
  assert.equal(result.conflicting_sources[0].source_id, jwtRoadmap.id);
  assert.equal(result.conflicting_sources[0].reason_superseded, 'current_architecture_intent_over_history');
});

test('current test evidence wins over a stale claim about test results', () => {
  const evidence = createSource({ kind: 'test', domain: 'test_result', identity: 'npm-test-2026-08-09', content: '67 pass' });
  const staleClaim = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/old.md', content: 'the test suite is failing' });

  const result = resolveAuthorityConflict([evidence, staleClaim]);

  assert.equal(result.winner.source_id, evidence.id);
});

test('an active bug record wins over incompatible historical documentation', () => {
  const activeBug = createSource({
    kind: 'bug',
    domain: 'active_bug_state',
    path: 'Docs/05_sessions/session_01/07_bugs/bugs_identificados.md',
    section: 'BUG-01',
    content: 'OPEN',
  });
  const staleDoc = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/old.md', content: 'no known bugs at this time' });

  const result = resolveAuthorityConflict([staleDoc, activeBug]);

  assert.equal(result.winner.source_id, activeBug.id);
  assert.equal(result.conflicting_sources[0].reason_superseded, 'current_active_bug_state_over_history');
});

test('future intent never overrides a present-authoritative claim', () => {
  const roadmap = createSource({ kind: 'documentation', domain: 'future_intent', path: 'Docs/01_product/visao_produto.md', content: 'planned: Obsidian in 0.4.0' });
  const currentDecision = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/04_governance/registro_decisoes.md', content: 'Obsidian is out of scope for 0.3.0' });

  const result = resolveAuthorityConflict([roadmap, currentDecision]);

  assert.equal(result.winner.source_id, currentDecision.id);
  assert.equal(result.conflicting_sources[0].reason_superseded, 'current_architecture_intent_over_future_intent');
});

test('history never overrides a present-authoritative claim', () => {
  const history = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/old.md', content: 'old claim' });
  const git = createSource({ kind: 'git', domain: 'repository_state', identity: 'HEAD', content: 'current sha' });

  const result = resolveAuthorityConflict([history, git]);

  assert.equal(result.winner.source_id, git.id);
});

// --- Traceability -------------------------------------------------------

test('a superseded source is always preserved in conflicting_sources, never dropped', () => {
  const git = createSource({ kind: 'git', domain: 'repository_state', identity: 'HEAD', content: 'sha' });
  const doc = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'stale' });

  const result = resolveAuthorityConflict([git, doc]);

  assert.equal(result.conflicting_sources.length, 1);
  assert.deepEqual(result.conflicting_sources[0].value, doc);
});

test('reason_superseded is always present on a resolved conflict', () => {
  const git = createSource({ kind: 'git', domain: 'repository_state', identity: 'HEAD', content: 'sha' });
  const doc = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'stale' });

  const result = resolveAuthorityConflict([git, doc]);

  assert.equal(typeof result.conflicting_sources[0].reason_superseded, 'string');
  assert.ok(result.conflicting_sources[0].reason_superseded.length > 0);
});

// --- Unresolved conflicts -------------------------------------------------------

test('a conflict between two equally-authoritative present sources is unresolved, never guessed', () => {
  const decisionA = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/04_governance/registro_decisoes.md', section: 'DEC-10', content: 'use REST' });
  const decisionB = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/04_governance/registro_decisoes.md', section: 'DEC-11', content: 'use GraphQL' });

  const result = resolveAuthorityConflict([decisionA, decisionB]);

  assert.equal(result.status, 'unresolved');
  assert.equal(result.winner, null);
});

test('a conflict between two different present-authoritative domains is unresolved (no cross-domain ranking)', () => {
  const decision = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/04_governance/registro_decisoes.md', content: 'x' });
  const testEvidence = createSource({ kind: 'test', domain: 'test_result', identity: 'npm-test', content: 'y' });

  const result = resolveAuthorityConflict([decision, testEvidence]);

  assert.equal(result.status, 'unresolved');
});

test('a conflict between only non-present-authoritative sources is unresolved', () => {
  const history = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/a.md', content: 'a' });
  const future = createSource({ kind: 'documentation', domain: 'future_intent', path: 'Docs/b.md', content: 'b' });

  const result = resolveAuthorityConflict([history, future]);

  assert.equal(result.status, 'unresolved');
  assert.equal(result.winner, null);
});

test('an unresolved conflict still preserves every source, none dropped', () => {
  const a = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/a.md', content: 'a' });
  const b = createSource({ kind: 'documentation', domain: 'future_intent', path: 'Docs/b.md', content: 'b' });

  const result = resolveAuthorityConflict([a, b]);

  assert.equal(result.conflicting_sources.length, 2);
  const ids = result.conflicting_sources.map((c) => c.source_id).sort();
  assert.deepEqual(ids, [a.id, b.id].sort());
});

// --- Determinism and immutability -------------------------------------------------------

test('conflict resolution is independent of input order', () => {
  const jwt = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'jwt' });
  const httpOnly = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/y.md', content: 'httponly' });

  const forward = resolveAuthorityConflict([jwt, httpOnly]);
  const reversed = resolveAuthorityConflict([httpOnly, jwt]);

  assert.deepEqual(forward, reversed);
});

test('repeated calls with the same input are deepEqual', () => {
  const a = createSource({ kind: 'git', domain: 'repository_state', identity: 'HEAD', content: 'sha' });
  const b = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'stale' });

  const first = resolveAuthorityConflict([a, b]);
  const second = resolveAuthorityConflict([a, b]);

  assert.deepEqual(first, second);
});

test('resolveAuthorityConflict never mutates its input sources', () => {
  const a = createSource({ kind: 'git', domain: 'repository_state', identity: 'HEAD', content: 'sha' });
  const b = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'stale' });
  const sources = [a, b];
  const before = JSON.stringify(sources);

  resolveAuthorityConflict(sources);

  assert.equal(JSON.stringify(sources), before);
  assert.ok(Object.isFrozen(a));
  assert.ok(Object.isFrozen(b));
});

// --- Structural safety: no filesystem, network, LLM, or relevance logic -------------------------------------------------------

test('authority.js performs no filesystem, network, or LLM access, and implements no relevance/scoring logic', () => {
  const source = fs.readFileSync(AUTHORITY_FILE, 'utf8');

  assert.ok(!source.includes("from 'node:fs'"), 'must not import node:fs');
  assert.ok(!/readFileSync|writeFileSync|readdirSync/.test(source), 'must not touch the filesystem');
  assert.ok(!/node:https?|node:net|node:dgram|\bfetch\(/.test(source), 'must not perform network access');
  assert.ok(!/\.env\b/.test(source), 'must not reference .env');
  // Comments may cite the contract's provenance (legacy/sessions/session_12_.../contrato_context_manifest_v1.md);
  // what must never appear is a runtime path built to actually read from legacy/.
  assert.ok(!/(readFileSync|readdirSync|join|resolve)\([^)]*legacy/.test(source), 'must never read from legacy/ sessions at runtime');
  assert.ok(!/relevance|goal|keyword|embedding/i.test(source), 'must not implement relevance/goal scoring');
});

test('createSource throws when neither path nor identity is given', () => {
  assert.throws(
    () => createSource({ kind: 'documentation', domain: 'history' }),
    /requires either "path" or "identity"/,
  );
});

test('resolveAuthorityConflict requires at least two sources', () => {
  const a = createSource({ kind: 'git', domain: 'repository_state', identity: 'HEAD' });
  assert.throws(() => resolveAuthorityConflict([a]), /at least 2 sources/);
  assert.throws(() => resolveAuthorityConflict([]), /at least 2 sources/);
});
