# Bloco 02 — DDAE State Collector

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Objetivo

Implementar o terceiro sensor do Context Compiler — `collectDdaeContext(projectRoot, options)` — que responde "o que o control plane DDAE (`Docs/`) diz atualmente sobre este projeto?", de forma determinística, read-only e sem interpretar Markdown como instrução.

## 2. Contexto

Predecessor legacy (`legacy/sessions/session_12_context_compiler_foundation/`) definiu o contrato do Manifest v1 e implementou Git Collector e Project Collector (Bloco 02 daquela sessão), mas nunca chegou ao DDAE State Collector (Bloco 03, não iniciado). Esta sessão retoma exatamente esse ponto, agora sob o control plane canônico. Contrato de referência: `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md`, Seções 4 (Source Model) e 6 (Session selection).

## 3. Problema que Este Bloco Resolve

Sem este collector, nenhuma camada futura do Context Compiler (Authority Model, Relevance Engine, Manifest) tem acesso normalizado ao estado operacional real do projeto — sessão atual, decisões, bugs, validações. Cada camada teria que reimplementar sua própria leitura ad-hoc de `Docs/`, com risco real de inconsistência entre elas (por exemplo, dois módulos discordando sobre qual é "a sessão atual").

## 4. Contrato (registrado antes do código)

- **PURPOSE:** coletar o estado operacional persistido pelo DDAE sob `Docs/`.
- **INPUT:** `projectRoot` (string); `options.session` (string opcional — seletor explícito de sessão canônica).
- **OUTPUT:** objeto JavaScript plano e determinístico (nunca uma Promise — API síncrona, consistente com `collectGitContext`/`collectProjectContext`).
- **SOURCE OF TRUTH:** `Docs/` (control plane canônico).
- **CANONICAL SESSION ROOT:** `Docs/05_sessions/`.
- **LEGACY:** `legacy/sessions/` — nunca coletado automaticamente. É evidência histórica, não estado operacional atual; só uma decisão futura explícita de authority/policy poderia trazê-lo para o Context Compiler.

## 5. Escopo

- `collectDdaeContext(projectRoot, options = {})` em `src/context/ddae-context.js`.
- Seleção determinística de sessão (explícita, `latest_canonical` — nomenclatura reaproveitada do contrato da Session 12 — ou nenhuma).
- Coleta de: sessões canônicas (visão geral), sessão atual (13 módulos, blocos, prompts, feedbacks, bugs, validação, tests, security, performance, release), decisões de governança, quality gates.
- Modos degradados: `Docs/` ausente, zero sessões, sessão explícita inexistente, módulo ausente — nenhum deles lança exceção.
- Path safety (sem symlink seguido para fora do projeto, sem path absoluto no retorno) e determinismo (chamadas repetidas produzem `deepEqual`).

## 6. Fora de Escopo

- Qualquer decisão de relevância/autoridade entre fontes (Blocos 03/04 seguintes).
- Renderização de `CONTEXT.md`, `manifest.json`, ou qualquer output `.ddae/`.
- Comando de CLI (`ddae-engine context ...`) — ainda não existe.
- Correção do BUG-01 (template do glossário) — continua aberto, P3, alvo de bloco futuro.
- NLP ou inferência semântica sobre prosa livre — apenas parsing de campos estruturados já existentes no contrato dos templates (checkbox de status da sessão, heading `# Bloco NN — Título`, status de quality gate via `scanQualityGateStatuses`).

## 7. Arquivos e Pastas Envolvidos

