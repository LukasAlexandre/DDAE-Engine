# Validação — Bloco 04: Self-Hosting Validation + Project Identity Normalization

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
eee4cef9bdcdcb88d20f94beb9b45d5f9cecfb9f

git rev-parse origin/main
eee4cef9bdcdcb88d20f94beb9b45d5f9cecfb9f

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

HOST --version = 0.2.0
CANDIDATE --version = 0.2.0
```

## Etapa 2 — Host como executor

```text
HOST realpath:      C:\...\DDAE\node_modules\ddae-engine\bin\ddae-engine.js
CANDIDATE realpath: C:\...\DDAE\bin\ddae-engine.js
```

Arquivos fisicamente distintos confirmados. Todas as operações de validação/auditoria deste bloco usaram exclusivamente `node node_modules/ddae-engine/bin/ddae-engine.js` — nunca o candidate, nunca `npx`.

## Etapa 3 — Validation proof ANTES da correção (estado bruto)

```text
node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
Status: OK
Sessions found: 1
Warnings: 0
Errors: 0
exit code: 0

node node_modules/ddae-engine/bin/ddae-engine.js audit --dir .
Status: OK
Sessions found: 1
Warnings: 7 (todos: quality gate com status pendente — templates ainda não preenchidos, esperado)
Errors: 0
Suggestions: 1 ("Pasta fora do padrão principal: Docs/sessions" — esperado, é o histórico legacy)
Sessions: session_01_ddae_self_hosting_bootstrap: vazia (0 bloco(s)) — reconhecida corretamente como sessão, não como módulo
exit code: 0
```

**Nenhum erro estrutural no estado bruto**, mesmo antes de qualquer correção de identidade — registrado factualmente, sem maquiagem.

## Etapa 4 — Auditoria de `PROJECT_NAME` temporário

Busca textual pela string exata `ddae-self-host-scaffold` em `docs/`:

```text
TOTAL FILES (canonical scaffold, 00_ddae_engine..99_archive): 43
TOTAL FILES (root: CLAUDE.md/AGENTS.md/.cursorrules/ddae-engine.config.json): 0
TOTAL FILES (legacy docs/sessions/session_00..session_12): 0
TOTAL FILES (docs/sessions/session_13_.../ — citações da própria documentação de validação, não o bug em si): 2
  - docs/sessions/session_13_ddae_self_hosting_bootstrap/README.md
  - docs/sessions/session_13_ddae_self_hosting_bootstrap/validacao_bloco_03_canonical_self_host_session.md
```

Os 43 arquivos canônicos listados: `docs/00_ddae_engine/{folder_schema,glossario,metodologia,regras_ddae_engine}.md`, `docs/01_product/{publico_alvo,requisitos_funcionais,requisitos_nao_funcionais}.md`, `docs/02_architecture/{arquitetura_base,decisoes_tecnicas,estrutura_projeto,riscos_arquiteturais,stack_tecnica}.md`, `docs/03_contracts/{contrato_autenticacao,contrato_banco_dados,contrato_deploy,contrato_frontend_backend,contrato_variaveis_ambiente}.md`, `docs/04_governance/{convencoes_branches,convencoes_codigo,convencoes_commits,matriz_riscos,registro_decisoes}.md`, `docs/05_sessions/README.md`, `docs/06_quality_gates/{architecture,deploy,design,final_audit,performance,security,tests}_gate.md`, `docs/07_design_system/{acessibilidade,componentes_ui,identidade_visual,responsividade,tokens_design}.md`, `docs/08_deploy/{deploy_homologacao,deploy_local,deploy_producao,troubleshooting}.md`, `docs/09_observability/{incidentes,logs,metricas,monitoramento}.md`.

Nenhuma ocorrência foi tocada em `docs/sessions/` (legacy nem a própria sessão 13) — reconhecido explicitamente como fora do escopo de normalização (as duas ocorrências ali são citações textuais do achado, dentro da própria documentação de validação, não instâncias do defeito).

`(43 canônicos + 2 citações legacy = 45; a Bloco 03 havia estimado "~44" antes desta contagem precisa — os 2 arquivos já editados no Bloco 03, `visao_produto.md`/`proposta_solucao.md`, já não continham a string, confirmando que 46 originais − 2 já corrigidos = 44 ocorrências totais remanescentes, das quais 2 são citações e 42... — na prática a contagem final precisa apurada nesta etapa é 43 arquivos canônicos + 2 citações = 45 arquivos com a string, e o número exato substitui a estimativa aproximada anterior.)`

## Achado adicional: bug real no template-fonte de `glossario.md`

Durante a auditoria, uma segunda ocorrência foi localizada em `docs/00_ddae_engine/glossario.md`, linha 28, de natureza **diferente** do cabeçalho:

```text
| `ddae-self-host-scaffold` | Nome da pasta do projeto alvo (`--dir`). | Todos os documentos de `Docs/` e quality gates. |
```

Essa linha faz parte de uma tabela que documenta os placeholders reconhecidos pelo CLI (`{{SESSION_NUMBER}}`, `{{SESSION_TITLE}}`, etc.). As outras linhas da mesma tabela mostram corretamente o **token literal** do placeholder (ex.: `{{SESSION_NUMBER}}`). Mas a linha de `PROJECT_NAME` (e, por extensão, a linha seguinte de `CURRENT_DATE`, mostrando `2026-08-08` em vez de `{{CURRENT_DATE}}`) mostra o **valor já renderizado**, não o token — porque o mecanismo de template do DDAE Engine (`renderTemplate`, `src/utils/text.js`) faz substituição de string cega em todo o arquivo, sem nenhum mecanismo de escape para texto que precisa permanecer literal (como esta própria tabela de documentação dos placeholders).

**Isso é um bug real no template-fonte do produto** (`src/templates/docs_root/00_ddae_engine/glossario.md`), que afeta **todo projeto** que roda `ddae-engine init` — não é específico deste bootstrap de self-hosting, e não é resolvido pela normalização de identidade deste bloco. Corrigi-lo exigiria alterar `src/` (mecanismo de template ou o conteúdo-fonte do glossário), o que está fora do escopo deste bloco (Etapa 6: "Não refatore templates", "O diff deve ser exclusivamente uma correção de identidade").

**Decisão tomada:** a linha 3 de `glossario.md` (cabeçalho de identidade) foi normalizada como as outras 42; a linha 28 (anomalia de template) foi **deliberadamente preservada sem alteração** — corrigi-la aqui seria mascarar um bug real de produto atrás de uma troca cosmética de identidade, sem resolver a causa raiz. Registrado como pendência explícita para uma sessão/bloco dedicado futuro (fora do escopo da Session 13).

## Etapa 5–6 — Identidade canônica e normalização mecânica

Identidade canônica definida: **DDAE Engine** (nome do pacote: `ddae-engine`; repositório: `DDAE-Engine`).

Substituição mecânica aplicada exclusivamente ao padrão de linha exata:

```text
de:  > Projeto: ddae-self-host-scaffold · Atualizado em: <data>
para: > Projeto: DDAE Engine · Atualizado em: <data>
```

em 43 arquivos do scaffold canônico. Nenhum outro conteúdo foi alterado — nenhum texto reescrito, nenhum template refatorado, nenhum documento preenchido além dessa linha, nenhuma mudança de roadmap.

## Etapa 7 — Prova de ausência da identidade temporária

```text
grep -rn "ddae-self-host-scaffold" (canonical scaffold) → apenas
  docs/00_ddae_engine/glossario.md:28 (anomalia conhecida, preservada deliberadamente)
