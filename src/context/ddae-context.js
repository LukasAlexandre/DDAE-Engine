import fs from 'node:fs';
import path from 'node:path';
import {
  listSessionDirs,
  parseSessionFolderName,
  listSessionModules,
} from '../utils/session.js';
import { scanQualityGateStatuses } from '../utils/quality-gates.js';
import { getMarkdownSection } from '../utils/markdown-checks.js';

const DOCS_DIR_NAME = 'Docs';
const SESSIONS_DIR_NAME = '05_sessions';
const QUALITY_GATES_DIR_NAME = '06_quality_gates';

const BLOCK_FILE_PATTERN = /^bloco_(\d+)_([a-z0-9_]+)\.md$/;
const PROMPT_FILE_PATTERN = /^prompt_(bloco_\d+_[a-z0-9_]+)\.md$/;
const FEEDBACK_FILE_PATTERN = /^feedback_(bloco_\d+_[a-z0-9_]+)\.md$/;
const BLOCK_HEADING_PATTERN = /^#\s*Bloco\s+(\d+)\s*[—–-]\s*(.+?)\s*$/m;

// The session README template's "## 5. Status" section always offers exactly
// these four literal checkbox options — a closed, structured enum, not free
// text. Recognizing a checked box here is markdown-structure parsing (same
// technique already used for quality gates in quality-gates.js), never NLP:
// nothing here infers meaning from prose.
const SESSION_STATUS_OPTIONS = ['Não iniciada', 'Em andamento', 'Concluída', 'Bloqueada'];

// Modules whose canonical file set isn't fixed by a single known filename —
// their directory contents are listed generically (still non-recursive, one
// level, only inside a known canonical session module path).
const LISTED_MODULES = ['09_validation', '10_tests', '11_security', '12_performance', '13_release'];

