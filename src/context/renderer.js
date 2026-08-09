import { assertContextManifest } from '../schemas/context-schema.js';

// Markdown Renderer v1 — a pure function from a validated Context Manifest v1
// to a deterministic CONTEXT.md string. `manifest.json` is canonical;
// `CONTEXT.md` is derived (legacy/sessions/session_12_context_compiler_
// foundation/contrato_context_manifest_v1.md, Section 1). This module never
// collects, never resolves authority, never scores relevance, never
// recompiles, never touches the fingerprint, never reads the filesystem,
// and never writes anything — it only reads the Manifest it is given.

const DOCUMENT_TITLE = '# DDAE Agent Context';

// Fixed, LLM-readable section order — never reordered dynamically, never
// omitted even when empty (Bloco 06 contract).
export const SECTION_TITLES = Object.freeze([
  'Goal',
  'Project State',
  'Current Session',
  'Architecture',
  'Relevant Files',
  'Decisions',
  'Constraints',
  'Known Bugs',
  'Validation',
  'Out of Scope',
]);

function inlineCode(value) {
  const text = String(value ?? '');
  const runs = text.match(/`+/g) || [];
  const maxRun = runs.reduce((max, run) => Math.max(max, run.length), 0);
  const fence = '`'.repeat(maxRun + 1);
  const needsPadding = text.startsWith('`') || text.endsWith('`') || text === '';
  return needsPadding ? `${fence} ${text} ${fence}` : `${fence}${text}${fence}`;
}

/**
 * Wraps arbitrary source content (evidence, never instruction) in a fenced
 * code block whose fence is always longer than the longest run of
 * backticks already present in the content — the same escaping strategy
 * CommonMark itself recommends, so content containing its own ``` fences,
 * "# fake heading" lines, or "ignore previous instructions" prose can never
 * break out of the block or masquerade as document structure.
 */
function codeBlock(content, language = 'text') {
  const normalized = String(content ?? '').replace(/\r\n/g, '\n');
  const runs = normalized.match(/`+/g) || [];
  const maxRun = runs.reduce((max, run) => Math.max(max, run.length), 0);
  const fence = '`'.repeat(Math.max(3, maxRun + 1));
  return `${fence}${language}\n${normalized}\n${fence}`;
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

function orNA(value) {
  return value === null || value === undefined ? 'n/a' : inlineCode(value);
}

function emptyState(message = 'None recorded.') {
  return `- ${message}`;
}

function buildSourceIndex(manifest) {
  const byId = new Map();
  for (const source of manifest.sources) {
    byId.set(source.id, source);
  }
  return byId;
}

/** Renders "source: `id`[, path: `...`][, section: `...`]" — provenance is
 * always shown by reference (id/path/section), never by re-deriving new
 * facts about the source. */
function renderProvenance(sourceId, sourceById) {
  const source = sourceById.get(sourceId);
  const parts = [`source: ${inlineCode(sourceId)}`];
  if (source?.path) {
    parts.push(`path: ${inlineCode(source.path)}`);
  }
  if (source?.section) {
    parts.push(`section: ${inlineCode(source.section)}`);
  }
  return parts.join(', ');
}

function renderGoal(manifest) {
  const { goal } = manifest;
  return [
    '## Goal',
    '',
    goal.text,
    '',
    `- Normalized: ${inlineCode(goal.normalized)}`,
    `- Hash: ${inlineCode(goal.hash)}`,
  ].join('\n');
}

function renderProjectState(manifest) {
  const { project, compiler, budget, git, fingerprint } = manifest;
  return [
    '## Project State',
    '',
    '### Project',
    `- Name: ${inlineCode(project.name)}`,
    `- Root kind: ${inlineCode(project.root_kind)}`,
    '',
    '### Compiler',
    `- Name: ${inlineCode(compiler.name)}`,
    `- Contract version: ${inlineCode(compiler.contract_version)}`,
    `- Engine version: ${inlineCode(compiler.engine_version)}`,
    '',
    '### Budget',
    `- Profile: ${inlineCode(budget.profile)}`,
    `- Max chars: ${budget.max_chars}`,
    `- Used chars: ${budget.used_chars}`,
    '',
    '### Git',
    `- Available: ${yesNo(git.available)}`,
    `- Repository: ${yesNo(git.repository)}`,
    `- Branch: ${orNA(git.branch)}`,
    `- HEAD: ${orNA(git.head)}`,
    `- Working tree: ${orNA(git.working_tree)}`,
    '',
    '### Fingerprint',
    `- Algorithm: ${inlineCode(fingerprint.algorithm)}`,
    `- Value: ${inlineCode(fingerprint.value)}`,
  ].join('\n');
}

function renderCurrentSession(manifest) {
  const { session } = manifest;
  if (session.id === null) {
    return [
      '## Current Session',
      '',
      'No current DDAE session.',
      '',
      `- Selection reason: ${inlineCode(session.selection_reason)}`,
    ].join('\n');
  }
  return [
    '## Current Session',
    '',
    `- ID: ${inlineCode(session.id)}`,
    `- Path: ${orNA(session.path)}`,
    `- Selection reason: ${inlineCode(session.selection_reason)}`,
  ].join('\n');
}

/**
 * Architecture is a VIEW over `relevant_files`, restricted to entries whose
 * Source is formally `kind: "architecture"` — never a new fact, never
 * inferred from prose (a `documentation` source that happens to mention
 * "architecture" is never promoted here). Manifest v1 has no dedicated
 * `architecture` array; this section exists only to make already-selected
 * architecture evidence easy to find without re-reading the whole
 * Relevant Files list.
 */
function renderArchitecture(manifest, sourceById) {
  const entries = manifest.relevant_files.filter((entry) => sourceById.get(entry.source_id)?.kind === 'architecture');
  const lines = ['## Architecture', ''];
  if (entries.length === 0) {
    lines.push(emptyState('None recorded in selected manifest sources.'));
    return lines.join('\n');
  }
  for (const entry of entries) {
    const label = entry.path ? inlineCode(entry.path) : inlineCode(entry.source_id);
    lines.push(`- ${label} (${renderProvenance(entry.source_id, sourceById)}, score: ${entry.score}) — see Relevant Files for full content.`);
  }
  return lines.join('\n');
}

function renderRelevantFile(entry, sourceById) {
  const source = sourceById.get(entry.source_id);
  const heading = entry.path ? `### File: ${inlineCode(entry.path)}` : `### Source: ${inlineCode(entry.source_id)}`;
  const lines = [heading, '', `- Source ID: ${inlineCode(entry.source_id)}`];
  if (source) {
    lines.push(`- Kind: ${inlineCode(source.kind)}`);
    lines.push(`- Authority class: ${inlineCode(source.authority_class)}`);
  }
  if (entry.section) {
    lines.push(`- Section: ${inlineCode(entry.section)}`);
  }
  lines.push(`- Score: ${entry.score}`);
  lines.push(`- Char cost: ${entry.char_cost}`);
  lines.push('');
  lines.push(codeBlock(entry.content));
  return lines.join('\n');
}

/**
 * `excluded_sources` means "left out before it could become relevant
 * context" — it is never a synonym for "out of product scope", and is
 * deliberately kept here, under Relevant Files, rather than folded into
 * the Out of Scope section, which would assert a semantic the Manifest
 * never made.
 *
 * Two distinct shapes are rendered differently, on purpose: a *relevance*
 * exclusion (`source_id` present — a Source that was safely ingested but
 * didn't fit the budget) shows its score/char cost/reason; a *security*
 * exclusion (no `source_id` — a file the Sensitive Data Guard refused to
 * ingest at all) shows only `path` and `reason`, because that is the
 * entire safe surface of that record — no content, no matched value, ever.
 */
function renderExcludedSources(manifest) {
  const lines = ['### Excluded Sources', ''];
  if (manifest.excluded_sources.length === 0) {
    lines.push(emptyState());
    return lines.join('\n');
  }
  for (const entry of manifest.excluded_sources) {
    const label = entry.path ? inlineCode(entry.path) : inlineCode(entry.source_id);
    if (entry.source_id !== undefined) {
      lines.push(`- ${label} — source: ${inlineCode(entry.source_id)}, score: ${entry.score}, char cost: ${entry.char_cost}, reason: ${inlineCode(entry.reason)}`);
    } else {
      lines.push(`- ${label} — reason: ${inlineCode(entry.reason)}`);
    }
  }
  return lines.join('\n');
}

function renderRelevantFiles(manifest, sourceById) {
  const lines = ['## Relevant Files', ''];
  if (manifest.relevant_files.length === 0) {
    lines.push(emptyState());
  } else {
    // Preserves the exact order already recorded in the Manifest (the
    // Relevance Engine's score DESC / path ASC / source id ASC selection
    // order) — never re-sorted here, e.g. never alphabetically by path.
    lines.push(manifest.relevant_files.map((entry) => renderRelevantFile(entry, sourceById)).join('\n\n'));
  }
  lines.push('');
  lines.push(renderExcludedSources(manifest));
  return lines.join('\n');
}

function renderFactList(title, entries, sourceById) {
  const lines = [`## ${title}`, ''];
  if (entries.length === 0) {
    lines.push(emptyState());
    return lines.join('\n');
  }
  for (const entry of entries) {
    lines.push(`- ${entry.value} — ${renderProvenance(entry.source_id, sourceById)}`);
  }
  return lines.join('\n');
}

function renderAuthorityConflicts(manifest, sourceById) {
  const lines = ['### Authority Conflicts', ''];
  if (manifest.conflicts.length === 0) {
    lines.push(emptyState());
    return lines.join('\n');
  }
  const blocks = manifest.conflicts.map((conflict) => {
    const conflictLines = [
      `#### ${inlineCode(conflict.claim_id)}`,
      '',
      `- Domain: ${inlineCode(conflict.domain)}`,
      `- Status: ${inlineCode(conflict.status)}`,
    ];
    if (conflict.status === 'resolved') {
      conflictLines.push(`- Winner: ${inlineCode(conflict.winner.source_id)} (${renderProvenance(conflict.winner.source_id, sourceById)})`);
    } else {
      conflictLines.push('- Winner: unresolved');
    }
    conflictLines.push('- Conflicting sources:');
    for (const entry of conflict.conflicting_sources) {
      const reason = entry.reason_superseded ? inlineCode(entry.reason_superseded) : 'n/a';
      conflictLines.push(`  - ${inlineCode(entry.source_id)} — reason: ${reason}`);
    }
    return conflictLines.join('\n');
  });
  lines.push(blocks.join('\n\n'));
  return lines.join('\n');
}

/**
 * Validation carries both `manifest.validation` (explicit validation facts)
 * and, as a subsection, the traceable Authority Model output
 * (`manifest.conflicts`) — never a new top-level section, since a conflict
 * record is itself a kind of validation evidence about the Manifest's own
 * sources, not a new category of fact.
 */
function renderValidation(manifest, sourceById) {
  const lines = ['## Validation', ''];
  if (manifest.validation.length === 0) {
    lines.push(emptyState());
  } else {
    for (const entry of manifest.validation) {
      lines.push(`- ${entry.value} — ${renderProvenance(entry.source_id, sourceById)}`);
    }
  }
  lines.push('');
  lines.push(renderAuthorityConflicts(manifest, sourceById));
  return lines.join('\n');
}

/**
 * Manifest v1 has no dedicated `out_of_scope` field. This section always
 * renders the same neutral sentence — it represents the explicit absence of
 * data, never an inference from `constraints`, `excluded_sources`, source
 * kinds, or free text.
 */
function renderOutOfScope() {
  return ['## Out of Scope', '', '- None explicitly recorded in Manifest v1.'].join('\n');
}

/**
 * Renders a validated Context Manifest v1 into a deterministic CONTEXT.md
 * string. The same Manifest always produces the exact same string, byte
 * for byte: LF newlines, exactly one trailing newline, no timestamp, no
 * randomness, no dependence on object key insertion order or filesystem
 * state. Rejects (via `assertContextManifest`) rather than "fixing" an
 * invalid Manifest.
 */
export function renderContextMarkdown(manifest) {
  assertContextManifest(manifest);
  const sourceById = buildSourceIndex(manifest);

  const sections = [
    renderGoal(manifest),
    renderProjectState(manifest),
    renderCurrentSession(manifest),
    renderArchitecture(manifest, sourceById),
    renderRelevantFiles(manifest, sourceById),
    renderFactList('Decisions', manifest.decisions, sourceById),
    renderFactList('Constraints', manifest.constraints, sourceById),
    renderFactList('Known Bugs', manifest.bugs, sourceById),
    renderValidation(manifest, sourceById),
    renderOutOfScope(),
  ];

  return `${DOCUMENT_TITLE}\n\n${sections.join('\n\n')}\n`;
}
