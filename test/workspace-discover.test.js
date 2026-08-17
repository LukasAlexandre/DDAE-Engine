import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { discoverWorkspaceState } from '../src/workspace/discover.js';
import { makeTempDir, cleanup } from './helpers.js';

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function initRepo(dir) {
  git(['init', '-q', '-b', 'main'], dir);
  git(['config', 'user.name', 'DDAE Test'], dir);
  git(['config', 'user.email', 'ddae-test@example.invalid'], dir);
  git(['config', 'core.autocrlf', 'false'], dir);
}

function commitAll(dir, message) {
  git(['add', '-A'], dir);
  git(['commit', '-q', '-m', message], dir);
}

function write(root, relPath, content) {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
}

function docsRoot(root) {
  return path.join(root, 'Docs');
}

function initDocs(root) {
  fs.mkdirSync(path.join(docsRoot(root), '05_sessions'), { recursive: true });
}

function writeSessionReadme(root, sessionName, status = 'Em andamento') {
  const options = ['Não iniciada', 'Em andamento', 'Concluída', 'Bloqueada'];
  const lines = options.map((option) => `- [${option === status ? 'x' : ' '}] ${option}`);
  write(root, `Docs/05_sessions/${sessionName}/README.md`, `# ${sessionName}\n\n## 5. Status\n\n${lines.join('\n')}\n`);
}

function writeBlock(root, sessionName, fileName, number, title, body = 'Body.\n') {
  write(root, `Docs/05_sessions/${sessionName}/05_blocks/${fileName}`, `# Bloco ${number} — ${title}\n\n${body}`);
}

function writeBugsTable(root, sessionName, rows) {
  const header = '| ID | Descrição | Severidade | Onde foi encontrado | Status |\n|---|---|---|---|---|\n';
  const body = rows.map((row) => `| ${row.id} | ${row.summary} | ${row.severity} | ${row.where} | ${row.status} |`).join('\n');
  write(root, `Docs/05_sessions/${sessionName}/07_bugs/bugs_identificados.md`, `# Bugs\n\n## 1. Lista de Bugs\n\n${header}${body}\n`);
}

function writeRisksTable(root, rows) {
  const header = '| ID | Risco | Área | Probabilidade | Impacto | Status |\n|---|---|---|---|---|---|\n';
  const body = rows.map((row) => `| ${row.id} | ${row.summary} | ${row.area} | ${row.prob} | ${row.impact} | ${row.status} |`).join('\n');
  write(root, 'Docs/04_governance/matriz_riscos.md', `# Matriz\n\n## 2. Riscos\n\n${header}${body}\n`);
}

function writeDecisions(root, entries) {
  const body = entries.map((entry) => `### ${entry.id} — ${entry.title}\n\n- **Status:** Vigente\n`).join('\n');
  write(root, 'Docs/04_governance/registro_decisoes.md', `# Registro de Decisões\n\n## 2. Decisões\n\n${body}`);
}

function snapshotTree(root) {
  const entries = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      if (name === '.git') continue;
      const abs = path.join(dir, name);
      const stat = fs.lstatSync(abs);
      entries.push(`${path.relative(root, abs)}:${stat.isDirectory() ? 'dir' : stat.size}`);
      if (stat.isDirectory()) walk(abs);
    }
  };
  walk(root);
  return entries;
}

test('1. basic snapshot on an empty project (no Docs/, no git repo) never throws and reports degraded state', () => {
  const dir = makeTempDir();
  try {
    const result = discoverWorkspaceState(dir);
    assert.equal(result.git.repository, false);
    assert.equal(result.current_session, null);
    assert.deepEqual(result.decisions, []);
    assert.deepEqual(result.risks, []);
    assert.deepEqual(result.open_bugs, []);
    assert.deepEqual(result.recent_changes, []);
    assert.deepEqual(result.current_tasks, []);
    assert.equal(result.release_state.version, null);
    assert.equal(result.release_state.latest_tag, null);
  } finally {
    cleanup(dir);
  }
});

test('2. repeated calls with unchanged state produce deepEqual snapshots (determinism)', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    initDocs(dir);
    write(dir, 'package.json', JSON.stringify({ name: 'x', version: '1.2.3' }));
    commitAll(dir, 'chore: init');

    const first = discoverWorkspaceState(dir);
    const second = discoverWorkspaceState(dir);
    assert.deepEqual(first, second);
  } finally {
    cleanup(dir);
  }
});

