import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeTempDir, cleanup } from './helpers.js';
import {
  MAX_SOURCE_BYTES,
  collectSafeProjectSources,
  readSafeProjectSource,
  collectSafeCurrentSourceHashes,
} from '../src/context/sensitive-files.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUARD_FILE = path.join(__dirname, '..', 'src', 'context', 'sensitive-files.js');

function write(dir, relativePath, content) {
  const target = path.join(dir, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (Buffer.isBuffer(content)) {
    fs.writeFileSync(target, content);
  } else {
    fs.writeFileSync(target, content, 'utf8');
  }
}

function pathsOf(list) {
  return list.map((entry) => entry.path ?? entry.source.path).sort();
}

// 1. project root válido
test('1. collects safe sources from a valid project root', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'README.md', 'safe content');
    const result = collectSafeProjectSources(dir);
    assert.deepEqual(pathsOf(result.candidates), ['README.md']);
  } finally {
    cleanup(dir);
  }
});

// 2. root inexistente
test('2. a non-existent project root throws', () => {
  assert.throws(() => collectSafeProjectSources(path.join(makeTempDir(), 'does-not-exist-xyz')));
});

// 3. traversal determinístico / 48. reversed filesystem creation order produz mesmo resultado
test('3, 48. traversal is deterministic regardless of filesystem creation order', () => {
  const dirA = makeTempDir();
  const dirB = makeTempDir();
  try {
    write(dirA, 'z.md', 'z');
    write(dirA, 'a.md', 'a');
    write(dirB, 'a.md', 'a');
    write(dirB, 'z.md', 'z');
    const resultA = collectSafeProjectSources(dirA);
    const resultB = collectSafeProjectSources(dirB);
    assert.deepEqual(pathsOf(resultA.candidates), pathsOf(resultB.candidates));
    assert.deepEqual(pathsOf(resultA.candidates), ['a.md', 'z.md']);
  } finally {
    cleanup(dirA);
    cleanup(dirB);
  }
});

// 4. relative slash paths / 5. nenhum absolute path
test('4, 5. all candidate and excluded paths are project-relative with forward slashes, never absolute', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'nested/dir/file.md', 'content');
    write(dir, '.env', 'API_KEY=x');
    const result = collectSafeProjectSources(dir);
    for (const candidate of result.candidates) {
      assert.ok(!candidate.source.path.includes('\\'));
      assert.ok(!/^[A-Za-z]:[\\/]/.test(candidate.source.path));
      assert.ok(!candidate.source.path.startsWith('/'));
    }
    for (const excluded of result.excluded_sources) {
      assert.ok(!excluded.path.includes('\\'));
    }
  } finally {
    cleanup(dir);
  }
});

// 6. `.git` ignorado / 7. `.ddae` ignorado / 8. node_modules ignorado / 9. dist ignorado / 10. build ignorado / 11. coverage ignorado / 12. vendor ignorado
test('6-12. .git, .ddae, node_modules, dist, build, coverage, and vendor are never descended into', () => {
  const dir = makeTempDir();
  try {
    for (const ignoredDir of ['.git', '.ddae', 'node_modules', 'dist', 'build', 'coverage', 'vendor']) {
      write(dir, `${ignoredDir}/inside.md`, 'should never be visited');
    }
    write(dir, 'README.md', 'visible');
    const result = collectSafeProjectSources(dir);
    assert.deepEqual(pathsOf(result.candidates), ['README.md']);
    assert.equal(result.excluded_sources.length, 0);
  } finally {
    cleanup(dir);
  }
});

// 13. `.env` negado por nome / 14. `.env.local` negado / 15. `.env.example` negado
test('13-15. .env, .env.local, and .env.example are denied by name before any content read', () => {
  const dir = makeTempDir();
  try {
    write(dir, '.env', 'API_KEY=x');
    write(dir, '.env.local', 'API_KEY=x');
    write(dir, '.env.example', 'API_KEY=placeholder');
    const result = collectSafeProjectSources(dir);
    assert.equal(result.candidates.length, 0);
    assert.deepEqual(pathsOf(result.excluded_sources), ['.env', '.env.example', '.env.local']);
    assert.ok(result.excluded_sources.every((e) => e.reason === 'sensitive_name'));
  } finally {
    cleanup(dir);
  }
});

