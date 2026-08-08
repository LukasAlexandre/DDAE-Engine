import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { collectGitContext } from '../src/context/git-context.js';
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

function headSha(dir) {
  return git(['rev-parse', 'HEAD'], dir).trim();
}

test('collectGitContext reports a clean repository with a valid full-length HEAD SHA', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    fs.writeFileSync(path.join(dir, 'README.md'), 'hello\n');
    commitAll(dir, 'chore: initial commit');
    const sha = headSha(dir);

    const result = collectGitContext(dir);

    assert.equal(result.available, true);
    assert.equal(result.repository, true);
    assert.equal(result.branch, 'main');
    assert.equal(result.detached, false);
    assert.equal(result.head, sha);
    assert.match(result.head, /^[0-9a-f]{40}$/);
    assert.equal(result.working_tree, 'clean');
    assert.deepEqual(result.modified_files, []);
    assert.deepEqual(result.untracked_files, []);
    assert.deepEqual(result.warnings, []);
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext reports a dirty repository with a tracked modified file', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    const filePath = path.join(dir, 'file.txt');
    fs.writeFileSync(filePath, 'v1\n');
    commitAll(dir, 'chore: add file');
    fs.writeFileSync(filePath, 'v2\n');

    const result = collectGitContext(dir);

    assert.equal(result.working_tree, 'dirty');
    assert.deepEqual(result.modified_files, ['file.txt']);
    assert.deepEqual(result.untracked_files, []);
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext reports an untracked file separately from modified files', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    fs.writeFileSync(path.join(dir, 'tracked.txt'), 'a\n');
    commitAll(dir, 'chore: add tracked file');
    fs.writeFileSync(path.join(dir, 'new-file.txt'), 'new\n');

    const result = collectGitContext(dir);

    assert.equal(result.working_tree, 'dirty');
    assert.deepEqual(result.modified_files, []);
    assert.deepEqual(result.untracked_files, ['new-file.txt']);
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext handles paths containing spaces', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    fs.writeFileSync(path.join(dir, 'file with space.txt'), 'x\n');

    const result = collectGitContext(dir);

    assert.deepEqual(result.untracked_files, ['file with space.txt']);
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext reports origin_head as null when there is no remote', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
    commitAll(dir, 'chore: commit');

    const result = collectGitContext(dir);

    assert.equal(result.origin_head, null);
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext resolves origin_head from a locally simulated remote-tracking ref (no network)', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
    commitAll(dir, 'chore: commit');
    const sha = headSha(dir);
    git(['update-ref', 'refs/remotes/origin/main', sha], dir);

    const result = collectGitContext(dir);

    assert.equal(result.origin_head, sha);
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext returns tags sorted alphabetically', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
    commitAll(dir, 'chore: commit');
    git(['tag', 'v0.2.0'], dir);
    git(['tag', 'v0.1.0'], dir);
    git(['tag', 'alpha'], dir);

    const result = collectGitContext(dir);

    assert.deepEqual(result.tags, ['alpha', 'v0.1.0', 'v0.2.0']);
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext returns recent commit SHAs (HEAD first, no message/author collected)', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
    commitAll(dir, 'chore: first');
    fs.writeFileSync(path.join(dir, 'a.txt'), 'b\n');
    commitAll(dir, 'chore: second');
    const sha = headSha(dir);

    const result = collectGitContext(dir);

    assert.equal(result.recent_commits.length, 2);
    assert.equal(result.recent_commits[0].sha, sha);
    for (const commit of result.recent_commits) {
      assert.match(commit.sha, /^[0-9a-f]{40}$/);
      assert.deepEqual(Object.keys(commit), ['sha']);
    }
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext reports detached HEAD with branch null', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
    commitAll(dir, 'chore: first');
    fs.writeFileSync(path.join(dir, 'a.txt'), 'b\n');
    commitAll(dir, 'chore: second');
    const firstSha = git(['rev-parse', 'HEAD~1'], dir).trim();
    git(['checkout', '-q', firstSha], dir);

    const result = collectGitContext(dir);

    assert.equal(result.detached, true);
    assert.equal(result.branch, null);
    assert.equal(result.head, firstSha);
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext supports a repository with zero commits', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);

    const result = collectGitContext(dir);

    assert.equal(result.available, true);
    assert.equal(result.repository, true);
    assert.equal(result.branch, 'main');
    assert.equal(result.head, null);
    assert.deepEqual(result.recent_commits, []);
    assert.equal(result.working_tree, 'clean');
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext reports a non-repository directory as degraded, without throwing', () => {
  const dir = makeTempDir();
  try {
    const result = collectGitContext(dir);

    assert.equal(result.available, true);
    assert.equal(result.repository, false);
    assert.equal(result.branch, null);
    assert.equal(result.working_tree, null);
    assert.deepEqual(result.warnings, [{ code: 'NOT_A_GIT_REPOSITORY' }]);
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext degrades gracefully when the git binary is unavailable', () => {
  const dir = makeTempDir();
  const emptyPathDir = makeTempDir('ddae-no-git-path-');
  try {
    const env = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (key.toLowerCase() === 'path') continue;
      env[key] = value;
    }
    env.PATH = emptyPathDir;
    env.Path = emptyPathDir;

    const result = collectGitContext(dir, { env });

    assert.equal(result.available, false);
    assert.equal(result.repository, false);
    assert.equal(result.branch, null);
    assert.deepEqual(result.warnings, [{ code: 'GIT_UNAVAILABLE' }]);
  } finally {
    cleanup(dir);
    cleanup(emptyPathDir);
  }
});

test('collectGitContext is deterministic for an unchanged repository', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
    commitAll(dir, 'chore: commit');
    fs.writeFileSync(path.join(dir, 'untracked.txt'), 'x\n');

    const first = collectGitContext(dir);
    const second = collectGitContext(dir);

    assert.deepEqual(first, second);
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext never returns absolute paths', () => {
  const dir = makeTempDir();
  try {
    initRepo(dir);
    fs.writeFileSync(path.join(dir, 'tracked.txt'), 'a\n');
    commitAll(dir, 'chore: commit');
    fs.mkdirSync(path.join(dir, 'nested'));
    fs.writeFileSync(path.join(dir, 'nested', 'untracked.txt'), 'x\n');

    const result = collectGitContext(dir);
    const serialized = JSON.stringify(result);

    assert.ok(!serialized.includes(dir));
    assert.ok(!/[A-Za-z]:\\/.test(serialized));
    // git's default (--untracked-files=normal) collapses an entirely
    // untracked directory into a single "dir/" entry rather than expanding
    // every file inside it — this is git's own behavior, not a collector bug.
    assert.deepEqual(result.untracked_files, ['nested/']);
  } finally {
    cleanup(dir);
  }
});

test('collectGitContext throws a structured error for a non-existent projectRoot (programmer error, not degraded mode)', () => {
  const dir = makeTempDir();
  try {
    const missing = path.join(dir, 'does-not-exist');
    assert.throws(() => collectGitContext(missing), /projectRoot does not exist or is not a directory/);
  } finally {
    cleanup(dir);
  }
});
