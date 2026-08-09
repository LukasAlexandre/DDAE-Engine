import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PROJECT_ROOT, EXPECTED_VERSION } from './verify-package.mjs';
import { listSessionModules, LEGACY_BASE_SESSION_SLUGS } from '../../src/utils/session.js';

// listSessionModules/LEGACY_BASE_SESSION_SLUGS are imported only as reference
// data (what the 13 canonical modules and legacy slugs are called) to build
// assertions — every actual CLI invocation below runs through the INSTALLED
// package's binary, never through this checkout's src/. That distinction is
// the entire point of this script.

const REQUIRED_INSTALLED_FILES = ['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md', path.join('bin', 'ddae-engine.js')];
const FORBIDDEN_INSTALLED_PATHS = ['test', '.github', path.join('docs', 'sessions'), 'feedback', path.join('scripts', 'ci'), path.join('scripts', 'release'), '.git'];
const STALE_OPERATIONAL_PATTERNS = ['github.com/LukasAlexandre/DDAD', 'LukasAlexandre/DDAD.git'];

function assertOutsideProjectRoot(candidatePath, label) {
  const resolvedCandidate = fs.realpathSync(candidatePath);
  const resolvedRoot = fs.realpathSync(PROJECT_ROOT);
  if (resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`${label} must be outside the project checkout — got "${resolvedCandidate}" under "${resolvedRoot}"`);
  }
}

/**
 * Resolves npm's own JS entrypoint (set by npm itself as an env var on any
 * process it spawns — `npm run smoke`, `npm test`, `npm run release:check`,
 * `npm publish` via prepublishOnly) and invokes it directly with `node`.
 * This sidesteps the Windows `npm.cmd` shim problem found in Bloco 03
 * (execFileSync cannot spawn .cmd files without a shell) without needing a
 * shell at all — safe even when arguments contain spaces (temp paths on
 * Windows regularly do), unlike a shell command built from string literals.
 */
function getNpmExecPath() {
  const execPath = process.env.npm_execpath;
  if (!execPath || !fs.existsSync(execPath)) {
    throw new Error(
      'npm_execpath is not set or does not exist. This script must run through npm '
      + '(e.g. `npm run smoke`, `npm test`, or `npm run release:check`) — npm sets this '
      + 'env var automatically for any script it runs. Running '
      + '`node scripts/release/smoke-distribution.mjs` directly is not supported.',
    );
  }
  return execPath;
}

/**
 * Strips inherited `npm_config_*` env vars before spawning a nested npm.
 * Without this, running this script from inside `npm publish --dry-run`
 * (prepublishOnly -> release:check -> smoke) leaks the parent's
 * `npm_config_dry_run=true` into the nested `npm pack`/`npm install` calls
 * below — they'd silently no-op (pack reports success but never writes the
 * tarball) instead of doing the real thing this script needs them to do.
 */
function cleanNpmEnv() {
  const cleaned = { ...process.env };
  for (const key of Object.keys(cleaned)) {
    if (key.toLowerCase().startsWith('npm_config_')) {
      delete cleaned[key];
    }
  }
  return cleaned;
}

function runNpm(args, options = {}) {
  const npmExecPath = getNpmExecPath();
  return execFileSync(process.execPath, [npmExecPath, ...args], {
    encoding: 'utf8',
    env: cleanNpmEnv(),
    ...options,
  });
}

function runInstalledCli(binPath, args, options = {}) {
  return execFileSync(process.execPath, [binPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: '' },
    ...options,
  });
}

function packTarball(destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  const output = runNpm(['pack', '--json', '--pack-destination', destDir], { cwd: PROJECT_ROOT });
  const [summary] = JSON.parse(output);
  if (summary.name !== 'ddae-engine') {
    throw new Error(`Unexpected packed package name: ${summary.name}`);
  }
  if (summary.version !== EXPECTED_VERSION) {
    throw new Error(`Unexpected packed package version: ${summary.version} (expected ${EXPECTED_VERSION})`);
  }
  const tarballPath = path.join(destDir, summary.filename);
  if (!fs.existsSync(tarballPath)) {
    throw new Error(`Expected tarball not found at ${tarballPath}`);
  }
  assertOutsideProjectRoot(tarballPath, 'Tarball');
  return { tarballPath, summary };
}

