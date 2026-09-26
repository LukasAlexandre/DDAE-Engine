import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { discoverWorkspaceState } from '../src/workspace/discover.js';
import { makeTempDir, cleanup } from './helpers.js';

// Bloco 03, Decisão 2: Discovery is the only collection boundary, so the
// contract's `project.name` and `ddae` fields must come from the snapshot.

function write(root, relPath, content) {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
}

function writeSessionReadme(root, sessionName, status) {
  const options = ['Não iniciada', 'Em andamento', 'Concluída', 'Bloqueada'];
  const lines = options.map((option) => `- [${option === status ? 'x' : ' '}] ${option}`);
  write(root, `Docs/05_sessions/${sessionName}/README.md`, `# ${sessionName}\n\n## 5. Status\n\n${lines.join('\n')}\n`);
}

test('project.name is the basename of the root, never an absolute path', () => {
  const dir = makeTempDir();
  try {
    fs.mkdirSync(path.join(dir, 'Docs', '05_sessions'), { recursive: true });
    const result = discoverWorkspaceState(dir);
    assert.equal(result.project.name, path.basename(dir));
    assert.equal(result.project.root_relative_path, '.');
  } finally {
    cleanup(dir);
  }
});

test('ddae summary exposes sessions, current session, modules and counts — structure only, no file content', () => {
  const dir = makeTempDir();
  try {
    writeSessionReadme(dir, 'session_01_alpha', 'Concluída');
    writeSessionReadme(dir, 'session_02_beta', 'Em andamento');
    write(dir, 'Docs/05_sessions/session_02_beta/05_blocks/bloco_01_one.md', '# Bloco 01 — One\n\n- [ ] a secret-looking task body\n');
    write(dir, 'Docs/05_sessions/session_02_beta/05_blocks/bloco_02_two.md', '# Bloco 02 — Two\n');
    const { ddae } = discoverWorkspaceState(dir);
    assert.equal(ddae.available, true);
    assert.equal(ddae.docs_root, 'Docs');
    assert.equal(ddae.sessions_root, 'Docs/05_sessions');
    assert.deepEqual(ddae.sessions.map((s) => s.name), ['session_01_alpha', 'session_02_beta']);
    assert.deepEqual(Object.keys(ddae.sessions[0]).sort(), ['name', 'path']);
    assert.equal(ddae.current_session.name, 'session_02_beta');
    assert.equal(ddae.current_session.status, 'Em andamento');
    assert.deepEqual(ddae.current_session.counts, { blocks: 2, prompts: 0, feedbacks: 0 });
    assert.ok(ddae.current_session.modules.every((m) => Object.keys(m).sort().join() === 'exists,name'));
    assert.ok(!JSON.stringify(ddae).includes('secret-looking'));
    assert.ok(Object.isFrozen(ddae));
  } finally {
    cleanup(dir);
  }
});

test('ddae summary degrades to available:false without Docs/ and carries no absolute path', () => {
  const dir = makeTempDir();
  try {
    const { ddae } = discoverWorkspaceState(dir);
    assert.deepEqual(
      { available: ddae.available, docs_root: ddae.docs_root, sessions: ddae.sessions, current_session: ddae.current_session },
      { available: false, docs_root: null, sessions: [], current_session: null },
    );
    assert.ok(!JSON.stringify(ddae).includes(dir.split(path.sep).join('/')));
  } finally {
    cleanup(dir);
  }
});
