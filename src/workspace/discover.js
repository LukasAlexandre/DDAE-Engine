import fs from 'node:fs';
import path from 'node:path';
import { collectDdaeContext } from '../context/ddae-context.js';
import { collectGitContext } from '../context/git-context.js';

// Workspace Discovery — a read-only, deterministic sensor that answers
// "what is the current canonical state of this project that a future
// Project Brain could consume?", never "how do we render/persist/validate
// it?" (those belong to later blocks — Docs/03_contracts/
// contrato_workspace_project_brain.md, Seções B–H).
//
// Reuses collectDdaeContext/collectGitContext as-is. src/context/** is
// never modified by this module — two extensions considered during
// planning (commit subject, Stable Host version) were explicitly
// deferred/rejected by the Architecture Delta Gate recorded in
// Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/
// 05_blocks/bloco_02_workspace_discovery.md, Seção 4 — not implemented
// here.

const DECISION_HEADING_PATTERN = /^###\s+(RD-\d+)\s*[—–-]\s*(.+?)\s*$/gm;
const UNCHECKED_ITEM_PATTERN = /^[-*]\s*\[\s\]\s+(.+?)\s*$/gm;
const PLACEHOLDER_CELL_VALUES = new Set(['_..._', '...', '']);
const BUG_STATUS_OPEN = new Set(['Aberto', 'Em correção', 'Em correcao']);

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
 * never throwing when the file is absent — same fail-closed policy as
 * `readCanonicalFile` in ddae-context.js (kept local rather than shared,
 * matching how the existing collectors each keep their own tiny copy of
 * this same shape instead of a premature cross-module dependency).
 */
function readCanonicalFileSafe(root, absPath) {
  const relPath = relativeTo(root, absPath);
  const stat = lstatOrNull(absPath);
  if (!stat || stat.isSymbolicLink() || !stat.isFile()) {
    return { path: relPath, exists: false, content: null };
  }
  return { path: relPath, exists: true, content: fs.readFileSync(absPath, 'utf8') };
}

/**
 * Splits a Markdown pipe-table into a header row and data rows. Assumes no
 * literal `|` inside a cell (true for every canonical DDAE table this
 * module reads) — a deliberately minimal parser, not a general Markdown
 * table implementation.
 */
function splitTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function parseMarkdownTable(content) {
  if (typeof content !== 'string') {
    return { headers: [], rows: [] };
  }
  const lines = content.split('\n');
  const headerIndex = lines.findIndex((line) => /^\s*\|.*\|\s*$/.test(line));
  if (headerIndex === -1 || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[headerIndex + 1] ?? '')) {
    return { headers: [], rows: [] };
  }
  const headers = splitTableRow(lines[headerIndex]);
  const rows = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/^\s*\|.*\|\s*$/.test(line)) {
      break;
    }
    rows.push(splitTableRow(line));
  }
  return { headers, rows };
}

/**
 * A row is a template placeholder (not real data) when its primary content
 * cell (Risco/Descrição — never the ID or the enum-like Status/Probabilidade
 * columns, which can legitimately hold short values on a real row) is still
 * the unfilled `_..._`/`...` marker used across every DDAE Engine template.
 */
function isPlaceholderRow(cells, contentIndex) {
  const cell = cells[contentIndex] ?? '';
  return PLACEHOLDER_CELL_VALUES.has(cell);
}

// The template's unfilled heading is `### RD-01 — _Título da decisão_` —
// italic-wrapped placeholder text, the same "not filled in yet" convention
// as `_..._` elsewhere, just spelled out descriptively for a title instead
// of a bullet/table cell.
const PLACEHOLDER_TITLE_PATTERN = /^_.*_$/;

function discoverDecisions(ddaeContext) {
  const decisionsFile = ddaeContext.governance?.decisions;
  if (!decisionsFile?.exists || typeof decisionsFile.content !== 'string') {
    return Object.freeze([]);
  }
  const entries = [];
  for (const match of decisionsFile.content.matchAll(DECISION_HEADING_PATTERN)) {
    const summary = match[2];
    if (PLACEHOLDER_TITLE_PATTERN.test(summary)) {
      continue;
    }
    entries.push(Object.freeze({ id: match[1], summary, source_path: decisionsFile.path }));
  }
  return Object.freeze(entries);
}

function discoverRisks(root, ddaeContext) {
  if (!ddaeContext.available || !ddaeContext.docs_root) {
    return Object.freeze([]);
  }
  const absPath = path.join(root, ddaeContext.docs_root, '04_governance', 'matriz_riscos.md');
  const file = readCanonicalFileSafe(root, absPath);
  if (!file.exists) {
    return Object.freeze([]);
  }
  const { headers, rows } = parseMarkdownTable(file.content);
  const idIndex = headers.indexOf('ID');
  const riskIndex = headers.indexOf('Risco');
  const statusIndex = headers.indexOf('Status');
  if (idIndex === -1 || riskIndex === -1) {
    return Object.freeze([]);
  }
  const entries = rows
    .filter((cells) => !isPlaceholderRow(cells, riskIndex))
    .map((cells) => Object.freeze({
      id: cells[idIndex] ?? null,
      summary: cells[riskIndex] ?? null,
      status: statusIndex === -1 ? null : (cells[statusIndex] ?? null),
      source_path: file.path,
    }));
  return Object.freeze(entries);
}

