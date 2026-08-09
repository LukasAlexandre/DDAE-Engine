import fs from 'node:fs';
import path from 'node:path';
import { createSource } from './authority.js';
import { sha256Hex } from './fingerprint.js';

// Sensitive Data Guard — the security boundary that decides which project
// files are safe to become textual context, and which never should. This
// module is the ONLY place in the Context Compiler that reads arbitrary
// project file content — Compiler, Renderer, and Validator all stay pure
// and never open a `source.path` themselves (legacy/sessions/
// session_12_context_compiler_foundation/contrato_context_manifest_v1.md,
// Section 12). Content rejected here is never "sanitized and reused" — it
// is excluded outright, and a rejection record never carries the content,
// value, or matched pattern that caused the rejection.

export const MAX_SOURCE_BYTES = 262144; // 256 KiB — see Checkpoint 08 validation for the file-size survey behind this number.

const IGNORED_DIR_NAMES = new Set(['.git', '.ddae', 'node_modules', 'dist', 'build', 'coverage', 'vendor']);

// Matched against the file's basename only, case-insensitively — never the
// full path — so a sensitive name is denied no matter how deep it's nested.
const DENY_BASENAME_PATTERNS = [
  /^\.env$/i,
  /^\.env\..+$/i,
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa$/i,
  /^id_ed25519$/i,
  /^\.npmrc$/i,
  /^credentials/i,
  /^secrets/i,
  /\.p12$/i,
  /\.pfx$/i,
];

// Textual source-code and documentation types this Guard is willing to
// consider at all. An unrecognized extension is never treated as evidence
// of anything — it simply never enters the candidate universe, and never
// pollutes excluded_sources either (Bloco 08 contract: "unsupported type
// não precisa poluir excluded_sources em massa").
const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.py', '.go', '.rs', '.java', '.kt', '.cs', '.c', '.cpp', '.h', '.hpp',
  '.sql', '.yml', '.yaml', '.toml', '.ini', '.properties',
  '.sh', '.ps1', '.bat', '.cmd',
  '.html', '.css', '.scss', '.vue', '.svelte',
  '.graphql', '.gql', '.proto', '.xml',
]);
const TEXT_BASENAMES = new Set(['Dockerfile', 'Makefile']);

// Case-insensitive, tolerant of optional whitespace around `=` — detection
// only needs to know a pattern is present, never to capture or report the
// matched value itself.
const SENSITIVE_CONTENT_PATTERNS = [
  /PRIVATE KEY/i,
  /API_KEY\s*=/i,
  /TOKEN\s*=/i,
  /PASSWORD\s*=/i,
  /SECRET\s*=/i,
];

const SOURCE_CODE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs',
  '.java', '.kt', '.cs', '.c', '.cpp', '.h', '.hpp', '.sh', '.ps1',
  '.bat', '.cmd', '.html', '.css', '.scss', '.vue', '.svelte', '.sql',
]);
const PROJECT_METADATA_BASENAMES = new Set([
  'package.json', 'pyproject.toml', 'requirements.txt', 'Cargo.toml',
  'go.mod', 'Gemfile', 'composer.json',
]);

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, '\n');
}

function toPortablePath(relativePath) {
  return relativePath.split('\\').join('/');
}

function matchesDenyName(basename) {
  return DENY_BASENAME_PATTERNS.some((pattern) => pattern.test(basename));
}

function isTextCandidate(basename) {
  if (TEXT_BASENAMES.has(basename)) {
    return true;
  }
  return TEXT_EXTENSIONS.has(path.extname(basename).toLowerCase());
}

function isBinary(buffer) {
  return buffer.includes(0);
}

function containsSensitiveContent(content) {
  return SENSITIVE_CONTENT_PATTERNS.some((pattern) => pattern.test(content));
}

/**
 * Classifies a Source's `kind`/`domain` purely from its project-relative
 * path — never from its content (no NLP, no keyword scanning of the file
 * body). Reuses the exact `kind`/`domain` vocabularies from authority.js;
 * never invents a new one.
 */
function classifySource(relativePath) {
  const parts = relativePath.split('/');
  const basename = parts[parts.length - 1];
  const ext = path.extname(basename).toLowerCase();

  if (parts[0] === 'Docs') {
    if (parts[1] === '02_architecture') {
      return { kind: 'architecture', domain: 'architecture_intent' };
    }
    if (relativePath === 'Docs/04_governance/registro_decisoes.md') {
      return { kind: 'decision', domain: 'architecture_intent' };
    }
    if (parts.includes('07_bugs')) {
      return { kind: 'bug', domain: 'active_bug_state' };
    }
    if (parts.includes('09_validation')) {
      return { kind: 'validation', domain: 'test_result' };
    }
  }

  if (SOURCE_CODE_EXTENSIONS.has(ext)) {
    return { kind: 'source_code', domain: 'runtime_metadata' };
  }
  if (PROJECT_METADATA_BASENAMES.has(basename)) {
    return { kind: 'project_metadata', domain: 'runtime_metadata' };
  }
  return { kind: 'documentation', domain: 'history' };
}

/**
 * The single safety pipeline shared by both directory traversal and a
 * single known-path reread (`readSafeProjectSource`) — one place that
 * decides "is this file safe to read as context", so build-time and
 * validate-time can never silently diverge.
 *
 * Order matters and is deliberate: name/type checks (cheap, no I/O beyond
 * `lstat`) happen before any content is ever read; size is checked via
 * `stat` before the file is opened; containment is checked via `realpath`
 * before content is read; binary detection happens on the raw buffer
 * before any UTF-8 interpretation; sensitive-content heuristics run last,
 * on already-decoded, LF-normalized text.
 */
