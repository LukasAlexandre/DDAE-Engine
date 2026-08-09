import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectNameOf } from '../utils/text.js';
import { collectGitContext } from '../context/git-context.js';
import { collectDdaeContext } from '../context/ddae-context.js';
import { compileContext } from '../context/compiler.js';
import { renderContextMarkdown } from '../context/renderer.js';
import { validateContextState } from '../context/validator.js';
import { stableStringify } from '../context/fingerprint.js';
import { BUDGET_PROFILES } from '../context/relevance.js';
import { collectSafeProjectSources, collectSafeCurrentSourceHashes } from '../context/sensitive-files.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));

function ddaeOutputPaths(dir) {
  const ddaeDir = path.join(dir, '.ddae');
  const contextDir = path.join(ddaeDir, 'context');
  return {
    ddaeDir,
    contextDir,
    gitignorePath: path.join(ddaeDir, '.gitignore'),
    manifestPath: path.join(contextDir, 'manifest.json'),
    contextMdPath: path.join(contextDir, 'CONTEXT.md'),
    validationPath: path.join(contextDir, 'validation.json'),
  };
}

function lstatOrNull(target) {
  try {
    return fs.lstatSync(target);
  } catch {
    return null;
  }
}

/**
 * Refuses to write through a path that would escape `projectRoot` or
 * collide with a non-directory — the same realpath-containment discipline
 * already used for the published tarball (scripts/release/
 * smoke-distribution.mjs), applied here to the CLI's own output
 * destination rather than an installed package.
 */
function assertSafeOutputDir(targetDir, projectRoot, label) {
  const stat = lstatOrNull(targetDir);
  if (stat === null) {
    return;
  }
  if (stat.isSymbolicLink()) {
    const resolvedTarget = fs.realpathSync(targetDir);
    const resolvedRoot = fs.realpathSync(projectRoot);
    if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(resolvedRoot + path.sep)) {
      throw new Error(`context build: ${label} is a symlink escaping the project root — refusing to write`);
    }
    return;
  }
  if (!stat.isDirectory()) {
    throw new Error(`context build: ${label} exists and is not a directory — refusing to overwrite`);
  }
}

/** Creates `.ddae/.gitignore` with `*` if absent — self-contained ignore,
 * never touches the consumer's own root `.gitignore` (Manifest v1 contract,
 * Section 11). Existing content is never overwritten. */
function ensureDdaeGitignore(ddaeDir, gitignorePath) {
  if (fs.existsSync(gitignorePath)) {
    return;
  }
  fs.mkdirSync(ddaeDir, { recursive: true });
  fs.writeFileSync(gitignorePath, '*\n', 'utf8');
}

