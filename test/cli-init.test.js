import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, makeTempDir, cleanup } from './helpers.js';

test('init does not pre-create any session', () => {
  const dir = makeTempDir();
  try {
    const result = runCli(['init', '--dir', dir]);
    assert.equal(result.status, 0);

    const sessionsDir = path.join(dir, 'Docs', '05_sessions');
    const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });
    const sessionDirs = entries.filter((e) => e.isDirectory());
    assert.equal(sessionDirs.length, 0, 'Docs/05_sessions/ must contain no session directories after init');
  } finally {
    cleanup(dir);
  }
});

test('init creates Docs/05_sessions/README.md explaining the session model', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const readmePath = path.join(dir, 'Docs', '05_sessions', 'README.md');
    assert.ok(fs.existsSync(readmePath));
    const content = fs.readFileSync(readmePath, 'utf8');
    assert.match(content, /session_01/);
  } finally {
    cleanup(dir);
  }
});

test('init still creates the rest of the official Docs/ structure', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const docsDir = path.join(dir, 'Docs');
    for (const folder of [
      '00_ddae_engine', '01_product', '02_architecture', '03_contracts',
      '04_governance', '05_sessions', '06_quality_gates', '07_design_system',
      '08_deploy', '09_observability', '99_archive',
    ]) {
      assert.ok(fs.existsSync(path.join(docsDir, folder)), `missing Docs/${folder}`);
    }
    assert.ok(fs.existsSync(path.join(docsDir, '00_ddae_engine', 'metodologia.md')));
    assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md')));
    assert.ok(fs.existsSync(path.join(dir, 'AGENTS.md')));
    assert.ok(fs.existsSync(path.join(dir, '.cursorrules')));
    assert.ok(fs.existsSync(path.join(dir, 'ddae-engine.config.json')));
  } finally {
    cleanup(dir);
  }
});

test('init does not overwrite existing files without --force', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const readmePath = path.join(dir, 'Docs', '05_sessions', 'README.md');
    fs.writeFileSync(readmePath, 'CUSTOM CONTENT MARKER');

    const result = runCli(['init', '--dir', dir]);
    assert.match(result.stdout, /Skipped/);
    assert.equal(fs.readFileSync(readmePath, 'utf8'), 'CUSTOM CONTENT MARKER');
  } finally {
    cleanup(dir);
  }
});
