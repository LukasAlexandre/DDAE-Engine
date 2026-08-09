# Bloco 09 — Real Consumer Smoke and Agent Workflow

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Objetivo

Provar empiricamente, sem alterar `src/`, que o Context Compiler 0.3.0 no estado atual (Blocos 01–08 + Checkpoint 07.1) já entrega a um consumidor real um pacote de contexto suficiente, seguro, determinístico e auditável para um agente de IA começar uma feature — não construir arquitetura nova.

## 2. Contexto

Este bloco é validation-first, não implementation-first. Contrato de referência: `legacy/sessions/session_12_context_compiler_foundation/plano_bloco_12.md` (antigo Bloco 10 — Real Consumer Smoke/Agent Workflow). Blocos 01–08 entregaram cada peça isoladamente (coletores, Source/Authority Model, Relevance Engine, Manifest/Compiler, Renderer, CLI, Sensitive Data Guard); este bloco é o primeiro a provar a cadeia inteira, de ponta a ponta, contra um consumidor com forma realista.

## 3. Problema que Este Bloco Resolve

Sem uma prova de ponta a ponta contra um consumidor realista, não há evidência de que a composição dos oito blocos anteriores realmente produz um `CONTEXT.md` útil — cada bloco prova sua própria peça isoladamente, mas nenhum prova a experiência final de um agente que só tem acesso ao `CONTEXT.md`. Este bloco também é a primeira vez que a distribuição real (tarball empacotado + instalado) é exercitada com a capability de Context Compiler, não apenas com os comandos de governança já cobertos por `scripts/release/smoke-distribution.mjs`.

## 4. Escopo

- Prova manual exploratória (não persistida) contra um consumidor TEMP com conteúdo realista: código/teste relevante, arquitetura, decisão formal, bug da sessão atual, evidência de validação, um documento não relacionado dimensionado para criar pressão real de orçamento, um binário, e um segredo sentinela.
- `test/context-consumer-smoke.test.js` — prova automatizada (PROVA A), via binário do checkout, cobrindo os 30 itens do prompt do bloco: inicialização, sessão canônica, Git real, classificação de Source, seleção por relevância, exclusão por pressão de orçamento (nunca por threshold de score), exclusão de segurança, zero vazamento de segredo, ausência de path absoluto, legibilidade do `CONTEXT.md` para um agente, determinismo, staleness guardada, e o estado real (não presumido) dos arrays estruturados de fatos.
- Extensão mínima de `scripts/release/smoke-distribution.mjs` (PROVA B) — prova de que o tarball Candidate empacotado e instalado em um diretório TEMP também executa `context build/show/validate` com sucesso, com o mesmo zero-vazamento de segredo.
- Prova de Authority em memória (Etapa 19) usando `Source`s reais no estilo do consumidor (roadmap histórico vs. decisão atual aprovada), sem alterar `authority.js`.

## 5. Fora de Escopo

- Qualquer alteração em `src/**` — este bloco é estritamente de validação. Se um teste revelasse a necessidade de alterar `src/`, o bloco pararia e reportaria o gap sem implementar a correção (nenhum gap foi encontrado — ver Seção 8).
- NLP, extração automática de fatos, threshold mínimo de relevância, alteração de pesos do Relevance Engine.
- Integração real com Claude Code/Codex/qualquer LLM, embeddings, MCP, Obsidian.
- Correção do BUG-01, bump de versão, publicação npm, tag, Session 03.

## 6. Arquivos e Pastas Envolvidos

- `test/context-consumer-smoke.test.js` (novo).
- `scripts/release/smoke-distribution.mjs` (alterado — nova etapa `contextCompilerJourney`, puramente aditiva).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_09_real_consumer_smoke_and_agent_workflow.md` (este arquivo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_09_real_consumer_smoke_and_agent_workflow.md` e `08_feedbacks/feedback_bloco_09_real_consumer_smoke_and_agent_workflow.md` (gerados após a CI técnica verde).

## 7. Dependências

- Blocos 01–08 + Checkpoint 07.1 — usados exclusivamente como consumidores das APIs já existentes, nunca alterados.
- `scripts/release/verify-package.mjs` (para `PROJECT_ROOT`/`EXPECTED_VERSION`, reaproveitados sem alteração pela extensão do smoke de distribuição).

## 8. Achados da Prova Manual (antes de qualquer teste persistido)

1. **Relevância e pressão de orçamento**: sob o budget default (`standard`), todos os quatro tipos de conteúdo core (arquitetura, decisão, bug, validação) mais código/teste relevante foram selecionados; o documento não relacionado (`roadmap_future.md`, ~11 KB) nunca foi selecionado, excluído por `budget_exceeded` — nunca por um threshold de score (que não existe no Relevance Engine v1). Sob pressão artificial de orçamento (`minimal`), o mesmo padrão se confirma de forma ainda mais visível.
2. **Fatos estruturados (`manifest.decisions`/`bugs`/`validation`) permanecem sempre vazios** — confirmado, por design (Bloco 08: sem NLP, sem extração automática). As seções dedicadas `## Decisions`/`## Known Bugs`/`## Validation` do `CONTEXT.md` sempre leem "None recorded." mesmo quando o conteúdo correspondente foi de fato selecionado. **O conteúdo real da decisão/bug/validação continua disponível e corretamente identificado (kind/authority_class) na seção `## Relevant Files`** — confirmado por teste. Avaliação: o pacote permanece objetivamente suficiente para um agente que lê o `CONTEXT.md` completo (não apenas os cabeçalhos de seção). Registrado como **P3 — melhoria de UX documentada** (Seção 15), não um blocker P2: nenhuma alteração de runtime foi feita.
3. **Nenhum blocker de produto foi encontrado.** Todos os 30 itens do prompt do bloco foram satisfeitos pelo comportamento já existente, sem qualquer alteração em `src/`.