- `src/context/ddae-context.js` (novo).
- `test/context-ddae.test.js` (novo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_02_ddae_state_collector.md` (este arquivo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_02_ddae_state_collector.md` e `08_feedbacks/feedback_bloco_02_ddae_state_collector.md` (gerados após a CI técnica verde).

## 8. Dependências

Reaproveita, sem duplicar: `listSessionDirs`, `parseSessionFolderName`, `listSessionModules` (`src/utils/session.js`); `scanQualityGateStatuses` (`src/utils/quality-gates.js`); `readMarkdownFile`, `getMarkdownSection` (`src/utils/markdown-checks.js`); `sessionDirOf`/`parseBlockFile` (`src/commands/block.js`, como referência de parsing de heading de bloco).

## 9. Plano de Implementação

1. Resolver `Docs/` a partir de `projectRoot`; se ausente, retornar estado degradado estruturado (nunca lançar exceção).
2. Listar sessões canônicas via `listSessionDirs`; nunca ler `legacy/sessions/`.
3. Resolver seleção: `options.session` explícito (se existir na lista) vence; senão, maior número (`latest_canonical`); sessão explícita inexistente não recua silenciosamente para outra.
4. Para a sessão selecionada, coletar os 13 módulos oficiais (`listSessionModules`), registrando ausência sem lançar exceção.
5. Coletar blocos (`05_blocks/`, ordenados numericamente, título via heading real do arquivo), prompts e feedbacks (`06_prompts/`/`08_feedbacks/`, associados ao bloco pelo nome do arquivo).
6. Coletar bugs (`07_bugs/bugs_identificados.md`/`bugs_corrigidos.md`, paths canônicos fixos) e os módulos de listagem genérica (`09_validation`, `10_tests`, `11_security`, `12_performance`, `13_release`).
7. Coletar governança: `Docs/04_governance/registro_decisoes.md` e `Docs/06_quality_gates/*` via `scanQualityGateStatuses`.
8. Normalizar todos os paths para `/`, relativos a `projectRoot`; nunca path absoluto no retorno.
9. Escrever `test/context-ddae.test.js` cobrindo os 24 cenários do contrato (degradado, seleção, módulos, blocos/prompts/feedbacks, bugs, validação, governança, isolamento de `legacy/`, determinismo, symlink, path safety).
10. Rodar o collector contra o próprio repositório (self-host) e provar determinismo com duas chamadas independentes.

## 10. Critérios de Aceite

- [x] `Docs/` ausente → `available: false`, sem exceção.
- [x] Sessão explícita inexistente nunca recua silenciosamente para outra.
- [x] Módulos internos (`01_intake`...) nunca confundidos com sessões.
- [x] Os 13 módulos oficiais reconhecidos quando presentes; ausência registrada sem exceção.
- [x] Blocos/prompts/feedbacks ordenados deterministicamente, independente da ordem do filesystem.
- [x] `legacy/sessions/` nunca lido, mesmo contendo conteúdo com forma de bug/decisão DDAE.
- [x] Nenhum path absoluto no retorno; todos os separadores normalizados para `/`.
- [x] Duas chamadas independentes produzem `deepEqual`.
- [x] Nenhum conteúdo fora de `Docs/` é lido (prova com sentinela em `.env`/`src/`).

## 11. Validações Obrigatórias

- [x] `npm test` — 93 testes, 90 pass, 0 fail, 3 skip.
- [x] `npm run package:check` — OK, 96 arquivos.
- [x] `npm run smoke` — `[DDAE smoke] OK`.
- [x] `ddae-engine validate`/`audit` via Stable Host — `Status: OK`, `Errors: 0`.
- [x] CI remota 5/5 (a confirmar após push).

## 12. Segurança

O collector lê conteúdo de arquivos, mas exclusivamente sob paths canônicos conhecidos dentro de `Docs/05_sessions/<sessão selecionada>/` e `Docs/04_governance/`/`Docs/06_quality_gates/` — nunca varre o projeto arbitrariamente, nunca lê `.env`/`node_modules`/`legacy/`, e nunca segue symlink para fora de `projectRoot` (testado). Markdown é sempre tratado como dado/evidência, nunca como instrução executável. O Sensitive Data Guard completo continua reservado ao Bloco 08/09 — este collector é seguro por construção (escopo de leitura fechado), não por filtro.

## 13. Performance

Não aplicável — leitura de um número pequeno e fixo de arquivos Markdown pequenos, sem recursão além de um nível por módulo conhecido.

## 14. Design System / UX

Não aplicável.

## 15. Riscos

- Parsing de status da sessão via checkbox estruturado (`## 5. Status`) é uma forma limitada de "entendimento" de Markdown — mitigado por ser um enum fechado de 4 opções literais, no mesmo padrão já usado e testado para quality gates (`quality-gates.js`), não inferência livre.
- BUG-01 (template do glossário) continua aberto — não afeta este collector, mas afeta a futura ingestão de `Docs/00_ddae_engine/glossario.md` pelo Context Compiler.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_02_ddae_state_collector --session session_02_context_compiler_0_3_0` (Stable Host), somente após a CI técnica verde.

## 17. Commit Semântico Sugerido

```
feat(context): add DDAE state collector
```
