# Validação — Bloco 05: Self-Hosting Closure + Package Isolation Contract

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
b45ed88922956e582d08c4e7c76b7ec2947ab42a

git rev-parse origin/main
b45ed88922956e582d08c4e7c76b7ec2947ab42a

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

HOST --version = 0.2.0
CANDIDATE --version = 0.2.0
```

## Etapa 2 — Validação inicial (antes de qualquer edição de fechamento)

```text
node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
Status: OK, Sessions found: 1, Warnings: 0, Errors: 0

node node_modules/ddae-engine/bin/ddae-engine.js audit --dir .
Status: OK, Sessions found: 1, Warnings: 7, Errors: 0, Suggestions: 1
```

Idêntico ao resultado final do Bloco 04 — baseline reconfirmado, nada divergiu entre blocos.

## Etapa 3–4 — Correção da instância do glossário (não da fonte)

`Docs/00_ddae_engine/glossario.md`, Seção 2 ("Placeholders Reconhecidos pelo CLI"), linhas 28–29 corrigidas de:

```text
| `ddae-self-host-scaffold` | Nome da pasta do projeto alvo (`--dir`). | ...
| `2026-08-08` | Data corrente em `YYYY-MM-DD`... | ...
```

para:

```text
| `{{PROJECT_NAME}}` | Nome da pasta do projeto alvo (`--dir`). | ...
| `{{CURRENT_DATE}}` | Data corrente em `YYYY-MM-DD`... | ...
```

Consistente com o estilo das demais linhas da mesma tabela (`{{SESSION_NUMBER}}`, `{{SESSION_TITLE}}`, etc.). `src/templates/docs_root/00_ddae_engine/glossario.md` (a fonte real do template) **não foi alterado** — apenas a instância já gerada neste repositório.

Confirmado: zero ocorrências restantes de `ddae-self-host-scaffold` em todo `docs/00_ddae_engine` até `docs/99_archive`.

## Etapa 5 — Bug registrado no control plane canônico

BUG-01 registrado em `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_identificados.md`, com: scope, affected, observed, expected, passos para reproduzir, arquivo relacionado, impact, workaround, source fix (pendente), target (`session_02_context_compiler_0_3_0`), status `OPEN / DEFERRED TO SESSION 02`. Severidade classificada como **P3** — não estrutural, não bloqueia esta sessão.

## Etapa 6–7 — Documento oficial de self-hosting

`Docs/00_ddae_engine/self_hosting.md` criado, cobrindo: Stable Host (pacote, instalação, execução), Candidate (execução), regra central (Stable governa Candidate), proibição de self-dependency, dois planos de controle (`Docs/05_sessions/` canônico vs. `docs/sessions/` legacy read-only), política de execução, modelo de promoção Stable N → Candidate N+1 → Stable N+1, roadmap oficial (referência), defeito conhecido (BUG-01), e handoff formal do Context Compiler.

## Etapa 8 — Roadmap

Reconfirmado sem alteração: `Docs/01_product/visao_produto.md`, Seção 4 — `0.2.0` Released, `0.3.0` Context Compiler In development, `0.4.0` Obsidian Workspace / Project Brain Planned. Nenhuma mudança de escopo.

## Etapa 9 — Handoff do Context Compiler

Registrado em `self_hosting.md`, Seção 10: predecessor `docs/sessions/session_12_context_compiler_foundation/` (Bloco 01 aprovado, Checkpoint 01.1 aprovado, Bloco 02 aprovado — `src/context/git-context.js`, `src/context/project-context.js` — Bloco 03 não iniciado); próxima sessão canônica `Docs/05_sessions/session_02_context_compiler_0_3_0` (ainda não criada), retomando no DDAE State Collector (`src/context/ddae-context.js`, ainda não existe).

**Correção de execução registrada:** a primeira tentativa desta etapa editou `docs/sessions/session_12_context_compiler_foundation/README.md` para apontar ao novo destino — violando a proibição explícita deste bloco de tocar `docs/sessions/session_00` até `session_12`. Identificado e revertido antes do commit (`git diff` confirmado vazio para esse arquivo). O handoff permanece registrado apenas em `self_hosting.md`, local permitido.

## Etapa 10–11 — Fechamento da sessão canônica

`Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/09_validation/fechamento_sessao.md`: Status = **Aprovada com ressalvas** (única ressalva: BUG-01); tabela de blocos (03/04/05, todos Aprovado); critérios de aceite da sessão como um todo, todos atendidos; checklist de encerramento completo; decisão e justificativa registradas; riscos restantes (BUG-01); próxima sessão recomendada (`session_02_context_compiler_0_3_0`).

`10_tests/regressao.md`: 6 casos de regressão registrados (suíte do candidate, package:check, smoke, validate/audit via stable host ×2, isolamento de pacote), todos "Passou".

`11_security/checklist_seguranca.md`: itens aplicáveis marcados (sem segredo commitado, sem self-dependency, sem package-lock, `node_modules/` nunca commitado, histórico preservado, isolamento de pacote); itens não aplicáveis (autenticação/logs) marcados como tal, não deixados como placeholder vazio.

`13_release/release_notes.md`: registrado explicitamente "nenhuma publicação npm foi realizada nesta sessão" — sem inventar número de versão; BUG-01 listado como limitação conhecida.

## Etapa 12 — Fechamento da sessão legacy de transição

`docs/sessions/session_13_ddae_self_hosting_bootstrap/README.md` e `plano_bloco_13.md`: Bloco 05 marcado Concluído; todos os 6 blocos/checkpoints (01, 01.1, 02, 03, 04, 05) Concluídos; seção explícita "SESSION 13 CONCLUÍDA"; nota de que `docs/sessions/` não recebe mais sessões de desenvolvimento novas; próxima sessão canônica apontada.

`docs/sessions/session_00` até `session_12`: **nenhuma alteração** — confirmado via diff vazio nesses caminhos (ver Etapa 17).

## Etapas 14–16 — Isolamento, validação final e regressão

```text
npm pack --dry-run --json (final)
leaked files: 0 []
total files: 95
src/context/git-context.js present: true
src/context/project-context.js present: true
src/context/ddae-context.js present: false

