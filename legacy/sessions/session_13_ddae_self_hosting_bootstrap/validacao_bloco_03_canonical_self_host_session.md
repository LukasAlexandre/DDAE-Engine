# Validação — Bloco 03: Canonical Self-Host Session Bootstrap

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
e0fbd5386bd0b09d02d97ad0f279b9ceb46a1751

git rev-parse origin/main
e0fbd5386bd0b09d02d97ad0f279b9ceb46a1751

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

package.json: version 0.2.0, dependencies {}, devDependencies {}
package-lock.json: ausente
```

Estado idêntico ao commit do Bloco 02, working tree limpo.

## Etapa 2 — Host e candidate fisicamente distintos

```text
node node_modules/ddae-engine/bin/ddae-engine.js --version → 0.2.0
node bin/ddae-engine.js --version → 0.2.0

realpath HOST:      C:\...\DDAE\node_modules\ddae-engine\bin\ddae-engine.js
realpath CANDIDATE: C:\...\DDAE\bin\ddae-engine.js
```

Mesma versão textual, dois arquivos físicos distintos — confirmado por `fs.realpathSync`.

## Etapa 3 — Control plane antes da criação

```text
docs/05_sessions/ → apenas README.md

node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
Status: OK
Sessions found: 0
Warnings: 0
Errors: 0
```

`Sessions found: 0` confirmado pelo próprio Stable Host, não apenas por inspeção manual do filesystem.

## Etapa 4 — Sintaxe real consultada antes de executar

```text
node node_modules/ddae-engine/bin/ddae-engine.js --help
...
session create "<name>"    Create the next session under Docs/05_sessions/
Options: --dir <path>, --force
```

Nenhuma sintaxe foi adivinhada — a sintaxe real da release `0.2.0` foi consultada via `--help` antes da execução, conforme instruído.

## Comando executado

```bash
node node_modules/ddae-engine/bin/ddae-engine.js session create "DDAE self hosting bootstrap" --dir .
```

```text
Created session: Docs/05_sessions/session_01_ddae_self_hosting_bootstrap
  Modules created: 13
  Files created: 21
