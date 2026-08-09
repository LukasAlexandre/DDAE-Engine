import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTemplate } from '../src/utils/text.js';

test('renderTemplate substitutes an operational placeholder with its value', () => {
  const output = renderTemplate('Projeto: {{PROJECT_NAME}}', { PROJECT_NAME: 'meu-projeto' });
  assert.equal(output, 'Projeto: meu-projeto');
});

test('renderTemplate leaves a placeholder untouched when its key is absent from data', () => {
  const output = renderTemplate('Token: {{NEXT_BLOCK}}', { PROJECT_NAME: 'meu-projeto' });
  assert.equal(output, 'Token: {{NEXT_BLOCK}}');
});

test('renderTemplate preserves an escaped placeholder as a literal token, even though its key is present in data', () => {
  const output = renderTemplate('Token: \\{{PROJECT_NAME}}', { PROJECT_NAME: 'meu-projeto' });
  assert.equal(output, 'Token: {{PROJECT_NAME}}');
});

test('renderTemplate resolves the operational and the escaped form of the same key independently in the same document', () => {
  const template = '> Projeto: {{PROJECT_NAME}}\n\n| `\\{{PROJECT_NAME}}` | description |';
  const output = renderTemplate(template, { PROJECT_NAME: 'meu-projeto' });
  assert.equal(output, '> Projeto: meu-projeto\n\n| `{{PROJECT_NAME}}` | description |');
});

test('renderTemplate renders a double-escaped placeholder as the visible escape syntax itself', () => {
  const output = renderTemplate('ex.: `\\\\{{PROJECT_NAME}}`', { PROJECT_NAME: 'meu-projeto' });
  assert.equal(output, 'ex.: `\\{{PROJECT_NAME}}`');
});

test('renderTemplate is a pure function: identical input always yields identical output (no hidden randomness/timestamps)', () => {
  const template = '{{PROJECT_NAME}} / {{CURRENT_DATE}} / \\{{PROJECT_NAME}}';
  const data = { PROJECT_NAME: 'meu-projeto', CURRENT_DATE: '2026-01-01' };
  const first = renderTemplate(template, data);
  const second = renderTemplate(template, data);
  assert.equal(first, second);
});

test('renderTemplate leaves an unrelated backslash (not immediately adjacent to a placeholder) untouched', () => {
  const output = renderTemplate('C:\\Users\\Name {{PROJECT_NAME}}', { PROJECT_NAME: 'x' });
  assert.equal(output, 'C:\\Users\\Name x');
});

test('renderTemplate handles several escaped and operational placeholders independently in one pass', () => {
  const template = '{{SESSION_NUMBER}} / \\{{SESSION_NUMBER}} / {{PROJECT_NAME}} / \\{{PROJECT_NAME}}';
  const output = renderTemplate(template, { SESSION_NUMBER: '01', PROJECT_NAME: 'x' });
  assert.equal(output, '01 / {{SESSION_NUMBER}} / x / {{PROJECT_NAME}}');
});