test('4/20. discovery performs zero filesystem writes and never mutates the project tree', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    initDocs(dir);
    write(dir, 'README.md', 'hi\n');
    commitAll(dir, 'chore: init');

    const before = snapshotTree(dir);
    discoverWorkspaceState(dir);
    const after = snapshotTree(dir);
    assert.deepEqual(before, after);
  } finally {
    cleanup(dir);
  }
});

test('6. no absolute machine path ever appears in the returned snapshot', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    const result = discoverWorkspaceState(dir);
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes(dir));
  } finally {
    cleanup(dir);
  }
});

test('7. Git unavailable degrades to an empty recent_changes/release tag without throwing', () => {
  const dir = makeTempDir();
  const emptyPathDir = makeTempDir('ddae-no-git-path-');
  try {
    initDocs(dir);
    const env = { PATH: emptyPathDir, Path: emptyPathDir };
    const result = discoverWorkspaceState(dir, { env });
    assert.equal(result.git.available, false);
    assert.deepEqual(result.recent_changes, []);
    assert.equal(result.release_state.latest_tag, null);
  } finally {
    cleanup(dir);
    cleanup(emptyPathDir);
  }
});

test('8. zero sessions produces empty session-derived collections without error', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    const result = discoverWorkspaceState(dir);
    assert.equal(result.current_session, null);
    assert.deepEqual(result.open_bugs, []);
    assert.deepEqual(result.current_tasks, []);
  } finally {
    cleanup(dir);
  }
});

test('9/10. multiple sessions select the latest canonical session deterministically', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    writeSessionReadme(dir, 'session_01_first');
    writeSessionReadme(dir, 'session_02_second');
    const result = discoverWorkspaceState(dir);
    assert.equal(result.current_session.id, 'session_02_second');
    assert.equal(result.current_session.selection_reason, 'latest_canonical');
  } finally {
    cleanup(dir);
  }
});

test('11. decisions are discovered from RD- headings in registro_decisoes.md, not DT- headings elsewhere', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    writeDecisions(dir, [{ id: 'RD-01', title: 'Use RD prefix here' }, { id: 'RD-02', title: 'Second decision' }]);
    const result = discoverWorkspaceState(dir);
    assert.deepEqual(result.decisions.map((d) => d.id), ['RD-01', 'RD-02']);
    assert.equal(result.decisions[0].summary, 'Use RD prefix here');
    assert.equal(result.decisions[0].source_path, 'Docs/04_governance/registro_decisoes.md');
  } finally {
    cleanup(dir);
  }
});

test('11b. an unfilled decision heading (_Título da decisão_ placeholder) is excluded, not surfaced as real', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    writeDecisions(dir, [{ id: 'RD-01', title: '_Título da decisão_' }, { id: 'RD-02', title: 'A real one' }]);
    const result = discoverWorkspaceState(dir);
    assert.deepEqual(result.decisions.map((d) => d.id), ['RD-02']);
  } finally {
    cleanup(dir);
  }
});

test('12. risks are parsed from the matriz_riscos.md table, placeholder rows excluded', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    writeRisksTable(dir, [
      { id: 'MR-01', summary: '_..._', area: 'X', prob: 'Baixa', impact: 'Baixo', status: 'Aberto' },
      { id: 'MR-02', summary: 'Real risk with `code` and ~~strike~~', area: 'Operação', prob: 'Média', impact: 'Alto', status: 'Aberto' },
    ]);
    const result = discoverWorkspaceState(dir);
    assert.deepEqual(result.risks.map((r) => r.id), ['MR-02']);
    assert.equal(result.risks[0].summary, 'Real risk with `code` and ~~strike~~');
    assert.equal(result.risks[0].status, 'Aberto');
  } finally {
    cleanup(dir);
  }
});

test('13. open bugs are aggregated across sessions and filtered by status', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    writeSessionReadme(dir, 'session_01_a');
    writeSessionReadme(dir, 'session_02_b');
    writeBugsTable(dir, 'session_01_a', [
      { id: 'BUG-01', summary: '_..._', severity: 'P3', where: 'x', status: 'Aberto' },
      { id: 'BUG-02', summary: 'Open one', severity: 'P2', where: 'y', status: 'Aberto' },
    ]);
    writeBugsTable(dir, 'session_02_b', [
      { id: 'BUG-03', summary: 'Already fixed', severity: 'P3', where: 'z', status: 'Corrigido' },
    ]);
    const result = discoverWorkspaceState(dir);
    assert.deepEqual(result.open_bugs.map((b) => b.id), ['BUG-02']);
    assert.equal(result.open_bugs[0].session, 'session_01_a');
  } finally {
    cleanup(dir);
  }
});