function installTarball(tarballPath, installDir) {
  fs.mkdirSync(installDir, { recursive: true });
  runNpm([
    'install',
    '--prefix', installDir,
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--no-save',
    '--offline',
    tarballPath,
  ], { cwd: installDir });
}

function resolveInstalledCli(installDir) {
  const installedPackageDir = path.join(installDir, 'node_modules', 'ddae-engine');
  const pkgJsonPath = path.join(installedPackageDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    throw new Error(`Installed package.json not found at ${pkgJsonPath}`);
  }
  const installedPkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  if (installedPkg.name !== 'ddae-engine' || installedPkg.version !== EXPECTED_VERSION) {
    throw new Error(`Installed package identity mismatch: ${installedPkg.name}@${installedPkg.version}`);
  }

  const binRelative = installedPkg.bin && installedPkg.bin['ddae-engine'];
  if (!binRelative) {
    throw new Error('Installed package.json has no bin.ddae-engine entry');
  }
  const binPath = path.join(installedPackageDir, binRelative);
  if (!fs.existsSync(binPath)) {
    throw new Error(`Installed CLI entrypoint not found at ${binPath}`);
  }

  // Proof that npm's normal PATH-shim linking worked, even though we invoke
  // the resolved entrypoint directly via `node` (see runInstalledCli) rather
  // than through this shim — executing .cmd/.ps1 shims portably would need a
  // shell on Windows, the exact fragility avoided elsewhere in this file.
  const shimNames = process.platform === 'win32'
    ? ['ddae-engine.cmd', 'ddae-engine.ps1', 'ddae-engine']
    : ['ddae-engine'];
  const binDir = path.join(installDir, 'node_modules', '.bin');
  const shimFound = shimNames.some((name) => fs.existsSync(path.join(binDir, name)));
  if (!shimFound) {
    throw new Error(`No PATH shim found under ${binDir} for any of: ${shimNames.join(', ')}`);
  }

  assertOutsideProjectRoot(binPath, 'Installed CLI entrypoint');

  return { installedPackageDir, binPath, installedPkg };
}

function checkInstalledPackageContent(installedPackageDir) {
  for (const rel of REQUIRED_INSTALLED_FILES) {
    if (!fs.existsSync(path.join(installedPackageDir, rel))) {
      throw new Error(`Required file missing from installed package: ${rel}`);
    }
  }
  for (const rel of FORBIDDEN_INSTALLED_PATHS) {
    if (fs.existsSync(path.join(installedPackageDir, rel))) {
      throw new Error(`Forbidden path present in installed package: ${rel}`);
    }
  }
}

/**
 * Scans for the operational GitHub URL, not the bare word "DDAD" — the
 * installed README.md legitimately contains a historical sentence naming
 * DDAD as the project's original identity, which is not a stale reference.
 */
function checkNoStaleReferences(installedPackageDir) {
  for (const rel of ['package.json', 'README.md', 'CHANGELOG.md']) {
    const filePath = path.join(installedPackageDir, rel);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of STALE_OPERATIONAL_PATTERNS) {
      if (content.includes(pattern)) {
        throw new Error(`Stale operational reference "${pattern}" found in installed ${rel}`);
      }
    }
  }
}

function initConsumer(binPath, consumerDir) {
  fs.mkdirSync(consumerDir, { recursive: true });
  runInstalledCli(binPath, ['init', '--dir', consumerDir]);
}

