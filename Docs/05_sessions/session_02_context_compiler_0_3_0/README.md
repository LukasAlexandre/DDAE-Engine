# Session 02 — context compiler 0 3 0

> Projeto: DDAE · Atualizado em: 2026-08-09

> Este README é o ponto de entrada da sessão. Qualquer pessoa ou agente de IA deve conseguir, lendo só este arquivo, entender o que esta sessão faz, o que já está pronto e qual é o próximo passo — sem precisar abrir todas as subpastas.

## 1. Objetivo

Retomar e concluir o desenvolvimento do DDAE Context Compiler (target de produto `0.3.0`), agora sob o control plane canônico de self-hosting (`Docs/05_sessions/`), continuando exatamente de onde o predecessor legacy parou.

## 2. Contexto

O Context Compiler começou em `legacy/sessions/session_12_context_compiler_foundation/` (histórico de engenharia pré-self-hosting), onde foram aprovados: Bloco 01 (Context Model & Architecture), Checkpoint 01.1 (correção de proveniência do baseline), Bloco 02 (Git + Project Collectors — `src/context/git-context.js`, `src/context/project-context.js`). O Bloco 03 (DDAE State Collector) nunca foi iniciado ali — a sessão foi pausada para o bootstrap de self-hosting (`legacy/sessions/session_13_ddae_self_hosting_bootstrap/`, concluído). Esta sessão (`session_02`) é a continuação formal, criada pelo Stable Host (`ddae-engine@0.2.0`), sob o novo control plane canônico.

## 3. Escopo

- Bloco 01 — Cross-Platform Self-Host Docs Casing: corrigir a estrutura física do próprio repositório antes de qualquer implementação nova (ver Seção 7).
- Bloco 02 em diante — retomar o Context Compiler: DDAE State Collector, Authority & Source Model, Relevance Engine v1, Context Manifest + Compiler, Markdown Renderer, `context build/show/validate` CLI, Sensitive Data Guard, smoke com consumidor real e com o próprio self-host, correção do BUG-01 (template do glossário), preparação de release, release `0.3.0`.

## 4. Fora de Escopo

- Work Packets, Handoff, MCP Server, Obsidian Workspace (reservado para `0.4.0` — ver `Docs/01_product/visao_produto.md`, Seção 4).
- Qualquer reescrita do histórico legacy (`legacy/sessions/`).
- Publicação `0.3.0` antes de todos os blocos desta sessão estarem aprovados.

## 5. Status

- [ ] Não iniciada
- [x] Em andamento
- [ ] Concluída
- [ ] Bloqueada

## 6. Documentos Obrigatórios Desta Sessão

- [x] `01_intake/levantamento_inicial.md`
- [ ] `02_analysis/` (funcional, técnica, arquitetural, riscos)
- [ ] `04_planning/plano_execucao.md`
- [x] `05_blocks/` — ao menos um bloco criado (Bloco 01)
- [ ] `06_prompts/` — um prompt por bloco
- [ ] `08_feedbacks/` — um feedback por bloco concluído
- [ ] `09_validation/fechamento_sessao.md`

## 7. Blocos Planejados

| Bloco | Título | Status |
|---|---|---|
| 01 | Cross-Platform Self-Host Docs Casing (+ Checkpoint 01.1 — Linux Stable Host Proof) | Concluído — aprovado integralmente |
| 02 | DDAE State Collector | Concluído — aprovado |
| 03 | Authority & Source Model | Concluído — aprovado |
| 04 | Relevance Engine v1 | Concluído — aprovado |
| 05 | Context Manifest + Compiler | Concluído — aprovado |
| 06 | Markdown Renderer | Concluído — aprovado |
| 07 | `context build/show/validate` CLI (+ Checkpoint 07.1 — Fingerprint Session Selection Integrity) | Concluído — aprovado integralmente |
| 08 | Sensitive Data Guard | Concluído — aprovado |
| 09 | Consumer + Self-host Smoke | Concluído — aprovado |
| 10 | BUG-01 (template do glossário) + polish | Concluído — aprovado |
| 11 | Release Readiness | Pendente |
| 12 | Release `0.3.0` | Pendente |

## 8. Riscos

Nenhum risco aberto. BUG-01 (P3, herdado de `session_01_ddae_self_hosting_bootstrap`) foi corrigido no Bloco 10 — ver `session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_corrigidos.md`.

## 9. Dependências

Depende de `legacy/sessions/session_12_context_compiler_foundation/` (contrato do Manifest v1, collectors já implementados) e de `session_01_ddae_self_hosting_bootstrap/` (self-hosting operacional, `Docs/00_ddae_engine/self_hosting.md`).

