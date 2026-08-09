// Relevance Engine v1 — lexical, heuristic, deterministic, offline.
//
// Answers "which evidence matters for this goal?", never "which evidence is
// true?" (that is the Authority Model's question — src/context/authority.js)
// and never "how to build manifest.json?" (that is the future Compiler's
// question). This module never reads the filesystem, never touches Git,
// never calls an LLM, and never scores anything by `authority_class` — a
// Source's authority and its relevance to the current goal are independent
// axes, by design (legacy/sessions/session_12_context_compiler_foundation/
// plano_bloco_12.md, Bloco 05).

// Field weights: how much a goal term matching a given field of a candidate
// contributes to its score. Each goal term counts at most once per field —
// repeating a word fifty times in `content` never multiplies the score
// (matching is done against the *set* of terms present in the field, not
// against raw occurrence count).
export const FIELD_WEIGHTS = Object.freeze({
  filename: 5,
  path: 4,
  section: 3,
  content: 2,
});

// Signal weights: explicit, caller-supplied boolean facts about a candidate
// (never inferred from `source.kind` — a `bug` Source isn't automatically
// `bug_reference: true`; only the caller, who knows what's formally relevant
// to the current goal, decides that).
export const SIGNAL_WEIGHTS = Object.freeze({
  current_session: 4,
  decision_reference: 5,
  bug_reference: 4,
  git_changed: 1,
});

const SIGNAL_KEYS = Object.freeze(Object.keys(SIGNAL_WEIGHTS));

export const BUDGET_PROFILES = Object.freeze({
  minimal: 20000,
  standard: 60000,
  deep: 120000,
});

const DEFAULT_BUDGET_PROFILE = 'standard';

const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;
const CAMEL_CASE_BOUNDARY = /([a-z0-9])([A-Z])/g;
const PATH_BOUNDARY_CHARS = /[_\-/\\.:]/g;
const NON_WORD_CHARS = /[^\p{L}\p{N}\s]/gu;
const WHITESPACE_RUN = /\s+/g;

/**
 * Deterministic, language-neutral lexical tokenization shared by goal
 * normalization and field matching. No translation, no stemming, no
 * synonyms, no dictionary — purely mechanical: strip diacritics, split
 * camelCase, treat common path/identifier separators as boundaries,
 * lowercase, strip remaining punctuation, collapse whitespace, dedupe
 * preserving first-seen order.
 */
function tokenize(input) {
  if (typeof input !== 'string' || input.length === 0) {
    return [];
  }
  let text = input.normalize('NFD').replace(DIACRITICS_PATTERN, '');
  text = text.replace(CAMEL_CASE_BOUNDARY, '$1 $2');
  text = text.replace(PATH_BOUNDARY_CHARS, ' ');
  text = text.toLowerCase();
  text = text.replace(NON_WORD_CHARS, ' ');
  text = text.replace(WHITESPACE_RUN, ' ').trim();
  if (text === '') {
    return [];
  }
  const seen = new Set();
  const tokens = [];
  for (const token of text.split(' ')) {
    if (token && !seen.has(token)) {
      seen.add(token);
      tokens.push(token);
    }
  }
  return tokens;
}

/**
 * Normalizes a free-text `goal` into a stable, deterministic set of lexical
 * terms. A goal is mandatory input for relevance — there is no meaningful
 * "relevance" without an explicit objective to be relevant *to*.
 */
export function normalizeGoal(goal) {
  if (typeof goal !== 'string' || goal.trim() === '') {
    throw new Error('normalizeGoal requires a non-empty goal string');
  }
  const terms = tokenize(goal);
  if (terms.length === 0) {
    throw new Error('normalizeGoal: goal produced no usable terms after normalization');
  }
  return Object.freeze({
    text: goal,
    normalized: terms.join(' '),
    terms: Object.freeze(terms),
  });
}

function resolveNormalizedGoal(goal) {
  if (typeof goal === 'string') {
    return normalizeGoal(goal);
  }
  if (goal && Array.isArray(goal.terms) && typeof goal.normalized === 'string') {
    return goal;
  }
  throw new Error('relevance: goal must be a non-empty string or the object returned by normalizeGoal()');
}

function assertValidCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('relevance: candidate must be an object');
  }
  if (!candidate.source || typeof candidate.source !== 'object' || typeof candidate.source.id !== 'string') {
    throw new Error('relevance: candidate.source must be a Source produced by createSource()');
  }
  if (candidate.content !== undefined && typeof candidate.content !== 'string') {
    throw new Error('relevance: candidate.content must be a string when provided');
  }
}

/**
 * Signals are explicit booleans supplied by the caller — never inferred from
 * `source.kind` or from content. Unknown keys are ignored (forward
 * compatible); known keys must be boolean when present.
 */
function normalizeSignals(signals) {
  const input = signals ?? {};
  const result = {};
  for (const key of SIGNAL_KEYS) {
    const value = input[key];
    if (value !== undefined && typeof value !== 'boolean') {
      throw new Error(`relevance: signals.${key} must be boolean when provided`);
    }
    result[key] = value === true;
  }
  return Object.freeze(result);
}

