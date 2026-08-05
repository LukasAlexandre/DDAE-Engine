import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyDir } from './fs-helpers.js';
import { renderTemplate } from './text.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Source of the internal modules (01_intake .. 13_release) copied into every
// real session by `scaffoldSession`. These are organizational categories
// inside a session, never sessions themselves.
export const SESSION_TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'session');

// Canonical shape of a real session folder name: session_<number>_<slug>.
// Anything that doesn't match this — README.md, stray files, module folders
// nested inside a session, hidden/legacy directories — is not a session.
export const SESSION_NAME_PATTERN = /^session_(\d+)_([a-z0-9_]+)$/;

// Slugs used by the pre-1.0 scaffold, which used to create these 10 "base
// sessions" automatically during `init`. They are no longer generated, but
// the exact set is kept here so `audit` can recognize leftover legacy
// scaffolds in older projects and warn about them without touching anything.
export const LEGACY_BASE_SESSION_SLUGS = [
  'project_foundation',
  'architecture_contracts',
  'design_system',
  'core_features',
  'auth_security',
  'tests_quality',
  'performance',
  'deploy_release',
  'observability',
  'final_audit',
];

export function sessionFolderName(number, slug) {
  return `session_${number}_${slug}`;
}

/**
 * Splits a `session_NN_some_slug` folder name into its number and slug.
 * Returns undefined fields when the name doesn't match the canonical shape.
 */
export function parseSessionFolderName(session) {
  const match = session.match(SESSION_NAME_PATTERN);
  return match ? { number: match[1], slug: match[2] } : { number: undefined, slug: undefined };
}

/**
 * Lists the immediate subdirectories of `sessionsDir` (Docs/05_sessions/)
 * that are real sessions — directories matching SESSION_NAME_PATTERN.
 * README.md, module folders (only ever nested inside a session, not here),
 * and any non-conforming entry are excluded.
 */
export function listSessionDirs(sessionsDir) {
  if (!fs.existsSync(sessionsDir)) {
    return [];
  }
  return fs.readdirSync(sessionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SESSION_NAME_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Lists the immediate subdirectories that exist directly under `sessionsDir`
 * but do NOT match the canonical session name shape — candidates for a
 * "folder outside the session naming convention" warning.
 */
export function listNonConformingDirs(sessionsDir) {
  if (!fs.existsSync(sessionsDir)) {
    return [];
  }
  return fs.readdirSync(sessionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SESSION_NAME_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Next available session number, based only on directories matching
 * SESSION_NAME_PATTERN directly under `sessionsDir`. Gaps are preserved
 * (session_01 + session_03 present -> next is session_04, not session_02).
 * Returns 1 when no real session exists yet.
 */
export function nextSessionNumber(sessionsDir) {
  let max = 0;
  for (const name of listSessionDirs(sessionsDir)) {
    const { number } = parseSessionFolderName(name);
    max = Math.max(max, Number(number));
  }
  return max + 1;
}

/**
 * Names of the internal modules a real session is scaffolded with
 * (01_intake .. 13_release), derived from the template directory itself so
 * this list can't drift from what `scaffoldSession` actually copies.
 */
export function listSessionModules() {
  return fs.readdirSync(SESSION_TEMPLATE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Detects the exact set of slugs the old scaffold used to pre-create as
 * "base sessions". Used only for a non-destructive legacy warning in
 * `audit` — never to decide what to delete or renumber.
 */
export function detectLegacyBaseSessions(sessionsDir) {
  const names = listSessionDirs(sessionsDir);
  return names.filter((name) => {
    const { slug } = parseSessionFolderName(name);
    return LEGACY_BASE_SESSION_SLUGS.includes(slug);
  });
}

export function scaffoldSession(destDir, { number, title, slug, projectName, currentDate }, { force, created, skipped }) {
  copyDir(SESSION_TEMPLATE_DIR, destDir, {
    force,
    created,
    skipped,
    transform: (content) => renderTemplate(content, {
      SESSION_NUMBER: number,
      SESSION_TITLE: title,
      SESSION_SLUG: slug,
      PROJECT_NAME: projectName,
      CURRENT_DATE: currentDate,
    }),
  });
}
