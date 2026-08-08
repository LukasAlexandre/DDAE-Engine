import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..', '..');

// Pinned to the published release this repository's self-hosting contract
// governs by (Docs/00_ddae_engine/self_hosting.md) — intentionally not read
// from package.json.version, since the whole point is proving a *published*
// release, independent of whatever the in-development candidate says.
const STABLE_HOST_VERSION = '0.2.0';

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  const output = execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf8' });
  console.log(output);
  return output;
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

console.log('=== DDAE Self-Host: Stable Host Linux/Cross-Platform Validation Proof ===');

const pkgPath = path.join(PROJECT_ROOT, 'package.json');
const lockPath = path.join(PROJECT_ROOT, 'package-lock.json');

if (fs.existsSync(lockPath)) {
  fail('package-lock.json already exists before the stable host install');
}

const hashBefore = sha256(pkgPath);
console.log(`package.json SHA-256 (before install): ${hashBefore}`);

run(`npm install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund ddae-engine@${STABLE_HOST_VERSION}`);

const hostBin = path.join(PROJECT_ROOT, 'node_modules', 'ddae-engine', 'bin', 'ddae-engine.js');
if (!fs.existsSync(hostBin)) {
  fail(`stable host binary not found at ${hostBin}`);
}

const versionOutput = run(`node "${hostBin}" --version`).trim();
if (versionOutput !== STABLE_HOST_VERSION) {
  fail(`stable host --version returned "${versionOutput}", expected "${STABLE_HOST_VERSION}"`);
}

const validateOutput = run(`node "${hostBin}" validate --dir .`);
if (!/Status: OK/.test(validateOutput)) {
  fail('stable host validate did not report Status: OK');
}
const sessionsMatch = validateOutput.match(/Sessions found: (\d+)/);
if (!sessionsMatch || Number(sessionsMatch[1]) < 2) {
  fail(`expected at least 2 canonical sessions recognized by validate, got: ${validateOutput}`);
}

const auditOutput = run(`node "${hostBin}" audit --dir .`);
if (!/Status: OK/.test(auditOutput) || !/Errors: 0/.test(auditOutput)) {
  fail('stable host audit did not report Status: OK / Errors: 0');
}

const hashAfter = sha256(pkgPath);
console.log(`package.json SHA-256 (after install):  ${hashAfter}`);
if (hashBefore !== hashAfter) {
  fail('package.json changed during stable host installation');
}

if (fs.existsSync(lockPath)) {
  fail('package-lock.json was created by the stable host installation');
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (Object.keys(pkg.dependencies ?? {}).length > 0 || Object.keys(pkg.devDependencies ?? {}).length > 0) {
  fail('dependencies/devDependencies were mutated by the stable host installation');
}

console.log('\n[DDAE self-host] Stable host validation PASSED');
