// Brain Manifest v1 schema validator — zero-dependency, pure JS.
//
// Implements Seção B of Docs/03_contracts/contrato_workspace_project_brain.md
// (frozen by Bloco 01). Like context-schema.js, this module never touches
// the filesystem or network and never constructs a manifest — it only
// judges whether an already-assembled object conforms to the contract, so
// it can gate the compiler today and a future `workspace validate` reading
// a manifest.json from disk with no compiler involved.
//
// The v1 field set is closed: anything the contract does not list (a
// memory field, a git branch, a status on an entity reference, ...) is
// rejected, so the schema cannot drift silently. Evolving it means a new
// schema_version, not a looser validator.

export const BRAIN_SCHEMA_VERSION = 'brain-manifest-v1';

export const BRAIN_ENTITY_KEYS = Object.freeze([
  'current_tasks',
  'decisions',
  'open_bugs',
  'recent_changes',
  'release_state',
  'risks',
]);

const TOP_LEVEL_REQUIRED = Object.freeze([
  'schema_version',
  'engine_version',
  'project',
  'git',
  'ddae',
  'current_session',
  'sources',
  'entities',
  'views',
  'fingerprint',
]);
// `generated_at` is informative and lives outside the fingerprinted payload.
const TOP_LEVEL_OPTIONAL = Object.freeze(['generated_at']);

const FINGERPRINT_VALUE_PATTERN = /^[0-9a-f]{64}$/;

/** Code-point comparison — never localeCompare, which varies by platform/ICU. */
export function compareStrings(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Canonical order of an entity reference: id, then source_path (null first). */
export function compareRefs(a, b) {
  return compareStrings(a.id, b.id) || compareStrings(a.source_path ?? '', b.source_path ?? '');
}

/** Canonical order of a provenance entry: path, then entity. */
export function compareSources(a, b) {
  return compareStrings(a.path, b.path) || compareStrings(a.entity, b.entity);
}

export function compareByName(a, b) {
  return compareStrings(a.name, b.name);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

function isProjectRelativePath(value) {
  if (!isNonEmptyString(value)) {
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

function checkExactKeys(errors, field, value, required, optional = []) {
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      pushError(errors, field, `unknown field "${key}" is not part of ${BRAIN_SCHEMA_VERSION}`);
    }
  }
  for (const key of required) {
    if (!(key in value)) {
      pushError(errors, field === 'manifest' ? key : `${field}.${key}`, 'is required');
    }
  }
}

function checkSorted(errors, field, list, compare) {
  for (let i = 1; i < list.length; i += 1) {
    if (compare(list[i - 1], list[i]) > 0) {
      pushError(errors, field, 'must be in canonical (code-point) order');
      return;
    }
  }
}

function checkProject(manifest, errors) {
  const project = manifest.project;
  if (!isPlainObject(project)) {
    pushError(errors, 'project', 'must be an object');
    return;
  }
  checkExactKeys(errors, 'project', project, ['name', 'root_relative_path']);
  if (!isNonEmptyString(project.name)) {
    pushError(errors, 'project.name', 'must be a non-empty string');
  }
  if (!isProjectRelativePath(project.root_relative_path) && project.root_relative_path !== '.') {
    pushError(errors, 'project.root_relative_path', 'must be a project-relative path with forward slashes');
  }
}

function checkGit(manifest, errors) {
  const git = manifest.git;
  if (!isPlainObject(git)) {
    pushError(errors, 'git', 'must be an object');
    return;
  }
  checkExactKeys(errors, 'git', git, ['available', 'head']);
  if (typeof git.available !== 'boolean') {
    pushError(errors, 'git.available', 'must be a boolean');
  }
  if (git.head !== null && !isNonEmptyString(git.head)) {
    pushError(errors, 'git.head', 'must be a non-empty string or null');
  }
}

function checkPathList(errors, field, list, key) {
  list.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      pushError(errors, `${field}[${index}]`, 'must be an object');
      return;
    }
    if (!isProjectRelativePath(entry[key])) {
      pushError(errors, `${field}[${index}].${key}`, 'must be a project-relative path with forward slashes');
    }
  });
}

