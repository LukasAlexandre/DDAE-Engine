import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initCommand } from './commands/init.js';
import { sessionCreateCommand } from './commands/session.js';
import { blockCreateCommand } from './commands/block.js';
import { promptCreateCommand } from './commands/prompt.js';
import { feedbackCreateCommand } from './commands/feedback.js';
import { validateCommand } from './commands/validate.js';
import { auditCommand } from './commands/audit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const HELP = `ddae-engine — Document-Driven AI Engineering Engine

Usage:
  ddae-engine <command> [options]

Commands:
  init                                            Scaffold the official Docs/ structure and AI agent rule files
  session create "<name>"                         Create the next session under Docs/05_sessions/
  block create "<name>" --session <session>       Create the next block inside a session
  prompt create --block <block> --session <s>     Generate a prompt from an existing block
  feedback create --block <block> --session <s>   Generate a feedback doc from an existing block
  validate                                        Check the Docs/ structure for compliance (exit 0/1)
  audit                                           Report orphaned/incomplete sessions, blocks, prompts, feedbacks

Options:
  -h, --help        Show this help message
  -v, --version     Print the installed ddae-engine version
  --dir <path>      Target directory to operate in (default: current directory)
  --force           Overwrite files that already exist

Examples:
  npx ddae-engine init
  npx ddae-engine session create "dashboard admin"
  npx ddae-engine block create "login administrativo" --session session_01_dashboard_admin
  npx ddae-engine prompt create --block bloco_01_login_administrativo --session session_01_dashboard_admin
  npx ddae-engine feedback create --block bloco_01_login_administrativo --session session_01_dashboard_admin
  npx ddae-engine validate
  npx ddae-engine audit
`;

function parseArgs(args, { withValue = [] } = {}) {
  const result = { positional: [], dir: process.cwd(), force: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--dir') {
      const value = args[i + 1];
      if (!value) {
        throw new Error('--dir requires a path argument');
      }
      result.dir = path.resolve(value);
      i += 1;
    } else if (arg === '--force') {
      result.force = true;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (!withValue.includes(key)) {
        throw new Error(`Unknown option: ${arg}`);
      }
      const value = args[i + 1];
      if (!value) {
        throw new Error(`--${key} requires a value`);
      }
      result[key] = value;
      i += 1;
    } else {
      result.positional.push(arg);
    }
  }
  return result;
}

function requireSubcommand(args, command, allowed) {
  const sub = args[0];
  if (!allowed.includes(sub)) {
    throw new Error(`Usage: ddae-engine ${command} ${allowed.join('|')} ...`);
  }
  return sub;
}

export async function run(argv) {
  const args = argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'init': {
      const opts = parseArgs(args.slice(1));
      await initCommand({ dir: opts.dir, force: opts.force });
      break;
    }
    case 'session': {
      requireSubcommand(args.slice(1), 'session', ['create']);
      const opts = parseArgs(args.slice(2));
      await sessionCreateCommand({ name: opts.positional[0], dir: opts.dir, force: opts.force });
      break;
    }
    case 'block': {
      requireSubcommand(args.slice(1), 'block', ['create']);
      const opts = parseArgs(args.slice(2), { withValue: ['session'] });
      await blockCreateCommand({
        name: opts.positional[0],
        session: opts.session,
        dir: opts.dir,
        force: opts.force,
      });
      break;
    }
    case 'prompt': {
      requireSubcommand(args.slice(1), 'prompt', ['create']);
      const opts = parseArgs(args.slice(2), { withValue: ['session', 'block'] });
      await promptCreateCommand({
        block: opts.block,
        session: opts.session,
        dir: opts.dir,
        force: opts.force,
      });
      break;
    }
    case 'feedback': {
      requireSubcommand(args.slice(1), 'feedback', ['create']);
      const opts = parseArgs(args.slice(2), { withValue: ['session', 'block'] });
      await feedbackCreateCommand({
        block: opts.block,
        session: opts.session,
        dir: opts.dir,
        force: opts.force,
      });
      break;
    }
    case 'validate': {
      const opts = parseArgs(args.slice(1));
      await validateCommand({ dir: opts.dir });
      break;
    }
    case 'audit': {
      const opts = parseArgs(args.slice(1));
      await auditCommand({ dir: opts.dir });
      break;
    }
    case '-v':
    case '--version':
      console.log(pkg.version);
      break;
    case '-h':
    case '--help':
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}
