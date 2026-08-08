import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { collectProjectContext } from '../src/context/project-context.js';
import { makeTempDir, cleanup } from './helpers.js';

test('collectProjectContext returns empty markers/ecosystems/directories for an empty project', () => {
  const dir = makeTempDir();
  try {
    const result = collectProjectContext(dir);

    assert.deepEqual(result.markers, []);
    assert.deepEqual(result.directories, []);
    assert.deepEqual(result.ecosystems, { node: false, python: false, rust: false, go: false, docker: false });
  } finally {
    cleanup(dir);
  }
});

test('collectProjectContext detects a Node marker', () => {
  const dir = makeTempDir();
  try {
    fs.writeFileSync(path.join(dir, 'package.json'), '{}\n');

    const result = collectProjectContext(dir);

    assert.deepEqual(result.markers, ['package.json']);
    assert.equal(result.ecosystems.node, true);
  } finally {
    cleanup(dir);
  }
});

test('collectProjectContext detects Python markers (pyproject.toml or requirements.txt)', () => {
  const dir = makeTempDir();
  try {
    fs.writeFileSync(path.join(dir, 'requirements.txt'), 'flask\n');

    const result = collectProjectContext(dir);

    assert.deepEqual(result.markers, ['requirements.txt']);
    assert.equal(result.ecosystems.python, true);
  } finally {
    cleanup(dir);
  }
});

test('collectProjectContext detects a Rust marker', () => {
  const dir = makeTempDir();
  try {
    fs.writeFileSync(path.join(dir, 'Cargo.toml'), '[package]\n');

    const result = collectProjectContext(dir);

    assert.equal(result.ecosystems.rust, true);
    assert.equal(result.ecosystems.node, false);
  } finally {
    cleanup(dir);
  }
});

test('collectProjectContext detects a Go marker', () => {
  const dir = makeTempDir();
  try {
    fs.writeFileSync(path.join(dir, 'go.mod'), 'module example\n');

    const result = collectProjectContext(dir);

    assert.equal(result.ecosystems.go, true);
  } finally {
    cleanup(dir);
  }
});

test('collectProjectContext detects Docker markers', () => {
  const dir = makeTempDir();
  try {
    fs.writeFileSync(path.join(dir, 'Dockerfile'), 'FROM node\n');
    fs.writeFileSync(path.join(dir, 'docker-compose.yml'), 'services: {}\n');

    const result = collectProjectContext(dir);

    assert.deepEqual(result.markers, ['Dockerfile', 'docker-compose.yml']);
    assert.equal(result.ecosystems.docker, true);
  } finally {
    cleanup(dir);
  }
});

test('collectProjectContext detects a multi-stack project (Node + Python + Docker together)', () => {
  const dir = makeTempDir();
  try {
    fs.writeFileSync(path.join(dir, 'package.json'), '{}\n');
    fs.writeFileSync(path.join(dir, 'requirements.txt'), 'flask\n');
    fs.writeFileSync(path.join(dir, 'Dockerfile'), 'FROM node\n');

    const result = collectProjectContext(dir);

    assert.deepEqual(result.markers, ['Dockerfile', 'package.json', 'requirements.txt']);
    assert.equal(result.ecosystems.node, true);
    assert.equal(result.ecosystems.python, true);
    assert.equal(result.ecosystems.docker, true);
    assert.equal(result.ecosystems.rust, false);
    assert.equal(result.ecosystems.go, false);
  } finally {
    cleanup(dir);
  }
});

test('collectProjectContext detects known conventional directories', () => {
  const dir = makeTempDir();
  try {
    fs.mkdirSync(path.join(dir, 'src'));
    fs.mkdirSync(path.join(dir, 'Docs'));
    fs.mkdirSync(path.join(dir, 'test'));
    fs.mkdirSync(path.join(dir, 'not-a-conventional-dir'));

    const result = collectProjectContext(dir);

    assert.deepEqual(result.directories, ['Docs', 'src', 'test']);
  } finally {
    cleanup(dir);
  }
});

test('collectProjectContext returns markers and directories sorted deterministically, independent of creation order', () => {
  const dir = makeTempDir();
  try {
    fs.writeFileSync(path.join(dir, 'requirements.txt'), 'x\n');
    fs.writeFileSync(path.join(dir, 'package.json'), '{}\n');
    fs.mkdirSync(path.join(dir, 'test'));
    fs.mkdirSync(path.join(dir, 'Backend'));

    const result = collectProjectContext(dir);

    assert.deepEqual(result.markers, ['package.json', 'requirements.txt']);
    assert.deepEqual(result.directories, ['Backend', 'test']);
  } finally {
    cleanup(dir);
  }
});

test('collectProjectContext never reads directory contents or file content (zero recursive scan, zero content read)', () => {
  const dir = makeTempDir();
  try {
    fs.writeFileSync(path.join(dir, '.env'), 'SUPER_SECRET_SHOULD_NEVER_BE_READ=sentinel-value\n');
    fs.mkdirSync(path.join(dir, 'nested', 'deeper'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'nested', 'deeper', 'unknown-file.txt'), 'irrelevant content\n');
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"sentinel-project-name-should-not-leak"}\n');

    const result = collectProjectContext(dir);
    const serialized = JSON.stringify(result);

    assert.ok(!serialized.includes('SUPER_SECRET_SHOULD_NEVER_BE_READ'));
    assert.ok(!serialized.includes('sentinel-project-name-should-not-leak'));
    assert.ok(!serialized.includes('.env'));
    assert.ok(!serialized.includes('unknown-file.txt'));
    assert.ok(!result.directories.includes('nested'));
  } finally {
    cleanup(dir);
  }
});

test('collectProjectContext never follows a symlink shadowing a conventional directory name', (t) => {
  const dir = makeTempDir();
  const target = makeTempDir('ddae-symlink-target-');
  try {
    const linkPath = path.join(dir, 'src');
    try {
      fs.symlinkSync(target, linkPath, 'dir');
    } catch (error) {
      t.skip(`symlink creation not permitted in this environment: ${error.code}`);
      return;
    }

    const result = collectProjectContext(dir);

    assert.ok(!result.directories.includes('src'));
  } finally {
    cleanup(dir);
    cleanup(target);
  }
});

test('collectProjectContext never returns absolute paths', () => {
  const dir = makeTempDir();
  try {
    fs.writeFileSync(path.join(dir, 'package.json'), '{}\n');
    fs.mkdirSync(path.join(dir, 'src'));

    const result = collectProjectContext(dir);
    const serialized = JSON.stringify(result);

    assert.ok(!serialized.includes(dir));
    assert.ok(!/[A-Za-z]:\\/.test(serialized));
  } finally {
    cleanup(dir);
  }
});

test('collectProjectContext is deterministic for an unchanged project', () => {
  const dir = makeTempDir();
  try {
    fs.writeFileSync(path.join(dir, 'package.json'), '{}\n');
    fs.mkdirSync(path.join(dir, 'src'));

    const first = collectProjectContext(dir);
    const second = collectProjectContext(dir);

    assert.deepEqual(first, second);
  } finally {
    cleanup(dir);
  }
});

test('collectProjectContext throws a structured error for a non-existent projectRoot', () => {
  const dir = makeTempDir();
  try {
    const missing = path.join(dir, 'does-not-exist');
    assert.throws(() => collectProjectContext(missing), /projectRoot does not exist or is not a directory/);
  } finally {
    cleanup(dir);
  }
});
