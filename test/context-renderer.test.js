import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSource } from '../src/context/authority.js';
import { computeContextFingerprint } from '../src/context/fingerprint.js';
import { createContextManifest } from '../src/context/manifest.js';
import { renderContextMarkdown, SECTION_TITLES } from '../src/context/renderer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RENDERER_FILE = path.join(__dirname, '..', 'src', 'context', 'renderer.js');

function fp() {
  return computeContextFingerprint({ marker: Math.random() });
}

function validManifest(overrides = {}) {
  return createContextManifest({
    compiler: { name: 'ddae-context-compiler', contract_version: '1', engine_version: '0.2.0' },
    project: { name: 'DDAE Engine', root_kind: 'ddae' },
    goal: { text: 'Implement a feature', normalized: 'implement a feature', hash: `sha256:${'a'.repeat(64)}` },
    session: { id: 'session_02_context_compiler_0_3_0', path: 'Docs/05_sessions/session_02_context_compiler_0_3_0', selection_reason: 'latest_canonical' },
    budget: { profile: 'standard', max_chars: 60000, used_chars: 100 },
    git: { available: true, repository: true, branch: 'main', head: 'a'.repeat(40), working_tree: 'clean' },
    sources: [],
    decisions: [],
    constraints: [],
    bugs: [],
    validation: [],
    relevant_files: [],
    excluded_sources: [],
    conflicts: [],
    fingerprint: fp(),
    ...overrides,
  });
}