function checkDdaeSession(errors, session) {
  if (session === null) {
    return;
  }
  if (!isPlainObject(session)) {
    pushError(errors, 'ddae.current_session', 'must be an object or null');
    return;
  }
  checkExactKeys(errors, 'ddae.current_session', session, ['name', 'path', 'status', 'modules', 'counts']);
  if (!isNonEmptyString(session.name)) {
    pushError(errors, 'ddae.current_session.name', 'must be a non-empty string');
  }
  if (!isProjectRelativePath(session.path)) {
    pushError(errors, 'ddae.current_session.path', 'must be a project-relative path with forward slashes');
  }
  if (session.status !== null && !isNonEmptyString(session.status)) {
    pushError(errors, 'ddae.current_session.status', 'must be a non-empty string or null');
  }
  if (!Array.isArray(session.modules)) {
    pushError(errors, 'ddae.current_session.modules', 'must be an array');
  } else {
    session.modules.forEach((module, index) => {
      if (!isPlainObject(module) || !isNonEmptyString(module.name) || typeof module.exists !== 'boolean') {
        pushError(errors, `ddae.current_session.modules[${index}]`, 'must be { name: string, exists: boolean }');
      }
    });
    checkSorted(errors, 'ddae.current_session.modules', session.modules.filter(isPlainObject), compareByName);
  }
  const counts = session.counts;
  if (!isPlainObject(counts)) {
    pushError(errors, 'ddae.current_session.counts', 'must be an object');
  } else {
    checkExactKeys(errors, 'ddae.current_session.counts', counts, ['blocks', 'prompts', 'feedbacks']);
    for (const key of ['blocks', 'prompts', 'feedbacks']) {
      if (!Number.isInteger(counts[key]) || counts[key] < 0) {
        pushError(errors, `ddae.current_session.counts.${key}`, 'must be a non-negative integer');
      }
    }
  }
}

function checkDdae(manifest, errors) {
  const ddae = manifest.ddae;
  if (!isPlainObject(ddae)) {
    pushError(errors, 'ddae', 'must be an object');
    return;
  }
  checkExactKeys(errors, 'ddae', ddae, ['available', 'docs_root', 'sessions_root', 'sessions', 'current_session']);
  if (typeof ddae.available !== 'boolean') {
    pushError(errors, 'ddae.available', 'must be a boolean');
  }
  for (const key of ['docs_root', 'sessions_root']) {
    if (ddae[key] !== null && !isProjectRelativePath(ddae[key])) {
      pushError(errors, `ddae.${key}`, 'must be a project-relative path with forward slashes, or null');
    }
  }
  if (!Array.isArray(ddae.sessions)) {
    pushError(errors, 'ddae.sessions', 'must be an array');
  } else {
    ddae.sessions.forEach((session, index) => {
      if (!isPlainObject(session) || !isNonEmptyString(session.name)) {
        pushError(errors, `ddae.sessions[${index}]`, 'must be { name, path }');
      }
    });
    checkPathList(errors, 'ddae.sessions', ddae.sessions, 'path');
    checkSorted(errors, 'ddae.sessions', ddae.sessions.filter(isPlainObject), compareByName);
  }
  if (ddae.current_session === undefined) {
    return;
  }
  checkDdaeSession(errors, ddae.current_session);
}

function checkCurrentSession(manifest, errors) {
  const session = manifest.current_session;
  if (session === null) {
    return;
  }
  if (!isPlainObject(session)) {
    pushError(errors, 'current_session', 'must be an object or null');
    return;
  }
  checkExactKeys(errors, 'current_session', session, ['id', 'selection_reason']);
  if (!isNonEmptyString(session.id)) {
    pushError(errors, 'current_session.id', 'must be a non-empty string');
  }
  if (!isNonEmptyString(session.selection_reason)) {
    pushError(errors, 'current_session.selection_reason', 'must be a non-empty string');
  }
}

function checkSources(manifest, errors) {
  const sources = manifest.sources;
  if (!Array.isArray(sources)) {
    pushError(errors, 'sources', 'must be an array');
    return;
  }
  sources.forEach((source, index) => {
    if (!isPlainObject(source)) {
      pushError(errors, `sources[${index}]`, 'must be an object');
      return;
    }
    checkExactKeys(errors, `sources[${index}]`, source, ['path', 'entity']);
    if (!BRAIN_ENTITY_KEYS.includes(source.entity)) {
      pushError(errors, `sources[${index}].entity`, `must be one of: ${BRAIN_ENTITY_KEYS.join(', ')}`);
    }
  });
  checkPathList(errors, 'sources', sources, 'path');
  checkSorted(errors, 'sources', sources.filter((s) => isPlainObject(s) && typeof s.path === 'string' && typeof s.entity === 'string'), compareSources);
}

