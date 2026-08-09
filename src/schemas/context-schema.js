// Context Manifest v1 schema validator — zero-dependency, pure JS.
//
// Implements the conceptual schema from legacy/sessions/
// session_12_context_compiler_foundation/contrato_context_manifest_v1.md,
// Section 18. This module never reads the filesystem or network, and never
// constructs a manifest — it only judges whether an already-assembled
// object conforms to the contract. That makes it reusable both by
// manifest.js (as the final gate before a manifest leaves createContextManifest)
// and, later, by a `context validate` CLI reading a manifest.json from disk
// with no compiler involved at all.

import { SOURCE_KINDS, AUTHORITY_DOMAINS } from '../context/authority.js';
import { BUDGET_PROFILES } from '../context/relevance.js';

export const CONTEXT_SCHEMA_VERSION = '1';

const VALID_BUDGET_PROFILES = Object.freeze(Object.keys(BUDGET_PROFILES));
const VALID_WORKING_TREE = Object.freeze(['clean', 'dirty']);

// session.selection_reason is constrained by whether session.id is null —
// mirrors the exact reason enum collectDdaeContext() already produces
// (src/context/ddae-context.js): 'explicit'/'latest_canonical' only ever
// accompany a real session; 'none'/'explicit_not_found' only ever
// accompany session.id === null.
const PRESENT_SESSION_REASONS = Object.freeze(['explicit', 'latest_canonical']);
const NULL_SESSION_REASONS = Object.freeze(['none', 'explicit_not_found']);

const VALID_CONFLICT_STATUS = Object.freeze(['resolved', 'unresolved']);
const GOAL_HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;
const GIT_HEAD_PATTERN = /^[0-9a-f]{40}$/i;
const FINGERPRINT_VALUE_PATTERN = /^[0-9a-f]{64}$/;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function isProjectRelativePath(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return false;
  }
  if (value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value)) {
    return false;
  }
  return !value.includes('\\');
}

function pushError(errors, field, message) {
  errors.push(`${field}: ${message}`);
}

function checkCompiler(manifest, errors) {
  const compiler = manifest.compiler;
  if (
    !compiler || typeof compiler !== 'object'
    || !isNonEmptyString(compiler.name)
    || !isNonEmptyString(compiler.contract_version)
    || !isNonEmptyString(compiler.engine_version)
  ) {
    pushError(errors, 'compiler', 'must include non-empty name, contract_version, and engine_version');
  }
}

function checkProject(manifest, errors) {
  const project = manifest.project;
  if (!project || typeof project !== 'object' || !isNonEmptyString(project.name) || !isNonEmptyString(project.root_kind)) {
    pushError(errors, 'project', 'must include non-empty name and root_kind');
  }
}

function checkGoal(manifest, errors) {
  const goal = manifest.goal;
  if (
    !goal || typeof goal !== 'object'
    || !isNonEmptyString(goal.text)
    || !isNonEmptyString(goal.normalized)
    || !GOAL_HASH_PATTERN.test(goal.hash ?? '')
  ) {
    pushError(errors, 'goal', 'must include non-empty text, normalized, and a "sha256:<hex>" hash');
  }
}

function checkSession(manifest, errors) {
  const session = manifest.session;
  if (!session || typeof session !== 'object') {
    pushError(errors, 'session', 'must be an object');
    return;
  }
  if (session.id === null) {
    if (session.path !== null) {
      pushError(errors, 'session.path', 'must be null when session.id is null');
    }
    if (!NULL_SESSION_REASONS.includes(session.selection_reason)) {
      pushError(errors, 'session.selection_reason', `must be one of ${NULL_SESSION_REASONS.join(', ')} when session.id is null`);
    }
    return;
  }
  if (!isNonEmptyString(session.id)) {
    pushError(errors, 'session.id', 'must be a non-empty string or null');
  }
  if (session.path !== null && !isProjectRelativePath(session.path)) {
    pushError(errors, 'session.path', 'must be project-relative or null');
  }
  if (!PRESENT_SESSION_REASONS.includes(session.selection_reason)) {
    pushError(errors, 'session.selection_reason', `must be one of ${PRESENT_SESSION_REASONS.join(', ')} when session.id is present`);
  }
}