function discoverOpenBugs(root, ddaeContext) {
  if (!ddaeContext.available) {
    return Object.freeze([]);
  }
  const entries = [];
  for (const session of ddaeContext.sessions) {
    const absPath = path.join(root, session.path, '07_bugs', 'bugs_identificados.md');
    const file = readCanonicalFileSafe(root, absPath);
    if (!file.exists) {
      continue;
    }
    const { headers, rows } = parseMarkdownTable(file.content);
    const idIndex = headers.indexOf('ID');
    const descIndex = headers.indexOf('Descrição');
    const statusIndex = headers.indexOf('Status');
    if (idIndex === -1 || descIndex === -1) {
      continue;
    }
    for (const cells of rows) {
      if (isPlaceholderRow(cells, descIndex)) {
        continue;
      }
      const status = statusIndex === -1 ? null : (cells[statusIndex] ?? null);
      if (status !== null && !BUG_STATUS_OPEN.has(status)) {
        continue;
      }
      entries.push(Object.freeze({
        id: cells[idIndex] ?? null,
        summary: cells[descIndex] ?? null,
        status,
        session: session.name,
        source_path: file.path,
      }));
    }
  }
  return Object.freeze(entries);
}

function discoverRecentChanges(gitContext) {
  if (!gitContext.available || !gitContext.repository) {
    return Object.freeze([]);
  }
  return Object.freeze(gitContext.recent_commits.map((commit) => Object.freeze({ sha: commit.sha })));
}

function discoverCurrentTasks(root, ddaeContext) {
  const session = ddaeContext.current_session;
  if (!session || session.blocks.length === 0) {
    return Object.freeze([]);
  }
  const activeBlock = session.blocks[session.blocks.length - 1];
  const file = readCanonicalFileSafe(root, path.join(root, activeBlock.path));
  if (!file.exists) {
    return Object.freeze([]);
  }
  const items = [];
  for (const match of file.content.matchAll(UNCHECKED_ITEM_PATTERN)) {
    const text = match[1].trim();
    if (text.length === 0 || text === '_..._' || text === '...') {
      continue;
    }
    items.push(text);
  }
  return Object.freeze(items.map((text) => Object.freeze({ text, block: activeBlock.name, source_path: activeBlock.path })));
}

function readPackageVersion(root) {
  const file = readCanonicalFileSafe(root, path.join(root, 'package.json'));
  if (!file.exists) {
    return null;
  }
  try {
    const pkg = JSON.parse(file.content);
    return typeof pkg.version === 'string' ? pkg.version : null;
  } catch {
    return null;
  }
}

function discoverReleaseState(root, gitContext) {
  const version = readPackageVersion(root);
  const tags = gitContext.available && gitContext.repository ? gitContext.tags : [];
  const latestTag = tags.length > 0 ? tags[tags.length - 1] : null;
  return Object.freeze({ version, latest_tag: latestTag });
}

/**
 * Discovers the current canonical Workspace state of `projectRoot` — a
 * pure, read-only snapshot. Never writes to disk, never touches the
 * network, never creates `.ddae/brain/`/`.obsidian/`, and produces no
 * timestamp/random data in the returned structure (the caller — the
 * future Brain Compiler, Bloco 03 — decides what, if anything, gets
 * fingerprinted or persisted).
 */
export function discoverWorkspaceState(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`discoverWorkspaceState: projectRoot does not exist or is not a directory: ${root}`);
  }

  const ddaeContext = collectDdaeContext(root, { session: options.session });
  const gitContext = collectGitContext(root, { env: options.env });

  const currentSession = ddaeContext.current_session
    ? Object.freeze({ id: ddaeContext.current_session.name, selection_reason: ddaeContext.selection.reason })
    : null;

  return Object.freeze({
    project: Object.freeze({ root_relative_path: '.' }),
    git: Object.freeze({
      available: gitContext.available,
      repository: gitContext.repository,
      branch: gitContext.branch,
      head: gitContext.head,
    }),
    current_session: currentSession,
    decisions: discoverDecisions(ddaeContext),
    risks: discoverRisks(root, ddaeContext),
    open_bugs: discoverOpenBugs(root, ddaeContext),
    recent_changes: discoverRecentChanges(gitContext),
    current_tasks: discoverCurrentTasks(root, ddaeContext),
    release_state: discoverReleaseState(root, gitContext),
    warnings: Object.freeze([...ddaeContext.warnings, ...gitContext.warnings]),
  });
}