node node_modules/ddae-engine/bin/ddae-engine.js validate --dir . (final)
Status: OK, Sessions found: 1, Warnings: 0, Errors: 0

node node_modules/ddae-engine/bin/ddae-engine.js audit --dir . (final)
Status: OK, Sessions found: 1, Warnings: 7, Errors: 0, Suggestions: 1

npm test        → 67 tests, 65 pass, 0 fail, 2 skip
npm run package:check → OK, 95 files
npm run smoke    → [DDAE smoke] OK
```

Idêntico em todas as três execuções de `validate`/`audit` ao longo dos Blocos 04–05 — nenhuma regressão estrutural em nenhum momento do bootstrap.

## Riscos

- BUG-01 (P3) permanece aberto por decisão deliberada — não é esquecimento, é escopo: corrigir `src/templates/`/`renderTemplate` nesta sessão de governança misturaria uma mudança de produto com um bootstrap de processo. Mitigado por registro explícito com alvo (`session_02_context_compiler_0_3_0`) e recomendação de resolver antes do Context Compiler depender de `Docs/` como fonte real.
- Nenhum outro risco novo identificado neste bloco.

## Pendências para a próxima sessão canônica

- Criar `Docs/05_sessions/session_02_context_compiler_0_3_0` via Stable Host.
- Resolver BUG-01 (fonte do template do glossário) antes ou no início dessa sessão.
- Retomar o Bloco 03 — DDAE State Collector (`src/context/ddae-context.js`).

## Confirmação de zero implementação além do escopo

- `src/`, `bin/`, `test/`, `scripts/`, `.github/` — não alterados.
- `package.json`, `package-lock.json` — não alterados/ausente.
- `docs/sessions/session_00` a `session_12` — não alterados (confirmado, incluindo a reversão da tentativa inicial na Etapa 9).
- `session_02_...` — não criada.
- Nenhuma publicação npm, tag, ou GitHub Release.