function checkBudget(manifest, errors) {
  const budget = manifest.budget;
  if (
    !budget || typeof budget !== 'object'
    || !VALID_BUDGET_PROFILES.includes(budget.profile)
    || !Number.isInteger(budget.max_chars) || budget.max_chars <= 0
    || !Number.isInteger(budget.used_chars) || budget.used_chars < 0
    || budget.used_chars > budget.max_chars
  ) {
    pushError(errors, 'budget', `must include a valid profile (${VALID_BUDGET_PROFILES.join('/')}), a positive max_chars, and 0 <= used_chars <= max_chars`);
  }
}

function checkGit(manifest, errors) {
  const git = manifest.git;
  if (!git || typeof git !== 'object' || typeof git.available !== 'boolean') {
    pushError(errors, 'git', 'must be an object with a boolean "available"');
    return;
  }
  if (!git.available) {
    if (git.repository !== false || git.branch !== null || git.head !== null || git.working_tree !== null) {
      pushError(errors, 'git', 'repository must be false and branch/head/working_tree must be null when git.available is false');
    }
    return;
  }
  if (typeof git.repository !== 'boolean') {
    pushError(errors, 'git.repository', 'must be boolean when git.available is true');
  }
  if (git.branch !== null && !isNonEmptyString(git.branch)) {
    pushError(errors, 'git.branch', 'must be a non-empty string or null');
  }
  if (git.head !== null && !GIT_HEAD_PATTERN.test(git.head)) {
    pushError(errors, 'git.head', 'must be a 40-character hex SHA or null');
  }
  if (git.working_tree !== null && !VALID_WORKING_TREE.includes(git.working_tree)) {
    pushError(errors, 'git.working_tree', `must be one of ${VALID_WORKING_TREE.join(', ')}, or null`);
  }
}

function checkSources(manifest, errors) {
  const sourceIds = new Set();
  if (!Array.isArray(manifest.sources)) {
    pushError(errors, 'sources', 'must be an array');
    return sourceIds;
  }
  manifest.sources.forEach((source, index) => {
    const label = `sources[${index}]`;
    if (!source || typeof source !== 'object' || !isNonEmptyString(source.id)) {
      pushError(errors, label, 'must include a non-empty id');
      return;
    }
    if (sourceIds.has(source.id)) {
      pushError(errors, label, `duplicate source id "${source.id}"`);
    }
    sourceIds.add(source.id);
    if (!SOURCE_KINDS.includes(source.kind)) {
      pushError(errors, `${label}.kind`, `invalid kind "${source.kind}"`);
    }
    if (!AUTHORITY_DOMAINS.includes(source.authority_class)) {
      pushError(errors, `${label}.authority_class`, `invalid domain "${source.authority_class}"`);
    }
    if (source.path !== null && source.path !== undefined && !isProjectRelativePath(source.path)) {
      pushError(errors, `${label}.path`, 'must be project-relative or null');
    }
  });
  return sourceIds;
}

function checkReferenceList(manifest, errors, field, sourceIds, { requireValue = false } = {}) {
  const list = manifest[field];
  if (!Array.isArray(list)) {
    pushError(errors, field, 'must be an array');
    return;
  }
  list.forEach((entry, index) => {
    const label = `${field}[${index}]`;
    if (!entry || typeof entry !== 'object' || !isNonEmptyString(entry.source_id)) {
      pushError(errors, label, 'must include a non-empty source_id');
      return;
    }
    if (requireValue && entry.value === undefined) {
      pushError(errors, label, 'must include a value');
    }
    if (!sourceIds.has(entry.source_id)) {
      pushError(errors, label, `source_id "${entry.source_id}" not found in sources`);
    }
  });
}

