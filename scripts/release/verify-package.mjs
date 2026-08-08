import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.join(__dirname, '..', '..');

// Bumped alongside package.json's own "version" field when preparing a new release.
export const EXPECTED_VERSION = '0.2.0';

export const REQUIRED_FILES = [
  'package.json',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'bin/ddae-engine.js',
];

// A handful of representative runtime paths, not an exhaustive template list —
// this only needs to catch "the src/ tree stopped being packed", not track
// every individual template file.
export const REQUIRED_SRC_PREFIXES = [
  'src/cli.js',
  'src/commands/',
  'src/utils/',
  'src/templates/',
  'src/context/',
];

export const FORBIDDEN_PREFIXES = [
  'test/',
  '.github/',
  'docs/sessions/',
  'feedback/',
  'scripts/ci/',
  'scripts/release/',
  'node_modules/',
  '.git/',
];

const FORBIDDEN_PATTERNS = [
  /\.tgz$/i,
  /(^|\/)\.env(\..*)?$/i,
  /(^|\/)\.npmrc$/i,
  /credentials/i,
  /secret/i,
  /id_rsa/i,
  /\.pem$/i,
  /\.key$/i,
];

/**
 * Runs `npm pack --dry-run --json` and returns the flat list of file paths
 * npm would actually include in the published tarball — the ground truth for
 * package contents, not an assumption based on `package.json.files`.
 *
 * Uses execSync (always goes through the platform shell) instead of
 * execFileSync: on Windows, `npm` on PATH is the `npm.cmd` shim, which
 * execFileSync cannot spawn directly (EINVAL) without a shell. The command is
 * a static literal string, never built from interpolated/external input, so
 * this carries no injection risk on either platform.
 */
export function getPackedFiles(cwd = PROJECT_ROOT) {
  const output = execSync('npm pack --dry-run --json', { cwd, encoding: 'utf8' });
  const [summary] = JSON.parse(output);
  return summary.files.map((file) => file.path);
}

export function checkMetadata(pkg) {
  const errors = [];
  if (pkg.name !== 'ddae-engine') {
    errors.push(`name esperado "ddae-engine", encontrado "${pkg.name}"`);
  }
  if (pkg.version !== EXPECTED_VERSION) {
    errors.push(`version esperada "${EXPECTED_VERSION}" para esta release, encontrado "${pkg.version}"`);
  }
  if (!pkg.engines || pkg.engines.node !== '>=22') {
    errors.push(`engines.node esperado ">=22", encontrado "${pkg.engines && pkg.engines.node}"`);
  }
  const binPath = pkg.bin && pkg.bin['ddae-engine'];
  if (!binPath) {
    errors.push('bin.ddae-engine ausente em package.json');
  } else if (!fs.existsSync(path.join(PROJECT_ROOT, binPath))) {
    errors.push(`bin.ddae-engine aponta para um arquivo inexistente: ${binPath}`);
  }
  return errors;
}

export function checkRepositoryIdentity(pkg) {
  const errors = [];
  const repoUrl = pkg.repository && pkg.repository.url;
  if (!repoUrl || !repoUrl.includes('github.com/LukasAlexandre/DDAE-Engine')) {
    errors.push(`repository.url não aponta para o repositório DDAE-Engine atual: "${repoUrl}"`);
  }
  if (!pkg.homepage || !pkg.homepage.includes('github.com/LukasAlexandre/DDAE-Engine')) {
    errors.push(`homepage não aponta para o repositório DDAE-Engine atual: "${pkg.homepage}"`);
  }
  const bugsUrl = pkg.bugs && pkg.bugs.url;
  if (!bugsUrl || !bugsUrl.includes('github.com/LukasAlexandre/DDAE-Engine/issues')) {
    errors.push(`bugs.url não aponta para o repositório DDAE-Engine atual: "${bugsUrl}"`);
  }
  return errors;
}

export function checkRequiredFiles(files) {
  const errors = [];
  for (const required of REQUIRED_FILES) {
    if (!files.includes(required)) {
      errors.push(`arquivo obrigatório ausente do pacote: ${required}`);
    }
  }
  for (const prefix of REQUIRED_SRC_PREFIXES) {
    const present = files.some((file) => file === prefix || file.startsWith(prefix));
    if (!present) {
      errors.push(`nenhum arquivo runtime encontrado sob: ${prefix}`);
    }
  }
  return errors;
}

export function checkForbiddenFiles(files) {
  const errors = [];
  for (const file of files) {
    if (FORBIDDEN_PREFIXES.some((prefix) => file.startsWith(prefix))) {
      errors.push(`arquivo proibido presente no pacote: ${file}`);
      continue;
    }
    if (FORBIDDEN_PATTERNS.some((pattern) => pattern.test(file))) {
      errors.push(`arquivo proibido presente no pacote (padrão sensível): ${file}`);
    }
  }
  return errors;
}

/**
 * Full check against the real package in `cwd`. For unit tests of individual
 * rules, prefer calling checkMetadata/checkRepositoryIdentity/
 * checkRequiredFiles/checkForbiddenFiles directly with synthetic input —
 * they're pure and don't touch the filesystem or spawn npm.
 */
export function verifyPackage({ cwd = PROJECT_ROOT, packageJson } = {}) {
  const pkg = packageJson ?? JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  const files = getPackedFiles(cwd);

  const metadataErrors = checkMetadata(pkg);
  const repositoryErrors = checkRepositoryIdentity(pkg);
  const requiredFileErrors = checkRequiredFiles(files);
  const forbiddenFileErrors = checkForbiddenFiles(files);

  return {
    pkg,
    files,
    metadataErrors,
    repositoryErrors,
    requiredFileErrors,
    forbiddenFileErrors,
    errors: [...metadataErrors, ...repositoryErrors, ...requiredFileErrors, ...forbiddenFileErrors],
  };
}

function isMain() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

function main() {
  const result = verifyPackage();

  console.log('DDAE Package Check\n');
  console.log(`Package: ${result.pkg.name}@${result.pkg.version}`);
  console.log(`Files inspected: ${result.files.length}\n`);
  console.log(`Required files: ${result.requiredFileErrors.length === 0 ? 'OK' : 'FAIL'}`);
  console.log(`Forbidden files: ${result.forbiddenFileErrors.length === 0 ? 'OK' : 'FAIL'}`);
  console.log(`Metadata: ${result.metadataErrors.length === 0 ? 'OK' : 'FAIL'}`);
  console.log(`Repository identity: ${result.repositoryErrors.length === 0 ? 'OK' : 'FAIL'}`);

  if (result.errors.length > 0) {
    console.log('\nFailures:');
    for (const error of result.errors) {
      console.log(`  - ${error}`);
    }
    console.log('\n[DDAE package:check] FAILED');
    process.exitCode = 1;
    return;
  }

  console.log('\n[DDAE package:check] OK');
}

if (isMain()) {
  main();
}
