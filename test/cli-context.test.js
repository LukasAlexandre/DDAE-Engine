import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, makeTempDir, cleanup } from './helpers.js';

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function initGitRepo(dir) {
  git(['init', '-q', '-b', 'main'], dir);
  git(['config', 'user.name', 'DDAE Test'], dir);
  git(['config', 'user.email', 'ddae-test@example.invalid'], dir);
  git(['config', 'core.autocrlf', 'false'], dir);
}

function commitAll(dir, message) {
  git(['add', '-A'], dir);
  git(['commit', '-q', '-m', message], dir);
}

function headOf(dir) {
  return git(['rev-parse', 'HEAD'], dir).trim();
}

function ddaePaths(dir) {
  const base = path.join(dir, '.ddae');
  const contextDir = path.join(base, 'context');
  return {
    gitignore: path.join(base, '.gitignore'),
    manifest: path.join(contextDir, 'manifest.json'),
    contextMd: path.join(contextDir, 'CONTEXT.md'),
    validation: path.join(contextDir, 'validation.json'),
  };
}

// 1. --help shows context build/show/validate
test('1. --help lists context build/show/validate', () => {
  const result = runCli(['--help']);
  assert.match(result.stdout, /context build/);
  assert.match(result.stdout, /context show/);
  assert.match(result.stdout, /context validate/);
});

// 2. unknown context action falha
test('2. an unknown context subcommand fails', () => {
  const dir = makeTempDir();
  try {
    const result = runCli(['context', 'bogus', '--dir', dir]);
    assert.equal(result.status, 1);
  } finally {
    cleanup(dir);
  }
});

// 3. build sem --goal falha exit1
test('3. build without --goal fails with exit 1', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const result = runCli(['context', 'build', '--dir', dir]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /requires --goal/);
  } finally {
    cleanup(dir);
  }
});

// 4. build whitespace goal falha
test('4. build with a whitespace-only goal fails', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const result = runCli(['context', 'build', '--goal', '   ', '--dir', dir]);
    assert.equal(result.status, 1);
  } finally {
    cleanup(dir);
  }
});

// 5. budget invalid falha
test('5. build with an invalid --budget fails', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const result = runCli(['context', 'build', '--goal', 'x', '--budget', 'huge', '--dir', dir]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /invalid --budget/);
  } finally {
    cleanup(dir);
  }
});

// 6. default budget standard
test('6. build defaults to the standard budget', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const manifest = JSON.parse(fs.readFileSync(ddaePaths(dir).manifest, 'utf8'));
    assert.equal(manifest.budget.profile, 'standard');
  } finally {
    cleanup(dir);
  }
});

// 7-9. minimal/standard/deep aceitos
test('7-9. minimal, standard, and deep budgets are all accepted', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    for (const profile of ['minimal', 'standard', 'deep']) {
      const result = runCli(['context', 'build', '--goal', 'x', '--budget', profile, '--dir', dir]);
      assert.equal(result.status, 0, `budget ${profile} should succeed`);
      const manifest = JSON.parse(fs.readFileSync(ddaePaths(dir).manifest, 'utf8'));
      assert.equal(manifest.budget.profile, profile);
    }
  } finally {
    cleanup(dir);
  }
});

// 10. explicit valid session
test('10. build with an explicit valid session selects it', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['session', 'create', 'primeira', '--dir', dir]);
    runCli(['session', 'create', 'segunda', '--dir', dir]);
    const list = fs.readdirSync(path.join(dir, 'Docs', '05_sessions')).filter((n) => n.startsWith('session_'));
    const first = list.sort()[0];
    const result = runCli(['context', 'build', '--goal', 'x', '--session', first, '--dir', dir]);
    assert.equal(result.status, 0);
    const manifest = JSON.parse(fs.readFileSync(ddaePaths(dir).manifest, 'utf8'));
    assert.equal(manifest.session.id, first);
    assert.equal(manifest.session.selection_reason, 'explicit');
  } finally {
    cleanup(dir);
  }
});