function checkConflicts(manifest, errors, sourceIds) {
  if (!Array.isArray(manifest.conflicts)) {
    pushError(errors, 'conflicts', 'must be an array');
    return;
  }
  manifest.conflicts.forEach((conflict, index) => {
    const label = `conflicts[${index}]`;
    if (
      !conflict || typeof conflict !== 'object'
      || !isNonEmptyString(conflict.claim_id)
      || !AUTHORITY_DOMAINS.includes(conflict.domain)
      || !VALID_CONFLICT_STATUS.includes(conflict.status)
    ) {
      pushError(errors, label, 'must include claim_id, a valid domain, and a valid status');
      return;
    }
    if (conflict.status === 'resolved') {
      if (!conflict.winner || !isNonEmptyString(conflict.winner.source_id) || !sourceIds.has(conflict.winner.source_id)) {
        pushError(errors, `${label}.winner`, 'must reference an existing source_id when status is "resolved"');
      }
    } else if (conflict.winner !== null) {
      pushError(errors, `${label}.winner`, 'must be null when status is "unresolved"');
    }
    if (!Array.isArray(conflict.conflicting_sources)) {
      pushError(errors, `${label}.conflicting_sources`, 'must be an array');
      return;
    }
    conflict.conflicting_sources.forEach((entry, entryIndex) => {
      if (!entry || !isNonEmptyString(entry.source_id) || !sourceIds.has(entry.source_id)) {
        pushError(errors, `${label}.conflicting_sources[${entryIndex}]`, 'must reference an existing source_id');
      }
    });
  });
}

function checkFingerprint(manifest, errors) {
  const fingerprint = manifest.fingerprint;
  if (
    !fingerprint || typeof fingerprint !== 'object'
    || fingerprint.algorithm !== 'sha256'
    || !FINGERPRINT_VALUE_PATTERN.test(fingerprint.value ?? '')
  ) {
    pushError(errors, 'fingerprint', 'must include algorithm "sha256" and a 64-character hex value');
  }
}

/**
 * Validates a Context Manifest v1 object against the contract. Returns
 * `{ valid, errors }` rather than throwing, so a caller (like `context
 * validate`, in a future block) can report every problem at once instead of
 * stopping at the first one.
 */
export function validateContextManifest(manifest) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['manifest: must be an object'] };
  }

  if (manifest.schema_version !== CONTEXT_SCHEMA_VERSION) {
    pushError(errors, 'schema_version', `expected "${CONTEXT_SCHEMA_VERSION}", got ${JSON.stringify(manifest.schema_version)}`);
  }

  checkCompiler(manifest, errors);
  checkProject(manifest, errors);
  checkGoal(manifest, errors);
  checkSession(manifest, errors);
  checkBudget(manifest, errors);
  checkGit(manifest, errors);

  const sourceIds = checkSources(manifest, errors);

  checkReferenceList(manifest, errors, 'relevant_files', sourceIds);
  checkReferenceList(manifest, errors, 'excluded_sources', sourceIds);
  checkReferenceList(manifest, errors, 'decisions', sourceIds, { requireValue: true });
  checkReferenceList(manifest, errors, 'constraints', sourceIds, { requireValue: true });
  checkReferenceList(manifest, errors, 'bugs', sourceIds, { requireValue: true });
  checkReferenceList(manifest, errors, 'validation', sourceIds, { requireValue: true });

  checkConflicts(manifest, errors, sourceIds);
  checkFingerprint(manifest, errors);

  return { valid: errors.length === 0, errors };
}

/**
 * Same contract as `validateContextManifest`, but throws with every
 * collected error joined into one message — convenient for call sites
 * (like `createContextManifest`) that treat an invalid manifest as a
 * programmer error, not a recoverable outcome.
 */
export function assertContextManifest(manifest) {
  const { valid, errors } = validateContextManifest(manifest);
  if (!valid) {
    throw new Error(`assertContextManifest: invalid Context Manifest:\n- ${errors.join('\n- ')}`);
  }
  return manifest;
}