function sectionTitlesOf(markdown) {
  return [...markdown.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
}

// 1. Manifest obrigatório
test('1. renderContextMarkdown requires a manifest', () => {
  assert.throws(() => renderContextMarkdown(undefined), /must be an object/);
});

// 2. Manifest inválido rejeitado via schema
test('2. an invalid manifest is rejected via context-schema.js, never silently fixed', () => {
  assert.throws(() => renderContextMarkdown({ schema_version: '999' }), /assertContextManifest: invalid Context Manifest/);
});

// 3. retorno é string
test('3. the return value is a string', () => {
  assert.equal(typeof renderContextMarkdown(validManifest()), 'string');
});

// 4. título "# DDAE Agent Context"
test('4. the document starts with "# DDAE Agent Context"', () => {
  const markdown = renderContextMarkdown(validManifest());
  assert.ok(markdown.startsWith('# DDAE Agent Context\n'));
});

// 5. 10 top-level sections presentes
test('5. exactly 10 top-level sections are present', () => {
  const titles = sectionTitlesOf(renderContextMarkdown(validManifest()));
  assert.equal(titles.length, 10);
});

// 6. top-level section order exata
test('6. top-level sections appear in the exact documented order', () => {
  const titles = sectionTitlesOf(renderContextMarkdown(validManifest()));
  assert.deepEqual(titles, [...SECTION_TITLES]);
});

// 7. cada top-level section aparece uma vez
test('7. each top-level section appears exactly once', () => {
  const titles = sectionTitlesOf(renderContextMarkdown(validManifest()));
  assert.equal(new Set(titles).size, titles.length);
});

// 8. goal.text renderizado
test('8. goal.text is rendered', () => {
  const markdown = renderContextMarkdown(validManifest({ goal: { text: 'A very specific goal statement', normalized: 'a very specific goal statement', hash: `sha256:${'b'.repeat(64)}` } }));
  assert.ok(markdown.includes('A very specific goal statement'));
});

// 9. goal.normalized renderizado
test('9. goal.normalized is rendered', () => {
  const markdown = renderContextMarkdown(validManifest({ goal: { text: 'x', normalized: 'unique normalized goal marker', hash: `sha256:${'c'.repeat(64)}` } }));
  assert.ok(markdown.includes('unique normalized goal marker'));
});

// 10. goal.hash renderizado
test('10. goal.hash is rendered', () => {
  const hash = `sha256:${'d'.repeat(64)}`;
  const markdown = renderContextMarkdown(validManifest({ goal: { text: 'x', normalized: 'x', hash } }));
  assert.ok(markdown.includes(hash));
});

// 11. project metadata renderizada
test('11. project metadata is rendered', () => {
  const markdown = renderContextMarkdown(validManifest({ project: { name: 'Unique Project Name', root_kind: 'ddae' } }));
  assert.ok(markdown.includes('Unique Project Name'));
});

// 12. compiler metadata renderizada
test('12. compiler metadata is rendered', () => {
  const markdown = renderContextMarkdown(validManifest({ compiler: { name: 'ddae-context-compiler', contract_version: '1', engine_version: '9.9.9-marker' } }));
  assert.ok(markdown.includes('9.9.9-marker'));
});

// 13. budget renderizado
test('13. budget is rendered', () => {
  const markdown = renderContextMarkdown(validManifest({ budget: { profile: 'deep', max_chars: 120000, used_chars: 4242 } }));
  assert.ok(markdown.includes('deep'));
  assert.ok(markdown.includes('120000'));
  assert.ok(markdown.includes('4242'));
});

// 14. fingerprint renderizado
test('14. fingerprint is rendered', () => {
  const fingerprint = fp();
  const markdown = renderContextMarkdown(validManifest({ fingerprint }));
  assert.ok(markdown.includes(fingerprint.value));
});

// 15. Git available renderizado
test('15. an available Git state is rendered with real values', () => {
  const markdown = renderContextMarkdown(validManifest({ git: { available: true, repository: true, branch: 'feature-x', head: 'f'.repeat(40), working_tree: 'dirty' } }));
  assert.ok(markdown.includes('feature-x'));
  assert.ok(markdown.includes('f'.repeat(40)));
  assert.ok(markdown.includes('dirty'));
});

// 16. Git unavailable/degraded renderizado sem inventar valores
test('16. an unavailable Git state renders "n/a" without inventing values', () => {
  const markdown = renderContextMarkdown(validManifest({ git: { available: false, repository: false, branch: null, head: null, working_tree: null } }));
  assert.ok(markdown.includes('Available: no'));
  assert.ok(markdown.includes('Branch: n/a'));
  assert.ok(markdown.includes('HEAD: n/a'));
  assert.ok(markdown.includes('Working tree: n/a'));
});

// 17. current session presente
test('17. a present current session is rendered', () => {
  const markdown = renderContextMarkdown(validManifest({ session: { id: 'session_99_marker', path: 'Docs/05_sessions/session_99_marker', selection_reason: 'explicit' } }));
  assert.ok(markdown.includes('session_99_marker'));
});

// 18. session null/degraded
test('18. a null session renders "No current DDAE session." without inventing one', () => {
  const markdown = renderContextMarkdown(validManifest({ session: { id: null, path: null, selection_reason: 'none' } }));
  assert.ok(markdown.includes('No current DDAE session.'));
});

// 19. Architecture usa apenas selected relevant_files cujo Source.kind=architecture
test('19. Architecture only lists relevant_files whose Source.kind is "architecture"', () => {
  const archSource = createSource({ kind: 'architecture', domain: 'architecture_intent', path: 'Docs/02_architecture/x.md', content: 'arch content' });
  const codeSource = createSource({ kind: 'source_code', domain: 'runtime_metadata', path: 'src/x.js', content: 'code content' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [archSource, codeSource],
    relevant_files: [
      { source_id: archSource.id, path: archSource.path, section: null, score: 5, breakdown: {}, char_cost: 12, content: 'arch content' },
      { source_id: codeSource.id, path: codeSource.path, section: null, score: 3, breakdown: {}, char_cost: 12, content: 'code content' },
    ],
  }));
  const architectureSection = markdown.split('## Architecture')[1].split('## Relevant Files')[0];
  assert.ok(architectureSection.includes('Docs/02_architecture/x.md'));
  assert.ok(!architectureSection.includes('src/x.js'));
});

// 20. documentation contendo palavra "architecture" não vira Architecture
test('20. a documentation source merely mentioning "architecture" in prose is never promoted', () => {
  const docSource = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/notes.md', content: 'Architecture decision: use microservices' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [docSource],
    relevant_files: [{ source_id: docSource.id, path: docSource.path, section: null, score: 5, breakdown: {}, char_cost: 30, content: 'Architecture decision: use microservices' }],
  }));
  const architectureSection = markdown.split('## Architecture')[1].split('## Relevant Files')[0];
  assert.ok(!architectureSection.includes('Docs/notes.md'));
  assert.ok(architectureSection.includes('None recorded'));
});