function inspectPath(root, absolutePath, relativePath) {
  let lstat;
  try {
    lstat = fs.lstatSync(absolutePath);
  } catch {
    return { status: 'missing' };
  }
  if (lstat.isSymbolicLink()) {
    return { status: 'excluded', reason: 'symlink' };
  }
  if (!lstat.isFile()) {
    return { status: 'skip' };
  }

  const basename = path.basename(relativePath);
  if (matchesDenyName(basename)) {
    return { status: 'excluded', reason: 'sensitive_name' };
  }
  if (!isTextCandidate(basename)) {
    return { status: 'skip' };
  }
  if (lstat.size > MAX_SOURCE_BYTES) {
    return { status: 'excluded', reason: 'too_large' };
  }

  let realTarget;
  try {
    realTarget = fs.realpathSync(absolutePath);
  } catch {
    return { status: 'missing' };
  }
  if (realTarget !== root && !realTarget.startsWith(root + path.sep)) {
    return { status: 'excluded', reason: 'outside_root' };
  }

  let buffer;
  try {
    buffer = fs.readFileSync(absolutePath);
  } catch {
    return { status: 'missing' };
  }
  if (isBinary(buffer)) {
    return { status: 'excluded', reason: 'binary' };
  }

  const content = normalizeLineEndings(buffer.toString('utf8'));
  if (containsSensitiveContent(content)) {
    return { status: 'excluded', reason: 'sensitive_content' };
  }

  return { status: 'candidate', content };
}

function walk(root, absoluteDir, relativeDir, candidates, excluded) {
  let entries;
  try {
    entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  } catch {
    return;
  }
  entries = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  for (const entry of entries) {
    const absolutePath = path.join(absoluteDir, entry.name);
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;

    if (entry.isSymbolicLink()) {
      // Fail-closed: a symlink is never followed, whether it points to a
      // file or a directory — recorded as excluded so it's auditable.
      excluded.push({ path: relativePath, reason: 'symlink' });
      continue;
    }
    if (entry.isDirectory()) {
      if (IGNORED_DIR_NAMES.has(entry.name)) {
        continue;
      }
      walk(root, absolutePath, relativePath, candidates, excluded);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    const result = inspectPath(root, absolutePath, relativePath);
    if (result.status === 'excluded') {
      excluded.push({ path: relativePath, reason: result.reason });
    } else if (result.status === 'candidate') {
      const { kind, domain } = classifySource(relativePath);
      const source = createSource({ kind, domain, path: relativePath, content: result.content });
      candidates.push({ source, content: result.content });
    }
    // 'skip' (unrecognized type) and 'missing' (vanished mid-walk) are
    // deliberately not recorded anywhere.
  }
}

/**
 * Recursively, deterministically collects every safe textual source under
 * `projectRoot`, applying the full Guard pipeline to each candidate file.
 * Never follows a symlink, never descends into `.git`/`.ddae`/
 * `node_modules`/`dist`/`build`/`coverage`/`vendor`, never reads a file
 * above `MAX_SOURCE_BYTES`, never treats binary content as text, and never
 * ingests content matching a sensitive-data heuristic. Returns candidates
 * and exclusions both sorted deterministically by path (ties broken by
 * reason) — independent of filesystem enumeration order.
 */
export function collectSafeProjectSources(projectRoot) {
  const root = fs.realpathSync(path.resolve(projectRoot));
  const candidates = [];
  const excluded = [];
  walk(root, root, '', candidates, excluded);

  candidates.sort((a, b) => (a.source.path < b.source.path ? -1 : a.source.path > b.source.path ? 1 : 0));
  excluded.sort((a, b) => {
    if (a.path !== b.path) {
      return a.path < b.path ? -1 : 1;
    }
    return a.reason < b.reason ? -1 : a.reason > b.reason ? 1 : 0;
  });

  return Object.freeze({ candidates: Object.freeze(candidates), excluded_sources: Object.freeze(excluded) });
}

/**
 * Safely re-reads one already-known project-relative path through the
 * exact same Guard pipeline used during collection — the only way
 * `context validate` (or any other freshness check) may ever look at a
 * source's current content. Returns `null` whenever the path is missing,
 * unrecognized, or now fails any Guard check (deny name, oversized,
 * binary, sensitive content, symlink, outside root) — freshness is never
 * confirmed by a bypass.
 */
export function readSafeProjectSource(projectRoot, relativePath) {
  const root = fs.realpathSync(path.resolve(projectRoot));
  const portablePath = toPortablePath(relativePath);
  const absolutePath = path.join(root, ...portablePath.split('/'));
  const result = inspectPath(root, absolutePath, portablePath);
  if (result.status !== 'candidate') {
    return null;
  }
  return Object.freeze({ content: result.content, content_hash: sha256Hex(result.content) });
}

/**
 * Builds a `{ [relativePath]: content_hash }` map for a list of
 * project-relative paths, using `readSafeProjectSource` for each — paths
 * that are no longer safely readable are simply absent from the result,
 * never assigned a stale or fabricated hash.
 */
export function collectSafeCurrentSourceHashes(projectRoot, relativePaths) {
  const hashes = {};
  for (const relativePath of relativePaths) {
    const result = readSafeProjectSource(projectRoot, relativePath);
    if (result) {
      hashes[relativePath] = result.content_hash;
    }
  }
  return hashes;
}