// 11. explicit missing session falha sem fallback
test('11. build with an explicit missing session fails without falling back', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const result = runCli(['context', 'build', '--goal', 'x', '--session', 'session_99_does_not_exist', '--dir', dir]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /session not found/);
    assert.ok(!fs.existsSync(ddaePaths(dir).manifest), 'no package should be written on failure');
  } finally {
    cleanup(dir);
  }
});

// 12-15. build cria .gitignore/manifest/CONTEXT.md/validation.json
test('12-15. build creates .ddae/.gitignore, manifest.json, CONTEXT.md, and validation.json', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const paths = ddaePaths(dir);
    assert.ok(fs.existsSync(paths.gitignore));
    assert.ok(fs.existsSync(paths.manifest));
    assert.ok(fs.existsSync(paths.contextMd));
    assert.ok(fs.existsSync(paths.validation));
    assert.equal(fs.readFileSync(paths.gitignore, 'utf8'), '*\n');
  } finally {
    cleanup(dir);
  }
});

// 16. Manifest valida
test('16. the built manifest.json passes schema validation', async () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const { validateContextManifest } = await import('../src/schemas/context-schema.js');
    const manifest = JSON.parse(fs.readFileSync(ddaePaths(dir).manifest, 'utf8'));
    const { valid, errors } = validateContextManifest(manifest);
    assert.equal(valid, true, JSON.stringify(errors));
  } finally {
    cleanup(dir);
  }
});

// 17. CONTEXT.md == Renderer(manifest)
test('17. the written CONTEXT.md exactly matches renderContextMarkdown(manifest)', async () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const { renderContextMarkdown } = await import('../src/context/renderer.js');
    const paths = ddaePaths(dir);
    const manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
    const contextMd = fs.readFileSync(paths.contextMd, 'utf8');
    assert.equal(contextMd, renderContextMarkdown(manifest));
  } finally {
    cleanup(dir);
  }
});

// 18. validation receipt determinístico
test('18. the validation.json receipt has the expected deterministic shape', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const receipt = JSON.parse(fs.readFileSync(ddaePaths(dir).validation, 'utf8'));
    assert.deepEqual(receipt, { schema_version: '1', status: 'VALID', fingerprint: receipt.fingerprint, reasons: [] });
    assert.match(receipt.fingerprint, /^[0-9a-f]{64}$/);
  } finally {
    cleanup(dir);
  }
});

// 19. repeated build byte-identical
test('19. repeated builds with the same state are byte-identical', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const paths = ddaePaths(dir);
    const before = {
      manifest: fs.readFileSync(paths.manifest, 'utf8'),
      contextMd: fs.readFileSync(paths.contextMd, 'utf8'),
      validation: fs.readFileSync(paths.validation, 'utf8'),
    };
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const after = {
      manifest: fs.readFileSync(paths.manifest, 'utf8'),
      contextMd: fs.readFileSync(paths.contextMd, 'utf8'),
      validation: fs.readFileSync(paths.validation, 'utf8'),
    };
    assert.deepEqual(after, before);
  } finally {
    cleanup(dir);
  }
});

// 20. show retorna CONTEXT.md
test('20. show prints exactly the built CONTEXT.md', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const expected = fs.readFileSync(ddaePaths(dir).contextMd, 'utf8');
    const result = runCli(['context', 'show', '--dir', dir]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, expected);
  } finally {
    cleanup(dir);
  }
});

// 21. show antes de build falha
test('21. show before any build fails clearly', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const result = runCli(['context', 'show', '--dir', dir]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no context package found/);
  } finally {
    cleanup(dir);
  }
});

// 22. show read-only
test('22. show never modifies the context package', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const paths = ddaePaths(dir);
    const before = Object.fromEntries(Object.entries(paths).map(([k, p]) => [k, fs.readFileSync(p, 'utf8')]));
    runCli(['context', 'show', '--dir', dir]);
    const after = Object.fromEntries(Object.entries(paths).map(([k, p]) => [k, fs.readFileSync(p, 'utf8')]));
    assert.deepEqual(after, before);
  } finally {
    cleanup(dir);
  }
});