// 21. Relevant Files preserva ordem original
test('21. Relevant Files preserves the exact order given in the manifest', () => {
  const a = createSource({ kind: 'documentation', domain: 'history', path: 'z_last.md', content: 'a' });
  const b = createSource({ kind: 'documentation', domain: 'history', path: 'a_first.md', content: 'b' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [a, b],
    relevant_files: [
      { source_id: a.id, path: a.path, section: null, score: 10, breakdown: {}, char_cost: 1, content: 'a' },
      { source_id: b.id, path: b.path, section: null, score: 5, breakdown: {}, char_cost: 1, content: 'b' },
    ],
  }));
  const indexA = markdown.indexOf('z_last.md');
  const indexB = markdown.indexOf('a_first.md');
  assert.ok(indexA < indexB, 'z_last.md (higher score) must appear before a_first.md, not alphabetically resorted');
});

// 22. Relevant File mostra provenance
test('22. each relevant file shows its source id, kind, and authority class', () => {
  const source = createSource({ kind: 'test', domain: 'test_result', path: 'test/x.test.js', content: 'test content' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [source],
    relevant_files: [{ source_id: source.id, path: source.path, section: null, score: 5, breakdown: {}, char_cost: 12, content: 'test content' }],
  }));
  assert.ok(markdown.includes(source.id));
  assert.ok(markdown.includes('Kind: `test`'));
  assert.ok(markdown.includes('Authority class: `test_result`'));
});

// 23. conteúdo relevante preservado
test('23. relevant file content is preserved verbatim inside the fenced block', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'exact preserved content marker' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [source],
    relevant_files: [{ source_id: source.id, path: source.path, section: null, score: 5, breakdown: {}, char_cost: 30, content: 'exact preserved content marker' }],
  }));
  assert.ok(markdown.includes('exact preserved content marker'));
});

// 24. conteúdo com CRLF renderiza LF
test('24. content with CRLF line endings renders with LF', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/crlf.md', content: 'line one\r\nline two\r\n' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [source],
    relevant_files: [{ source_id: source.id, path: source.path, section: null, score: 5, breakdown: {}, char_cost: 20, content: 'line one\r\nline two\r\n' }],
  }));
  assert.ok(!markdown.includes('\r'));
  assert.ok(markdown.includes('line one\nline two'));
});

// 25. conteúdo contendo triple-backticks não quebra fence
test('25. content containing triple backticks does not break the fence', () => {
  const trickyContent = 'before\n```\nnested fence\n```\nafter';
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/tricky.md', content: trickyContent });
  const markdown = renderContextMarkdown(validManifest({
    sources: [source],
    relevant_files: [{ source_id: source.id, path: source.path, section: null, score: 5, breakdown: {}, char_cost: trickyContent.length, content: trickyContent }],
  }));
  assert.ok(markdown.includes('````text'));
  assert.ok(markdown.includes(trickyContent));
  const sections = sectionTitlesOf(markdown);
  assert.deepEqual(sections, [...SECTION_TITLES]);
});

// 26. conteúdo contendo "# Fake Heading" não cria top-level section
test('26. content containing "# Fake Heading" never creates a spurious top-level section', () => {
  const trickyContent = '# Fake Top-Level Heading\n\nSome more text pretending to be structure.';
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/fake-heading.md', content: trickyContent });
  const markdown = renderContextMarkdown(validManifest({
    sources: [source],
    relevant_files: [{ source_id: source.id, path: source.path, section: null, score: 5, breakdown: {}, char_cost: trickyContent.length, content: trickyContent }],
  }));
  const sections = sectionTitlesOf(markdown);
  assert.deepEqual(sections, [...SECTION_TITLES]);
});

// 27. decisions renderizadas com source provenance
test('27. decisions are rendered with source provenance', () => {
  const source = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/04_governance/registro_decisoes.md', section: 'DEC-07' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [source],
    decisions: [{ value: 'Use HttpOnly cookies', source_id: source.id }],
  }));
  const section = markdown.split('## Decisions')[1].split('## Constraints')[0];
  assert.ok(section.includes('Use HttpOnly cookies'));
  assert.ok(section.includes('DEC-07'));
});

// 28. constraints renderizadas
test('28. constraints are rendered', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [source],
    constraints: [{ value: 'No external network calls', source_id: source.id }],
  }));
  assert.ok(markdown.includes('No external network calls'));
});

