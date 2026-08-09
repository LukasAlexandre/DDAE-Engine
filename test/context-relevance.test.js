import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSource } from '../src/context/authority.js';
import {
  BUDGET_PROFILES,
  FIELD_WEIGHTS,
  SIGNAL_WEIGHTS,
  normalizeGoal,
  scoreRelevanceCandidate,
  rankRelevantSources,
} from '../src/context/relevance.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RELEVANCE_FILE = path.join(__dirname, '..', 'src', 'context', 'relevance.js');

// Strips `//` line comments so structural checks below assert against actual
// code, not prose that legitimately explains what the module deliberately
// does NOT do (e.g. "never calls an LLM" would otherwise false-positive a
// naive "must not mention LLM" check).
function stripLineComments(source) {
  return source
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

function candidateFor({ path: srcPath, section = null, content = '', signals, identity }) {
  const source = createSource({
    kind: 'documentation',
    domain: 'history',
    path: srcPath,
    section,
    identity: srcPath ? undefined : identity,
    content,
  });
  return { source, content, signals };
}

// --- Etapas 1-6: goal normalization -----------------------------------------

test('1. goal is mandatory for normalizeGoal', () => {
  assert.throws(() => normalizeGoal(undefined), /non-empty goal string/);
  assert.throws(() => normalizeGoal(null), /non-empty goal string/);
  assert.throws(() => normalizeGoal(42), /non-empty goal string/);
});

test('2. whitespace-only goal is rejected', () => {
  assert.throws(() => normalizeGoal('   '), /non-empty goal string/);
  assert.throws(() => normalizeGoal(''), /non-empty goal string/);
});

test('3. goal normalization is deterministic', () => {
  const a = normalizeGoal('Implementar auditoria de usuarios');
  const b = normalizeGoal('Implementar auditoria de usuarios');
  assert.deepEqual(a, b);
});

test('4. diacritics are normalized away', () => {
  const withDiacritics = normalizeGoal('auditoria');
  const accented = normalizeGoal('audítoria');
  assert.deepEqual(withDiacritics.terms, accented.terms);
});

test('5. camelCase and path separators are treated as term boundaries', () => {
  const goal = normalizeGoal('auditService/Backend_Audit.module.ts');
  assert.ok(goal.terms.includes('audit'));
  assert.ok(goal.terms.includes('service'));
  assert.ok(goal.terms.includes('backend'));
  assert.ok(goal.terms.includes('module'));
  assert.ok(goal.terms.includes('ts'));
});

test('6. duplicate terms are deduplicated preserving first-seen order', () => {
  const goal = normalizeGoal('audit audit users audit');
  assert.deepEqual(goal.terms, ['audit', 'users']);
});

test('goal never magically translates or infers unrelated terms', () => {
  const goal = normalizeGoal('Auditoria de Usuarios');
  assert.ok(!goal.terms.includes('audit'));
  assert.ok(!goal.terms.includes('user'));
});

// --- Etapas 7-13: candidate scoring -----------------------------------------

test('7. filename match contributes FIELD_WEIGHTS.filename per unique term', () => {
  const candidate = candidateFor({ path: 'Backend/core/audit_service.js' });
  const { score, breakdown } = scoreRelevanceCandidate(candidate, 'audit service');
  assert.equal(breakdown.filename_terms.length, 2);
  assert.equal(breakdown.path_terms.length, 0);
  assert.equal(score, 2 * FIELD_WEIGHTS.filename);
});

test('8. path match contributes FIELD_WEIGHTS.path per unique term', () => {
  const candidate = candidateFor({ path: 'Backend/Audit/service.js' });
  const { score, breakdown } = scoreRelevanceCandidate(candidate, 'audit');
  assert.equal(breakdown.path_terms.length, 1);
  assert.equal(breakdown.filename_terms.length, 0);
  assert.equal(score, FIELD_WEIGHTS.path);
});

test('9. section match contributes FIELD_WEIGHTS.section per unique term', () => {
  const candidate = candidateFor({ path: 'Docs/x.md', section: 'Auditoria de acesso' });
  const { score, breakdown } = scoreRelevanceCandidate(candidate, 'auditoria');
  assert.equal(breakdown.section_terms.length, 1);
  assert.equal(score, FIELD_WEIGHTS.section);
});

test('10. content match contributes FIELD_WEIGHTS.content per unique term', () => {
  const candidate = candidateFor({ path: 'Docs/x.md', content: 'this document covers an audit' });
  const { score, breakdown } = scoreRelevanceCandidate(candidate, 'audit');
  assert.equal(breakdown.content_terms.length, 1);
  assert.equal(score, FIELD_WEIGHTS.content);
});

test('11. repeated content terms never multiply the score', () => {
  const candidate = candidateFor({ path: 'Docs/x.md', content: 'audit audit audit audit audit' });
  const { score, breakdown } = scoreRelevanceCandidate(candidate, 'audit');
  assert.equal(breakdown.content_terms.length, 1);
  assert.equal(score, FIELD_WEIGHTS.content);
});

test('filename and path matches on distinct segments both count', () => {
  const candidate = candidateFor({ path: 'Backend/Audit/audit_service.js' });
  const { breakdown } = scoreRelevanceCandidate(candidate, 'audit');
  assert.equal(breakdown.filename_terms.length, 1);
  assert.equal(breakdown.path_terms.length, 1);
});

// --- Etapas 12, 24-25: signals -----------------------------------------

test('12. current_session signal contributes SIGNAL_WEIGHTS.current_session', () => {
  const withSignal = candidateFor({ path: 'Docs/a.md', signals: { current_session: true } });
  const withoutSignal = candidateFor({ path: 'Docs/b.md', signals: { current_session: false } });
  const a = scoreRelevanceCandidate(withSignal, 'irrelevant');
  const b = scoreRelevanceCandidate(withoutSignal, 'irrelevant');
  assert.equal(a.score - b.score, SIGNAL_WEIGHTS.current_session);
});

test('13. decision_reference signal contributes SIGNAL_WEIGHTS.decision_reference', () => {
  const candidate = candidateFor({ path: 'Docs/a.md', signals: { decision_reference: true } });
  const { score } = scoreRelevanceCandidate(candidate, 'irrelevant');
  assert.equal(score, SIGNAL_WEIGHTS.decision_reference);
});

test('14. bug_reference signal contributes SIGNAL_WEIGHTS.bug_reference', () => {
  const candidate = candidateFor({ path: 'Docs/a.md', signals: { bug_reference: true } });
  const { score } = scoreRelevanceCandidate(candidate, 'irrelevant');
  assert.equal(score, SIGNAL_WEIGHTS.bug_reference);
});

test('15. git_changed signal contributes SIGNAL_WEIGHTS.git_changed', () => {
  const candidate = candidateFor({ path: 'Docs/a.md', signals: { git_changed: true } });
  const { score } = scoreRelevanceCandidate(candidate, 'irrelevant');
  assert.equal(score, SIGNAL_WEIGHTS.git_changed);
});

test('16. combined signals sum their individual weights', () => {
  const candidate = candidateFor({
    path: 'Docs/a.md',
    signals: { current_session: true, decision_reference: true, bug_reference: true, git_changed: true },
  });
  const { score } = scoreRelevanceCandidate(candidate, 'irrelevant');
  assert.equal(
    score,
    SIGNAL_WEIGHTS.current_session + SIGNAL_WEIGHTS.decision_reference + SIGNAL_WEIGHTS.bug_reference + SIGNAL_WEIGHTS.git_changed,
  );
});

test('signals are never inferred from source.kind', () => {
  const bugSource = createSource({ kind: 'bug', domain: 'active_bug_state', path: 'Docs/bugs.md', section: 'BUG-01' });
  const { score, breakdown } = scoreRelevanceCandidate({ source: bugSource, content: '' }, 'irrelevant');
  assert.equal(score, 0);
  assert.equal(breakdown.bug_reference, false);
});

// --- Etapa 17: score breakdown sums exactly to total -----------------------

test('17. score breakdown sums exactly to the total score', () => {
  const candidate = candidateFor({
    path: 'Backend/Audit/audit_service.js',
    section: 'Audit rules',
    content: 'the audit service enforces rules',
    signals: { current_session: true, git_changed: true },
  });
  const { score, breakdown } = scoreRelevanceCandidate(candidate, 'audit service rules');
  const recomputed = (
    breakdown.filename_terms.length * FIELD_WEIGHTS.filename
    + breakdown.path_terms.length * FIELD_WEIGHTS.path
    + breakdown.section_terms.length * FIELD_WEIGHTS.section
    + breakdown.content_terms.length * FIELD_WEIGHTS.content
    + (breakdown.current_session ? SIGNAL_WEIGHTS.current_session : 0)
    + (breakdown.decision_reference ? SIGNAL_WEIGHTS.decision_reference : 0)
    + (breakdown.bug_reference ? SIGNAL_WEIGHTS.bug_reference : 0)
    + (breakdown.git_changed ? SIGNAL_WEIGHTS.git_changed : 0)
  );
  assert.equal(recomputed, score);
});

// --- Etapa 18: zero-score is valid ------------------------------------------

test('18. a candidate with zero matches is scored zero, not discarded', () => {
  const candidate = candidateFor({ path: 'Docs/unrelated.md', content: 'nothing relevant here' });
  const { score } = scoreRelevanceCandidate(candidate, 'audit');
  assert.equal(score, 0);

  const result = rankRelevantSources([candidate], { goal: 'audit' });
  assert.equal(result.ranked.length, 1);
  assert.equal(result.ranked[0].score, 0);
});

// --- Etapas 19-21: sort order ------------------------------------------

test('19. ranking sorts by score DESC', () => {
  const high = candidateFor({ path: 'Backend/Audit/audit.js' });
  const low = candidateFor({ path: 'Docs/unrelated.md' });
  const result = rankRelevantSources([low, high], { goal: 'audit' });
  assert.ok(result.ranked[0].score >= result.ranked[1].score);
  assert.equal(result.ranked[0].source.id, high.source.id);
});

test('20. tie in score breaks by path ASC', () => {
  const b = candidateFor({ path: 'b_audit.js' });
  const a = candidateFor({ path: 'a_audit.js' });
  const result = rankRelevantSources([b, a], { goal: 'audit' });
  assert.equal(result.ranked[0].score, result.ranked[1].score);
  assert.equal(result.ranked[0].path, 'a_audit.js');
  assert.equal(result.ranked[1].path, 'b_audit.js');
});

test('21. tertiary tie-break is source id ASC when score and path are equal', () => {
  const a = candidateFor({ path: 'same.md', identity: 'a' });
  const b = candidateFor({ path: 'same.md', identity: 'b' });
  const [first, second] = [a, b].sort((x, y) => (x.source.id < y.source.id ? -1 : 1));
  const result = rankRelevantSources([a, b], { goal: 'irrelevant' });
  assert.equal(result.ranked[0].source.id, first.source.id);
  assert.equal(result.ranked[1].source.id, second.source.id);
});

// --- Etapas 22-23: determinism and immutability -----------------------------

test('22. ranking is independent of input order', () => {
  const candidates = [
    candidateFor({ path: 'Backend/Audit/audit_service.js' }),
    candidateFor({ path: 'Backend/Users/user_service.js' }),
    candidateFor({ path: 'README.md', content: 'general project overview' }),
  ];
  const forward = rankRelevantSources(candidates, { goal: 'audit users' });
  const reversed = rankRelevantSources([...candidates].reverse(), { goal: 'audit users' });
  assert.deepEqual(forward, reversed);
});

test('23. repeated calls with the same input are deepEqual', () => {
  const candidates = [candidateFor({ path: 'Backend/Audit/audit.js' })];
  const first = rankRelevantSources(candidates, { goal: 'audit' });
  const second = rankRelevantSources(candidates, { goal: 'audit' });
  assert.deepEqual(first, second);
});

test('input candidates array and its objects are never mutated', () => {
  const candidates = [candidateFor({ path: 'Backend/Audit/audit.js', signals: { git_changed: true } })];
  const before = JSON.stringify(candidates);
  rankRelevantSources(candidates, { goal: 'audit' });
  assert.equal(JSON.stringify(candidates), before);
  assert.ok(Object.isFrozen(candidates[0].source));
});

test('a Source passed into a candidate is never mutated by scoring', () => {
  const source = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/x.md', content: 'audit' });
  const before = JSON.stringify(source);
  scoreRelevanceCandidate({ source, content: 'audit content' }, 'audit');
  assert.equal(JSON.stringify(source), before);
});

// --- Etapa 24: authority independence ---------------------------------------

test('24. identical lexical relevance across different authority_class never changes score', () => {
  const historySource = createSource({ kind: 'documentation', domain: 'history', path: 'Docs/audit_notes.md', content: 'audit content' });
  const decisionSource = createSource({ kind: 'decision', domain: 'architecture_intent', path: 'Docs/audit_notes.md', content: 'audit content' });
  const a = scoreRelevanceCandidate({ source: historySource, content: 'audit content' }, 'audit');
  const b = scoreRelevanceCandidate({ source: decisionSource, content: 'audit content' }, 'audit');
  assert.equal(a.score, FIELD_WEIGHTS.filename + FIELD_WEIGHTS.content);
  assert.equal(a.score, b.score);
});

// --- Etapa 23 (fixture): main scenario --------------------------------------

test('25. fixture: lexical matches outrank a generic README, which outranks an unrelated source', () => {
  const auditService = candidateFor({ path: 'Backend/Audit/audit_service.js', content: 'implements audit rules for the service' });
  const userService = candidateFor({ path: 'Backend/Users/user_service.js', content: 'manages user accounts' });
  const auditPage = candidateFor({ path: 'Frontend/Admin/AuditPage.tsx', content: 'renders the audit dashboard' });
  const auditTest = candidateFor({ path: 'Tests/test_audit.js', content: 'tests for the audit service' });
  const readme = candidateFor({ path: 'README.md', content: 'general project overview covering user accounts and audit basics' });
  const unrelated = candidateFor({ path: 'Docs/unrelated_topic.md', content: 'a completely unrelated topic' });

  const result = rankRelevantSources(
    [userService, readme, auditPage, unrelated, auditTest, auditService],
    { goal: 'Implementar auditoria de usuarios' },
  );

  // The goal is in Portuguese ("auditoria de usuarios") and must not
  // magically match English "audit"/"user" fixture content — confirms no
  // hidden translation happened.
  assert.equal(result.ranked.find((r) => r.source.id === auditService.source.id).score, 0);

  const goalMatchingResult = rankRelevantSources(
    [userService, readme, auditPage, unrelated, auditTest, auditService],
    { goal: 'audit user service' },
  );
  const scoreOf = (candidate) => goalMatchingResult.ranked.find((r) => r.source.id === candidate.source.id).score;

  assert.ok(scoreOf(auditService) > scoreOf(readme));
  assert.ok(scoreOf(readme) > scoreOf(unrelated));
  assert.equal(scoreOf(unrelated), 0);
});

// --- Etapa 26: source model compatibility -----------------------------------

test('26. accepts real Sources produced by createSource() without modifying authority.js', () => {
  const source = createSource({ kind: 'source_code', domain: 'runtime_metadata', path: 'src/context/relevance.js', content: 'relevance engine' });
  const candidate = { source, content: 'relevance engine implementation' };
  const { score } = scoreRelevanceCandidate(candidate, 'relevance engine');
  assert.ok(score > 0);
});

// --- Etapas 27-30: budget profiles ------------------------------------------

test('27. minimal budget profile is 20000 characters', () => {
  assert.equal(BUDGET_PROFILES.minimal, 20000);
});

test('28. standard budget profile is 60000 characters', () => {
  assert.equal(BUDGET_PROFILES.standard, 60000);
});

test('29. deep budget profile is 120000 characters', () => {
  assert.equal(BUDGET_PROFILES.deep, 120000);
});

test('30. standard is the default budget profile', () => {
  const candidate = candidateFor({ path: 'Docs/x.md', content: 'audit' });
  const result = rankRelevantSources([candidate], { goal: 'audit' });
  assert.equal(result.budget.profile, 'standard');
  assert.equal(result.budget.max_chars, BUDGET_PROFILES.standard);
});

test('31. an invalid budget profile is rejected', () => {
  const candidate = candidateFor({ path: 'Docs/x.md', content: 'audit' });
  assert.throws(
    () => rankRelevantSources([candidate], { goal: 'audit', budget: 'extreme' }),
    /invalid budget profile/,
  );
});

// --- Etapas 32-36: char cost and selection ----------------------------------

test('32. char cost normalizes CRLF to LF before counting', () => {
  const lf = candidateFor({ path: 'Docs/a.md', content: 'line one\nline two\n' });
  const crlf = candidateFor({ path: 'Docs/b.md', content: 'line one\r\nline two\r\n' });
  const result = rankRelevantSources([lf, crlf], { goal: 'irrelevant', budget: 'minimal' });
  const lfEntry = result.ranked.find((r) => r.source.id === lf.source.id);
  const crlfEntry = result.ranked.find((r) => r.source.id === crlf.source.id);
  assert.equal(lfEntry.char_cost, crlfEntry.char_cost);
});

test('33. selection never exceeds max_chars for the active budget', () => {
  const candidates = Array.from({ length: 10 }, (_, i) => candidateFor({
    path: `Docs/doc_${i}.md`,
    content: 'audit '.repeat(1000),
  }));
  const result = rankRelevantSources(candidates, { goal: 'audit', budget: 'minimal' });
  assert.ok(result.budget.used_chars <= result.budget.max_chars);
  const totalSelectedChars = result.selected.reduce((sum, entry) => sum + entry.char_cost, 0);
  assert.equal(totalSelectedChars, result.budget.used_chars);
});

test('34. an oversized single candidate is skipped without truncation', () => {
  const oversized = candidateFor({ path: 'Docs/huge.md', content: 'x'.repeat(BUDGET_PROFILES.minimal + 1) });
  const result = rankRelevantSources([oversized], { goal: 'irrelevant', budget: 'minimal' });
  assert.equal(result.selected.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, 'budget_exceeded');
});

test('35. after skipping an oversized candidate, ranking still fills the budget with smaller ones', () => {
  const oversized = candidateFor({ path: 'Docs/a_huge.md', content: 'audit '.repeat(5000) });
  const small = candidateFor({ path: 'Docs/b_small.md', content: 'audit content' });
  const result = rankRelevantSources([oversized, small], { goal: 'audit', budget: 'minimal' });
  assert.equal(result.skipped.some((s) => s.source.id === oversized.source.id), true);
  assert.equal(result.selected.some((s) => s.source.id === small.source.id), true);
});

test('36. selected + skipped together preserve every candidate', () => {
  const candidates = [
    candidateFor({ path: 'Docs/a.md', content: 'x'.repeat(BUDGET_PROFILES.minimal + 1) }),
    candidateFor({ path: 'Docs/b.md', content: 'small content' }),
    candidateFor({ path: 'Docs/c.md', content: '' }),
  ];
  const result = rankRelevantSources(candidates, { goal: 'irrelevant', budget: 'minimal' });
  assert.equal(result.selected.length + result.skipped.length, candidates.length);
});

// --- Etapas 37-41: purity ---------------------------------------------------

test('37-41. relevance.js performs no filesystem, network, or LLM access, and uses no embeddings or external dependencies', () => {
  const source = fs.readFileSync(RELEVANCE_FILE, 'utf8');
  const code = stripLineComments(source);
  assert.ok(!/from ['"]node:fs['"]/.test(code), 'must not import node:fs');
  assert.ok(!/readFileSync|writeFileSync|readdirSync/.test(code), 'must not touch the filesystem');
  assert.ok(!/node:https?|node:net|node:dgram|\bfetch\(/.test(code), 'must not perform network access');
  assert.ok(!/embedding|vector|cosine|\bllm\b|openai|anthropic/i.test(code), 'must not implement embeddings or call an LLM');

  const imports = [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(imports.length === 0, `relevance.js must have zero imports (found: ${imports.join(', ')})`);
});

test('42. relevance.js never writes to .ddae', () => {
  const source = fs.readFileSync(RELEVANCE_FILE, 'utf8');
  const code = stripLineComments(source);
  assert.ok(!/\.ddae/.test(code), 'must never reference .ddae output');
});

test('43. relevance.js implements no Compiler, Manifest, or CLI logic', () => {
  const source = fs.readFileSync(RELEVANCE_FILE, 'utf8');
  const code = stripLineComments(source);
  assert.ok(!/manifest\.json|CONTEXT\.md|commander|process\.argv/i.test(code), 'must not implement Compiler/Manifest/CLI concerns');
});

// --- extra: candidate validation --------------------------------------------

test('rankRelevantSources requires an array', () => {
  assert.throws(() => rankRelevantSources('not-an-array', { goal: 'x' }), /requires an array/);
});

test('a candidate without a valid Source is rejected', () => {
  assert.throws(
    () => scoreRelevanceCandidate({ source: { not: 'a source' } }, 'audit'),
    /must be a Source produced by createSource/,
  );
});

test('signals with a non-boolean value are rejected', () => {
  const candidate = candidateFor({ path: 'Docs/a.md', signals: { current_session: 'yes' } });
  assert.throws(() => scoreRelevanceCandidate(candidate, 'audit'), /must be boolean/);
});
