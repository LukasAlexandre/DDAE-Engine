import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RECENT_COMMITS_LIMIT = 10;

function toPortablePath(rawPath) {
  return rawPath.split('\\').join('/');
}

function runGit(args, { cwd, env }) {
  return execFileSync('git', args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * Parses `git status --porcelain=v1 -z` output. Under -z, paths are emitted
 * raw (unquoted, no arrow) and rename/copy records carry an extra
 * NUL-terminated original-path field that must be consumed to stay aligned,
 * even though this collector doesn't keep that original path.
 */
function parsePorcelainStatus(output) {
  const modifiedFiles = [];
  const untrackedFiles = [];
  if (!output) {
    return { modifiedFiles, untrackedFiles };
  }
  const tokens = output.split('\0');
  let i = 0;
  while (i < tokens.length) {
    const record = tokens[i];
    if (record.length < 3) {
      i += 1;
      continue;
    }
    const statusCode = record.slice(0, 2);
    const filePath = toPortablePath(record.slice(3));
    if (statusCode === '??') {
      untrackedFiles.push(filePath);
      i += 1;
    } else if (statusCode[0] === 'R' || statusCode[0] === 'C') {
      modifiedFiles.push(filePath);
      i += 2;
    } else {
      modifiedFiles.push(filePath);
      i += 1;
    }
  }
  return { modifiedFiles, untrackedFiles };
}

function degradedResult(available, code) {
  return {
    available,
    repository: false,
    branch: null,
    detached: false,
    head: null,
    origin_head: null,
    working_tree: null,
    modified_files: [],
    untracked_files: [],
    recent_commits: [],
    tags: [],
    warnings: [{ code }],
  };
}

/**
 * Collects a deterministic, read-only snapshot of Git state for `projectRoot`.
 *
 * Never touches the network (no fetch), never writes (no add/commit/checkout/
 * tag/config changes), and never collects remote URLs, commit messages, or
 * author/committer identity — the Sensitive Data Guard doesn't exist yet
 * (Bloco 09), so this collector avoids bringing arbitrary text into the
 * Context Compiler before that guard can screen it.
 *
 * `options.env` overrides the environment passed to the `git` subprocess
 * (defaults to `process.env`) — this is the seam used by tests to simulate
 * Git being unavailable, without touching the real process environment.
 */
export function collectGitContext(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`collectGitContext: projectRoot does not exist or is not a directory: ${root}`);
  }
  const env = options.env ?? process.env;
  const git = (args) => runGit(args, { cwd: root, env });

  try {
    const isWorkTree = git(['rev-parse', '--is-inside-work-tree']).trim();
    if (isWorkTree !== 'true') {
      return degradedResult(true, 'NOT_A_GIT_REPOSITORY');
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return degradedResult(false, 'GIT_UNAVAILABLE');
    }
    return degradedResult(true, 'NOT_A_GIT_REPOSITORY');
  }

  let branch = null;
  let detached = false;
  try {
    branch = git(['symbolic-ref', '--short', '-q', 'HEAD']).trim();
  } catch {
    detached = true;
  }

  let head = null;
  try {
    head = git(['rev-parse', 'HEAD']).trim();
  } catch {
    head = null;
  }

  let originHead = null;
  if (branch) {
    try {
      originHead = git(['rev-parse', `refs/remotes/origin/${branch}`]).trim();
    } catch {
      originHead = null;
    }
  }

  const statusOutput = git(['status', '--porcelain=v1', '-z']);
  const { modifiedFiles, untrackedFiles } = parsePorcelainStatus(statusOutput);
  modifiedFiles.sort();
  untrackedFiles.sort();
  const workingTree = modifiedFiles.length === 0 && untrackedFiles.length === 0 ? 'clean' : 'dirty';

  let recentCommits = [];
  if (head) {
    const log = git(['log', `--max-count=${RECENT_COMMITS_LIMIT}`, '--format=%H']);
    recentCommits = log.split('\n').map((line) => line.trim()).filter(Boolean).map((sha) => ({ sha }));
  }

  const tagsOutput = git(['tag', '--list']);
  const tags = tagsOutput.split('\n').map((line) => line.trim()).filter(Boolean).sort();

  return {
    available: true,
    repository: true,
    branch,
    detached,
    head,
    origin_head: originHead,
    working_tree: workingTree,
    modified_files: modifiedFiles,
    untracked_files: untrackedFiles,
    recent_commits: recentCommits,
    tags,
    warnings: [],
  };
}
