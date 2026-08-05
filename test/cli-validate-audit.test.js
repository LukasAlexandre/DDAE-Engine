import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, makeTempDir, cleanup } from './helpers.js';

test('validate accepts a freshly initialized project with zero sessions', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const result = runCli(['validate', '--dir', dir]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Sessions found: 0/);
    assert.match(result.stdout, /Status: OK/);
  } finally {
    cleanup(dir);
  }
});

test('validate reports the real session count once sessions exist', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['session', 'create', 'um', '--dir', dir]);
    runCli(['session', 'create', 'dois', '--dir', dir]);
    const result = runCli(['validate', '--dir', dir]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Sessions found: 2/);
  } finally {
    cleanup(dir);
  }
});

test('validate flags duplicate session numbers as an error', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const sessionsDir = path.join(dir, 'Docs', '05_sessions');
    fs.mkdirSync(path.join(sessionsDir, 'session_01_um'));
    fs.mkdirSync(path.join(sessionsDir, 'session_01_outro_nome'));
    const result = runCli(['validate', '--dir', dir]);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Numeração de sessão duplicada/);
  } finally {
    cleanup(dir);
  }
});

test('validate detects duplicate numbering even when one folder uses a non-padded number', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const sessionsDir = path.join(dir, 'Docs', '05_sessions');
    fs.mkdirSync(path.join(sessionsDir, 'session_1_um')); // non-canonical padding, still matches \d+
    fs.mkdirSync(path.join(sessionsDir, 'session_01_outro_nome'));
    const result = runCli(['validate', '--dir', dir]);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Numeração de sessão duplicada \(número 1\)/);
  } finally {
    cleanup(dir);
  }
});

test('audit distinguishes "no sessions yet" from a real session list', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const empty = runCli(['audit', '--dir', dir]);
    assert.match(empty.stdout, /Sessions found: 0/);
    assert.match(empty.stdout, /Nenhuma sessão criada ainda/);

    runCli(['session', 'create', 'autenticacao', '--dir', dir]);
    const withSession = runCli(['audit', '--dir', dir]);
    assert.match(withSession.stdout, /Sessions found: 1/);
    assert.match(withSession.stdout, /session_01_autenticacao: vazia/);
  } finally {
    cleanup(dir);
  }
});

test('audit never lists internal modules as if they were sessions', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['session', 'create', 'autenticacao', '--dir', dir]);
    const result = runCli(['audit', '--dir', dir]);
    const sessionsBlock = result.stdout.split('\nSessions:\n')[1]?.split('\n\n')[0] ?? '';
    assert.doesNotMatch(sessionsBlock, /01_intake/);
    assert.doesNotMatch(sessionsBlock, /05_blocks/);
    assert.match(sessionsBlock, /session_01_autenticacao/);
  } finally {
    cleanup(dir);
  }
});

test('validate and audit flag a session missing a required module', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['session', 'create', 'incompleta', '--dir', dir]);
    const modulePath = path.join(dir, 'Docs', '05_sessions', 'session_01_incompleta', '11_security');
    fs.rmSync(modulePath, { recursive: true, force: true });

    const validateResult = runCli(['validate', '--dir', dir]);
    assert.equal(validateResult.status, 0, 'a missing module is a warning, not a validation failure');
    assert.match(validateResult.stdout, /Sessão sem módulo obrigatório \(11_security\)/);

    const auditResult = runCli(['audit', '--dir', dir]);
    assert.match(auditResult.stdout, /Sessão sem módulo obrigatório \(falta 11_security\)/);
  } finally {
    cleanup(dir);
  }
});

test('audit detects a legacy pre-1.0 session scaffold without deleting anything', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const sessionsDir = path.join(dir, 'Docs', '05_sessions');
    const legacyDir = path.join(sessionsDir, 'session_01_project_foundation');
    fs.mkdirSync(legacyDir);

    const result = runCli(['audit', '--dir', dir]);
    assert.match(result.stdout, /legada/);
    assert.match(result.stdout, /session_01_project_foundation/);
    assert.ok(fs.existsSync(legacyDir), 'legacy session folder must not be deleted by audit');
  } finally {
    cleanup(dir);
  }
});