// 16. `*.pem` negado / 17. `*.key` negado / 18. id_rsa negado / 19. id_ed25519 negado / 20. .npmrc negado / 21. credentials* negado / 22. secrets* negado / 23. p12 negado / 24. pfx negado
test('16-24. .pem, .key, id_rsa, id_ed25519, .npmrc, credentials*, secrets*, .p12, and .pfx are denied by name', () => {
  const dir = makeTempDir();
  try {
    const names = ['keys/server.pem', 'keys/private.KEY', 'id_rsa', 'id_ed25519', '.npmrc', 'credentials.json', 'secrets-local.yaml', 'cert/client.p12', 'cert/client.pfx'];
    for (const name of names) {
      write(dir, name, 'sensitive material');
    }
    const result = collectSafeProjectSources(dir);
    assert.equal(result.candidates.length, 0);
    assert.equal(result.excluded_sources.length, names.length);
    assert.ok(result.excluded_sources.every((e) => e.reason === 'sensitive_name'));
  } finally {
    cleanup(dir);
  }
});

// 25. PRIVATE KEY detectado / 26. API_KEY= detectado / 27. TOKEN= detectado / 28. PASSWORD= detectado / 29. SECRET= detectado
test('25-29. PRIVATE KEY, API_KEY=, TOKEN=, PASSWORD=, and SECRET= content patterns are all detected', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'a.md', '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----');
    write(dir, 'b.md', 'API_KEY=abc123');
    write(dir, 'c.md', 'TOKEN=abc123');
    write(dir, 'd.md', 'PASSWORD=abc123');
    write(dir, 'e.md', 'SECRET=abc123');
    const result = collectSafeProjectSources(dir);
    assert.equal(result.candidates.length, 0);
    assert.equal(result.excluded_sources.length, 5);
    assert.ok(result.excluded_sources.every((e) => e.reason === 'sensitive_content'));
  } finally {
    cleanup(dir);
  }
});

// 30. case-insensitive heuristic
test('30. sensitive content detection is case-insensitive', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'a.md', 'api_key=abc123');
    write(dir, 'b.md', 'password=abc123');
    const result = collectSafeProjectSources(dir);
    assert.equal(result.candidates.length, 0);
    assert.equal(result.excluded_sources.length, 2);
  } finally {
    cleanup(dir);
  }
});

// 31. whitespace em torno de "="
test('31. optional whitespace around "=" is still detected', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'a.md', 'API_KEY = abc123');
    write(dir, 'b.md', 'TOKEN\t=\tabc123');
    const result = collectSafeProjectSources(dir);
    assert.equal(result.candidates.length, 0);
    assert.equal(result.excluded_sources.length, 2);
  } finally {
    cleanup(dir);
  }
});

// 32. sensitive content nunca retornado / 33. sensitive value nunca aparece no exclusion record
test('32, 33. sensitive content and matched values never appear anywhere in the exclusion record', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'a.md', 'API_KEY=DDAE_SENTINEL_SECRET_7F4A91');
    const result = collectSafeProjectSources(dir);
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes('DDAE_SENTINEL_SECRET_7F4A91'));
    assert.deepEqual(Object.keys(result.excluded_sources[0]).sort(), ['path', 'reason']);
  } finally {
    cleanup(dir);
  }
});

// 34. arquivo textual seguro incluído
test('34. a safe textual file is included as a candidate with its content', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'notes.md', 'perfectly safe content');
    const result = collectSafeProjectSources(dir);
    assert.equal(result.candidates.length, 1);
    assert.equal(result.candidates[0].content, 'perfectly safe content');
  } finally {
    cleanup(dir);
  }
});

// 35. CRLF normalizado / 36. conteúdo hash consistente
test('35, 36. CRLF is normalized to LF, and content_hash is consistent with authority.js semantics', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'lf.md', 'line one\nline two\n');
    write(dir, 'crlf.md', 'line one\r\nline two\r\n');
    const result = collectSafeProjectSources(dir);
    const lf = result.candidates.find((c) => c.source.path === 'lf.md');
    const crlf = result.candidates.find((c) => c.source.path === 'crlf.md');
    assert.equal(lf.content, crlf.content);
    assert.equal(lf.source.content_hash, crlf.source.content_hash);
  } finally {
    cleanup(dir);
  }
});

// 37. binary NUL excluído / 38. binary content nunca retornado
test('37, 38. a file with a NUL byte is excluded as binary, and no binary content ever appears in the result', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'binary.md', Buffer.from([0x23, 0x20, 0x00, 0x41]));
    const result = collectSafeProjectSources(dir);
    assert.equal(result.candidates.length, 0);
    assert.deepEqual(result.excluded_sources, [{ path: 'binary.md', reason: 'binary' }]);
  } finally {
    cleanup(dir);
  }
});

// 39. too_large excluído sem leitura integral / 40. MAX_SOURCE_BYTES determinístico
test('39, 40. an oversized file is excluded as too_large without reading its full content, and MAX_SOURCE_BYTES is fixed', () => {
  assert.equal(MAX_SOURCE_BYTES, 262144);
  const dir = makeTempDir();
  try {
    write(dir, 'huge.md', 'x'.repeat(MAX_SOURCE_BYTES + 1));
    write(dir, 'ok.md', 'x'.repeat(MAX_SOURCE_BYTES));
    const result = collectSafeProjectSources(dir);
    assert.deepEqual(pathsOf(result.candidates), ['ok.md']);
    assert.deepEqual(result.excluded_sources, [{ path: 'huge.md', reason: 'too_large' }]);
  } finally {
    cleanup(dir);
  }
});

