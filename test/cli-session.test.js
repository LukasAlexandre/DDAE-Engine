import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { listSessionModules } from '../src/utils/session.js';
import { runCli, makeTempDir, cleanup } from './helpers.js';

test('first session created is session_01, second is session_02', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);

    const first = runCli(['session', 'create', 'primeira sessao', '--dir', dir]);
    assert.match(first.stdout, /session_01_primeira_sessao/);
    assert.ok(fs.existsSync(path.join(dir, 'Docs', '05_sessions', 'session_01_primeira_sessao')));

    const second = runCli(['session', 'create', 'segunda sessao', '--dir', dir]);
    assert.match(second.stdout, /session_02_segunda_sessao/);
    assert.ok(fs.existsSync(path.join(dir, 'Docs', '05_sessions', 'session_02_segunda_sessao')));
  } finally {
    cleanup(dir);
  }
});

test('a new session receives all 13 official modules and their files', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['session', 'create', 'autenticacao', '--dir', dir]);

    const sessionDir = path.join(dir, 'Docs', '05_sessions', 'session_01_autenticacao');
    for (const moduleName of listSessionModules()) {
      assert.ok(fs.existsSync(path.join(sessionDir, moduleName)), `missing module ${moduleName}`);
    }
    assert.ok(fs.existsSync(path.join(sessionDir, 'README.md')));
  } finally {
    cleanup(dir);
  }
});

test('session create never overwrites files in an already-existing session folder', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const sessionDir = path.join(dir, 'Docs', '05_sessions', 'session_01_autenticacao');
    const readme = path.join(sessionDir, 'README.md');
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(readme, 'CUSTOM CONTENT MARKER');

    runCli(['session', 'create', 'autenticacao', '--dir', dir]);

    assert.equal(fs.readFileSync(readme, 'utf8'), 'CUSTOM CONTENT MARKER');
  } finally {
    cleanup(dir);
  }
});

test('session create ignores stray files and non-conforming folders when numbering', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const sessionsDir = path.join(dir, 'Docs', '05_sessions');
    runCli(['session', 'create', 'um', '--dir', dir]); // session_01_um
    fs.mkdirSync(path.join(sessionsDir, 'session_03_manual')); // simulates externally created session_03
    fs.writeFileSync(path.join(sessionsDir, 'session_99_arquivo.txt'), 'not a directory');
    fs.mkdirSync(path.join(sessionsDir, '01_intake_solto')); // module-shaped, not a session

    const result = runCli(['session', 'create', 'quatro', '--dir', dir]);
    assert.match(result.stdout, /session_04_quatro/);
  } finally {
    cleanup(dir);
  }
});

test('block, prompt, and feedback creation work end-to-end against a session_01 folder', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['session', 'create', 'primeira sessao', '--dir', dir]);

    const blockResult = runCli(['block', 'create', 'login', '--session', 'session_01_primeira_sessao', '--dir', dir]);
    assert.match(blockResult.stdout, /bloco_01_login\.md/);
    const blockPath = path.join(
      dir, 'Docs', '05_sessions', 'session_01_primeira_sessao', '05_blocks', 'bloco_01_login.md',
    );
    assert.ok(fs.existsSync(blockPath));
    assert.match(fs.readFileSync(blockPath, 'utf8'), /Sessão: 01 \(primeira_sessao\)/);

    const promptResult = runCli([
      'prompt', 'create', '--block', 'bloco_01_login', '--session', 'session_01_primeira_sessao', '--dir', dir,
    ]);
    assert.match(promptResult.stdout, /prompt_bloco_01_login\.md/);
    assert.ok(fs.existsSync(path.join(
      dir, 'Docs', '05_sessions', 'session_01_primeira_sessao', '06_prompts', 'prompt_bloco_01_login.md',
    )));

    const feedbackResult = runCli([
      'feedback', 'create', '--block', 'bloco_01_login', '--session', 'session_01_primeira_sessao', '--dir', dir,
    ]);
    assert.match(feedbackResult.stdout, /feedback_bloco_01_login\.md/);
    assert.ok(fs.existsSync(path.join(
      dir, 'Docs', '05_sessions', 'session_01_primeira_sessao', '08_feedbacks', 'feedback_bloco_01_login.md',
    )));
  } finally {
    cleanup(dir);
  }
});