```

Zero ocorrências do cabeçalho de identidade restantes. `docs/sessions/` (legacy e a própria session_13) permanece com suas 2 citações intactas, sem alteração.

## Etapa 8–9 — Validation proof DEPOIS da correção e comparação

```text
node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
Status: OK
Sessions found: 1
Warnings: 0
Errors: 0
exit code: 0

node node_modules/ddae-engine/bin/ddae-engine.js audit --dir .
Status: OK
Sessions found: 1
Warnings: 7 (idênticos aos de antes — quality gates pendentes)
Errors: 0
Suggestions: 1 (idêntica — Docs/sessions fora do padrão)
exit code: 0
```

**Comparação:** resultado estruturalmente **idêntico** antes e depois — `validate`/`audit` já estavam verdes no estado bruto. A normalização de identidade **melhorou a correção semântica dos documentos (evitando que uma futura fonte de contexto declare uma identidade de projeto incorreta) mas não corrigiu nenhum problema estrutural, porque não havia nenhum**. Isso é reportado exatamente como tal, sem inflar o resultado.

## Etapa 10 — Isolamento de pacote

```text
npm pack --dry-run --json
leaked files: 0 []
total files: 95
```

Idêntico ao Bloco 03 — nenhuma mudança de conteúdo em `Docs/` afeta o pacote publicável, que continua protegido estruturalmente pela allowlist de `package.json.files`.

## Etapa 11 — Regressão

```text
npm test        → 67 tests, 65 pass, 0 fail, 2 skip
npm run package:check → OK, 95 files
npm run smoke    → [DDAE smoke] OK
```

## Etapa 12 — Escopo do diff

```text
git diff --stat
43 files changed, 43 insertions(+), 43 deletions(-)
```

Exatamente 1 linha alterada por arquivo, nos 43 arquivos canônicos esperados. Nenhuma sessão legacy (`session_00`–`session_12`) aparece. Nenhum `package.json`, `package-lock.json`, `src/`, `bin/`, `test/`, `scripts/`, `.github/` aparece.

## Riscos

- **Bug real no template-fonte de `glossario.md`** (ver acima) — não corrigido neste bloco, deliberadamente, para não misturar uma correção de `src/` com uma normalização de identidade em `Docs/`. Fica registrado como pendência para uma sessão/bloco futuro dedicado.
- Nenhum risco novo relacionado à normalização em si — mudança puramente textual, sem efeito estrutural comprovado por `validate`/`audit` antes/depois idênticos.

## Pendências para o Bloco 05

- Fechamento formal do bootstrap self-host (Session 13).
- Preparação da criação de `session_02_context_compiler_0_3_0`, retomando o Context Compiler no ponto exato em que a Session 12 legacy parou (Bloco 03 — DDAE State Collector), agora sob o control plane canônico.
- Registrar formalmente, fora desta sessão, a pendência do bug de template do `glossario.md`/`renderTemplate` para tratamento futuro.

## Confirmação de zero implementação além do escopo

- `src/context/git-context.js`, `src/context/project-context.js` — não alterados.
- `src/templates/` (incluindo o template-fonte de `glossario.md`) — não alterado, apesar do bug identificado.
- `package.json`, `package-lock.json` — não alterados/ausente.
- `session_02_...` — não criada.
- Nenhum código/Vault do Obsidian criado.