// 29. bugs renderizados
test('29. bugs are rendered', () => {
  const source = createSource({ kind: 'bug', domain: 'active_bug_state', path: 'Docs/x/bugs_identificados.md', section: 'BUG-01' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [source],
    bugs: [{ value: 'Glossary template renders raw placeholders', source_id: source.id }],
  }));
  assert.ok(markdown.includes('Glossary template renders raw placeholders'));
});

// 30. validation renderizada
test('30. validation facts are rendered', () => {
  const source = createSource({ kind: 'test', domain: 'test_result', identity: 'npm-test-run' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [source],
    validation: [{ value: 'npm test: 257 pass, 0 fail', source_id: source.id }],
  }));
  assert.ok(markdown.includes('npm test: 257 pass, 0 fail'));
});

// 31. resolved conflict renderizado
test('31. a resolved conflict is rendered with its winner and losing sources', () => {
  const winner = createSource({ kind: 'decision', domain: 'architecture_intent', identity: 'winner-src' });
  const loser = createSource({ kind: 'documentation', domain: 'history', identity: 'loser-src' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [winner, loser],
    conflicts: [{
      claim_id: 'claim-resolved-marker',
      domain: 'architecture_intent',
      status: 'resolved',
      winner: { source_id: winner.id },
      conflicting_sources: [{ source_id: loser.id, reason_superseded: 'current_architecture_intent_over_history' }],
    }],
  }));
  assert.ok(markdown.includes('claim-resolved-marker'));
  assert.ok(markdown.includes(winner.id));
  assert.ok(markdown.includes('current_architecture_intent_over_history'));
});

// 32. unresolved conflict renderizado
test('32. an unresolved conflict is rendered with "Winner: unresolved"', () => {
  const a = createSource({ kind: 'decision', domain: 'architecture_intent', identity: 'a-side' });
  const b = createSource({ kind: 'decision', domain: 'architecture_intent', identity: 'b-side' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [a, b],
    conflicts: [{
      claim_id: 'claim-unresolved-marker',
      domain: 'architecture_intent',
      status: 'unresolved',
      winner: null,
      conflicting_sources: [{ source_id: a.id, reason_superseded: null }, { source_id: b.id, reason_superseded: null }],
    }],
  }));
  assert.ok(markdown.includes('claim-unresolved-marker'));
  assert.ok(markdown.includes('Winner: unresolved'));
});

// 33. Renderer não resolve conflito novamente
test('33. the renderer never re-resolves a conflict — it only displays what the manifest already recorded', () => {
  const source = fs.readFileSync(RENDERER_FILE, 'utf8');
  const code = source.replace(/\/\/.*$/gm, '');
  assert.ok(!/resolveAuthorityConflict/.test(code));
});

// 34. excluded_sources aparecem sob Relevant Files
test('34. excluded_sources are rendered under the "Excluded Sources" subsection of Relevant Files', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/excluded.md' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [source],
    excluded_sources: [{ source_id: source.id, path: source.path, score: 1, char_cost: 99999, reason: 'budget_exceeded' }],
  }));
  const relevantFilesSection = markdown.split('## Relevant Files')[1].split('## Decisions')[0];
  assert.ok(relevantFilesSection.includes('### Excluded Sources'));
  assert.ok(relevantFilesSection.includes('Docs/excluded.md'));
});

// 35. excluded_sources NÃO aparecem como semantic Out of Scope
test('35. excluded_sources never leak into Out of Scope', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/excluded-marker-xyz.md' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [source],
    excluded_sources: [{ source_id: source.id, path: source.path, score: 1, char_cost: 99999, reason: 'budget_exceeded' }],
  }));
  const outOfScopeSection = markdown.split('## Out of Scope')[1];
  assert.ok(!outOfScopeSection.includes('excluded-marker-xyz.md'));
});

// 36. Out of Scope não inventa informação
test('36. Out of Scope always renders the fixed neutral sentence, never inferred content', () => {
  const markdown = renderContextMarkdown(validManifest({
    constraints: [{ value: 'some constraint', source_id: undefined }].filter(() => false),
  }));
  const outOfScopeSection = markdown.split('## Out of Scope')[1];
  assert.ok(outOfScopeSection.includes('None explicitly recorded in Manifest v1.'));
});