```

Executado exclusivamente pelo Stable Host — nunca `bin/ddae-engine.js` (candidate). Nenhum `npx` foi usado.

## Etapa 5 — Estrutura da sessão

```text
docs/05_sessions/session_01_ddae_self_hosting_bootstrap/
├── README.md
├── 01_intake/
├── 02_analysis/
├── 03_ideas/
├── 04_planning/
├── 05_blocks/
├── 06_prompts/
├── 07_bugs/
├── 08_feedbacks/
├── 09_validation/
├── 10_tests/
├── 11_security/
├── 12_performance/
└── 13_release/
```

13 módulos oficiais confirmados — nenhum criado manualmente, todos gerados pelo próprio Stable Host. Numeração: `session_01` (não `session_02`, `session_13` ou `session_14`), conforme esperado — `Docs/05_sessions/` é um namespace canônico novo, não uma continuação de `docs/sessions/`.

```text
git status --short docs/sessions/ → (vazio — histórico legacy intocado pela criação da sessão)
```

## Etapa 6 — Transição registrada na sessão canônica

`docs/05_sessions/session_01_ddae_self_hosting_bootstrap/README.md` e `01_intake/levantamento_inicial.md` preenchidos (sem destruir a estrutura de template gerada pelo Stable Host), registrando: objetivo, Stable Host (`ddae-engine@0.2.0`, `node_modules/ddae-engine/`), Candidate (checkout, baseline `e0fbd5386bd0b09d02d97ad0f279b9ceb46a1751`), plano de controle legacy (`docs/sessions/`) vs. canônico (`Docs/05_sessions/`), estado do Context Compiler legacy (`docs/sessions/session_12_context_compiler_foundation/` — Bloco 01 aprovado, Checkpoint 01.1 aprovado, Bloco 02 aprovado, Bloco 03 não iniciado, pausada), e os princípios de self-hosting (stable host governa candidate; sem self-dependency; sem auto-modificação autônoma; Git como evidência; gates humanos continuam autoritativos; histórico legacy imutável; desenvolvimento canônico migra para `Docs/05_sessions/`; nenhum caso especial de runtime para `package.name === "ddae-engine"`).

## Etapa 7 — Roadmap oficial persistido

`Docs/01_product/visao_produto.md` e `Docs/01_product/proposta_solucao.md` (documentos canônicos do scaffold oficial para direção de produto — nenhum arquivo novo foi inventado) preenchidos com o conteúdo real do DDAE Engine e a tabela de roadmap:

| Versão | Nome | Status |
|---|---|---|
| `0.2.0` | Engineering Foundation | Released |
| `0.3.0` | Context Compiler | In development |
| `0.4.0` | Obsidian Workspace / Project Brain | Planned |

Obsidian **não** entra em `0.3.0` — nenhum código, Vault ou dependência do Obsidian foi criado. Apenas o roadmap foi registrado.

## Etapa 8 — Referências legacy ao roadmap antigo

Localizada a referência legacy exata: `docs/sessions/session_12_context_compiler_foundation/README.md:93` — "Evolução prevista após esta sessão: Session 13 (Work Packets + Handoff), Session 14 (DDAE MCP Server), Session 15 (Obsidian Knowledge Workspace)...". Esse arquivo **não foi alterado**. `visao_produto.md` (Seção 4) registra explicitamente que essa numeração histórica diverge do roadmap atual, e que a decisão vigente substitui apenas a intenção futura, não reescreve o histórico já registrado — conforme instruído.

## Achado real: `PROJECT_NAME` herdado do diretório TEMP

Durante a edição de `visao_produto.md`/`proposta_solucao.md`, foi identificado que o cabeçalho `> Projeto: ...` de **46 dos 50 arquivos** do scaffold mesclado no Bloco 02 carrega `ddae-self-host-scaffold` — o nome do diretório temporário usado para gerar o scaffold via `init --dir <TEMP>`, não o nome real do projeto (`DDAE Engine`). Causa raiz: `projectNameOf(dir)` deriva o nome do projeto do basename do diretório de destino no momento da geração — correto para o caso de uso normal do `init` (rodar dentro do projeto de destino), mas produz esse artefato quando o scaffold é gerado em um TEMP com nome diferente e depois mesclado, como exige a estratégia de matriz de colisão desta sessão.

**Escopo desta correção:** os dois arquivos efetivamente editados neste bloco (`visao_produto.md`, `proposta_solucao.md`) tiveram o cabeçalho corrigido para `DDAE Engine` como parte da própria edição de conteúdo. Os demais ~44 arquivos **não foram tocados neste bloco**, para não expandir o diff além do previsto nas Etapas 11–12 deste prompt. Registrado como pendência explícita para uma correção dedicada (pequena, mecânica) em um bloco futuro — não é um erro estrutural, apenas um cabeçalho cosmético incorreto.

## Etapas 11–13 — Auditoria de diff, isolamento e regressão

```text
git status --short
 M docs/01_product/proposta_solucao.md
 M docs/01_product/visao_produto.md
?? docs/05_sessions/session_01_ddae_self_hosting_bootstrap/

Nenhum arquivo em package.json, package-lock.json, src/, test/, scripts/, .github/.

npm pack --dry-run --json → 95 arquivos, 0 vazamento de docs//node_modules//package-lock.json

npm test        → 67 tests, 65 pass, 0 fail, 2 skip
npm run package:check → OK, 95 files
npm run smoke    → [DDAE smoke] OK
```

## Riscos

- **`PROJECT_NAME` incorreto em ~44 arquivos do scaffold.** Cosmético, não estrutural — registrado como pendência explícita (ver acima), não escondido.
- **Numeração de bloco herdada de duas sessões diferentes.** Esta sessão canônica (`session_01`) registra blocos com a numeração da sessão legacy de transição (`session_13`, Blocos 03/04) na tabela "Blocos Planejados" do seu próprio README, para manter rastreabilidade durante o bootstrap — uma vez que o bootstrap for concluído, sessões canônicas futuras (`session_02_...`) terão numeração de bloco própria e independente.

## Pendências para o Bloco 04

- `validate`/`audit` via Stable Host contra o próprio repositório, provando reconhecimento estrutural de `session_01_ddae_self_hosting_bootstrap` como sessão real (não módulo).
- Avaliar, no Bloco 04 ou em bloco dedicado futuro, a correção mecânica do `PROJECT_NAME` nos ~44 arquivos restantes do scaffold.

## Confirmação de zero implementação além do escopo

- `src/context/git-context.js`, `src/context/project-context.js` — não alterados.
- `src/context/ddae-context.js` — não criado (Bloco 03 da Session 12 legacy continua não iniciado).
- `package.json`, `package-lock.json` — não alterados/ausente.
- `session_02_...` — não criada.
- Nenhum código/Vault do Obsidian criado.
