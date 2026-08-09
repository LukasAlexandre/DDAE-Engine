import path from 'node:path';

/**
 * Converts arbitrary user input into a lowercase snake_case slug:
 * strips accents, replaces anything that isn't [a-z0-9] with underscores,
 * and collapses/trims repeated underscores.
 */
export function slugify(input) {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Replaces {{KEY}} placeholders in a template string with values from `data`.
 * A leading backslash escapes a placeholder so it survives rendering as a
 * literal token (e.g. `\{{PROJECT_NAME}}` renders as `{{PROJECT_NAME}}`) —
 * used by templates that need to document a placeholder rather than have it
 * interpolated.
 */
export function renderTemplate(content, data) {
  return content.replace(/\\?{{\s*([A-Z_]+)\s*}}/g, (match, key) => {
    if (match.startsWith('\\')) {
      return match.slice(1);
    }
    return key in data ? String(data[key]) : match;
  });
}

/**
 * Derives {{PROJECT_NAME}} from the target directory name. `dir` is always
 * an absolute, resolved path by the time commands receive it (see cli.js).
 */
export function projectNameOf(dir) {
  return path.basename(dir);
}

/** Returns {{CURRENT_DATE}} as an ISO calendar date (YYYY-MM-DD). */
export function currentDate() {
  return new Date().toISOString().slice(0, 10);
}
