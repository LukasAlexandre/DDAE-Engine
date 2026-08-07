import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkMetadata,
  checkRepositoryIdentity,
  checkRequiredFiles,
  checkForbiddenFiles,
  verifyPackage,
  EXPECTED_VERSION,
} from '../scripts/release/verify-package.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, '..', 'scripts', 'release', 'verify-package.mjs');

const VALID_PKG = {
  name: 'ddae-engine',
  version: EXPECTED_VERSION,
  engines: { node: '>=22' },
  bin: { 'ddae-engine': 'bin/ddae-engine.js' },
  repository: { type: 'git', url: 'git+https://github.com/LukasAlexandre/DDAE-Engine.git' },
  homepage: 'https://github.com/LukasAlexandre/DDAE-Engine',
  bugs: { url: 'https://github.com/LukasAlexandre/DDAE-Engine/issues' },
};

const VALID_FILES = [
  'package.json', 'README.md', 'LICENSE', 'CHANGELOG.md', 'bin/ddae-engine.js',
  'src/cli.js', 'src/commands/init.js', 'src/utils/text.js', 'src/templates/session/README.md',
];

test('package:check passes against the real, current package', () => {
  const stdout = execFileSync('node', [SCRIPT_PATH], { encoding: 'utf8' });
  assert.match(stdout, /\[DDAE package:check\] OK/);
});

test('verifyPackage() against the real project reports zero errors', () => {
  const result = verifyPackage();
  assert.deepEqual(result.errors, []);
});

test('checkRequiredFiles detects a missing CHANGELOG.md', () => {
  const files = VALID_FILES.filter((file) => file !== 'CHANGELOG.md');
  const errors = checkRequiredFiles(files);
  assert.ok(errors.some((error) => error.includes('CHANGELOG.md')));
});

test('checkMetadata detects a missing/nonexistent bin entry', () => {
  const pkg = { ...VALID_PKG, bin: { 'ddae-engine': 'bin/does-not-exist.js' } };
  const errors = checkMetadata(pkg);
  assert.ok(errors.some((error) => error.includes('bin.ddae-engine')));
});

test('checkForbiddenFiles detects a forbidden directory and a sensitive pattern', () => {
  const files = [...VALID_FILES, 'test/cli-init.test.js', '.env'];
  const errors = checkForbiddenFiles(files);
  assert.ok(errors.some((error) => error.includes('test/cli-init.test.js')));
  assert.ok(errors.some((error) => error.includes('.env')));
});

test('checkRepositoryIdentity detects a stale repository URL', () => {
  const pkg = { ...VALID_PKG, repository: { type: 'git', url: 'git+https://github.com/LukasAlexandre/DDAD.git' } };
  const errors = checkRepositoryIdentity(pkg);
  assert.ok(errors.some((error) => error.includes('repository.url')));
});

test('checkMetadata detects an incorrect engines.node', () => {
  const pkg = { ...VALID_PKG, engines: { node: '>=18' } };
  const errors = checkMetadata(pkg);
  assert.ok(errors.some((error) => error.includes('engines.node')));
});

test('checkMetadata and checkRequiredFiles pass against synthetic valid input', () => {
  assert.deepEqual(checkMetadata(VALID_PKG), []);
  assert.deepEqual(checkRequiredFiles(VALID_FILES), []);
  assert.deepEqual(checkForbiddenFiles(VALID_FILES), []);
  assert.deepEqual(checkRepositoryIdentity(VALID_PKG), []);
});
