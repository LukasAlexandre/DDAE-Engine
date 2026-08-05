import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.join(__dirname, '..');
export const CLI_BIN = path.join(REPO_ROOT, 'bin', 'ddae-engine.js');

export function makeTempDir(prefix = 'ddae-engine-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Runs the real CLI binary as a subprocess and captures stdout/exit code, without throwing on a non-zero exit (validate/audit use exit 1 to signal failure). */
export function runCli(args) {
  try {
    const stdout = execFileSync('node', [CLI_BIN, ...args], { encoding: 'utf8' });
    return { stdout, status: 0 };
  } catch (error) {
    return { stdout: error.stdout ?? '', stderr: error.stderr ?? '', status: error.status ?? 1 };
  }
}