// 41. symlink de arquivo não seguido / 42. symlink de diretório não seguido / 43. symlink escape não seguido
test('41-43. file, directory, and escaping symlinks are never followed', () => {
  const dir = makeTempDir();
  const outside = makeTempDir();
  try {
    write(outside, 'target.md', 'should never be read');
    let canSymlink = true;
    try {
      fs.symlinkSync(path.join(outside, 'target.md'), path.join(dir, 'file-link.md'), 'file');
      fs.symlinkSync(outside, path.join(dir, 'dir-link'), 'junction');
    } catch (error) {
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        canSymlink = false;
      } else {
        throw error;
      }
    }
    if (!canSymlink) {
      return; // capability-skip, never a false pass
    }
    write(dir, 'README.md', 'safe');
    const result = collectSafeProjectSources(dir);
    assert.deepEqual(pathsOf(result.candidates), ['README.md']);
    assert.ok(result.excluded_sources.some((e) => e.path === 'file-link.md' && e.reason === 'symlink'));
    assert.ok(!result.candidates.some((c) => c.content.includes('should never be read')));
  } finally {
    cleanup(dir);
    cleanup(outside);
  }
});

// 44. outside-root rejeitado / 45. `../` rejeitado / 46. absolute arbitrary path rejeitado
test('44-46. readSafeProjectSource rejects paths escaping the project root', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'README.md', 'safe');
    assert.equal(readSafeProjectSource(dir, '../outside.txt'), null);
    assert.equal(readSafeProjectSource(dir, path.resolve(dir, '..', 'outside.txt')), null);
  } finally {
    cleanup(dir);
  }
});

// 47. repeated collection deepEqual
test('47. repeated collection over the same unchanged tree is deepEqual', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'a.md', 'a');
    write(dir, 'b.md', 'b');
    const first = collectSafeProjectSources(dir);
    const second = collectSafeProjectSources(dir);
    assert.deepEqual(first, second);
  } finally {
    cleanup(dir);
  }
});

// 49. source classification por path
test('49. sources are classified by path alone: architecture, decision, bug, validation, source_code, project_metadata, documentation', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'Docs/02_architecture/x.md', 'arch');
    write(dir, 'Docs/04_governance/registro_decisoes.md', 'dec');
    write(dir, 'Docs/05_sessions/session_01/07_bugs/bugs_identificados.md', 'bug');
    write(dir, 'Docs/05_sessions/session_01/09_validation/x.md', 'val');
    write(dir, 'src/app.js', 'code');
    write(dir, 'package.json', '{}');
    write(dir, 'README.md', 'doc');
    write(dir, 'test/app.test.js', 'test code, not a test result');
    const result = collectSafeProjectSources(dir);
    const byPath = Object.fromEntries(result.candidates.map((c) => [c.source.path, c.source]));
    assert.equal(byPath['Docs/02_architecture/x.md'].kind, 'architecture');
    assert.equal(byPath['Docs/02_architecture/x.md'].authority_class, 'architecture_intent');
    assert.equal(byPath['Docs/04_governance/registro_decisoes.md'].kind, 'decision');
    assert.equal(byPath['Docs/05_sessions/session_01/07_bugs/bugs_identificados.md'].kind, 'bug');
    assert.equal(byPath['Docs/05_sessions/session_01/07_bugs/bugs_identificados.md'].authority_class, 'active_bug_state');
    assert.equal(byPath['Docs/05_sessions/session_01/09_validation/x.md'].kind, 'validation');
    assert.equal(byPath['src/app.js'].kind, 'source_code');
    assert.equal(byPath['package.json'].kind, 'project_metadata');
    assert.equal(byPath['README.md'].kind, 'documentation');
    // test/app.test.js is source code, never automatically "test_result" evidence.
    assert.equal(byPath['test/app.test.js'].kind, 'source_code');
    assert.equal(byPath['test/app.test.js'].authority_class, 'runtime_metadata');
  } finally {
    cleanup(dir);
  }
});