function assertZeroSessions(binPath, consumerDir) {
  const sessionsDir = path.join(consumerDir, 'Docs', '05_sessions');
  if (!fs.existsSync(path.join(sessionsDir, 'README.md'))) {
    throw new Error('Docs/05_sessions/README.md missing after init');
  }
  const entries = fs.readdirSync(sessionsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  if (entries.length !== 0) {
    throw new Error(`Expected zero sessions after init, found: ${entries.map((e) => e.name).join(', ')}`);
  }
  const validateOutput = runInstalledCli(binPath, ['validate', '--dir', consumerDir]);
  if (!/Status: OK/.test(validateOutput) || !/Sessions found: 0/.test(validateOutput)) {
    throw new Error(`validate did not confirm zero sessions:\n${validateOutput}`);
  }
  const auditOutput = runInstalledCli(binPath, ['audit', '--dir', consumerDir]);
  if (!/Sessions found: 0/.test(auditOutput)) {
    throw new Error(`audit did not confirm zero sessions:\n${auditOutput}`);
  }
}

function createSession(binPath, consumerDir, name, expectedFolderName) {
  const output = runInstalledCli(binPath, ['session', 'create', name, '--dir', consumerDir]);
  if (!output.includes(expectedFolderName)) {
    throw new Error(`Expected session folder "${expectedFolderName}" in output:\n${output}`);
  }
  return { folderName: expectedFolderName };
}

function assertModules(consumerDir, sessionFolderName) {
  const sessionDir = path.join(consumerDir, 'Docs', '05_sessions', sessionFolderName);
  const modules = listSessionModules();
  if (modules.length !== 13) {
    throw new Error(`Canonical module list drifted from 13 entries: ${modules.length}`);
  }
  for (const moduleName of modules) {
    if (!fs.existsSync(path.join(sessionDir, moduleName))) {
      throw new Error(`Missing module "${moduleName}" in ${sessionFolderName}`);
    }
  }
}

function createBlock(binPath, consumerDir, sessionFolderName, name) {
  const output = runInstalledCli(binPath, ['block', 'create', name, '--session', sessionFolderName, '--dir', consumerDir]);
  const match = output.match(/Created block: .*\/05_blocks\/(bloco_\d+_[a-z0-9_]+)\.md/);
  if (!match) {
    throw new Error(`Could not parse created block id from output:\n${output}`);
  }
  return match[1];
}

function createPrompt(binPath, consumerDir, sessionFolderName, blockId) {
  const output = runInstalledCli(binPath, ['prompt', 'create', '--block', blockId, '--session', sessionFolderName, '--dir', consumerDir]);
  if (!output.includes(`prompt_${blockId}.md`)) {
    throw new Error(`Expected prompt_${blockId}.md in output:\n${output}`);
  }
}

function createFeedback(binPath, consumerDir, sessionFolderName, blockId) {
  const output = runInstalledCli(binPath, ['feedback', 'create', '--block', blockId, '--session', sessionFolderName, '--dir', consumerDir]);
  if (!output.includes(`feedback_${blockId}.md`)) {
    throw new Error(`Expected feedback_${blockId}.md in output:\n${output}`);
  }
}

function assertValidate(binPath, consumerDir) {
  const output = runInstalledCli(binPath, ['validate', '--dir', consumerDir]);
  if (!/Status: OK/.test(output) || !/Sessions found: 2/.test(output)) {
    throw new Error(`validate did not confirm the expected final state:\n${output}`);
  }
}

function assertAudit(binPath, consumerDir) {
  const output = runInstalledCli(binPath, ['audit', '--dir', consumerDir]);
  if (!/Sessions found: 2/.test(output)) {
    throw new Error(`audit did not confirm the expected final state:\n${output}`);
  }
}

/**
 * Proves the Context Compiler capability (Blocos 05–08) works through the
 * INSTALLED tarball, not just this checkout — packs/installs already
 * happened above; this only exercises `context build/show/validate`
 * against a small, disposable consumer via the same `binPath` used for
 * every other step in this script. A minimal secret sentinel confirms the
 * Sensitive Data Guard is active in the shipped artifact, not just in the
 * source tree.
 */
function contextCompilerJourney(binPath, contextConsumerDir) {
  const SENTINEL = 'DDAE_DISTRIBUTION_SMOKE_SECRET_3C91EA';

  fs.mkdirSync(contextConsumerDir, { recursive: true });
  runInstalledCli(binPath, ['init', '--dir', contextConsumerDir]);
  fs.writeFileSync(path.join(contextConsumerDir, 'README.md'), 'Distribution smoke overview for the context compiler.\n');
  fs.writeFileSync(path.join(contextConsumerDir, '.env'), `API_KEY=${SENTINEL}\n`);

  const buildOutput = runInstalledCli(binPath, ['context', 'build', '--goal', 'distribution smoke proof', '--dir', contextConsumerDir]);
  if (!/Context package built successfully\./.test(buildOutput)) {
    throw new Error(`context build did not report success:\n${buildOutput}`);
  }
  if (buildOutput.includes(SENTINEL)) {
    throw new Error('context build stdout leaked the sentinel secret');
  }

  const manifestPath = path.join(contextConsumerDir, '.ddae', 'context', 'manifest.json');
  const contextMdPath = path.join(contextConsumerDir, '.ddae', 'context', 'CONTEXT.md');
  const manifestText = fs.readFileSync(manifestPath, 'utf8');
  const contextMdText = fs.readFileSync(contextMdPath, 'utf8');
  if (manifestText.includes(SENTINEL) || contextMdText.includes(SENTINEL)) {
    throw new Error('the built context package leaked the sentinel secret');
  }
  const manifest = JSON.parse(manifestText);
  if (!manifest.excluded_sources.some((entry) => entry.path === '.env' && entry.reason === 'sensitive_name')) {
    throw new Error(`expected .env to be excluded by the Sensitive Data Guard:\n${JSON.stringify(manifest.excluded_sources)}`);
  }
  if (!manifest.sources.some((source) => source.path === 'README.md')) {
    throw new Error('expected README.md to be safely ingested as a Source');
  }

  const showOutput = runInstalledCli(binPath, ['context', 'show', '--dir', contextConsumerDir]);
  if (showOutput !== contextMdText) {
    throw new Error('context show did not print exactly the built CONTEXT.md');
  }

  const validateOutput = runInstalledCli(binPath, ['context', 'validate', '--dir', contextConsumerDir]);
  if (!/Status: VALID/.test(validateOutput)) {
    throw new Error(`context validate did not report VALID:\n${validateOutput}`);
  }
}

function legacyDetectionJourney(binPath, legacyConsumerDir) {
  fs.mkdirSync(legacyConsumerDir, { recursive: true });
  runInstalledCli(binPath, ['init', '--dir', legacyConsumerDir]);
  const sessionsDir = path.join(legacyConsumerDir, 'Docs', '05_sessions');
  const legacySlug = LEGACY_BASE_SESSION_SLUGS[0];
  const legacyFolderName = `session_01_${legacySlug}`;
  const legacyDir = path.join(sessionsDir, legacyFolderName);
  fs.mkdirSync(legacyDir, { recursive: true });

  const auditOutput = runInstalledCli(binPath, ['audit', '--dir', legacyConsumerDir]);
  if (!/legada/i.test(auditOutput)) {
    throw new Error(`Expected legacy scaffold warning, got:\n${auditOutput}`);
  }
  if (!auditOutput.includes(legacyFolderName)) {
    throw new Error(`Expected legacy folder name "${legacyFolderName}" named in warning:\n${auditOutput}`);
  }
  if (!fs.existsSync(legacyDir)) {
    throw new Error('Legacy fixture directory must not be deleted by audit');
  }
}

/**
 * Runs the full distribution smoke: packs a REAL tarball, installs it in
 * isolation, and exercises the installed CLI end to end — proving the
 * artifact that will ship to npm works independently of this checkout.
 */
export async function runDistributionSmoke({ keepTmp = process.env.DDAE_SMOKE_KEEP_TMP === '1' } = {}) {
  const results = [];
  let tmpRoot;
  let currentStep = 'Setup';
  let header = null;

  try {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ddae-distribution-smoke-'));
    assertOutsideProjectRoot(tmpRoot, 'Temporary smoke root');

    const dirs = {
      pack: path.join(tmpRoot, 'pack'),
      install: path.join(tmpRoot, 'install'),
      consumer: path.join(tmpRoot, 'consumer'),
      legacyConsumer: path.join(tmpRoot, 'legacy-consumer'),
      contextConsumer: path.join(tmpRoot, 'context-consumer'),
    };

    currentStep = 'Tarball';
    const { tarballPath, summary } = packTarball(dirs.pack);
    results.push({ name: 'Tarball', ok: true, detail: summary.filename });

    currentStep = 'Package install';
    installTarball(tarballPath, dirs.install);
    results.push({ name: 'Package install', ok: true, detail: dirs.install });

    currentStep = 'Installed binary';
    const { installedPackageDir, binPath, installedPkg } = resolveInstalledCli(dirs.install);
    results.push({ name: 'Installed binary', ok: true, detail: binPath });
    header = { summary, installedPkg, binPath, installedPackageDir };

    currentStep = 'Package contents';
    checkInstalledPackageContent(installedPackageDir);
    results.push({ name: 'Package contents', ok: true });

    currentStep = 'Repository independence';
    checkNoStaleReferences(installedPackageDir);
    assertOutsideProjectRoot(installedPackageDir, 'Installed package');
    results.push({ name: 'Repository independence', ok: true });

    currentStep = 'CLI --version';
    const versionOutput = runInstalledCli(binPath, ['--version']).trim();
    if (versionOutput !== EXPECTED_VERSION) {
      throw new Error(`Expected --version "${EXPECTED_VERSION}", got "${versionOutput}"`);
    }
    results.push({ name: 'CLI --version', ok: true });

    currentStep = 'CLI --help';
    const helpOutput = runInstalledCli(binPath, ['--help']);
    if (!/ddae-engine — Document-Driven AI Engineering Engine/.test(helpOutput) || !/Commands:/.test(helpOutput)) {
      throw new Error(`Unexpected --help output:\n${helpOutput}`);
    }
    results.push({ name: 'CLI --help', ok: true });

    currentStep = 'Fresh init';
    initConsumer(binPath, dirs.consumer);
    results.push({ name: 'Fresh init', ok: true });

    currentStep = 'Zero sessions';
    assertZeroSessions(binPath, dirs.consumer);
    results.push({ name: 'Zero sessions', ok: true });

    currentStep = 'Session 01';
    const session1 = createSession(binPath, dirs.consumer, 'smoke primeira', 'session_01_smoke_primeira');
    results.push({ name: 'Session 01', ok: true });

    currentStep = 'Session 02';
    createSession(binPath, dirs.consumer, 'smoke segunda', 'session_02_smoke_segunda');
    results.push({ name: 'Session 02', ok: true });

    currentStep = '13 modules';
    assertModules(dirs.consumer, session1.folderName);
    results.push({ name: '13 modules', ok: true });

    currentStep = 'Block flow';
    const blockId = createBlock(binPath, dirs.consumer, session1.folderName, 'smoke bloco');
    results.push({ name: 'Block flow', ok: true });

    currentStep = 'Prompt flow';
    createPrompt(binPath, dirs.consumer, session1.folderName, blockId);
    results.push({ name: 'Prompt flow', ok: true });

    currentStep = 'Feedback flow';
    createFeedback(binPath, dirs.consumer, session1.folderName, blockId);
    results.push({ name: 'Feedback flow', ok: true });

    currentStep = 'Validate';
    assertValidate(binPath, dirs.consumer);
    results.push({ name: 'Validate', ok: true });

    currentStep = 'Audit';
    assertAudit(binPath, dirs.consumer);
    results.push({ name: 'Audit', ok: true });

    currentStep = 'Legacy detection';
    legacyDetectionJourney(binPath, dirs.legacyConsumer);
    results.push({ name: 'Legacy detection', ok: true });

    currentStep = 'Context compiler';
    contextCompilerJourney(binPath, dirs.contextConsumer);
    results.push({ name: 'Context compiler', ok: true });

    return { ok: true, results, header };
  } catch (error) {
    results.push({ name: currentStep, ok: false, error: error.message });
    return { ok: false, results, header, error };
  } finally {
    if (tmpRoot) {
      if (keepTmp) {
        results.push({ name: 'Cleanup', ok: true, detail: `skipped, kept at ${tmpRoot}` });
      } else {
        try {
          fs.rmSync(tmpRoot, { recursive: true, force: true });
          results.push({ name: 'Cleanup', ok: true });
        } catch (cleanupError) {
          results.push({ name: 'Cleanup', ok: false, error: cleanupError.message });
        }
      }
    }
  }
}

function formatLine(result) {
  const status = result.ok ? 'OK' : 'FAILED';
  const detail = result.detail ? ` (${result.detail})` : '';
  const error = result.error ? ` — ${result.error}` : '';
  return `${result.name}: ${status}${detail}${error}`;
}

function isMain() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

async function main() {
  const outcome = await runDistributionSmoke();

  console.log('DDAE Distribution Smoke\n');
  if (outcome.header) {
    console.log(`Source package: ${outcome.header.summary.name}@${outcome.header.summary.version}`);
    console.log(`Tarball: ${outcome.header.summary.filename}`);
    console.log('Tarball location: temporary');
    console.log(`Installed package: ${outcome.header.installedPackageDir}`);
    console.log(`Installed binary: ${outcome.header.binPath}`);
    console.log();
  }

  for (const result of outcome.results) {
    console.log(formatLine(result));
  }
  console.log();

  if (!outcome.ok) {
    console.log('[DDAE smoke] FAILED');
    process.exitCode = 1;
    return;
  }
  console.log('[DDAE smoke] OK');
}

if (isMain()) {
  await main();
}
