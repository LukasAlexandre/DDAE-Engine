# Session 01 — DDAE self hosting bootstrap

> Projeto: DDAE · Atualizado em: 2026-08-08

> Este README é o ponto de entrada da sessão. Qualquer pessoa ou agente de IA deve conseguir, lendo só este arquivo, entender o que esta sessão faz, o que já está pronto e qual é o próximo passo — sem precisar abrir todas as subpastas.

## 1. Objetivo

Tornar o DDAE-Engine consumidor real de sua própria release pública estável, deixando de apenas conter o pacote `ddae-engine` instalado dentro do próprio repositório e passando a ser efetivamente governado por ele — sem criar autodependência publicada, sem auto-modificação autônoma, e sem apagar o histórico interno já existente.

## 2. Contexto

Até esta sessão, o desenvolvimento do próprio DDAE-Engine foi documentado em `docs/sessions/` (histórico legacy interno) — uma convenção criada antes de o produto sequer ter o contrato de sessões/módulos que hoje oferece a consumidores. O DDAE-Engine nunca havia rodado `ddae-engine validate`/`ddae-engine audit` contra si mesmo, e nunca havia sido governado por uma versão publicada de si mesmo. Esta é a primeira sessão criada pelo próprio comando `ddae-engine session create`, executado através do **Stable Host** — `ddae-engine@0.2.0`, publicado no registro npm e instalado localmente em `node_modules/ddae-engine/` — em vez de pelo checkout em desenvolvimento (**Candidate**).

## 3. Escopo

- Instalação do Stable Host (`ddae-engine@0.2.0` via `npm install --no-save`, sem persistir em `package.json`).
- Adoção do scaffold `Docs/` no próprio repositório, mesclado com segurança (matriz de colisão, zero sobrescrita) contra o histórico já existente.
- Criação desta sessão canônica (`session_01_ddae_self_hosting_bootstrap`) exclusivamente pelo Stable Host.
- Registro do roadmap de produto (`0.3.0` Context Compiler, `0.4.0` Obsidian Workspace / Project Brain) em `Docs/01_product/`.
- Validação de que o Stable Host reconhece e valida o próprio repositório como projeto DDAE consumidor (`validate`/`audit`) — Bloco 04.

## 4. Fora de Escopo

- Qualquer alteração em `src/`, `bin/`, `test/`, `scripts/` do candidate.
- Migração, renumeração ou exclusão de `docs/sessions/` (histórico legacy — permanece intocado).
- Retomada do desenvolvimento do Context Compiler (`docs/sessions/session_12_context_compiler_foundation/`, Bloco 03 dessa sessão legacy) — só ocorre em uma sessão canônica futura (`session_02_...`), depois que este bootstrap for aprovado.
- Implementação de qualquer código ou estrutura do Obsidian Workspace / Project Brain (`0.4.0`) — apenas reservado no roadmap.
- Publicação npm, criação de tag, GitHub Release.

## 5. Status

- [ ] Não iniciada
- [x] Em andamento
- [ ] Concluída
- [ ] Bloqueada

## 6. Documentos Obrigatórios Desta Sessão

Marque conforme forem preenchidos. Um agente retomando o trabalho deve checar esta lista antes de assumir que a sessão está pronta para revisão.

- [x] `01_intake/levantamento_inicial.md`
- [ ] `02_analysis/` (funcional, técnica, arquitetural, riscos)
- [ ] `04_planning/plano_execucao.md`
- [ ] `05_blocks/` — ao menos um bloco criado
- [ ] `06_prompts/` — um prompt por bloco
- [ ] `08_feedbacks/` — um feedback por bloco concluído
- [ ] `09_validation/fechamento_sessao.md`

## 7. Blocos Planejados

| Bloco | Título | Status |
|---|---|---|
| 03 (legacy `session_13`, Bloco 03) | Canonical Self-Host Session Bootstrap — criação desta sessão | Concluído |
| 04 (legacy `session_13`, Bloco 04) | Self-Hosting Validation Proof — `validate`/`audit` via Stable Host contra o próprio repositório | Pendente |

Numeração de bloco herdada da sessão legacy de transição (`docs/sessions/session_13_ddae_self_hosting_bootstrap/`), que orquestra este bootstrap até ele estar concluído — ver Seção 9 (Dependências).

## 8. Riscos

Nenhum risco novo específico desta sessão além dos já registrados na sessão legacy de transição (`docs/sessions/session_13_ddae_self_hosting_bootstrap/validacao_bloco_02_stable_host_collision_scaffold.md`): dependência do comportamento nativo de filesystem case-insensitive do Windows para a matriz de colisão `Docs`/`docs`, e a necessidade de manter `node_modules/ddae-engine/` sempre reinstalado localmente (efêmero, não versionado) antes de qualquer ação de governança.

## 9. Dependências

Esta sessão é criada e orquestrada pela sessão legacy de transição `docs/sessions/session_13_ddae_self_hosting_bootstrap/` (Bloco 03), que define o contrato de self-hosting (`contrato_self_hosting_v1.md`) sob o qual esta sessão existe. Também depende, historicamente, de `docs/sessions/session_12_context_compiler_foundation/` — sessão legacy que iniciou o desenvolvimento do Context Compiler (Bloco 01 aprovado, Checkpoint 01.1 aprovado, Bloco 02 aprovado, Bloco 03 não iniciado) e que fica pausada até uma sessão canônica futura (`session_02_...`) retomar esse trabalho sob este novo control plane.

## 10. Resultado

Sessão criada com sucesso pelo Stable Host (`ddae-engine@0.2.0`, `node_modules/ddae-engine/bin/ddae-engine.js`), com os 13 módulos oficiais da release 0.2.0. Preenchimento completo (`02_analysis/` em diante) fica para o fechamento formal do bootstrap, no Bloco 04/05 da sessão legacy de transição.

## 11. Próxima Sessão

`session_02_context_compiler_0_3_0` (nome provisório) — só criada depois que o Bloco 04 (Self-Hosting Validation Proof) da sessão legacy de transição aprovar `validate`/`audit` do Stable Host contra este repositório. Retoma, sob o novo control plane canônico, o trabalho pausado em `docs/sessions/session_12_context_compiler_foundation/` (Bloco 03 — DDAE State Collector, e adiante).
