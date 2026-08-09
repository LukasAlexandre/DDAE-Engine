import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { collectDdaeContext } from '../src/context/ddae-context.js';
import { listSessionModules } from '../src/utils/session.js';
import { makeTempDir, cleanup } from './helpers.js';

function sessionsDir(root) {
  return path.join(root, 'Docs', '05_sessions');
}

function initDocs(root) {
  fs.mkdirSync(sessionsDir(root), { recursive: true });
}

function createSession(root, folderName, { modules = listSessionModules(), readmeStatus } = {}) {
  const sessionPath = path.join(sessionsDir(root), folderName);
  fs.mkdirSync(sessionPath, { recursive: true });
  for (const moduleName of modules) {
    fs.mkdirSync(path.join(sessionPath, moduleName), { recursive: true });
  }
  if (readmeStatus !== undefined) {
    writeReadmeWithStatus(sessionPath, readmeStatus);
  }
  return sessionPath;
}

function writeReadmeWithStatus(sessionPath, checkedOption) {
  const options = ['Não iniciada', 'Em andamento', 'Concluída', 'Bloqueada'];
  const lines = options.map((option) => `- [${option === checkedOption ? 'x' : ' '}] ${option}`);
  const content = `# Session\n\n## 5. Status\n\n${lines.join('\n')}\n`;
  fs.writeFileSync(path.join(sessionPath, 'README.md'), content, 'utf8');
}

function writeBlock(sessionPath, fileName, number, title) {
  fs.mkdirSync(path.join(sessionPath, '05_blocks'), { recursive: true });
  fs.writeFileSync(
    path.join(sessionPath, '05_blocks', fileName),
    `# Bloco ${number} — ${title}\n\nBody.\n`,
    'utf8',
  );
}

function writeQualityGate(root, fileName, status) {
  const gatesDir = path.join(root, 'Docs', '06_quality_gates');
  fs.mkdirSync(gatesDir, { recursive: true });
  const statusLine = status ? `- [x] ${status}` : '- [ ] Pendente';
  fs.writeFileSync(
    path.join(gatesDir, fileName),
    `# Quality Gate\n\n## 9. Status\n\n${statusLine}\n`,
    'utf8',
  );
}

