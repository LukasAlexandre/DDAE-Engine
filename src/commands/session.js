import path from 'node:path';
import { nextSessionNumber, scaffoldSession, sessionFolderName, listSessionModules } from '../utils/session.js';
import { slugify, pad2, projectNameOf, currentDate } from '../utils/text.js';

export async function sessionCreateCommand({ name, dir, force }) {
  if (!name) {
    throw new Error('session create requires a name, e.g. ddae-engine session create "dashboard admin"');
  }

  const sessionsDir = path.join(dir, 'Docs', '05_sessions');
  const number = pad2(nextSessionNumber(sessionsDir));
  const slug = slugify(name);
  const folderName = sessionFolderName(number, slug);
  const sessionDir = path.join(sessionsDir, folderName);

  const created = [];
  const skipped = [];
  scaffoldSession(
    sessionDir,
    { number, title: name, slug, projectName: projectNameOf(dir), currentDate: currentDate() },
    { force, created, skipped },
  );

  if (created.length === 0) {
    console.log(`Session already exists: Docs/05_sessions/${folderName} (use --force to overwrite)`);
    return;
  }

  console.log(`Created session: Docs/05_sessions/${folderName}`);
  console.log(`  Modules created: ${listSessionModules().length}`);
  console.log(`  Files created: ${created.length}${skipped.length > 0 ? ` (${skipped.length} skipped)` : ''}`);
}
