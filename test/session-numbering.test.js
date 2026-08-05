import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  SESSION_NAME_PATTERN,
  listSessionDirs,
  listNonConformingDirs,
  nextSessionNumber,
  listSessionModules,
  parseSessionFolderName,
  detectLegacyBaseSessions,
} from '../src/utils/session.js';
import { makeTempDir, cleanup } from './helpers.js';

test('SESSION_NAME_PATTERN matches real session names and rejects modules/files', () => {
  assert.equal(SESSION_NAME_PATTERN.test('session_01_autenticacao'), true);
  assert.equal(SESSION_NAME_PATTERN.test('session_11_dashboard_admin'), true);
  assert.equal(SESSION_NAME_PATTERN.test('01_intake'), false);
  assert.equal(SESSION_NAME_PATTERN.test('README.md'), false);
  assert.equal(SESSION_NAME_PATTERN.test('session_01'), false);
  assert.equal(SESSION_NAME_PATTERN.test('Session_01_foo'), false);
});

test('nextSessionNumber returns 1 when Docs/05_sessions has no real session yet', () => {
  const dir = makeTempDir();
  try {
    assert.equal(nextSessionNumber(dir), 1);
    fs.mkdirSync(dir, { recursive: true });
    assert.equal(nextSessionNumber(dir), 1);
  } finally {
    cleanup(dir);
  }
});

test('nextSessionNumber returns 2 once session_01 exists', () => {
  const dir = makeTempDir();
  try {
    fs.mkdirSync(path.join(dir, 'session_01_primeira'));
    assert.equal(nextSessionNumber(dir), 2);
  } finally {
    cleanup(dir);
  }
});

test('nextSessionNumber preserves gaps instead of filling them', () => {
  const dir = makeTempDir();
  try {
    fs.mkdirSync(path.join(dir, 'session_01_um'));
    fs.mkdirSync(path.join(dir, 'session_03_tres'));
    assert.equal(nextSessionNumber(dir), 4);
  } finally {
    cleanup(dir);
  }
});

test('nextSessionNumber ignores files, module-shaped folders, and hidden folders', () => {
  const dir = makeTempDir();
  try {
    fs.mkdirSync(path.join(dir, 'session_01_um'));
    fs.writeFileSync(path.join(dir, 'session_99_arquivo.txt'), 'not a directory');
    fs.mkdirSync(path.join(dir, '01_intake')); // module name, never a session on its own
    fs.mkdirSync(path.join(dir, '.hidden_dir'));
    fs.mkdirSync(path.join(dir, 'session_stuff_no_number')); // doesn't match the pattern
    assert.equal(nextSessionNumber(dir), 2);
  } finally {
    cleanup(dir);
  }
});

test('listSessionDirs only returns directories matching the canonical session name', () => {
  const dir = makeTempDir();
  try {
    fs.mkdirSync(path.join(dir, 'session_01_um'));
    fs.mkdirSync(path.join(dir, 'session_02_dois'));
    fs.mkdirSync(path.join(dir, '01_intake'));
    fs.writeFileSync(path.join(dir, 'README.md'), '# Sessions');
    assert.deepEqual(listSessionDirs(dir), ['session_01_um', 'session_02_dois']);
  } finally {
    cleanup(dir);
  }
});

test('listNonConformingDirs reports directories that are not real sessions', () => {
  const dir = makeTempDir();
  try {
    fs.mkdirSync(path.join(dir, 'session_01_um'));
    fs.mkdirSync(path.join(dir, '01_intake_solto'));
    fs.mkdirSync(path.join(dir, '.hidden'));
    assert.deepEqual(listNonConformingDirs(dir), ['.hidden', '01_intake_solto']);
  } finally {
    cleanup(dir);
  }
});

test('parseSessionFolderName extracts number/slug, or undefined for non-conforming names', () => {
  assert.deepEqual(parseSessionFolderName('session_01_autenticacao'), { number: '01', slug: 'autenticacao' });
  assert.deepEqual(parseSessionFolderName('session_11_dashboard_admin'), { number: '11', slug: 'dashboard_admin' });
  assert.deepEqual(parseSessionFolderName('01_intake'), { number: undefined, slug: undefined });
});

test('listSessionModules returns the 13 official internal modules', () => {
  const modules = listSessionModules();
  assert.equal(modules.length, 13);
  assert.ok(modules.includes('01_intake'));
  assert.ok(modules.includes('05_blocks'));
  assert.ok(modules.includes('09_validation'));
  assert.ok(modules.includes('13_release'));
});

test('detectLegacyBaseSessions finds only the exact pre-1.0 scaffold slugs', () => {
  const dir = makeTempDir();
  try {
    fs.mkdirSync(path.join(dir, 'session_01_project_foundation'));
    fs.mkdirSync(path.join(dir, 'session_05_auth_security'));
    fs.mkdirSync(path.join(dir, 'session_02_autenticacao')); // real, user-named session
    const legacy = detectLegacyBaseSessions(dir);
    assert.deepEqual(legacy.sort(), ['session_01_project_foundation', 'session_05_auth_security']);
  } finally {
    cleanup(dir);
  }
});

test('detectLegacyBaseSessions returns empty when there is no legacy scaffold', () => {
  const dir = makeTempDir();
  try {
    fs.mkdirSync(path.join(dir, 'session_01_autenticacao'));
    assert.deepEqual(detectLegacyBaseSessions(dir), []);
  } finally {
    cleanup(dir);
  }
});