test('collectDdaeContext returns degraded state without throwing when Docs/ is absent', () => {
  const dir = makeTempDir();
  try {
    const result = collectDdaeContext(dir);

    assert.equal(result.available, false);
    assert.deepEqual(result.sessions, []);
    assert.equal(result.current_session, null);
    assert.deepEqual(result.warnings, [{ code: 'DOCS_NOT_FOUND' }]);
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext handles an initialized Docs/ with zero sessions', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);

    const result = collectDdaeContext(dir);

    assert.equal(result.available, true);
    assert.deepEqual(result.sessions, []);
    assert.equal(result.current_session, null);
    assert.equal(result.selection.reason, 'none');
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext selects the single canonical session when only one exists', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    createSession(dir, 'session_01_first');

    const result = collectDdaeContext(dir);

    assert.equal(result.selection.selected, 'session_01_first');
    assert.equal(result.selection.reason, 'latest_canonical');
    assert.equal(result.current_session.name, 'session_01_first');
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext selects the highest-numbered session when none is requested explicitly', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    createSession(dir, 'session_02_second');
    createSession(dir, 'session_01_first');

    const result = collectDdaeContext(dir);

    assert.equal(result.selection.selected, 'session_02_second');
    assert.equal(result.selection.reason, 'latest_canonical');
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext honors an explicit session selection over the highest-numbered one', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    createSession(dir, 'session_01_first');
    createSession(dir, 'session_02_second');

    const result = collectDdaeContext(dir, { session: 'session_01_first' });

    assert.equal(result.selection.selected, 'session_01_first');
    assert.equal(result.selection.reason, 'explicit');
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext never falls back silently when the explicit session does not exist', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    createSession(dir, 'session_01_first');

    const result = collectDdaeContext(dir, { session: 'session_99_missing' });

    assert.equal(result.selection.selected, null);
    assert.equal(result.selection.reason, 'explicit_not_found');
    assert.equal(result.current_session, null);
    assert.deepEqual(result.warnings, [{ code: 'EXPLICIT_SESSION_NOT_FOUND', session: 'session_99_missing' }]);
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext ignores stray folders that do not match the session naming pattern', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    createSession(dir, 'session_01_first');
    fs.mkdirSync(path.join(sessionsDir(dir), 'not_a_session'), { recursive: true });
    fs.mkdirSync(path.join(sessionsDir(dir), 'session_99'), { recursive: true }); // no slug, non-conforming

    const result = collectDdaeContext(dir);

    assert.deepEqual(result.sessions.map((s) => s.name), ['session_01_first']);
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext never treats an internal module folder as a session', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    fs.mkdirSync(path.join(sessionsDir(dir), '01_intake'), { recursive: true });
    createSession(dir, 'session_01_first');

    const result = collectDdaeContext(dir);

    assert.deepEqual(result.sessions.map((s) => s.name), ['session_01_first']);
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext recognizes all 13 official modules when present', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    createSession(dir, 'session_01_first');

    const result = collectDdaeContext(dir);

    assert.equal(result.current_session.modules.length, 13);
    assert.ok(result.current_session.modules.every((m) => m.exists));
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext reports a missing module deterministically, without throwing', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    const allModules = listSessionModules().filter((m) => m !== '11_security');
    createSession(dir, 'session_01_first', { modules: allModules });

    const result = collectDdaeContext(dir);

    const security = result.current_session.modules.find((m) => m.name === '11_security');
    assert.equal(security.exists, false);
    assert.deepEqual(result.warnings, [
      { code: 'MODULE_MISSING', session: 'session_01_first', module: '11_security' },
    ]);
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext sorts blocks numerically regardless of filesystem/creation order', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    const sessionPath = createSession(dir, 'session_01_first');
    writeBlock(sessionPath, 'bloco_02_second.md', '02', 'Second Block');
    writeBlock(sessionPath, 'bloco_01_first.md', '01', 'First Block');
    writeBlock(sessionPath, 'bloco_10_tenth.md', '10', 'Tenth Block');

    const result = collectDdaeContext(dir);

    assert.deepEqual(
      result.current_session.blocks.map((b) => b.number),
      ['01', '02', '10'],
    );
    assert.equal(result.current_session.blocks[0].title, 'First Block');
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext collects prompts deterministically, associated with their block', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    const sessionPath = createSession(dir, 'session_01_first');
    fs.mkdirSync(path.join(sessionPath, '06_prompts'), { recursive: true });
    fs.writeFileSync(path.join(sessionPath, '06_prompts', 'prompt_bloco_02_second.md'), 'x', 'utf8');
    fs.writeFileSync(path.join(sessionPath, '06_prompts', 'prompt_bloco_01_first.md'), 'x', 'utf8');
    fs.writeFileSync(path.join(sessionPath, '06_prompts', 'README.md'), 'not a prompt', 'utf8');

    const result = collectDdaeContext(dir);

    assert.deepEqual(
      result.current_session.prompts.map((p) => p.name),
      ['prompt_bloco_01_first.md', 'prompt_bloco_02_second.md'],
    );
    assert.equal(result.current_session.prompts[0].block, 'bloco_01_first');
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext collects feedback deterministically, associated with their block', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    const sessionPath = createSession(dir, 'session_01_first');
    fs.mkdirSync(path.join(sessionPath, '08_feedbacks'), { recursive: true });
    fs.writeFileSync(path.join(sessionPath, '08_feedbacks', 'feedback_bloco_01_first.md'), 'x', 'utf8');
    fs.writeFileSync(path.join(sessionPath, '08_feedbacks', 'README.md'), 'not feedback', 'utf8');

    const result = collectDdaeContext(dir);

    assert.deepEqual(
      result.current_session.feedbacks.map((f) => f.name),
      ['feedback_bloco_01_first.md'],
    );
    assert.equal(result.current_session.feedbacks[0].block, 'bloco_01_first');
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext collects the bugs source files as canonical evidence', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    const sessionPath = createSession(dir, 'session_01_first');
    fs.writeFileSync(path.join(sessionPath, '07_bugs', 'bugs_identificados.md'), '# Bugs\nBUG-01', 'utf8');

    const result = collectDdaeContext(dir);

    assert.equal(result.current_session.bugs.identified.exists, true);
    assert.match(result.current_session.bugs.identified.content, /BUG-01/);
    assert.equal(result.current_session.bugs.corrected.exists, false);
    assert.equal(result.current_session.bugs.corrected.content, null);
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext collects validation sources for the current session', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    const sessionPath = createSession(dir, 'session_01_first');
    fs.writeFileSync(path.join(sessionPath, '09_validation', 'fechamento_sessao.md'), 'closed', 'utf8');

    const result = collectDdaeContext(dir);

    assert.deepEqual(result.current_session.validation.map((v) => v.name), ['fechamento_sessao.md']);
    assert.equal(result.current_session.validation[0].content, 'closed');
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext collects tests/security/performance/release sources for the current session', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    const sessionPath = createSession(dir, 'session_01_first');
    fs.writeFileSync(path.join(sessionPath, '10_tests', 'plano_testes.md'), 'a', 'utf8');
    fs.writeFileSync(path.join(sessionPath, '11_security', 'checklist_seguranca.md'), 'b', 'utf8');
    fs.writeFileSync(path.join(sessionPath, '12_performance', 'checklist_performance.md'), 'c', 'utf8');
    fs.writeFileSync(path.join(sessionPath, '13_release', 'release_notes.md'), 'd', 'utf8');

    const result = collectDdaeContext(dir);

    assert.deepEqual(result.current_session.tests.map((t) => t.name), ['plano_testes.md']);
    assert.deepEqual(result.current_session.security.map((t) => t.name), ['checklist_seguranca.md']);
    assert.deepEqual(result.current_session.performance.map((t) => t.name), ['checklist_performance.md']);
    assert.deepEqual(result.current_session.release.map((t) => t.name), ['release_notes.md']);
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext collects the governance decisions source', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    fs.mkdirSync(path.join(dir, 'Docs', '04_governance'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'Docs', '04_governance', 'registro_decisoes.md'), 'DEC-01', 'utf8');

    const result = collectDdaeContext(dir);

    assert.equal(result.governance.decisions.exists, true);
    assert.match(result.governance.decisions.content, /DEC-01/);
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext collects quality gate statuses deterministically', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    writeQualityGate(dir, 'architecture_gate.md', 'Aprovado');
    writeQualityGate(dir, 'security_gate.md', null);

    const result = collectDdaeContext(dir);

    const architecture = result.governance.quality_gates.find((g) => g.name === 'architecture_gate.md');
    const security = result.governance.quality_gates.find((g) => g.name === 'security_gate.md');
    const deploy = result.governance.quality_gates.find((g) => g.name === 'deploy_gate.md');

    assert.equal(architecture.exists, true);
    assert.equal(architecture.status, 'Aprovado');
    assert.equal(security.status, null);
    assert.equal(deploy.exists, false);
    assert.equal(result.governance.quality_gates.length, 7);
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext reads the session status from a structured checkbox, not free text', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    createSession(dir, 'session_01_first', { readmeStatus: 'Em andamento' });

    const result = collectDdaeContext(dir);

    assert.equal(result.current_session.status, 'Em andamento');
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext never scans legacy/sessions/, even when it contains DDAE-shaped content', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    createSession(dir, 'session_01_first');

    const legacySession = path.join(dir, 'legacy', 'sessions', 'session_99_legacy');
    fs.mkdirSync(path.join(legacySession, '07_bugs'), { recursive: true });
    fs.writeFileSync(path.join(legacySession, '07_bugs', 'bugs_identificados.md'), 'LEGACY-BUG-SENTINEL', 'utf8');
    fs.mkdirSync(path.join(dir, 'legacy', 'sessions', 'session_99_legacy', '04_governance'), { recursive: true });

    const result = collectDdaeContext(dir);
    const serialized = JSON.stringify(result);

    assert.ok(!serialized.includes('LEGACY-BUG-SENTINEL'));
    assert.ok(!serialized.includes('session_99_legacy'));
    assert.deepEqual(result.sessions.map((s) => s.name), ['session_01_first']);
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext never returns absolute paths', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    const sessionPath = createSession(dir, 'session_01_first');
    writeBlock(sessionPath, 'bloco_01_first.md', '01', 'First');

    const result = collectDdaeContext(dir);
    const serialized = JSON.stringify(result);

    assert.ok(!serialized.includes(dir));
    assert.ok(!/[A-Za-z]:\\/.test(serialized));
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext normalizes all paths to forward slashes', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    createSession(dir, 'session_01_first');

    const result = collectDdaeContext(dir);

    assert.equal(result.current_session.path, 'Docs/05_sessions/session_01_first');
    assert.ok(!result.current_session.path.includes('\\'));
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext is deterministic across repeated calls on an unchanged filesystem', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    const sessionPath = createSession(dir, 'session_01_first', { readmeStatus: 'Em andamento' });
    writeBlock(sessionPath, 'bloco_01_first.md', '01', 'First');
    writeQualityGate(dir, 'architecture_gate.md', 'Aprovado');

    const first = collectDdaeContext(dir);
    const second = collectDdaeContext(dir);

    assert.deepEqual(first, second);
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext never follows a symlinked session away from projectRoot', (t) => {
  const dir = makeTempDir();
  const target = makeTempDir('ddae-context-ddae-symlink-target-');
  try {
    initDocs(dir);
    fs.mkdirSync(path.join(target, '01_intake'), { recursive: true });
    const linkPath = path.join(sessionsDir(dir), 'session_01_first');
    try {
      fs.symlinkSync(target, linkPath, 'dir');
    } catch (error) {
      t.skip(`symlink creation not permitted in this environment: ${error.code}`);
      return;
    }

    const result = collectDdaeContext(dir);

    assert.deepEqual(result.sessions, []);
    assert.equal(result.current_session, null);
  } finally {
    cleanup(dir);
    cleanup(target);
  }
});

test('collectDdaeContext never reads arbitrary project content outside Docs/', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    createSession(dir, 'session_01_first');
    fs.writeFileSync(path.join(dir, '.env'), 'SUPER_SECRET_SHOULD_NEVER_BE_READ=sentinel-value', 'utf8');
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src', 'index.js'), 'ARBITRARY_PROJECT_CODE_SENTINEL', 'utf8');

    const result = collectDdaeContext(dir);
    const serialized = JSON.stringify(result);

    assert.ok(!serialized.includes('SUPER_SECRET_SHOULD_NEVER_BE_READ'));
    assert.ok(!serialized.includes('ARBITRARY_PROJECT_CODE_SENTINEL'));
  } finally {
    cleanup(dir);
  }
});

test('collectDdaeContext throws a structured error for a non-existent projectRoot', () => {
  const dir = makeTempDir();
  try {
    const missing = path.join(dir, 'does-not-exist');
    assert.throws(() => collectDdaeContext(missing), /projectRoot does not exist or is not a directory/);
  } finally {
    cleanup(dir);
  }
});