## 10. Resultado

Bloco 01 concluído e integralmente fechado: estrutura física do repositório corrigida para portabilidade cross-platform, sem perda de conteúdo (113 arquivos verificados byte-a-byte). Checkpoint 01.1 fechou a única evidência pendente — o Stable Host publicado (`ddae-engine@0.2.0`) agora é comprovadamente instalado e executado (`validate`/`audit`) contra este checkout dentro da CI, nos 5 ambientes da matriz, com evidência de log real capturada de um runner Linux. Bloco 02 concluído: `collectDdaeContext` (`src/context/ddae-context.js`) implementado — terceiro sensor do Context Compiler, coletando sessão atual, módulos, blocos, prompts, feedbacks, bugs, validação e governança de forma determinística, read-only, sem tocar `legacy/sessions/`. 26 testes novos, provado contra o próprio self-host, CI 5/5. Bloco 03 concluído: Source Model v1 e Authority Model v1 (`src/context/authority.js`) implementados — `createSource` normaliza evidência em Sources canônicas com domínio sempre explícito (nunca inferido de `kind`/prosa), `resolveAuthorityConflict` resolve conflitos por partição de domínio (`future_intent`/`history` nunca vencem o presente), preservando toda fonte perdedora com `reason_superseded` categórico, e retornando `unresolved` quando não há vencedor objetivo. 34 testes novos, incluindo o caso nomeado JWT vs HttpOnly, provado contra saída real dos três coletores desta sessão, CI 5/5. Bloco 04 concluído: motor de relevância v1 (`src/context/relevance.js`) implementado — lexical, heurístico, determinístico, offline, goal-driven, budget-aware, zero dependências. `normalizeGoal` tokeniza objetivos sem tradução/stemming/sinônimos; `scoreRelevanceCandidate` pontua candidatos com breakdown auditável por campo e sinal explícito, nunca inferido de `kind`; `rankRelevantSources` ordena e seleciona por orçamento de caracteres sem nunca truncar conteúdo. Relevância comprovadamente independente de autoridade (`authority_class` nunca influencia score). 47 testes novos, provado contra o próprio self-host com Sources reais dos três coletores. CI 5/5 (após correção de um bug no próprio helper de teste, restrito a `windows-latest`, sem impacto no código de produção). Bloco 05 concluído: núcleo canônico do Context Compiler implementado (`src/schemas/context-schema.js`, `src/context/fingerprint.js`, `src/context/manifest.js`, `src/context/compiler.js`) — `compileContext` orquestra coletores, Source/Authority Model e Relevance Engine em um Context Manifest v1 validado, determinístico e fingerprinted, inteiramente em memória, sem tocar filesystem/rede. Claims conflitantes são sempre explícitos (sem descoberta automática por NLP); o caso JWT vs HttpOnly foi reproduzido ponta a ponta através do Compiler. 83 testes novos, provado contra o próprio self-host (manifesto real, determinismo confirmado, schema válido). CI 5/5 na primeira tentativa. Bloco 06 concluído: Markdown Renderer (`src/context/renderer.js`) implementado — função pura que transforma um Manifest v1 validado em `CONTEXT.md`, com dez seções fixas sempre presentes na mesma ordem, Architecture como view filtrada de `relevant_files` (nunca inferida por NLP), `excluded_sources` mantido semanticamente distinto de Out of Scope, e proteção estrutural contra Markdown injection via fences dinâmicos. 47 testes novos, provado contra o próprio self-host (Manifest real via `compileContext`, determinismo byte-a-byte confirmado, fingerprint intocado após renderização). CI 5/5 na primeira tentativa. Bloco 07 concluído: Context Compiler exposto publicamente via `ddae-engine context build/show/validate` — `src/context/validator.js` (kernel VALID/STALE/INVALID) e `src/commands/context.js` implementados e integrados a `src/cli.js`. `context build` roda em modo estrutural fail-closed (candidates/claims/facts vazios) até o Sensitive Data Guard existir, mas já persiste um Manifest real e `CONTEXT.md` sob `.ddae/context/`, com `.ddae/.gitignore` self-ignore, containment de path/symlink no destino de escrita, e determinismo byte-a-byte comprovado. `context show`/`context validate` são estritamente read-only. 59 testes novos, provado em consumidor TEMP real via o binário Candidate (build/show/validate, staleness por HEAD, `.gitignore` self-ignore em repositório Git real) — o próprio checkout do DDAE-Engine permanece sem `.ddae/`. CI 5/5 na primeira tentativa. Checkpoint 07.1 concluído: auditoria cruzada pós-Bloco 07 encontrou uma lacuna de integridade — o fingerprint canônico incorporava `session.id` mas não `session.selection_reason`, permitindo que dois Manifests com a mesma sessão selecionada por motivos diferentes (`explicit` vs. `latest_canonical`) colidissem no mesmo fingerprint. Corrigido em `src/context/fingerprint.js`/`compiler.js`/`validator.js` (payload estendido, sem quebrar `schema_version`/compatibilidade). Prova: mesma sessão + `selection_reason` diferente → fingerprints diferentes; adulterar apenas `selection_reason` (com `CONTEXT.md` re-renderizado coerentemente) é detectado como `INVALID`/`FINGERPRINT_MISMATCH`; determinismo preservado. 5 testes novos, CI 5/5 na primeira tentativa. Bloco 08 concluído: Sensitive Data Guard (`src/context/sensitive-files.js`) implementado — a fronteira de segurança que permite `context build` sair do Safe Structural Mode e ingerir conteúdo textual real do projeto. Deny list por nome, diretórios nunca percorridos (incluindo proteção contra `.ddae/context/` realimentar um build), symlink fail-closed, limite de tamanho, detecção de binário, e heurística de conteúdo sensível — tudo aplicado antes de qualquer conteúdo chegar a `createSource`/Manifest/`CONTEXT.md`. `excluded_sources` passou a suportar exclusões de segurança (`{path, reason}`, sem `source_id`, sem conteúdo) além das exclusões de relevância já existentes. `context build`/`context validate` agora usam o mesmo pipeline de segurança para ingestão e para releitura de frescor. 44 testes novos, provado em consumidor TEMP real com segredo sentinela (zero vazamento em qualquer artefato ou canal de saída, nos três comandos) e contra o próprio repositório self-hosted (300 fontes seguras, 7 exclusões legítimas, determinístico). CI 5/5 na primeira tentativa. Bloco 09 concluído: bloco estritamente validation-first, sem qualquer alteração em `src/**` — provou empiricamente, contra um consumidor TEMP realista (código, teste, arquitetura, decisão formal, bug, validação, documento não relacionado dimensionado para pressão real de orçamento, binário, segredo sentinela) e contra o tarball Candidate empacotado e instalado, que o Context Compiler 0.3.0 já entrega um pacote suficiente, seguro, determinístico e auditável para um agente de IA começar uma feature lendo apenas `CONTEXT.md`. Confirmou que a exclusão por pressão de orçamento nunca é confundida com um threshold de relevância (que não existe) e que os arrays estruturados de fatos (`decisions`/`bugs`/`validation`) permanecem sempre vazios por design (sem NLP), com o conteúdo real ainda disponível e corretamente rotulado em `Relevant Files` — registrado como P3 (melhoria de UX), não P2 (blocker). 26 testes novos (`test/context-consumer-smoke.test.js`) e uma nova etapa aditiva em `scripts/release/smoke-distribution.mjs` (`contextCompilerJourney`). Nenhum blocker de produto encontrado. CI 5/5 na primeira tentativa. Bloco 10 concluído: bloco de polish/correção, deliberadamente pequeno — corrigiu BUG-01 (o template do glossário renderizava, em vez de documentar, os tokens `{{PROJECT_NAME}}`/`{{CURRENT_DATE}}`, herdado de `session_01_ddae_self_hosting_bootstrap`) com um mecanismo mínimo de escape (`\{{KEY}}`) em `renderTemplate` (`src/utils/text.js`), sem tocar o núcleo do Context Compiler já provado no Bloco 09. O bug foi reproduzido contra o Candidate antes de qualquer alteração de código, confirmando exatamente a causa raiz já registrada em `session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_identificados.md`. 10 testes novos (8 unitários sobre `renderTemplate`, 2 E2E via `ddae-engine init` real, incluindo prova de determinismo). `src/context/**`, `src/schemas/context-schema.js` e `src/commands/context.js` permaneceram intocados, confirmado por diff explícito antes do commit técnico. O bloco também corrigiu uma inexatidão de provenance encontrada no documento de validação do Bloco 09 (o baseline pré-bloco estava registrado incorretamente como o próprio commit técnico do bloco) e moveu BUG-01 de aberto para corrigido em `session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_corrigidos.md`. CI 5/5 na primeira tentativa. Demais blocos ainda não iniciados.

## 11. Próxima Sessão

Nenhuma ainda — esta sessão continua em andamento até a release `0.3.0` (Bloco 12).
