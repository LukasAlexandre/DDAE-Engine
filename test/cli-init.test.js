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

// BUG-01 regression: Docs/00_ddae_engine/glossario.md documents {{PROJECT_NAME}}
// and {{CURRENT_DATE}} as literal example tokens in its placeholder table, but
// those two keys are also the ones actively interpolated for every docs_root
// template (including the glossary's own header). Before the fix, the table
// rows rendered with real values instead of the literal token.
test('init generates a glossary where PROJECT_NAME/CURRENT_DATE are interpolated operationally in the header but preserved literally in the placeholder table (BUG-01)', () => {
  const dir = makeTempDir('ddae-bug01-');
  try {
    runCli(['init', '--dir', dir]);
    const content = fs.readFileSync(path.join(dir, 'Docs', '00_ddae_engine', 'glossario.md'), 'utf8');
    const projectName = path.basename(dir);

    // Operational: the header line must show the real project name and a real
    // ISO date, not the literal token.
    const headerLine = content.split('\n').find((line) => line.startsWith('> Projeto:'));
    assert.ok(headerLine, 'expected a "> Projeto:" header line');
    assert.match(headerLine, new RegExp(`Projeto: ${projectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `));
    assert.match(headerLine, /Atualizado em: \d{4}-\d{2}-\d{2}/);
    assert.doesNotMatch(headerLine, /\{\{PROJECT_NAME\}\}|\{\{CURRENT_DATE\}\}/);

    // Documentation: the placeholder table must show the literal tokens, not
    // the real project name or the real date.
    const tableSection = content.split('## 2. Placeholders Reconhecidos pelo CLI')[1] ?? '';
    assert.match(tableSection, /\| `\{\{PROJECT_NAME\}\}` \|/);
    assert.match(tableSection, /\| `\{\{CURRENT_DATE\}\}` \|/);
    assert.ok(!tableSection.includes(`\`${projectName}\``), 'the real project name must not leak into the placeholder table');

    // Placeholders never present in the docs_root data map (SESSION_NUMBER,
    // BLOCK_TITLE, NEXT_BLOCK, ...) must keep working as before: literal by
    // simple absence from the map, same as pre-fix behavior.
    assert.match(tableSection, /\| `\{\{SESSION_NUMBER\}\}` \|/);
    assert.match(content, /\{\{NEXT_BLOCK\}\}/);
  } finally {
    cleanup(dir);
  }
});

test('init glossary generation is deterministic: two projects with the same name produce byte-identical glossaries', () => {
  const parentA = makeTempDir('ddae-bug01-det-a-');
  const parentB = makeTempDir('ddae-bug01-det-b-');
  const fixedName = 'fixed-project-name';
  const dirA = path.join(parentA, fixedName);
  const dirB = path.join(parentB, fixedName);
  try {
    fs.mkdirSync(dirA, { recursive: true });
    fs.mkdirSync(dirB, { recursive: true });
    runCli(['init', '--dir', dirA]);
    runCli(['init', '--dir', dirB]);
    const glossaryA = fs.readFileSync(path.join(dirA, 'Docs', '00_ddae_engine', 'glossario.md'), 'utf8');
    const glossaryB = fs.readFileSync(path.join(dirB, 'Docs', '00_ddae_engine', 'glossario.md'), 'utf8');
    assert.equal(glossaryA, glossaryB);
  } finally {
    cleanup(parentA);
    cleanup(parentB);
  }
});
