import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { makeTempDir, cleanup, runCli } from './helpers.js';
import { createSource, resolveAuthorityConflict } from '../src/context/authority.js';
import { compileContext } from '../src/context/compiler.js';

// Real Consumer Smoke (Bloco 09) — proves the Context Compiler end to end
// against a realistic consumer project: real Git state, a real canonical
// session, domain source/docs/architecture/decision/bug/validation content,
// an unrelated document sized to trigger real budget pressure, a binary
// file, and a secret sentinel. One expensive fixture is built once (module
// scope, via `before`), and every test below is a read-only assertion
// against its already-built .ddae/context/ package — this mirrors the
// "one heavy setup, many light assertions" shape already used by the
// distribution smoke script, adapted for node:test's before/after hooks.

const SENTINEL = 'DDAE_CONSUMER_SMOKE_SECRET_91B7F2';

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function write(dir, relativePath, content) {
  const target = path.join(dir, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

let dir;
let sessionName;
let gitBranch;
let gitHead;
let manifest;
let contextMd;
let buildResult;
let showResult;
let validateResult;

before(() => {
  dir = makeTempDir('ddae-consumer-smoke-');

  runCli(['init', '--dir', dir]);
  const sessionResult = runCli(['session', 'create', 'Auditoria Usuarios', '--dir', dir]);
  sessionName = sessionResult.stdout.match(/session_\d+_[a-z0-9_]+/)[0];

  write(dir, 'src/auditoria_usuarios.js', 'function auditoriaUsuarios(usuarios) {\n  return usuarios.filter((u) => u.suspeito);\n}\nmodule.exports = { auditoriaUsuarios };\n');
  write(dir, 'src/usuarios.js', 'function listarUsuarios() {\n  return [];\n}\nmodule.exports = { listarUsuarios };\n');
  write(dir, 'src/auth.js', 'function autenticar(usuario) {\n  return Boolean(usuario);\n}\nmodule.exports = { autenticar };\n');
  write(dir, 'test/auditoria_usuarios.test.js', "const assert = require('assert');\n// teste de auditoria de usuarios\nassert.ok(true);\n");
  write(dir, 'Docs/02_architecture/auditoria_usuarios.md', '# Arquitetura — Auditoria de Usuarios\n\nA auditoria de usuarios roda em lote, consultando o histórico de acesso.\n');

  const registroDecisoes = fs.readFileSync(path.join(dir, 'Docs/04_governance/registro_decisoes.md'), 'utf8');
  write(dir, 'Docs/04_governance/registro_decisoes.md', `${registroDecisoes}\n## DEC-01 — Auditoria de Usuarios\n\nDecidimos implementar a auditoria de usuarios como job assíncrono, registrando cada acesso suspeito.\n`);

  write(dir, `Docs/05_sessions/${sessionName}/07_bugs/bugs_identificados.md`, '# Bugs Identificados\n\n## BUG-AUD-01 — Auditoria de usuarios não registra IP\n\nA auditoria de usuarios atualmente não registra o IP de origem do acesso suspeito.\n');
  write(dir, `Docs/05_sessions/${sessionName}/09_validation/validacao_auditoria.md`, '# Validação — Auditoria de Usuarios\n\nTestes de auditoria de usuarios executados: 12 passaram, 0 falharam.\n');

  // Unrelated document, sized (~11 KB, well under the Guard's 256 KiB
  // limit) so that under budget pressure it competes for space with the
  // relevant sources above and loses — proving budget-driven exclusion,
  // never a relevance-score threshold (Relevance Engine v1 has none).
  const roadmapParagraph = 'Este é um parágrafo de roadmap futuro totalmente não relacionado ao trabalho atual, cobrindo integrações de terceiros, expansão internacional e parcerias estratégicas de longo prazo. '.repeat(60);
  write(dir, 'Docs/01_product/roadmap_future.md', `# Roadmap Futuro\n\n${roadmapParagraph}\n`);

  write(dir, 'assets/logo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 1, 2, 3]));
  write(dir, '.env', `API_KEY=${SENTINEL}\n`);

  git(['init', '-q'], dir);
  git(['config', 'user.name', 'DDAE Consumer Smoke'], dir);
  git(['config', 'user.email', 'consumer-smoke@example.invalid'], dir);
  git(['add', '-A'], dir);
  git(['commit', '-q', '-m', 'initial consumer state'], dir);
  gitBranch = git(['branch', '--show-current'], dir).trim();
  gitHead = git(['rev-parse', 'HEAD'], dir).trim();

  buildResult = runCli(['context', 'build', '--goal', 'Adicionar auditoria de usuários', '--dir', dir]);
  showResult = runCli(['context', 'show', '--dir', dir]);
  validateResult = runCli(['context', 'validate', '--dir', dir]);

  manifest = JSON.parse(fs.readFileSync(path.join(dir, '.ddae', 'context', 'manifest.json'), 'utf8'));
  contextMd = fs.readFileSync(path.join(dir, '.ddae', 'context', 'CONTEXT.md'), 'utf8');
});

after(() => {
  cleanup(dir);
});

function relevantEntry(relativePath) {
  return manifest.relevant_files.find((entry) => entry.path === relativePath);
}
function sourceOf(entry) {
  return manifest.sources.find((source) => source.id === entry.source_id);
}

// 1-4. consumer initializes, session created, Git available, build works
test('1-4. the consumer initializes, a canonical session is created, Git is available, and build succeeds', () => {
  assert.equal(buildResult.status, 0);
  assert.match(sessionName, /^session_\d+_auditoria_usuarios$/);
  assert.equal(manifest.git.available, true);
});

// 5-6. show and validate work
test('5-6. show and validate succeed against the built package', () => {
  assert.equal(showResult.status, 0);
  assert.equal(validateResult.status, 0);
});

// 7. correct current session
test('7. the manifest records the correct current session', () => {
  assert.equal(manifest.session.id, sessionName);
  assert.equal(manifest.session.selection_reason, 'latest_canonical');
});

// 8-9. Git HEAD and branch correct
test('8-9. the manifest records the real Git HEAD and branch', () => {
  assert.equal(manifest.git.head, gitHead);
  assert.equal(manifest.git.branch, gitBranch);
  assert.equal(manifest.git.working_tree, 'clean');
});

// 10. relevant source_code selected
test('10. relevant source code is selected into relevant_files', () => {
  assert.ok(relevantEntry('src/auditoria_usuarios.js'), 'src/auditoria_usuarios.js should be selected');
});

// 11. architecture source selected
test('11. the architecture source is selected and classified correctly', () => {
  const entry = relevantEntry('Docs/02_architecture/auditoria_usuarios.md');
  assert.ok(entry);
  assert.equal(sourceOf(entry).kind, 'architecture');
  assert.equal(sourceOf(entry).authority_class, 'architecture_intent');
});

// 12. decision source selected
test('12. the decision source is selected and classified correctly under the default budget', () => {
  const entry = relevantEntry('Docs/04_governance/registro_decisoes.md');
  assert.ok(entry, 'the decision file should fit under the default (standard) budget');
  assert.equal(sourceOf(entry).kind, 'decision');
  assert.equal(sourceOf(entry).authority_class, 'architecture_intent');
  assert.ok(entry.content.includes('DEC-01'));
});

// 13. bug source selected
test('13. the bug source is selected and classified correctly', () => {
  const entry = relevantEntry(`Docs/05_sessions/${sessionName}/07_bugs/bugs_identificados.md`);
  assert.ok(entry);
  assert.equal(sourceOf(entry).kind, 'bug');
  assert.equal(sourceOf(entry).authority_class, 'active_bug_state');
  assert.ok(entry.content.includes('BUG-AUD-01'));
});

// 14. validation source selected
test('14. the validation source is selected and classified correctly', () => {
  const entry = relevantEntry(`Docs/05_sessions/${sessionName}/09_validation/validacao_auditoria.md`);
  assert.ok(entry);
  assert.equal(sourceOf(entry).kind, 'validation');
  assert.equal(sourceOf(entry).authority_class, 'test_result');
});

// 15. test file remains source_code/runtime_metadata
test('15. the .test.js file is classified as source_code, never test_result, just for its name', () => {
  const entry = relevantEntry('test/auditoria_usuarios.test.js');
  assert.ok(entry);
  assert.equal(sourceOf(entry).kind, 'source_code');
  assert.equal(sourceOf(entry).authority_class, 'runtime_metadata');
});

// 16. provenance complete
test('16. every selected source carries complete provenance (id, kind, path, authority_class, content_hash)', () => {
  for (const entry of manifest.relevant_files) {
    const source = sourceOf(entry);
    assert.ok(source, `source for ${entry.path} must exist in manifest.sources`);
    assert.ok(source.id);
    assert.ok(source.kind);
    assert.equal(source.path, entry.path);
    assert.ok(source.authority_class);
    assert.match(source.content_hash, /^[0-9a-f]{64}$/);
  }
});

// 17. core relevance > unrelated roadmap
test('17. every core domain file ranks above the unrelated roadmap document', () => {
  const roadmapEntry = relevantEntry('Docs/01_product/roadmap_future.md');
  const roadmapExcluded = manifest.excluded_sources.find((e) => e.path === 'Docs/01_product/roadmap_future.md');
  // Under the default (standard) budget the roadmap is excluded outright;
  // if it were ever selected, it must still rank below every core file.
  const coreScores = [
    relevantEntry('src/auditoria_usuarios.js')?.score,
    relevantEntry('Docs/02_architecture/auditoria_usuarios.md')?.score,
    relevantEntry(`Docs/05_sessions/${sessionName}/07_bugs/bugs_identificados.md`)?.score,
    relevantEntry(`Docs/05_sessions/${sessionName}/09_validation/validacao_auditoria.md`)?.score,
  ].filter((score) => score !== undefined);
  assert.ok(coreScores.length >= 4, 'all four core sources should be selected under the default budget');
  if (roadmapEntry) {
    assert.ok(coreScores.every((score) => score >= roadmapEntry.score));
  } else {
    assert.ok(roadmapExcluded, 'the roadmap should be excluded rather than silently missing');
  }
});

// 18. budget-pressure exclusion correct (dedicated minimal-budget build)
test('18. under minimal budget pressure, the unrelated roadmap is excluded with reason budget_exceeded — never a score threshold', () => {
  const pressureDir = makeTempDir('ddae-consumer-smoke-pressure-');
  try {
    runCli(['init', '--dir', pressureDir]);
    write(pressureDir, 'Docs/02_architecture/auditoria_usuarios.md', '# Arquitetura — Auditoria de Usuarios\n\nA auditoria de usuarios roda em lote.\n');
    const roadmapParagraph = 'Roadmap futuro não relacionado, expansão internacional, parcerias estratégicas de longo prazo. '.repeat(80);
    write(pressureDir, 'Docs/01_product/roadmap_future.md', `# Roadmap Futuro\n\n${roadmapParagraph}\n`);
    const result = runCli(['context', 'build', '--goal', 'Adicionar auditoria de usuários', '--budget', 'minimal', '--dir', pressureDir]);
    assert.equal(result.status, 0);
    const pressureManifest = JSON.parse(fs.readFileSync(path.join(pressureDir, '.ddae', 'context', 'manifest.json'), 'utf8'));
    const roadmapExclusion = pressureManifest.excluded_sources.find((e) => e.path === 'Docs/01_product/roadmap_future.md');
    assert.ok(roadmapExclusion, 'roadmap should be excluded under minimal budget pressure');
    assert.equal(roadmapExclusion.reason, 'budget_exceeded');
    // Zero-score sources are still valid citizens of the ranking — this
    // exclusion happened because it didn't fit the budget, not because a
    // relevance threshold rejected it (Relevance Engine v1 has none).
    assert.equal(typeof roadmapExclusion.score, 'number');
  } finally {
    cleanup(pressureDir);
  }
});

// 19. .env excluded
test('19. the .env file is excluded by name, never becoming a Source', () => {
  const envExclusion = manifest.excluded_sources.find((e) => e.path === '.env');
  assert.ok(envExclusion);
  assert.equal(envExclusion.reason, 'sensitive_name');
  assert.ok(!manifest.sources.some((s) => s.path === '.env'));
});

// 20. sentinel zero leak
test('20. the secret sentinel leaks nowhere: manifest, CONTEXT.md, validation.json, build/show/validate stdout+stderr', () => {
  const validationText = fs.readFileSync(path.join(dir, '.ddae', 'context', 'validation.json'), 'utf8');
  for (const [label, text] of [
    ['manifest.json', JSON.stringify(manifest)],
    ['CONTEXT.md', contextMd],
    ['validation.json', validationText],
    ['build stdout', buildResult.stdout],
    ['build stderr', buildResult.stderr ?? ''],
    ['show stdout', showResult.stdout],
    ['validate stdout', validateResult.stdout],
  ]) {
    assert.ok(!text.includes(SENTINEL), `${label} must never contain the sentinel secret`);
  }
});

// 21. binary não ingerido
test('21. the binary asset never becomes a Source', () => {
  assert.ok(!manifest.sources.some((s) => s.path === 'assets/logo.png'));
});

// 22. no absolute paths
test('22. no absolute filesystem path appears in the manifest or CONTEXT.md', () => {
  const allPaths = [
    ...manifest.sources.map((s) => s.path),
    ...manifest.relevant_files.map((f) => f.path),
    ...manifest.excluded_sources.map((e) => e.path),
  ].filter(Boolean);
  for (const candidatePath of allPaths) {
    assert.ok(!/^[A-Za-z]:[\\/]/.test(candidatePath));
    assert.ok(!candidatePath.startsWith('/'));
  }
  const dirSlash = dir.split(path.sep).join('/');
  assert.ok(!JSON.stringify(manifest).includes(dirSlash));
  assert.ok(!contextMd.includes(dirSlash));
});

// 23. CONTEXT.md agent-readiness
test('23. CONTEXT.md alone lets an agent identify goal, Git state, session, and the core feature files with provenance', () => {
  assert.match(contextMd, /## Goal\n\nAdicionar auditoria de usuários/);
  assert.match(contextMd, new RegExp(`Branch: \`${gitBranch}\``));
  assert.match(contextMd, new RegExp(`HEAD: \`${gitHead}\``));
  assert.match(contextMd, new RegExp(`ID: \`${sessionName}\``));
  assert.ok(contextMd.includes('src/auditoria_usuarios.js'));
  assert.ok(contextMd.includes('DEC-01'));
  assert.ok(contextMd.includes('BUG-AUD-01'));
  assert.ok(contextMd.includes('Testes de auditoria de usuarios executados'));
  assert.ok(contextMd.includes('Kind: `decision`'));
  assert.ok(contextMd.includes('Kind: `bug`'));
  assert.ok(contextMd.includes('Kind: `validation`'));
});

// 24. repeated build byte-identical
test('24. a repeated build over the same unchanged state is byte-identical', () => {
  const paths = {
    manifest: path.join(dir, '.ddae', 'context', 'manifest.json'),
    contextMd: path.join(dir, '.ddae', 'context', 'CONTEXT.md'),
    validation: path.join(dir, '.ddae', 'context', 'validation.json'),
  };
  const before2 = Object.fromEntries(Object.entries(paths).map(([k, p]) => [k, fs.readFileSync(p, 'utf8')]));
  runCli(['context', 'build', '--goal', 'Adicionar auditoria de usuários', '--dir', dir]);
  const after2 = Object.fromEntries(Object.entries(paths).map(([k, p]) => [k, fs.readFileSync(p, 'utf8')]));
  assert.deepEqual(after2, before2);
});

// 25. fingerprint stable
test('25. the fingerprint is present and stable', () => {
  assert.equal(manifest.fingerprint.algorithm, 'sha256');
  assert.match(manifest.fingerprint.value, /^[0-9a-f]{64}$/);
});

// 26-27. source mutation -> STALE / SOURCE_CONTENT_CHANGED
test('26-27. mutating a selected source without rebuilding makes validate report STALE with SOURCE_CONTENT_CHANGED', () => {
  const filePath = path.join(dir, 'src', 'auditoria_usuarios.js');
  const original = fs.readFileSync(filePath, 'utf8');
  try {
    fs.writeFileSync(filePath, `${original}\n// mutated for staleness proof\n`);
    const result = runCli(['context', 'validate', '--dir', dir]);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Status: STALE/);
    assert.match(result.stdout, /SOURCE_CONTENT_CHANGED/);
  } finally {
    fs.writeFileSync(filePath, original);
  }
});

// 28. show read-only
test('28. show never modifies the context package', () => {
  const manifestPath = path.join(dir, '.ddae', 'context', 'manifest.json');
  const before2 = fs.readFileSync(manifestPath, 'utf8');
  runCli(['context', 'show', '--dir', dir]);
  const after2 = fs.readFileSync(manifestPath, 'utf8');
  assert.equal(after2, before2);
});

// 29. validate read-only
test('29. validate never modifies the context package', () => {
  const manifestPath = path.join(dir, '.ddae', 'context', 'manifest.json');
  const before2 = fs.readFileSync(manifestPath, 'utf8');
  runCli(['context', 'validate', '--dir', dir]);
  const after2 = fs.readFileSync(manifestPath, 'utf8');
  assert.equal(after2, before2);
});

// 30. structured fact state documented, without NLP
test('30. structured fact arrays (decisions/bugs/validation) stay empty by design — no NLP extraction — while the same content remains fully available via Relevant Files', () => {
  assert.deepEqual(manifest.decisions, []);
  assert.deepEqual(manifest.bugs, []);
  assert.deepEqual(manifest.validation, []);
  assert.deepEqual(manifest.conflicts, []);
  // The Renderer's dedicated convenience sections therefore read empty —
  // this is a known, documented characteristic (Bloco 08 contract: facts
  // are only ever populated from explicit, formally-structured input, and
  // the CLI never fabricates that input from ingested content). The actual
  // decision/bug/validation text is still present and correctly labeled
  // under Relevant Files (asserted in tests #12-14/#23 above), which is
  // what keeps the package objectively sufficient for an agent.
  const decisionsSection = contextMd.split('## Decisions')[1]?.split('## Constraints')[0] ?? '';
  const bugsSection = contextMd.split('## Known Bugs')[1]?.split('## Validation')[0] ?? '';
  assert.match(decisionsSection, /None recorded\./);
  assert.match(bugsSection, /None recorded\./);
});

// --- Authority gate (Etapa 19) ---------------------------------------------
//
// The CLI never groups claims on its own — `manifest.conflicts` is
// legitimately empty above because no explicit claim group was ever
// declared to compileContext(). This does not mean the Authority Model is
// unreachable in a real consumer workflow: an explicit caller (a future
// block, or a script wrapping this same API) can still hand compileContext
// a claim group naming exactly which Sources are competing claims about
// the same fact — using data shaped like this consumer's own content, not
// synthetic authority.js fixtures, and without altering authority.js.

test('Authority gate A. every selected source in the real consumer package carries a coherent authority_class', () => {
  for (const source of manifest.sources) {
    assert.ok(
      ['repository_state', 'runtime_metadata', 'architecture_intent', 'test_result', 'active_bug_state', 'future_intent', 'history'].includes(source.authority_class),
      `unexpected authority_class "${source.authority_class}" for ${source.path}`,
    );
  }
});

test('Authority gate B. an explicit claim (historical roadmap vs. current approved decision, both drawn from this consumer) resolves in favor of the current decision, with the roadmap preserved', () => {
  const historicalRoadmap = createSource({
    kind: 'documentation',
    domain: 'history',
    path: 'Docs/01_product/roadmap_future.md',
    content: 'Roadmap antigo: auditoria de usuarios síncrona, sem registro de acesso suspeito.',
  });
  const currentDecision = createSource({
    kind: 'decision',
    domain: 'architecture_intent',
    path: 'Docs/04_governance/registro_decisoes.md',
    section: 'DEC-01',
    content: 'Decidimos implementar a auditoria de usuarios como job assíncrono, registrando cada acesso suspeito.',
  });

  const directResult = resolveAuthorityConflict([historicalRoadmap, currentDecision]);
  assert.equal(directResult.status, 'resolved');
  assert.equal(directResult.winner.source_id, currentDecision.id);
  assert.equal(directResult.conflicting_sources[0].source_id, historicalRoadmap.id);
  assert.equal(directResult.conflicting_sources[0].reason_superseded, 'current_architecture_intent_over_history');

  // Same proof, through the real Compiler entry point (compileContext),
  // using an explicit claims array — never inferred from text similarity.
  const compiledManifest = compileContext({
    engineVersion: '0.2.0',
    project: { name: 'consumer-authority-proof', root_kind: 'ddae' },
    goal: 'Adicionar auditoria de usuários',
    gitContext: { available: false, repository: false, branch: null, head: null, working_tree: null },
    ddaeContext: { available: false, current_session: null, selection: { requested: null, selected: null, reason: 'none' } },
    candidates: [],
    claims: [{
      id: 'claim-auditoria-usuarios',
      domain: 'architecture_intent',
      entries: [{ source: historicalRoadmap, value: 'sync' }, { source: currentDecision, value: 'async' }],
    }],
  });
  assert.equal(compiledManifest.conflicts.length, 1);
  assert.equal(compiledManifest.conflicts[0].status, 'resolved');
  assert.equal(compiledManifest.conflicts[0].winner.source_id, currentDecision.id);
  assert.equal(compiledManifest.conflicts[0].conflicting_sources[0].source_id, historicalRoadmap.id);
});