// 23. validate retorna VALID
test('23. validate reports VALID for a freshly built package', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const result = runCli(['context', 'validate', '--dir', dir]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Status: VALID/);
  } finally {
    cleanup(dir);
  }
});

// 24. validate read-only
test('24. validate never modifies the context package', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const paths = ddaePaths(dir);
    const before = Object.fromEntries(Object.entries(paths).map(([k, p]) => [k, fs.readFileSync(p, 'utf8')]));
    runCli(['context', 'validate', '--dir', dir]);
    const after = Object.fromEntries(Object.entries(paths).map(([k, p]) => [k, fs.readFileSync(p, 'utf8')]));
    assert.deepEqual(after, before);
  } finally {
    cleanup(dir);
  }
});

// 25. HEAD change -> STALE exit1
test('25. a changed Git HEAD makes validate report STALE with exit 1', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    initGitRepo(dir);
    commitAll(dir, 'initial');
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    fs.writeFileSync(path.join(dir, 'new-file.txt'), 'content');
    commitAll(dir, 'second commit');
    const result = runCli(['context', 'validate', '--dir', dir]);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Status: STALE/);
    assert.match(result.stdout, /GIT_HEAD_CHANGED/);
  } finally {
    cleanup(dir);
  }
});

// 26. tampered manifest -> INVALID exit1
test('26. a tampered manifest.json makes validate report INVALID with exit 1', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const paths = ddaePaths(dir);
    const manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
    manifest.fingerprint.value = '0'.repeat(64);
    fs.writeFileSync(paths.manifest, `${JSON.stringify(manifest)}\n`, 'utf8');
    const result = runCli(['context', 'validate', '--dir', dir]);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Status: INVALID/);
  } finally {
    cleanup(dir);
  }
});

// 27. tampered CONTEXT.md -> INVALID exit1
test('27. a tampered CONTEXT.md makes validate report INVALID with exit 1', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    fs.writeFileSync(ddaePaths(dir).contextMd, '# Tampered\n', 'utf8');
    const result = runCli(['context', 'validate', '--dir', dir]);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Status: INVALID/);
    assert.match(result.stdout, /CONTEXT_MARKDOWN_MISMATCH/);
  } finally {
    cleanup(dir);
  }
});

// 28. no-Git build funciona
test('28. build works in a directory with no Git repository', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const result = runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    assert.equal(result.status, 0);
    const manifest = JSON.parse(fs.readFileSync(ddaePaths(dir).manifest, 'utf8'));
    assert.equal(manifest.git.available, false);
  } finally {
    cleanup(dir);
  }
});

// 29. .ddae não aparece untracked em repo Git
test('29. .ddae/ never appears as untracked in a real Git repository', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    initGitRepo(dir);
    commitAll(dir, 'initial');
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const status = git(['status', '--porcelain'], dir);
    assert.ok(!status.includes('.ddae'), `git status should not list .ddae: ${status}`);
    const ignored = git(['status', '--porcelain', '--ignored'], dir);
    assert.match(ignored, /!! \.ddae\//);
  } finally {
    cleanup(dir);
  }
});

// 30. root .gitignore nunca modificado
test('30. the consumer root .gitignore is never modified', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    initGitRepo(dir);
    fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n');
    commitAll(dir, 'initial');
    const before = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const after = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
    assert.equal(after, before);
  } finally {
    cleanup(dir);
  }
});

// 31. no timestamp nos outputs
test('31. none of the built artifacts contain a timestamp', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const paths = ddaePaths(dir);
    for (const file of [paths.manifest, paths.contextMd, paths.validation]) {
      const content = fs.readFileSync(file, 'utf8');
      assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(content), `${file} must not contain a timestamp`);
    }
  } finally {
    cleanup(dir);
  }
});