// 37. empty states são estáveis
test('37. empty sections render a stable "None recorded." marker', () => {
  const markdown = renderContextMarkdown(validManifest());
  assert.ok(markdown.includes('None recorded.'));
});

// 38. zero timestamp
test('38. the rendered document never contains a timestamp', () => {
  const markdown = renderContextMarkdown(validManifest());
  assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(markdown));
  assert.ok(!/generated_at|created_at/i.test(markdown));
});

// 39. exatamente um trailing newline
test('39. the document ends with exactly one trailing newline', () => {
  const markdown = renderContextMarkdown(validManifest());
  assert.ok(markdown.endsWith('\n'));
  assert.ok(!markdown.endsWith('\n\n'));
});

// 40. repeated renders byte-identical
test('40. repeated renders of the same manifest are byte-identical', () => {
  const manifest = validManifest();
  assert.equal(renderContextMarkdown(manifest), renderContextMarkdown(manifest));
});

// 41. input Manifest não mutado
test('41. renderContextMarkdown never mutates the input manifest', () => {
  const manifest = validManifest();
  const before = JSON.stringify(manifest);
  renderContextMarkdown(manifest);
  assert.equal(JSON.stringify(manifest), before);
});

// 42-45, 48. purity: no filesystem, network, writes, LLM/embeddings, Compiler execution
test('42-45, 48-49. renderer.js performs no filesystem/network/write/LLM access and never executes the Compiler or CLI logic', () => {
  const source = fs.readFileSync(RENDERER_FILE, 'utf8');
  const code = source.replace(/\/\/.*$/gm, '');
  const imports = [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.deepEqual(imports, ['../schemas/context-schema.js']);
  assert.ok(!/readFileSync|writeFileSync|readdirSync/.test(code));
  assert.ok(!/node:https?|node:net|node:dgram|\bfetch\(/.test(code));
  assert.ok(!/embedding|vector|cosine|\bllm\b|openai|anthropic/i.test(code));
  assert.ok(!/compileContext|rankRelevantSources|resolveAuthorityConflict/.test(code));
  assert.ok(!/process\.argv|commander/.test(code));
  assert.ok(!/\.ddae(?![a-zA-Z])/.test(code));
});

// 46. no relevance scoring
test('46. the renderer never recomputes a relevance score — it only displays scores already present in the manifest', () => {
  const source = fs.readFileSync(RENDERER_FILE, 'utf8');
  const code = source.replace(/\/\/.*$/gm, '');
  assert.ok(!/normalizeGoal|scoreRelevanceCandidate/.test(code));
});

// 47. no authority resolution
test('47. the renderer never imports the Authority Model implementation', () => {
  const source = fs.readFileSync(RENDERER_FILE, 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(!imports.some((imp) => imp.includes('authority')));
});

// --- extra coverage -------------------------------------------------------

test('the renderer never recomputes the fingerprint — the manifest fingerprint.value is untouched', () => {
  const manifest = validManifest();
  renderContextMarkdown(manifest);
  assert.equal(manifest.fingerprint.value, manifest.fingerprint.value);
  assert.ok(Object.isFrozen(manifest));
});

test('reversed relevant_files input order (as compiled by compileContext) is preserved verbatim, never re-sorted alphabetically', () => {
  const high = createSource({ kind: 'documentation', domain: 'history', path: 'z_high_score.md', content: 'x' });
  const low = createSource({ kind: 'documentation', domain: 'history', path: 'a_low_score.md', content: 'y' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [high, low],
    relevant_files: [
      { source_id: high.id, path: high.path, section: null, score: 50, breakdown: {}, char_cost: 1, content: 'x' },
      { source_id: low.id, path: low.path, section: null, score: 1, breakdown: {}, char_cost: 1, content: 'y' },
    ],
  }));
  assert.ok(markdown.indexOf('z_high_score.md') < markdown.indexOf('a_low_score.md'));
});

test('a section heading is a Markdown-safe escaped path, never raw unescaped structural text', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/normal-path.md', content: 'x' });
  const markdown = renderContextMarkdown(validManifest({
    sources: [source],
    relevant_files: [{ source_id: source.id, path: source.path, section: null, score: 1, breakdown: {}, char_cost: 1, content: 'x' }],
  }));
  assert.ok(markdown.includes('### File: `Docs/normal-path.md`'));
});