function checkEntities(manifest, errors) {
  const entities = manifest.entities;
  if (!isPlainObject(entities)) {
    pushError(errors, 'entities', 'must be an object');
    return;
  }
  checkExactKeys(errors, 'entities', entities, BRAIN_ENTITY_KEYS);
  for (const key of BRAIN_ENTITY_KEYS) {
    const list = entities[key];
    if (list === undefined) {
      continue;
    }
    const field = `entities.${key}`;
    if (!Array.isArray(list)) {
      pushError(errors, field, 'must be an array');
      continue;
    }
    list.forEach((ref, index) => {
      const at = `${field}[${index}]`;
      if (!isPlainObject(ref)) {
        pushError(errors, at, 'must be an object');
        return;
      }
      checkExactKeys(errors, at, ref, ['id', 'source_path', 'summary']);
      if (!isNonEmptyString(ref.id)) {
        pushError(errors, `${at}.id`, 'must be a non-empty string');
      }
      if (ref.source_path !== null && !isProjectRelativePath(ref.source_path)) {
        pushError(errors, `${at}.source_path`, 'must be a project-relative path with forward slashes, or null for Git-derived entries');
      }
      if (typeof ref.summary !== 'string') {
        pushError(errors, `${at}.summary`, 'must be a string');
      }
    });
    checkSorted(errors, field, list.filter((r) => isPlainObject(r) && typeof r.id === 'string' && (r.source_path === null || typeof r.source_path === 'string')), compareRefs);
  }
}

function checkViews(manifest, errors) {
  const views = manifest.views;
  if (!Array.isArray(views)) {
    pushError(errors, 'views', 'must be an array');
    return;
  }
  views.forEach((view, index) => {
    if (!isProjectRelativePath(view)) {
      pushError(errors, `views[${index}]`, 'must be a project-relative path with forward slashes');
    }
  });
  checkSorted(errors, 'views', views.filter((v) => typeof v === 'string'), compareStrings);
}

function checkFingerprint(manifest, errors) {
  const fingerprint = manifest.fingerprint;
  if (
    !isPlainObject(fingerprint)
    || fingerprint.algorithm !== 'sha256'
    || !FINGERPRINT_VALUE_PATTERN.test(fingerprint.value ?? '')
  ) {
    pushError(errors, 'fingerprint', 'must include algorithm "sha256" and a 64-character hex value');
  }
}

/**
 * Validates a Brain Manifest v1 object against the frozen contract. Returns
 * `{ valid, errors }` rather than throwing, so a caller can report every
 * problem at once.
 */
export function validateBrainManifest(manifest) {
  const errors = [];

  if (!isPlainObject(manifest)) {
    return { valid: false, errors: ['manifest: must be an object'] };
  }

  checkExactKeys(errors, 'manifest', manifest, TOP_LEVEL_REQUIRED, TOP_LEVEL_OPTIONAL);

  if (manifest.schema_version !== BRAIN_SCHEMA_VERSION) {
    pushError(errors, 'schema_version', `expected "${BRAIN_SCHEMA_VERSION}", got ${JSON.stringify(manifest.schema_version)}`);
  }
  if (!isNonEmptyString(manifest.engine_version)) {
    pushError(errors, 'engine_version', 'must be a non-empty string');
  }
  if ('generated_at' in manifest && typeof manifest.generated_at !== 'string') {
    pushError(errors, 'generated_at', 'must be a string when present');
  }

  // Each check reports its own "missing"/"wrong type" error, so a deleted
  // required field is named by that field, not just by the generic list.
  if ('project' in manifest) checkProject(manifest, errors);
  if ('git' in manifest) checkGit(manifest, errors);
  if ('ddae' in manifest) checkDdae(manifest, errors);
  if ('current_session' in manifest) checkCurrentSession(manifest, errors);
  if ('sources' in manifest) checkSources(manifest, errors);
  if ('entities' in manifest) checkEntities(manifest, errors);
  if ('views' in manifest) checkViews(manifest, errors);
  if ('fingerprint' in manifest) checkFingerprint(manifest, errors);

  return { valid: errors.length === 0, errors };
}

/**
 * Same contract as `validateBrainManifest`, but throws with every collected
 * error joined into one message.
 */
export function assertBrainManifest(manifest) {
  const { valid, errors } = validateBrainManifest(manifest);
  if (!valid) {
    throw new Error(`assertBrainManifest: invalid Brain Manifest:\n- ${errors.join('\n- ')}`);
  }
  return manifest;
}