function writeDeterministic(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

export async function contextBuildCommand({ goal, session, budget, dir }) {
  if (!goal || goal.trim() === '') {
    throw new Error('context build requires --goal "<text>"');
  }
  const budgetProfile = budget ?? 'standard';
  if (!Object.prototype.hasOwnProperty.call(BUDGET_PROFILES, budgetProfile)) {
    throw new Error(`context build: invalid --budget "${budgetProfile}". Expected one of: ${Object.keys(BUDGET_PROFILES).join(', ')}`);
  }

  const gitContext = collectGitContext(dir);
  const ddaeContext = collectDdaeContext(dir, session ? { session } : {});
  if (session && ddaeContext.selection.reason === 'explicit_not_found') {
    throw new Error(`context build: session not found: ${session}`);
  }

  // Every candidate that reaches compileContext() has already passed
  // through the Sensitive Data Guard — this is the only place project file
  // content is ever read. Security exclusions (files the Guard refused
  // outright) are carried alongside, without ever having become a Source.
  const { candidates, excluded_sources: securityExclusions } = collectSafeProjectSources(dir);

  // Build entirely in memory first — nothing touches the filesystem until
  // the Manifest and CONTEXT.md are both known-good (Bloco 07 contract:
  // never leave a partial context package behind on failure).
  const manifest = compileContext({
    engineVersion: pkg.version,
    project: { name: projectNameOf(dir), root_kind: 'ddae' },
    goal,
    budget: budgetProfile,
    gitContext,
    ddaeContext,
    candidates,
    securityExclusions,
    claims: [],
    facts: { decisions: [], constraints: [], bugs: [], validation: [] },
  });
  const contextMarkdown = renderContextMarkdown(manifest);

  // The hashes the Guard already computed while reading each candidate —
  // never a second read of the filesystem just to build the receipt.
  const currentSourceHashes = Object.fromEntries(
    candidates
      .filter((candidate) => candidate.source.content_hash !== null)
      .map((candidate) => [candidate.source.id, candidate.source.content_hash]),
  );
  const { status: builtStatus, reasons: builtReasons } = validateContextState({
    manifest,
    contextMarkdown,
    currentGitContext: gitContext,
    currentDdaeContext: ddaeContext,
    currentSourceHashes,
  });
  const validationReceipt = {
    schema_version: manifest.schema_version,
    status: builtStatus,
    fingerprint: manifest.fingerprint.value,
    reasons: builtReasons,
  };

  const { ddaeDir, contextDir, gitignorePath, manifestPath, contextMdPath, validationPath } = ddaeOutputPaths(dir);
  assertSafeOutputDir(ddaeDir, dir, '.ddae');
  assertSafeOutputDir(contextDir, dir, '.ddae/context');

  ensureDdaeGitignore(ddaeDir, gitignorePath);
  writeDeterministic(manifestPath, `${stableStringify(manifest)}\n`);
  writeDeterministic(contextMdPath, contextMarkdown);
  writeDeterministic(validationPath, `${stableStringify(validationReceipt)}\n`);

  console.log('Context package built successfully.');
  console.log(`Safe sources ingested: ${candidates.length}`);
  console.log(`Sources excluded by the Sensitive Data Guard: ${securityExclusions.length}`);
}

export async function contextShowCommand({ dir }) {
  const { contextMdPath } = ddaeOutputPaths(dir);
  if (!fs.existsSync(contextMdPath)) {
    throw new Error('context show: no context package found — run "ddae-engine context build" first');
  }
  process.stdout.write(fs.readFileSync(contextMdPath, 'utf8'));
}

export async function contextValidateCommand({ dir }) {
  const { manifestPath, contextMdPath } = ddaeOutputPaths(dir);
  if (!fs.existsSync(manifestPath)) {
    throw new Error('context validate: no context package found — run "ddae-engine context build" first');
  }

  let manifest;
  let parseError = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    parseError = 'manifest.json is not valid JSON';
  }

  console.log('DDAE Context Validation Report\n');

  if (parseError) {
    console.log('Status: INVALID');
    console.log('Reasons:');
    console.log(`  - MANIFEST_INVALID: ${parseError}`);
    process.exitCode = 1;
    return;
  }

  const contextMarkdown = fs.existsSync(contextMdPath) ? fs.readFileSync(contextMdPath, 'utf8') : undefined;
  const currentGitContext = collectGitContext(dir);
  const currentDdaeContext = collectDdaeContext(dir);

  // Every selected source is re-read through the same Guard used at build
  // time — never a raw fs.readFileSync of `source.path`. A source that is
  // missing, or now fails any Guard check (renamed into a denied name,
  // grown oversized, turned binary, or started matching a sensitive-content
  // heuristic), is simply absent from the map — never assigned a hash by
  // bypassing the Guard.
  const relevantPaths = Array.isArray(manifest?.relevant_files)
    ? manifest.relevant_files.map((entry) => entry.path).filter((entry) => typeof entry === 'string')
    : [];
  const hashesByPath = collectSafeCurrentSourceHashes(dir, relevantPaths);
  const currentSourceHashes = {};
  if (Array.isArray(manifest?.relevant_files)) {
    for (const entry of manifest.relevant_files) {
      if (typeof entry.path === 'string' && hashesByPath[entry.path] !== undefined) {
        currentSourceHashes[entry.source_id] = hashesByPath[entry.path];
      }
    }
  }

  const { status, reasons } = validateContextState({
    manifest,
    contextMarkdown,
    currentGitContext,
    currentDdaeContext,
    currentSourceHashes,
  });

  console.log(`Status: ${status}`);
  if (reasons.length > 0) {
    console.log('Reasons:');
    for (const reason of reasons) {
      console.log(`  - ${JSON.stringify(reason)}`);
    }
  }

  process.exitCode = status === 'VALID' ? 0 : 1;
}