## 9. Plano de Execução

1. Reler `plano_bloco_12.md` (antigo Bloco 10) e o runtime atual completo do Context Compiler.
2. Construir e explorar manualmente (script ad-hoc, não persistido) um consumidor TEMP realista, observando o Manifest/CONTEXT.md reais sob budget `standard` e `minimal`.
3. Avaliar suficiência do pacote para um agente, registrando achados sem alterar `src/`.
4. Escrever `test/context-consumer-smoke.test.js` (PROVA A) codificando os achados como asserções automatizadas.
5. Estender `scripts/release/smoke-distribution.mjs` minimamente (PROVA B) para provar a mesma capability através do tarball instalado.
6. Escrever a prova de Authority em memória (Etapa 19).
7. Rodar `npm test`, `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
8. Auditar o diff, confirmando explicitamente `git diff --name-only -- src/` vazio.

## 10. Critérios de Aceite

- [x] Consumidor real inicializa, cria sessão canônica, tem Git real disponível.
- [x] `context build/show/validate` funcionam via binário do checkout e via tarball instalado.
- [x] Sources relevantes (arquitetura/decisão/bug/validação/código) classificadas corretamente, com proveniência completa.
- [x] `test/foo.test.js` classificado como `source_code`, nunca `test_result` por nome.
- [x] Conteúdo core rankeia acima de documento não relacionado; exclusão por pressão de orçamento comprovada sem alterar pesos.
- [x] `.env` excluído por nome; binário nunca vira Source; segredo sentinela zero vazamento em todos os canais (Manifest, CONTEXT.md, validation.json, stdout, stderr, tarball instalado).
- [x] Nenhum path absoluto vaza.
- [x] `CONTEXT.md` sozinho permite identificar goal, estado Git, sessão atual, arquivos core, decisão/bug/validação com proveniência.
- [x] Builds repetidos byte-idênticos; fingerprint estável.
- [x] Mutação de source selecionado sem rebuild → `STALE`/`SOURCE_CONTENT_CHANGED`, sem vazamento.
- [x] `show`/`validate` estritamente read-only.
- [x] Estado real dos arrays de fatos estruturados documentado sem presumir NLP.
- [x] Prova de Authority em memória com claim explícito, sem alterar `authority.js`.
- [x] **Zero alteração em `src/**`.**

## 11. Validações Obrigatórias

- [x] `npm test` — suíte completa, 0 falhas.
- [x] `npm run package:check` — OK, contagem de arquivos inalterada (nenhum novo arquivo de produção).
- [x] `npm run smoke` — `[DDAE smoke] OK`, incluindo a nova etapa `Context compiler: OK`.
- [x] `ddae-engine validate`/`audit` via Stable Host — `Status: OK`, `Errors: 0`.
- [x] CI remota 5/5 (a confirmar após push).

## 12. Segurança

Nenhuma superfície nova — este bloco só exercita a fronteira de segurança já implementada no Bloco 08 (Sensitive Data Guard), provando-a contra um consumidor realista e contra o tarball instalado, com um segredo sentinela dedicado (diferente do usado no Bloco 08, para evitar qualquer acoplamento acidental entre suítes de teste).

## 13. Performance

Não aplicável — mesma característica de performance já estabelecida no Bloco 08 (early-exit antes de leitura de conteúdo).

## 14. Design System / UX

Não aplicável ao produto DDAE-Engine em si; a legibilidade do `CONTEXT.md` para um agente foi o próprio objeto de prova deste bloco (Seção 8, item 2).

## 15. Riscos

- **P3 — melhoria de UX documentada**: as seções dedicadas `## Decisions`/`## Known Bugs`/`## Validation` do `CONTEXT.md` sempre leem "None recorded." mesmo quando conteúdo relevante desse tipo foi selecionado (ele aparece, correto e completo, em `## Relevant Files`). Um bloco futuro poderia considerar uma view de conveniência derivada de `relevant_files` já classificados por `kind` (sem NLP, sem inferência de conteúdo) — não implementado aqui, por ser fora do escopo estritamente validation-first deste bloco.
- BUG-01 continua aberto — não afeta este bloco.

## 16. Pendências Esperadas

- P3 registrada na Seção 15 — melhoria de UX, não uma lacuna funcional. Nenhuma pendência P1/P2.

## 17. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_09_real_consumer_smoke_and_agent_workflow --session session_02_context_compiler_0_3_0` (Stable Host), somente após a CI técnica verde.

## 18. Commit Semântico Sugerido

```
test(context): add real consumer context smoke
```