test('14/15/16/17. .ddae/context, .ddae/brain, and .obsidian are never treated as canonical sources', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    write(dir, '.ddae/context/manifest.json', JSON.stringify({ decisions: ['should never appear'] }));
    write(dir, '.ddae/brain/Home.md', '# should never appear either');
    write(dir, '.obsidian/workspace.json', '{"should":"never appear"}');
    const result = discoverWorkspaceState(dir);
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes('should never appear'));
  } finally {
    cleanup(dir);
  }
});

test('18. a symlinked risks/bugs file is never followed (fail-closed, path containment)', () => {
  const dir = makeTempDir();
  const outside = makeTempDir();
  try {
    initDocs(dir);
    write(outside, 'secret-risks.md', '| ID | Risco | Área | Probabilidade | Impacto | Status |\n|---|---|---|---|---|---|\n| XX-01 | should never be read | A | Baixa | Baixo | Aberto |\n');
    let canSymlink = true;
    try {
      fs.mkdirSync(path.join(docsRoot(dir), '04_governance'), { recursive: true });
      fs.symlinkSync(path.join(outside, 'secret-risks.md'), path.join(docsRoot(dir), '04_governance', 'matriz_riscos.md'), 'file');
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        canSymlink = false;
      } else {
        throw error;
      }
    }
    if (!canSymlink) {
      return; // capability-skip, never a false pass
    }
    const result = discoverWorkspaceState(dir);
    assert.deepEqual(result.risks, []);
    assert.ok(!JSON.stringify(result).includes('should never be read'));
  } finally {
    cleanup(dir);
    cleanup(outside);
  }
});

test('19. only the three known canonical filenames are read — a decoy sensitive file elsewhere never leaks', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    write(dir, '.env', 'SECRET_TOKEN=should-never-appear\n');
    write(dir, 'Docs/04_governance/some-other-file.md', 'ALSO_SECRET=should-never-appear\n');
    const result = discoverWorkspaceState(dir);
    assert.ok(!JSON.stringify(result).includes('should-never-appear'));
  } finally {
    cleanup(dir);
  }
});

test('current_tasks extracts unchecked checklist items from the most recent block only', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    writeSessionReadme(dir, 'session_01_a');
    writeBlock(dir, 'session_01_a', 'bloco_01_first.md', '01', 'first', '- [x] done\n- [ ] pending item one\n');
    writeBlock(dir, 'session_01_a', 'bloco_02_second.md', '02', 'second', '- [ ] pending item two\n- [x] done too\n');
    const result = discoverWorkspaceState(dir);
    assert.deepEqual(result.current_tasks.map((t) => t.text), ['pending item two']);
    assert.equal(result.current_tasks[0].block, 'bloco_02_second.md');
  } finally {
    cleanup(dir);
  }
});

test('release_state reads package.json version and the lexicographically-latest tag, never Stable Host', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    initDocs(dir);
    write(dir, 'package.json', JSON.stringify({ name: 'consumer-project', version: '2.5.0' }));
    commitAll(dir, 'chore: init');
    git(['tag', 'v2.4.0'], dir);
    git(['tag', 'v2.5.0'], dir);

    const result = discoverWorkspaceState(dir);
    assert.equal(result.release_state.version, '2.5.0');
    assert.equal(result.release_state.latest_tag, 'v2.5.0');
    assert.ok(!('stable_host' in result.release_state));
  } finally {
    cleanup(dir);
  }
});

test('recent_changes exposes only the sha shape already produced by collectGitContext (Delta A: deferred, not implemented)', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    initDocs(dir);
    write(dir, 'README.md', 'hi\n');
    commitAll(dir, 'chore: init commit');

    const result = discoverWorkspaceState(dir);
    assert.equal(result.recent_changes.length, 1);
    assert.deepEqual(Object.keys(result.recent_changes[0]), ['sha']);
  } finally {
    cleanup(dir);
  }
});

test('the returned snapshot is frozen (no accidental mutation by a caller)', () => {
  const dir = makeTempDir();
  try {
    initDocs(dir);
    const result = discoverWorkspaceState(dir);
    assert.ok(Object.isFrozen(result));
    assert.ok(Object.isFrozen(result.git));
    assert.ok(Object.isFrozen(result.decisions));
  } finally {
    cleanup(dir);
  }
});