function toPortablePath(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function relativeTo(root, absPath) {
  return toPortablePath(path.relative(root, absPath));
}

function lstatOrNull(entryPath) {
  try {
    return fs.lstatSync(entryPath);
  } catch {
    return null;
  }
}

/**
 * Reads a single known canonical file, refusing to follow a symlink and
 * never throwing when the file is absent — matches the path-safety policy
 * shared with git-context.js/project-context.js (Bloco 09 owns the full
 * Sensitive Data Guard; this collector only ever touches known Docs/ paths,
 * so reading their content here is safe by construction, not by filtering).
 */
function readCanonicalFile(root, absPath) {
  const relPath = relativeTo(root, absPath);
  const stat = lstatOrNull(absPath);
  if (!stat) {
    return { path: relPath, exists: false, content: null };
  }
  if (stat.isSymbolicLink()) {
    return { path: relPath, exists: false, content: null, warning: 'SYMLINK_SKIPPED' };
  }
  if (!stat.isFile()) {
    return { path: relPath, exists: false, content: null };
  }
  return { path: relPath, exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

/**
 * Lists the `.md` files directly inside a known canonical module directory
 * (one level, non-recursive) and reads each — used for modules whose file
 * set isn't a single fixed name (tests/security/performance/release/
 * validation), unlike bugs (two fixed names) or governance decisions (one).
 */
function listCanonicalMarkdownFiles(root, dirPath) {
  const dirStat = lstatOrNull(dirPath);
  if (!dirStat || dirStat.isSymbolicLink() || !dirStat.isDirectory()) {
    return [];
  }
  const names = fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort();

  return names.map((name) => readCanonicalFile(root, path.join(dirPath, name)));
}

function statusMarkedAs(sectionContent, optionLabel) {
  const escaped = optionLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`-\\s*\\[[xX]\\]\\s*${escaped}`).test(sectionContent);
}

/** Structured checkbox parsing of the session README's "## 5. Status" section. */
function readSessionStatus(readmeContent) {
  const section = getMarkdownSection(readmeContent, '5. Status');
  if (!section) {
    return null;
  }
  return SESSION_STATUS_OPTIONS.find((option) => statusMarkedAs(section, option)) ?? null;
}

function collectModules(root, sessionPath) {
  return listSessionModules().map((name) => {
    const modulePath = path.join(sessionPath, name);
    const stat = lstatOrNull(modulePath);
    return {
      name,
      exists: !!stat && !stat.isSymbolicLink() && stat.isDirectory(),
      path: relativeTo(root, modulePath),
    };
  });
}

function collectBlocks(root, sessionPath) {
  const blocksDir = path.join(sessionPath, '05_blocks');
  const dirStat = lstatOrNull(blocksDir);
  if (!dirStat || dirStat.isSymbolicLink() || !dirStat.isDirectory()) {
    return [];
  }
  const names = fs.readdirSync(blocksDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && BLOCK_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name);

  const blocks = names.map((name) => {
    const [, number, slug] = name.match(BLOCK_FILE_PATTERN);
    const absPath = path.join(blocksDir, name);
    let title = null;
    const stat = lstatOrNull(absPath);
    if (stat && !stat.isSymbolicLink() && stat.isFile()) {
      const headingMatch = fs.readFileSync(absPath, 'utf8').match(BLOCK_HEADING_PATTERN);
      title = headingMatch ? headingMatch[2] : null;
    }
    return { number, slug, name, path: relativeTo(root, absPath), title };
  });

  return blocks.sort((a, b) => Number(a.number) - Number(b.number));
}

function collectAssociatedFiles(root, sessionPath, dirName, pattern) {
  const dirPath = path.join(sessionPath, dirName);
  const dirStat = lstatOrNull(dirPath);
  if (!dirStat || dirStat.isSymbolicLink() || !dirStat.isDirectory()) {
    return [];
  }
  const names = fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  return names.map((name) => ({
    name,
    path: relativeTo(root, path.join(dirPath, name)),
    block: name.match(pattern)[1],
  }));
}

function collectBugs(root, sessionPath) {
  const bugsDir = path.join(sessionPath, '07_bugs');
  return {
    identified: readCanonicalFile(root, path.join(bugsDir, 'bugs_identificados.md')),
    corrected: readCanonicalFile(root, path.join(bugsDir, 'bugs_corrigidos.md')),
  };
}

function collectCurrentSession(root, sessionsDir, folderName, warnings) {
  const sessionPath = path.join(sessionsDir, folderName);
  const { number, slug } = parseSessionFolderName(folderName);

  const readme = readCanonicalFile(root, path.join(sessionPath, 'README.md'));
  const status = readme.exists ? readSessionStatus(readme.content) : null;

  const modules = collectModules(root, sessionPath);
  for (const module of modules) {
    if (!module.exists) {
      warnings.push({ code: 'MODULE_MISSING', session: folderName, module: module.name });
    }
  }

  const listedModules = {};
  for (const moduleName of LISTED_MODULES) {
    listedModules[moduleName] = listCanonicalMarkdownFiles(root, path.join(sessionPath, moduleName))
      .map((entry) => ({ ...entry, name: path.basename(entry.path) }));
  }

  return {
    number,
    slug,
    name: folderName,
    path: relativeTo(root, sessionPath),
    status,
    modules,
    blocks: collectBlocks(root, sessionPath),
    prompts: collectAssociatedFiles(root, sessionPath, '06_prompts', PROMPT_FILE_PATTERN),
    feedbacks: collectAssociatedFiles(root, sessionPath, '08_feedbacks', FEEDBACK_FILE_PATTERN),
    bugs: collectBugs(root, sessionPath),
    validation: listedModules['09_validation'],
    tests: listedModules['10_tests'],
    security: listedModules['11_security'],
    performance: listedModules['12_performance'],
    release: listedModules['13_release'],
  };
}

function collectGovernance(root, docsPath) {
  return {
    decisions: readCanonicalFile(root, path.join(docsPath, '04_governance', 'registro_decisoes.md')),
    quality_gates: scanQualityGateStatuses(path.join(docsPath, QUALITY_GATES_DIR_NAME)).map((gate) => ({
      name: gate.gate,
      path: relativeTo(root, path.join(docsPath, QUALITY_GATES_DIR_NAME, gate.gate)),
      exists: gate.exists,
      status: gate.status,
    })),
  };
}

function degradedResult(requested, warnings) {
  return {
    available: false,
    docs_root: null,
    sessions_root: null,
    selection: { requested, selected: null, reason: 'none' },
    sessions: [],
    current_session: null,
    governance: { decisions: null, quality_gates: [] },
    warnings,
  };
}

/**
 * Collects a deterministic, read-only snapshot of the DDAE operational state
 * persisted under the canonical control plane (`Docs/`) of `projectRoot`.
 *
 * This is a sensor, not the Context Compiler: it never decides relevance,
 * never resolves authority between conflicting sources, and never renders
 * `CONTEXT.md`. It answers exactly one question — "what does the DDAE
 * control plane currently say about this project?" — normalized, so later
 * blocks (Authority & Source Model, Relevance Engine, Manifest + Compiler)
 * can build on it without re-parsing the filesystem themselves.
 *
 * `legacy/sessions/` (pre-self-hosting engineering history) is never read:
 * it's historical evidence, not current operational state. Only a future,
 * explicit authority/policy decision could bring it into the Context
 * Compiler — never this collector, and never by default.
 *
 * `options.session`, when given, must name an existing canonical session
 * folder (e.g. `session_02_context_compiler_0_3_0`); an unresolvable
 * explicit request never silently falls back to another session.
 */
export function collectDdaeContext(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`collectDdaeContext: projectRoot does not exist or is not a directory: ${root}`);
  }

  const requested = options.session ?? null;
  const docsPath = path.join(root, DOCS_DIR_NAME);
  const docsStat = lstatOrNull(docsPath);
  if (!docsStat || docsStat.isSymbolicLink() || !docsStat.isDirectory()) {
    return degradedResult(requested, [{ code: 'DOCS_NOT_FOUND' }]);
  }

  const sessionsDir = path.join(docsPath, SESSIONS_DIR_NAME);
  const sessionFolders = listSessionDirs(sessionsDir);
  const warnings = [];

  const sessions = sessionFolders
    .map((folderName) => {
      const { number, slug } = parseSessionFolderName(folderName);
      return { number, slug, name: folderName, path: relativeTo(root, path.join(sessionsDir, folderName)) };
    })
    .sort((a, b) => Number(a.number) - Number(b.number));

  let selectedFolder = null;
  let reason = 'none';

  if (requested !== null) {
    if (sessionFolders.includes(requested)) {
      selectedFolder = requested;
      reason = 'explicit';
    } else {
      reason = 'explicit_not_found';
      warnings.push({ code: 'EXPLICIT_SESSION_NOT_FOUND', session: requested });
    }
  } else if (sessions.length > 0) {
    selectedFolder = sessions[sessions.length - 1].name;
    reason = 'latest_canonical';
  }

  const currentSession = selectedFolder
    ? collectCurrentSession(root, sessionsDir, selectedFolder, warnings)
    : null;

  return {
    available: true,
    docs_root: DOCS_DIR_NAME,
    sessions_root: toPortablePath(path.join(DOCS_DIR_NAME, SESSIONS_DIR_NAME)),
    selection: { requested, selected: selectedFolder, reason },
    sessions,
    current_session: currentSession,
    governance: collectGovernance(root, docsPath),
    warnings,
  };
}
