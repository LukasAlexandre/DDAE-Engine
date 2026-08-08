# Session 02 — context compiler 0 3 0

> Projeto: DDAE · Atualizado em: 2026-08-08

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
| 02 | DDAE State Collector | Pendente |
| 03 | Authority & Source Model | Pendente |
| 04 | Relevance Engine v1 | Pendente |
| 05 | Context Manifest + Compiler | Pendente |
| 06 | Markdown Renderer | Pendente |
| 07 | `context build/show/validate` CLI | Pendente |
| 08 | Sensitive Data Guard | Pendente |
| 09 | Consumer + Self-host Smoke | Pendente |
| 10 | BUG-01 (template do glossário) + polish | Pendente |
| 11 | Release Readiness | Pendente |
| 12 | Release `0.3.0` | Pendente |

## 8. Riscos

Nenhum risco novo além dos já registrados nos módulos `07_bugs/` desta e da sessão predecessora (BUG-01, P3, herdado de `session_01_ddae_self_hosting_bootstrap`).

## 9. Dependências

Depende de `legacy/sessions/session_12_context_compiler_foundation/` (contrato do Manifest v1, collectors já implementados) e de `session_01_ddae_self_hosting_bootstrap/` (self-hosting operacional, `Docs/00_ddae_engine/self_hosting.md`).

## 10. Resultado

Bloco 01 concluído e integralmente fechado: estrutura física do repositório corrigida para portabilidade cross-platform, sem perda de conteúdo (113 arquivos verificados byte-a-byte). Checkpoint 01.1 fechou a única evidência pendente — o Stable Host publicado (`ddae-engine@0.2.0`) agora é comprovadamente instalado e executado (`validate`/`audit`) contra este checkout dentro da CI, nos 5 ambientes da matriz, com evidência de log real capturada de um runner Linux. Demais blocos ainda não iniciados.

## 11. Próxima Sessão

Nenhuma ainda — esta sessão continua em andamento até a release `0.3.0` (Bloco 12).