// 32. no absolute path
test('32. none of the built artifacts contain an absolute filesystem path', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const paths = ddaePaths(dir);
    for (const file of [paths.manifest, paths.contextMd]) {
      const content = fs.readFileSync(file, 'utf8');
      assert.ok(!/[A-Za-z]:\\/.test(content), `${file} must not contain a Windows absolute path`);
      assert.ok(!content.includes(dir.replace(/\\/g, '/')), `${file} must not leak the temp dir path`);
    }
  } finally {
    cleanup(dir);
  }
});

// 33. no package root writes além de .ddae no consumer
test('33. build writes nothing outside .ddae/ in the consumer project', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const before = new Set(fs.readdirSync(dir));
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const after = new Set(fs.readdirSync(dir));
    const added = [...after].filter((entry) => !before.has(entry));
    assert.deepEqual(added, ['.ddae']);
  } finally {
    cleanup(dir);
  }
});

// 34. no broad recursive source read / 35. no arbitrary RelevanceCandidates / 36. structural build has zero textual relevant sources
test('34-36. structural build mode selects zero relevant_files and reads no project source content', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    fs.writeFileSync(path.join(dir, 'SECRET.env'), 'API_KEY=should-never-be-read\n');
    runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    const paths = ddaePaths(dir);
    const manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));
    assert.equal(manifest.relevant_files.length, 0);
    assert.equal(manifest.sources.length, 0);
    const contextMd = fs.readFileSync(paths.contextMd, 'utf8');
    assert.ok(!contextMd.includes('should-never-be-read'));
  } finally {
    cleanup(dir);
  }
});

// 37. warning de structural mode aparece no build
test('37. build prints the structural-mode warning', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    const result = runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    assert.match(result.stdout, /Structural context only/);
    assert.match(result.stdout, /Sensitive Data Guard/);
  } finally {
    cleanup(dir);
  }
});

// 38. Sensitive Data Guard completo ainda não existe
test('38. src/context/sensitive-files.js does not exist yet', () => {
  const guardPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'src', 'context', 'sensitive-files.js');
  assert.ok(!fs.existsSync(guardPath));
});

// 39-41. no LLM / no embeddings / no network
test('39-41. commands/context.js has no LLM, embeddings, or network access', () => {
  const commandPath = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', 'src', 'commands', 'context.js');
  const source = fs.readFileSync(commandPath, 'utf8');
  const code = source.replace(/\/\/.*$/gm, '');
  assert.ok(!/embedding|vector|cosine|\bllm\b|openai|anthropic/i.test(code));
  assert.ok(!/node:https?|node:net|node:dgram|\bfetch\(/.test(code));
});

// --- filesystem security (Etapa 33) ----------------------------------------

test('security: .ddae as a pre-existing file makes build fail without overwriting it', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    fs.writeFileSync(path.join(dir, '.ddae'), 'not a directory');
    const result = runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    assert.equal(result.status, 1);
    assert.equal(fs.readFileSync(path.join(dir, '.ddae'), 'utf8'), 'not a directory');
  } finally {
    cleanup(dir);
  }
});

test('security: .ddae/context as a pre-existing file makes build fail', () => {
  const dir = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    fs.mkdirSync(path.join(dir, '.ddae'));
    fs.writeFileSync(path.join(dir, '.ddae', 'context'), 'not a directory');
    const result = runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    assert.equal(result.status, 1);
  } finally {
    cleanup(dir);
  }
});

test('security: a symlinked .ddae escaping the project root makes build fail', () => {
  const dir = makeTempDir();
  const outside = makeTempDir();
  try {
    runCli(['init', '--dir', dir]);
    try {
      fs.symlinkSync(outside, path.join(dir, '.ddae'), 'dir');
    } catch (error) {
      // Windows without symlink privilege — skip rather than false-green.
      if (error.code === 'EPERM') {
        return;
      }
      throw error;
    }
    const result = runCli(['context', 'build', '--goal', 'x', '--dir', dir]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /symlink escaping/);
  } finally {
    cleanup(dir);
    cleanup(outside);
  }
});
