# DDAE Engine — Document-Driven AI Engineering Engine

> Nota histórica: o projeto nasceu como DDAD, passou por uma etapa intermediária como DDAT e foi consolidado como DDAE Engine — Document-Driven AI Engineering Engine antes da primeira publicação npm.

DDAE Engine is a lightweight methodology and CLI for keeping AI coding agents aligned with a project's intent. Instead of letting an agent infer scope from a prompt and the existing code, DDAE Engine makes **documents the source of truth**: product vision, architecture, contracts, governance, and session-by-session work are written down first, and agents are configured to read and update them as they work.

## Why

AI agents are good at writing code and bad at remembering *why* it was written that way. Without a persistent, structured record of intent, every session re-derives context from scratch — and drifts a little further from the original design each time. DDAE Engine fixes this by giving agents (and humans) a conventional set of documents to read before changing anything, and to update as part of every change.

## Requirements

- Node.js 22 or later (`engines.node` in `package.json`: `>=22`). Node 24 is the recommended baseline; Node 26 (Current) is validated in CI to catch regressions before it becomes LTS. Node 18 and 20 are end-of-life and no longer supported.

## Quick start

After the npm publication is completed, use:

```bash
npx ddae-engine init
```

Until then, run the CLI from a local checkout; see [Local usage](#local-usage-from-a-checkout).

This scaffolds the official DDAE Engine structure into your current project:

```
your-project/
├── Docs/
│   ├── 00_ddae_engine/                # methodology, rules, folder schema, glossary
│   ├── 01_product/             # vision, solution, audience, requirements
│   ├── 02_architecture/        # base architecture, stack, decisions, risks
│   ├── 03_contracts/           # frontend/backend, database, auth, env, deploy contracts
│   ├── 04_governance/          # code/commit/branch conventions, risk matrix, decisions log
│   ├── 05_sessions/            # empty on init except for README.md — sessions are created on demand (see below)
│   ├── 06_quality_gates/        # architecture/security/tests/performance/design/deploy/final_audit gates
│   ├── 07_design_system/        # visual identity, tokens, components, responsiveness, accessibility
│   ├── 08_deploy/               # local/homolog/production deploy notes, troubleshooting
│   ├── 09_observability/        # logs, metrics, monitoring, incidents
│   └── 99_archive/              # superseded documents
├── CLAUDE.md                    # rules for Claude Code
├── AGENTS.md                    # provider-agnostic agent rules
├── .cursorrules                 # rules for Cursor
└── ddae-engine.config.json
```

`init` does **not** pre-create any sessions — `Docs/05_sessions/` starts with only a `README.md` explaining the model. A session is a real unit of work, created on demand:

```bash
ddae-engine session create "autenticacao"
# -> Docs/05_sessions/session_01_autenticacao/
```

The first session created in any project is always `session_01`; the next is `session_02`, and so on — numbering counts only real sessions, never the 13 internal modules or any file/folder outside the `session_NN_<slug>` naming convention. Gaps are preserved: if `session_01` and `session_03` exist, the next one created is `session_04`, not `session_02`.

Each session contains the same internal module structure: `01_intake`, `02_analysis`, `03_ideas`, `04_planning`, `05_blocks`, `06_prompts`, `07_bugs`, `08_feedbacks`, `09_validation`, `10_tests`, `11_security`, `12_performance`, `13_release`, plus a root `README.md`. These 13 modules are categories *inside* a session, not sessions themselves — they never affect session numbering and are never treated as sessions by `validate`/`audit`.

Existing files are never overwritten unless you pass `--force`.

## Local usage from a checkout

When developing the CLI locally, run it directly from a clone of this repository:

```bash
node bin/ddae-engine.js init --dir ./my-project
node bin/ddae-engine.js validate --dir ./my-project
node bin/ddae-engine.js audit --dir ./my-project
```

You can also build the tarball locally and install it elsewhere to simulate a real package install:

```bash
npm pack
npm install /path/to/ddae-engine-<version>.tgz   # from another project
npx ddae-engine init --dir ./my-project
```

The local invocation mirrors the expected published CLI; only the executable changes (`node bin/ddae-engine.js` locally, `npx ddae-engine` from npm after publication).

## CLI reference

```
ddae-engine init [--dir <path>] [--force]
ddae-engine session create "<name>" [--dir <path>] [--force]
ddae-engine block create "<name>" --session <session> [--dir <path>] [--force]
ddae-engine prompt create --block <block> --session <session> [--dir <path>] [--force]
ddae-engine feedback create --block <block> --session <session> [--dir <path>] [--force]
ddae-engine validate [--dir <path>]
ddae-engine audit [--dir <path>]
ddae-engine --help
ddae-engine --version
```

| Option | Description |
|---|---|
| `--dir <path>` | Target directory to operate in (default: current directory) |
| `--force` | Overwrite files that already exist |

### Examples

Create a new session (auto-numbered, name converted to snake_case):

```bash
npx ddae-engine session create "dashboard admin"
# -> Docs/05_sessions/session_01_dashboard_admin/  (session_02, session_03, ... for the next ones)
```

Create the next block inside that session:

```bash
npx ddae-engine block create "login administrativo" --session session_01_dashboard_admin
# -> Docs/05_sessions/session_01_dashboard_admin/05_blocks/bloco_01_login_administrativo.md
```

Generate the prompt for that block:

```bash
npx ddae-engine prompt create --block bloco_01_login_administrativo --session session_01_dashboard_admin
# -> Docs/05_sessions/session_01_dashboard_admin/06_prompts/prompt_bloco_01_login_administrativo.md
```

Generate the feedback doc once the block is implemented:

```bash
npx ddae-engine feedback create --block bloco_01_login_administrativo --session session_01_dashboard_admin
# -> Docs/05_sessions/session_01_dashboard_admin/08_feedbacks/feedback_bloco_01_login_administrativo.md
```

Check that the `Docs/` structure is compliant, including required quality gates and their minimum fields (exit code `0` if OK, `1` if failed):

```bash
npx ddae-engine validate
```

Audit for orphaned/incomplete sessions, blocks, prompts, feedbacks, pending P1/P2 items, and quality gate status:

```bash
npx ddae-engine audit
```

## The workflow

1. **Write the document first.** A new feature starts as an edit to `Docs/01_product/requisitos_funcionais.md`, not as a code diff.
2. **Work session by session, block by block.** Each unit of work is a block inside a session (`ddae-engine block create`), with a generated prompt (`ddae-engine prompt create`) and a closing feedback doc (`ddae-engine feedback create`).
3. **Let the agent implement against the docs.** `CLAUDE.md`, `AGENTS.md`, and `.cursorrules` instruct any agent to read `Docs/` before writing code.
4. **Record decisions that are expensive to reverse.** These go in `Docs/04_governance/registro_decisoes.md`.
5. **Validate and audit regularly.** `ddae-engine validate` checks structural compliance and required quality gates; `ddae-engine audit` flags orphaned or incomplete work, pending P1/P2 items, and quality gate status.
6. **Keep docs and code in sync.** If an implementation diverges from a document, the document is updated in the same change.

See `Docs/00_ddae_engine/metodologia.md` for the full description of this workflow as it ships to scaffolded projects.

## Official templates

Every file `ddae-engine` generates comes from a template in `src/templates/`. These aren't empty headers — each one ships with guiding questions, fill-in instructions, checklists, and (where useful) tables and examples, so a human or an AI agent has enough to act on without inventing structure on the spot. This applies across the board: product/architecture/contract/governance/design-system/deploy/observability docs in `Docs/`, the session skeleton (`05_sessions/<sessao>/`), the block/prompt/feedback/validation templates, the seven quality gates, and the agent rule files (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`).

Templates share a consistent placeholder convention, rendered automatically at generation time:

| Placeholder | Filled with |
|---|---|
| `{{PROJECT_NAME}}` | Name of the target directory (`--dir`) |
| `{{CURRENT_DATE}}` | Generation date, `YYYY-MM-DD` |
| `{{SESSION_NUMBER}}` / `{{SESSION_TITLE}}` / `{{SESSION_SLUG}}` | Session metadata |
| `{{BLOCK_NUMBER}}` / `{{BLOCK_TITLE}}` / `{{BLOCK_SLUG}}` | Block metadata |

`{{NEXT_BLOCK}}` is reserved but intentionally not auto-rendered — there's no reliable way to know the next block's name when the current one is created. Fill it in by hand when you know it; see `Docs/00_ddae_engine/glossario.md`.

## The full loop

DDAE Engine is documentation + prompts + implementation + feedback + audit + validation — not just a folder generator. A block isn't done when the code works; it's done when:

1. The block document (`05_blocks/`) describes scope and acceptance criteria.
2. The prompt (`06_prompts/`) was generated and used to drive implementation.
3. The implementation matches what the block and prompt describe (or deviations were reported, not silently absorbed).
4. The feedback (`08_feedbacks/`) records what actually happened, including pendencies classified P1–P4.
5. `ddae-engine validate` and `ddae-engine audit` pass against the current `Docs/` structure.
6. The block's validation (status: approved / approved with caveats / rejected / blocked) decides whether the next block is released.

## Project status

`v0.1.0` of the DDAE Engine CLI implements `init`, `session create`, `block create`, `prompt create`, `feedback create`, `validate`, and `audit`. As of this version, the official templates (`Docs/` content, session skeleton, block/prompt/feedback/validation templates, quality gates, and agent rule files) were substantially rewritten for documentation quality — not just structural placeholders, but content that guides real execution for both humans and AI agents (Claude Code, Codex, Cursor, Copilot). The validation and audit commands now also understand required quality gates: `validate` checks their minimum structure and required fields, while `audit` reports gate status and P1/P2 pendencies.

## License

MIT — see [LICENSE](./LICENSE).
