import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextSequence, writeText } from '../utils/fs-helpers.js';
import { parseSessionFolderName } from '../utils/session.js';
import { slugify, pad2, renderTemplate, projectNameOf, currentDate } from '../utils/text.js';

export { parseSessionFolderName };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOCK_TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'block', 'bloco_template.md');

export function sessionDirOf(dir, session) {
  return path.join(dir, 'Docs', '05_sessions', session);
}

export function blockFilePath(dir, session, block) {
  const filename = block.endsWith('.md') ? block : `${block}.md`;
  return path.join(sessionDirOf(dir, session), '05_blocks', filename);
}

/**
 * Reads an existing block file and extracts its number/title from the
 * `# Bloco NN — Title` heading written by the block template.
 */
export function parseBlockFile(blockPath) {
  const content = fs.readFileSync(blockPath, 'utf8');
  const match = content.match(/^#\s*Bloco\s+(\d+)\s*[—–-]\s*(.+?)\s*$/m);
  if (!match) {
    throw new Error(`Could not parse block title from ${blockPath}`);
  }
  return { number: match[1], title: match[2] };
}

export async function blockCreateCommand({ name, session, dir, force }) {
  if (!session) {
    throw new Error('block create requires --session <session_folder_name>');
  }
  if (!name) {
    throw new Error('block create requires a name, e.g. ddae-engine block create "login administrativo" --session <sessao>');
  }

  const sessionDir = sessionDirOf(dir, session);
  if (!fs.existsSync(sessionDir)) {
    throw new Error(`Session not found: Docs/05_sessions/${session}`);
  }

  const blocksDir = path.join(sessionDir, '05_blocks');
  const number = pad2(nextSequence(blocksDir, 'bloco'));
  const slug = slugify(name);
  const filename = `bloco_${number}_${slug}.md`;
  const destPath = path.join(blocksDir, filename);

  const { number: sessionNumber, slug: sessionSlug } = parseSessionFolderName(session);
  const template = fs.readFileSync(BLOCK_TEMPLATE_PATH, 'utf8');
  const content = renderTemplate(template, {
    BLOCK_NUMBER: number,
    BLOCK_TITLE: name,
    BLOCK_SLUG: slug,
    SESSION_NUMBER: sessionNumber,
    SESSION_SLUG: sessionSlug,
    PROJECT_NAME: projectNameOf(dir),
    CURRENT_DATE: currentDate(),
  });

  const created = [];
  const skipped = [];
  writeText(destPath, content, { force, created, skipped });

  if (created.length === 0) {
    console.log(`Block already exists: Docs/05_sessions/${session}/05_blocks/${filename} (use --force to overwrite)`);
    return;
  }
  console.log(`Created block: Docs/05_sessions/${session}/05_blocks/${filename}`);
}