function splitPath(path) {
  if (!path) {
    return { filename: '', rest: '' };
  }
  const normalized = path.split('\\').join('/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) {
    return { filename: normalized, rest: '' };
  }
  return { filename: normalized.slice(lastSlash + 1), rest: normalized.slice(0, lastSlash) };
}

function matchedTerms(goalTerms, fieldText) {
  const fieldTerms = new Set(tokenize(fieldText ?? ''));
  return goalTerms.filter((term) => fieldTerms.has(term));
}

/**
 * Scores one RelevanceCandidate (`{ source, content?, signals? }`) against a
 * goal, returning `{ score, breakdown }` where `breakdown` is an auditable
 * explanation — the matched terms per field and the active signals — from
 * which `score` can be independently recomputed. Pure: never reads
 * `source.path` from disk, only ever uses `candidate.content` as given.
 */
export function scoreRelevanceCandidate(candidate, goal) {
  assertValidCandidate(candidate);
  const normalizedGoal = resolveNormalizedGoal(goal);
  const signals = normalizeSignals(candidate.signals);
  const content = candidate.content ?? '';

  const { filename, rest } = splitPath(candidate.source.path);
  const filenameTerms = matchedTerms(normalizedGoal.terms, filename);
  const pathTerms = matchedTerms(normalizedGoal.terms, rest);
  const sectionTerms = matchedTerms(normalizedGoal.terms, candidate.source.section ?? '');
  const contentTerms = matchedTerms(normalizedGoal.terms, content);

  const score = (
    filenameTerms.length * FIELD_WEIGHTS.filename
    + pathTerms.length * FIELD_WEIGHTS.path
    + sectionTerms.length * FIELD_WEIGHTS.section
    + contentTerms.length * FIELD_WEIGHTS.content
    + (signals.current_session ? SIGNAL_WEIGHTS.current_session : 0)
    + (signals.decision_reference ? SIGNAL_WEIGHTS.decision_reference : 0)
    + (signals.bug_reference ? SIGNAL_WEIGHTS.bug_reference : 0)
    + (signals.git_changed ? SIGNAL_WEIGHTS.git_changed : 0)
  );

  return Object.freeze({
    score,
    breakdown: Object.freeze({
      filename_terms: Object.freeze(filenameTerms),
      path_terms: Object.freeze(pathTerms),
      section_terms: Object.freeze(sectionTerms),
      content_terms: Object.freeze(contentTerms),
      current_session: signals.current_session,
      decision_reference: signals.decision_reference,
      bug_reference: signals.bug_reference,
      git_changed: signals.git_changed,
    }),
  });
}

function charCost(content) {
  if (!content) {
    return 0;
  }
  return content.replace(/\r\n/g, '\n').length;
}

/**
 * Ranks RelevanceCandidates against a goal and selects as many as fit inside
 * a character budget, in deterministic order (score DESC, path ASC, source
 * id ASC as a final tie-break for full ordering). Never truncates a
 * candidate's content — a Source/section is an atomic unit in v1; a
 * candidate that alone exceeds the remaining budget is skipped
 * (`reason: 'budget_exceeded'`) and evaluation continues with the next
 * (smaller) candidate, so the budget still gets filled where possible.
 */
export function rankRelevantSources(candidates, options = {}) {
  if (!Array.isArray(candidates)) {
    throw new Error('rankRelevantSources requires an array of candidates');
  }

  const normalizedGoal = resolveNormalizedGoal(options.goal);
  const profile = options.budget ?? DEFAULT_BUDGET_PROFILE;
  if (!Object.prototype.hasOwnProperty.call(BUDGET_PROFILES, profile)) {
    throw new Error(`rankRelevantSources: invalid budget profile "${profile}". Expected one of: ${Object.keys(BUDGET_PROFILES).join(', ')}`);
  }
  const maxChars = BUDGET_PROFILES[profile];

  const scored = candidates.map((candidate) => {
    assertValidCandidate(candidate);
    const { score, breakdown } = scoreRelevanceCandidate(candidate, normalizedGoal);
    return Object.freeze({
      source: candidate.source,
      path: candidate.source.path ?? '',
      score,
      breakdown,
      char_cost: charCost(candidate.content),
    });
  });

  const ranked = Object.freeze([...scored].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.path !== b.path) {
      return a.path < b.path ? -1 : 1;
    }
    if (a.source.id !== b.source.id) {
      return a.source.id < b.source.id ? -1 : 1;
    }
    return 0;
  }));

  let usedChars = 0;
  const selected = [];
  const skipped = [];
  for (const entry of ranked) {
    if (usedChars + entry.char_cost <= maxChars) {
      usedChars += entry.char_cost;
      selected.push(entry);
    } else {
      skipped.push(Object.freeze({ ...entry, reason: 'budget_exceeded' }));
    }
  }

  return Object.freeze({
    goal: normalizedGoal,
    budget: Object.freeze({
      profile,
      max_chars: maxChars,
      used_chars: usedChars,
      remaining_chars: maxChars - usedChars,
    }),
    ranked,
    selected: Object.freeze(selected),
    skipped: Object.freeze(skipped),
  });
}