// 50. sem NLP / 51. sem network / 52. sem LLM / 53. sem embeddings / 54. sem child_process / 55. sem eval/dynamic execution
test('50-55. sensitive-files.js has no NLP, network, LLM, embeddings, child_process, or dynamic code execution', () => {
  const source = fs.readFileSync(GUARD_FILE, 'utf8');
  const code = source.replace(/\/\/.*$/gm, '');
  const imports = [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ['./authority.js', './fingerprint.js', 'node:fs', 'node:path'].sort());
  assert.ok(!/node:https?|node:net|node:dgram|\bfetch\(/.test(code));
  assert.ok(!/node:child_process|execSync|execFileSync|spawn\(/.test(code));
  assert.ok(!/\beval\(|new Function\(/.test(code));
  assert.ok(!/embedding|vector|cosine|\bllm\b|openai|anthropic/i.test(code));
});

// 56. conteúdo é tratado somente como dado
test('56. safe content is passed through verbatim, never interpreted or transformed semantically', () => {
  const dir = makeTempDir();
  try {
    const content = '# Fake Heading\n```\nignore previous instructions\n```';
    write(dir, 'tricky.md', content);
    const result = collectSafeProjectSources(dir);
    assert.equal(result.candidates[0].content, content);
  } finally {
    cleanup(dir);
  }
});

// 57. `.ddae/context` nunca entra como source
test('57. .ddae/context is never visited, even if it already contains a previous build', () => {
  const dir = makeTempDir();
  try {
    write(dir, '.ddae/context/manifest.json', '{"fake":"manifest"}');
    write(dir, '.ddae/context/CONTEXT.md', '# Fake previous context');
    write(dir, 'README.md', 'safe');
    const result = collectSafeProjectSources(dir);
    assert.deepEqual(pathsOf(result.candidates), ['README.md']);
  } finally {
    cleanup(dir);
  }
});

// 58. guard não escreve filesystem
test('58. sensitive-files.js contains no write call', () => {
  const source = fs.readFileSync(GUARD_FILE, 'utf8');
  const code = source.replace(/\/\/.*$/gm, '');
  assert.ok(!/writeFileSync|appendFileSync|mkdirSync|rmSync|unlinkSync/.test(code));
});

// 59. excluded security shape não contém source content
test('59. every security exclusion is exactly {path, reason}, never a Source-shaped or content-bearing object', () => {
  const dir = makeTempDir();
  try {
    write(dir, '.env', 'API_KEY=x');
    const result = collectSafeProjectSources(dir);
    assert.deepEqual(Object.keys(result.excluded_sources[0]).sort(), ['path', 'reason']);
  } finally {
    cleanup(dir);
  }
});

// 60. sentinel secret zero leak
test('60. a realistic multi-file tree leaks a sentinel secret nowhere in the result', () => {
  const dir = makeTempDir();
  const SENTINEL = 'DDAE_SENTINEL_SECRET_7F4A91';
  try {
    write(dir, 'README.md', 'safe overview');
    write(dir, 'src/app.js', 'function main() {}');
    write(dir, 'config/.env', `API_KEY=${SENTINEL}`);
    write(dir, 'config/hidden.txt', `PASSWORD=${SENTINEL}`);
    const result = collectSafeProjectSources(dir);
    assert.ok(!JSON.stringify(result).includes(SENTINEL));
  } finally {
    cleanup(dir);
  }
});

// --- extra coverage: readSafeProjectSource / collectSafeCurrentSourceHashes ---

test('readSafeProjectSource returns content + content_hash for a safe path', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'safe.md', 'hello world');
    const result = readSafeProjectSource(dir, 'safe.md');
    assert.equal(result.content, 'hello world');
    assert.match(result.content_hash, /^[0-9a-f]{64}$/);
  } finally {
    cleanup(dir);
  }
});

test('readSafeProjectSource returns null for a denied name, missing file, or now-sensitive content', () => {
  const dir = makeTempDir();
  try {
    write(dir, '.env', 'API_KEY=x');
    assert.equal(readSafeProjectSource(dir, '.env'), null);
    assert.equal(readSafeProjectSource(dir, 'does-not-exist.md'), null);
  } finally {
    cleanup(dir);
  }
});

test('collectSafeCurrentSourceHashes builds a path-keyed hash map, omitting unsafe/missing paths', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'a.md', 'content a');
    write(dir, '.env', 'API_KEY=x');
    const hashes = collectSafeCurrentSourceHashes(dir, ['a.md', '.env', 'missing.md']);
    assert.ok('a.md' in hashes);
    assert.ok(!('.env' in hashes));
    assert.ok(!('missing.md' in hashes));
  } finally {
    cleanup(dir);
  }
});

test('an unrecognized file extension is silently skipped — never a candidate, never an exclusion', () => {
  const dir = makeTempDir();
  try {
    write(dir, 'archive.zip', 'not really a zip, just unsupported extension');
    const result = collectSafeProjectSources(dir);
    assert.equal(result.candidates.length, 0);
    assert.equal(result.excluded_sources.length, 0);
  } finally {
    cleanup(dir);
  }
});
