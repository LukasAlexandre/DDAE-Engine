# Validação — Bloco 02: DDAE State Collector

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
d2e8964a951a830aabf208e2c1f23c669b395afd

git rev-parse origin/main
d2e8964a951a830aabf208e2c1f23c669b395afd

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

Stable Host --version: 0.2.0
Candidate --version: 0.2.0
```

## Contrato fechado antes do código

Registrado em `05_blocks/bloco_02_ddae_state_collector.md`, Seção 4: PURPOSE, INPUT, OUTPUT, SOURCE OF TRUTH (`Docs/`), CANONICAL SESSION ROOT (`Docs/05_sessions/`), LEGACY POLICY (nunca coletado automaticamente).

## API implementada

`collectDdaeContext(projectRoot, options = {})` — síncrona, em `src/context/ddae-context.js`, consistente com `collectGitContext`/`collectProjectContext`.

## Reaproveitamento de utilitários existentes (sem duplicação)

- `listSessionDirs`, `parseSessionFolderName`, `listSessionModules` — `src/utils/session.js`.
- `scanQualityGateStatuses` — `src/utils/quality-gates.js`.
- `readMarkdownFile`, `getMarkdownSection` — `src/utils/markdown-checks.js` (via `quality-gates.js`, mais uso direto de `getMarkdownSection` para o status da sessão).

Nenhuma lógica de identificação/parsing de sessão foi duplicada.

## Session selection

Contrato implementado exatamente como especificado:

- `options.session` explícito e existente → `reason: 'explicit'`.
- Sem seleção explícita, com sessões existentes → maior número → `reason: 'latest_canonical'` (nomenclatura reaproveitada do contrato da Session 12, `contrato_context_manifest_v1.md` Seção 6 — não inventado um sinônimo novo).
- Sem sessões → `reason: 'none'`, `current_session: null`.
- Seleção explícita inexistente → `reason: 'explicit_not_found'`, `current_session: null`, sem fallback silencioso, com warning `EXPLICIT_SESSION_NOT_FOUND`.

## Modos degradados

| Caso | Comportamento | Testado |
|---|---|---|
| `Docs/` ausente | `available: false`, sem exceção, warning `DOCS_NOT_FOUND` | ✅ |
| `Docs/` existe, zero sessões | `available: true`, `sessions: []`, `current_session: null` | ✅ |
| Sessão explícita inexistente | Sem fallback, warning `EXPLICIT_SESSION_NOT_FOUND` | ✅ |
| Módulo oficial ausente | Sem exceção, `exists: false`, warning `MODULE_MISSING` | ✅ |
| Pasta estranha em `Docs/05_sessions/` | Ignorada (via `listSessionDirs`, já filtra) | ✅ |
| Módulo interno confundido com sessão | Nunca ocorre (via `SESSION_NAME_PATTERN`) | ✅ |

## Coleta por área

- **Módulos:** os 13 oficiais (`listSessionModules`), cada um com `exists`/`path`.
- **Blocos:** `05_blocks/*.md` matching `bloco_NN_slug.md`, ordenados por `Number(number)` ascendente, título extraído do heading real (`# Bloco NN — Título`) via o mesmo padrão de `parseBlockFile` do CLI.
- **Prompts/Feedbacks:** `06_prompts/`/`08_feedbacks/`, associados ao bloco pelo nome do arquivo, ordenados por nome.
- **Bugs:** dois paths canônicos fixos (`bugs_identificados.md`/`bugs_corrigidos.md`), `{path, exists, content}`.
- **Validação/Tests/Security/Performance/Release:** listagem genérica de `.md` dentro do módulo (não recursiva), cada arquivo como `{name, path, exists, content}`.
- **Governança:** `Docs/04_governance/registro_decisoes.md` (path fixo) + `Docs/06_quality_gates/*` via `scanQualityGateStatuses` (reaproveitado, não reimplementado).

## Status da sessão — parsing estruturado, não NLP

A seção `## 5. Status` do README de cada sessão tem exatamente 4 opções de checkbox fechadas (`Não iniciada`/`Em andamento`/`Concluída`/`Bloqueada`). O collector reconhece qual está marcada com `[x]`, reaproveitando o mesmo padrão (`statusMarkedAs`) já usado e testado em `quality-gates.js` para o status de cada gate — nunca infere sentido de texto livre.

## Isolamento de `legacy/sessions/`

Testado explicitamente: uma fixture com `legacy/sessions/session_99_legacy/07_bugs/bugs_identificados.md` contendo um sentinela nunca aparece na saída serializada do collector, e `session_99_legacy` nunca aparece na lista de sessões — o collector nunca constrói nem acessa nenhum path sob `legacy/`.

## Path safety

- Nenhum path absoluto no retorno (testado via `JSON.stringify` + regex `[A-Za-z]:\\`).
- Todos os separadores normalizados para `/`.
- Symlink de sessão nunca seguido (testado; skip local por privilégio ausente, mesmo padrão dos collectors anteriores — cobertura real esperada em CI).
- Nenhum conteúdo fora de `Docs/` é lido (testado com sentinelas em `.env` e `src/index.js` fora de `Docs/`).

## Determinismo

Duas chamadas independentes de `collectDdaeContext` sobre o mesmo estado de filesystem produzem `deepEqual` — testado com fixture sintética e comprovado contra o próprio repositório self-hosted.

## Prova contra o self-host real

```text
available: true
session count: 2
selected session: session_02_context_compiler_0_3_0
selection reason: latest_canonical
block count: 2
bugs identified source present: true
bugs corrected source present: true
validation source count: 1
governance decisions present: true
quality gate count: 7
warnings: []
deepEqual (two independent calls): true
no absolute path leak: true
no legacy/ reference: true
```

## Testes

`test/context-ddae.test.js` — 26 testes (25 pass, 1 skip por privilégio de symlink ausente localmente). Cobertura: os 24 cenários do contrato do Bloco 02.

## Package protection

`REQUIRED_SRC_PREFIXES` (`scripts/release/verify-package.mjs`) já protegia `src/context/` desde o antigo Bloco 02 legacy — não foi necessário alterar. `npm pack --dry-run --json` confirma `src/context/ddae-context.js` presente no pacote, 96 arquivos totais (95 → 96, variação explicada pelo novo arquivo, não forçada), zero vazamento de `Docs/`/`legacy/`/`node_modules/`/`package-lock.json`.

## Regressão

```text
npm test        → 93 tests, 90 pass, 0 fail, 3 skip
npm run package:check → OK, 96 files
npm run smoke    → [DDAE smoke] OK
stable host validate  → Status OK, Sessions found 2, Errors 0
stable host audit     → Status OK, Sessions found 2, Errors 0
```

## Commit técnico e CI

- Commit: `ce3e2981e86676ea8880871a6c636c1ce32beb5f`
- CI run: `31290579402` — `success`, 5/5
- Step de prova do Stable Host (`scripts/ci/verify-stable-host.mjs`) confirmado verde nos 5 ambientes para este mesmo commit.

## Riscos

Nenhum risco novo. BUG-01 (template do glossário) permanece aberto, P3, herdado do Bloco 01 — não relacionado a este bloco.

## Pendências para o Bloco 03

- Authority & Source Model: decidir por domínio qual fonte (Git, sessão, decisão, bug, roadmap) é autoritativa sobre cada tipo de afirmação, reaproveitando a saída normalizada deste collector como entrada.

## Confirmação de zero implementação além do escopo

- `src/context/git-context.js`, `src/context/project-context.js` — não alterados.
- `src/commands/context.js`, `src/context/compiler.js`, `src/context/relevance.js`, `src/context/authority.js`, `src/context/renderer.js`, `src/context/fingerprint.js` — não criados.
- `.ddae/`, `manifest.json`, `CONTEXT.md` — não criados.
- `src/templates/` — não alterado (BUG-01 continua aberto, deliberadamente).
- `package.json`, `package-lock.json` — não alterados/ausente.
- `legacy/sessions/session_12_context_compiler_foundation/` — não alterado (predecessor histórico preservado).
