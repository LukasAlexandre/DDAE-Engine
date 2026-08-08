import fs from 'node:fs';
import path from 'node:path';

const ECOSYSTEM_MARKERS = [
  'package.json',
  'pyproject.toml',
  'requirements.txt',
  'Cargo.toml',
  'go.mod',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml',
];

const CONVENTIONAL_DIRECTORIES = [
  'Docs',
  'docs',
  'src',
  'Backend',
  'backend',
  'Frontend',
  'frontend',
  'Tests',
  'tests',
  'test',
];

/**
 * `lstat`, never `stat` — a symlink named e.g. `src` must never be reported
 * as a directory (and a symlinked marker file never reported as a file),
 * because a symlink could resolve outside `PROJECT_ROOT`. This collector
 * simply doesn't follow it, matching the "symlink ignored" policy for
 * this bloco (the full Sensitive Data Guard/realpath containment model is
 * Bloco 09).
 */
function lstatOrNull(entryPath) {
  try {
    return fs.lstatSync(entryPath);
  } catch {
    return null;
  }
}

/**
 * On a case-insensitive filesystem (default on Windows and macOS), looking
 * up `docs` succeeds even when only `Docs` exists on disk — `lstat` alone
 * can't tell them apart. `realpathSync.native` returns the name with its
 * true on-disk casing, so comparing basenames rejects the accidental match
 * without ever reading a directory listing (still no recursive scan).
 */
function hasExactCaseMatch(entryPath, expectedName) {
  try {
    return path.basename(fs.realpathSync.native(entryPath)) === expectedName;
  } catch {
    return false;
  }
}

/**
 * Collects a deterministic, read-only, non-recursive snapshot of a project's
 * technical shape: presence of known ecosystem marker files and known
 * conventional top-level directories, by name only.
 *
 * This collector never reads file content, never lists directory contents,
 * and never walks the filesystem recursively — it only checks the existence
 * and type of a fixed, known set of top-level names. That makes it safe by
 * construction even though the Sensitive Data Guard doesn't exist yet
 * (Bloco 09): there is no code path here that could read `.env` or any other
 * arbitrary file content, because no content is ever read.
 */
export function collectProjectContext(projectRoot) {
  const root = path.resolve(projectRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`collectProjectContext: projectRoot does not exist or is not a directory: ${root}`);
  }

  const markers = [];
  for (const marker of ECOSYSTEM_MARKERS) {
    const entryPath = path.join(root, marker);
    const stat = lstatOrNull(entryPath);
    if (stat && stat.isFile() && hasExactCaseMatch(entryPath, marker)) {
      markers.push(marker);
    }
  }
  markers.sort();

  const ecosystems = {
    node: markers.includes('package.json'),
    python: markers.includes('pyproject.toml') || markers.includes('requirements.txt'),
    rust: markers.includes('Cargo.toml'),
    go: markers.includes('go.mod'),
    docker: markers.some((marker) => marker.startsWith('Dockerfile') || marker.startsWith('docker-compose') || marker.startsWith('compose')),
  };

  const directories = [];
  for (const dirName of CONVENTIONAL_DIRECTORIES) {
    const entryPath = path.join(root, dirName);
    const stat = lstatOrNull(entryPath);
    if (stat && stat.isDirectory() && hasExactCaseMatch(entryPath, dirName)) {
      directories.push(dirName);
    }
  }
  directories.sort();

  return { markers, ecosystems, directories };
}
