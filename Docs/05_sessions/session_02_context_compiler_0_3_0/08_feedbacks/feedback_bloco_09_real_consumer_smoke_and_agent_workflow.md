# Feedback — Bloco 09: Real Consumer Smoke and Agent Workflow

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Resumo Executivo

Bloco validation-first: provou empiricamente, sem alterar `src/`, que o Context Compiler 0.3.0 no estado atual (Blocos 01–08 + Checkpoint 07.1) já entrega a um consumidor real um pacote de contexto suficiente, seguro, determinístico e auditável para um agente começar uma feature. A prova exploratória manual (não persistida) contra um consumidor TEMP realista — código/teste, arquitetura, decisão formal, bug da sessão atual, evidência de validação, um documento não relacionado dimensionado para criar pressão real de orçamento, um binário, e um segredo sentinela — confirmou dois comportamentos centrais sem qualquer surpresa negativa: (1) sob orçamento padrão, todo conteúdo core (arquitetura/decisão/bug/validação/código) é selecionado e o documento não relacionado é excluído por `budget_exceeded`, nunca por um threshold de relevância que não existe; (2) os arrays estruturados `manifest.decisions`/`bugs`/`validation` permanecem sempre vazios, por design (sem NLP), mas o conteúdo real correspondente continua disponível e corretamente rotulado em `## Relevant Files` — avaliado como P3 (melhoria de UX documentada), não P2 (blocker). 26 testes automatizados novos (`test/context-consumer-smoke.test.js`) codificam esses achados. `scripts/release/smoke-distribution.mjs` ganhou uma etapa adicional (`contextCompilerJourney`) provando que o mesmo comportamento funciona através do tarball Candidate empacotado e instalado, não apenas do checkout. Nenhum arquivo em `src/` foi tocado — confirmado explicitamente por `git diff --name-only -- src/` vazio. CI técnica 5/5 na primeira tentativa. Bloco concluído conforme escopo, **aprovado, sem blocker**.

## 2. Objetivo do Bloco

Responder empiricamente: "O Context Compiler 0.3.0, no estado atual, já entrega para um consumidor real um pacote de contexto suficiente, seguro, determinístico e auditável para um agente começar uma feature sem reconstruir manualmente o projeto?" — sem adicionar arquitetura nova. Ver `05_blocks/bloco_09_real_consumer_smoke_and_agent_workflow.md`.

## 3. Escopo Implementado

Exatamente o escopo planejado: prova manual exploratória, `test/context-consumer-smoke.test.js` (PROVA A via binário do checkout), extensão mínima e aditiva de `scripts/release/smoke-distribution.mjs` (PROVA B via tarball instalado), e prova de Authority em memória com claim explícito usando dados no estilo do consumidor. Nenhuma linha de `src/` foi alterada — o bloco permaneceu estritamente validation-first do início ao fim, como exigido.

## 4. Arquivos Criados

- `test/context-consumer-smoke.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_09_real_consumer_smoke_and_agent_workflow.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_09_real_consumer_smoke_and_agent_workflow.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_09_real_consumer_smoke_and_agent_workflow.md` (este arquivo)

## 5. Arquivos Alterados

- `scripts/release/smoke-distribution.mjs` — nova função `contextCompilerJourney` e uma nova etapa `Context compiler` no fluxo de `runDistributionSmoke`, puramente aditivas (nenhuma etapa existente foi modificada). Prova, via o mesmo `binPath` já usado por todas as outras etapas do script, que `context build/show/validate` funcionam no tarball instalado, com um segredo sentinela dedicado confirmando zero vazamento.

**`src/**` não foi alterado.** Confirmado explicitamente por `git diff --name-only -- src/` vazio antes do commit.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
node node_modules/ddae-engine/bin/ddae-engine.js block create "Real Consumer Smoke and Agent Workflow" --session session_02_context_compiler_0_3_0 --dir .
node node_modules/ddae-engine/bin/ddae-engine.js prompt create --block bloco_09_real_consumer_smoke_and_agent_workflow --session session_02_context_compiler_0_3_0 --dir .
node --test test/context-consumer-smoke.test.js
npm test
npm run package:check
npm run smoke
node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
node node_modules/ddae-engine/bin/ddae-engine.js audit --dir .
git diff --name-only -- src/
node node_modules/ddae-engine/bin/ddae-engine.js feedback create --block bloco_09_real_consumer_smoke_and_agent_workflow --session session_02_context_compiler_0_3_0 --dir .
```

## 8. Testes Realizados

- **Prova manual exploratória** (script ad-hoc, não persistido): consumidor TEMP com `init` + sessão canônica real (`session_01_auditoria_usuarios`) + Git real (branch/HEAD/working tree limpo) + conteúdo de domínio (código, teste, arquitetura, decisão, bug, validação) + documento não relacionado (~11 KB) + binário + `.env` com segredo sentinela. Executada duas vezes — budget `standard` (default) e `minimal` — confirmando: sob `standard`, todo conteúdo core selecionado, decisão incluída, roadmap excluído por `budget_exceeded`; sob `minimal`, o mesmo padrão mais visível (até a decisão perde espaço, uma demonstração legítima de pressão de orçamento, não um defeito). `manifest.decisions`/`bugs`/`validation`/`conflicts` sempre vazios em ambos os casos. Zero vazamento do sentinela em qualquer run.
- `test/context-consumer-smoke.test.js` — 26 testes (fixture construída uma única vez via hooks `before`/`after` do `node:test`, todas as asserções são leitura sobre o pacote já construído): inicialização, sessão canônica correta, Git real (branch/HEAD/working tree), `show`/`validate` funcionam, código/arquitetura/decisão/bug/validação selecionados e classificados corretamente (incluindo o caso nomeado `test/foo.test.js` → `source_code`, nunca `test_result` por nome), proveniência completa em todo `relevant_files`, conteúdo core rankeando acima do roadmap não relacionado, exclusão por pressão de orçamento em build dedicado (`minimal`) comprovando `reason: 'budget_exceeded'` — nunca um threshold de score, `.env` excluído por nome, segredo sentinela com zero ocorrências em manifest/CONTEXT.md/validation.json/stdout/stderr de build+show+validate, binário nunca vira Source, ausência de path absoluto, `CONTEXT.md` sozinho permite identificar goal/Git/sessão/arquivos core/decisão/bug/validação com proveniência, build repetido byte-idêntico, fingerprint estável, mutação de source selecionado → `STALE`/`SOURCE_CONTENT_CHANGED` sem vazamento, `show`/`validate` estritamente read-only, e o estado real (vazio, por design) dos arrays de fatos estruturados documentado explicitamente — mais dois testes de "Authority gate": todo `authority_class` do consumidor é um domínio conhecido, e uma prova de claim explícito (roadmap histórico vs. decisão atual, dados no estilo do consumidor) resolvendo corretamente via `resolveAuthorityConflict` e via `compileContext` real — 26 pass, 0 fail.
- `npm run smoke` (distribuição): nova etapa `Context compiler: OK` — tarball empacotado e instalado, `context build/show/validate` executados através do binário instalado, `.env` excluído, README.md ingerido, zero vazamento do segredo sentinela dedicado (`DDAE_DISTRIBUTION_SMOKE_SECRET_3C91EA`, diferente do usado no fixture da PROVA A e do usado no Bloco 08, para não acoplar suítes de teste).

## 9. Validações Executadas

- `npm test` — 438 testes, 435 pass, 0 fail, 3 skip (412 pré-existentes + 26 novos).
- `npm run package:check` — `OK`, 106 arquivos (**inalterado** em relação ao Bloco 08 — nenhum arquivo de produção novo, como esperado para um bloco estritamente de validação).
- `npm run smoke` — `[DDAE smoke] OK`, incluindo a nova etapa `Context compiler: OK`.
- `ddae-engine validate --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`.
- `ddae-engine audit --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`, `Warnings: 8` (7 quality gates pendentes de conteúdo, pré-existentes, mais 1 aviso legítimo de bloco sem feedback, capturado antes deste próprio feedback existir).
- `git diff --name-only -- src/` — vazio, confirmado explicitamente antes do commit.
- CI remota: commit técnico `8ab26b0221f001d46071a3c924da25b727e435ba`, run `31329699521`, `success`, 5/5 na primeira tentativa (`ubuntu-latest / Node 22`, `ubuntu-latest / Node 24`, `ubuntu-latest / Node 26`, `windows-latest / Node 24`, `macos-latest / Node 24`), incluindo o step de prova do Stable Host continuando verde nos 5 ambientes.

## 10. Decisões Técnicas

- **Fixture construída uma única vez via `before`/`after` do `node:test`, não recriada a cada teste** — decisão de performance sem sacrificar rigor: todos os 26 testes fazem apenas leitura sobre o pacote já construído (exceto os testes #18/#24/#26 que deliberadamente precisam de builds adicionais para provar pressão de orçamento, determinismo, e staleness). Mantém a suíte rápida (~3s) sem reduzir cobertura.
- **PROVA A usa o binário do checkout (via `runCli`, já o padrão de todo `test/cli-*.test.js`), PROVA B usa o tarball instalado** — decisão deliberada, não uma omissão: `npm run smoke` já é o gate dedicado para "isso funciona quando publicado", executado em toda CI; duplicar o fluxo completo de empacotamento dentro de `context-consumer-smoke.test.js` seria redundante e mais lento sem adicionar cobertura real.
- **Segredos sentinela distintos por suíte** (`DDAE_CONSUMER_SMOKE_SECRET_91B7F2` na PROVA A, `DDAE_DISTRIBUTION_SMOKE_SECRET_3C91EA` na PROVA B, diferentes do sentinela do Bloco 08) — evita qualquer acoplamento acidental entre suítes de teste e torna cada prova de vazamento independente e auto-contida.
- **O achado sobre `manifest.decisions`/`bugs`/`validation` permanecerem vazios foi registrado como P3 (melhoria de UX documentada), não como P2 (blocker de completude)** — porque o critério real de suficiência ("um agente consegue começar a feature lendo o `CONTEXT.md`") foi objetivamente satisfeito: o conteúdo da decisão/bug/validação está presente, completo, e corretamente rotulado (`kind`/`authority_class`) em `## Relevant Files`. A ausência é apenas na seção de conveniência dedicada — uma limitação de apresentação, não de informação disponível.

## 11. Problemas Encontrados

Nenhum problema bloqueante. Nenhuma correção foi necessária em nenhum arquivo — nem de produção, nem de teste — durante a escrita deste bloco; todos os testes passaram na primeira execução, porque a prova manual exploratória (Seção 8) já havia validado o comportamento exato antes de qualquer asserção ser escrita.

## 12. Correções Aplicadas Durante o Bloco

Nenhuma.

## 13. Pendências

### P1 — Crítica

Nenhuma.

### P2 — Importante

Nenhuma. (Avaliado explicitamente e descartado — ver Seção 10, último item.)

### P3 — Melhoria Recomendada

- **Structured context completeness (UX)**: as seções `## Decisions`/`## Known Bugs`/`## Validation` do `CONTEXT.md` sempre leem "None recorded." mesmo quando conteúdo relevante desse tipo foi selecionado em `## Relevant Files`, porque `manifest.decisions`/`bugs`/`validation` só são populados a partir de entrada formalmente estruturada, que a CLI atual nunca fornece. Um bloco futuro poderia considerar uma view de conveniência derivada de `relevant_files` já classificados por `kind` (sem NLP, sem inferência de conteúdo) — decisão de design deliberadamente fora do escopo deste bloco, que é estritamente de validação.
- BUG-01 (template do glossário, herdado do Bloco 01 desta sessão) continua aberto — alvo de bloco futuro desta mesma sessão.

### P4 — Opcional

Nenhuma.

## 14. Riscos Restantes

Nenhum novo além do já registrado no bloco (Seção 15 de `05_blocks/bloco_09_real_consumer_smoke_and_agent_workflow.md`). BUG-01 permanece aberto, P3, não relacionado a este bloco.

## 15. Evidências

```text
Prova manual exploratória (budget standard vs. minimal, mesmo fixture):

standard: budget.used_chars 59952/60000
  relevant_files inclui: validation (score 19), architecture (16), test (16), bug (14),
    src/auditoria_usuarios.js (14), decision registro_decisoes.md (score 6) — TODOS presentes
  roadmap_future.md: excluded_sources, reason budget_exceeded, score 2

minimal: budget.used_chars 19922/20000
  relevant_files inclui: validation, architecture, test, bug, src/auditoria_usuarios.js — presentes
  decision registro_decisoes.md: excluded_sources, reason budget_exceeded (squeeze sob pressão forte)
  roadmap_future.md: excluded_sources, reason budget_exceeded, score 2

sentinel leak (ambos os runs): manifest=false, CONTEXT.md=false

Distribution smoke (tarball instalado):
Context compiler: OK

npm test: 438 tests, 435 pass, 0 fail, 3 skip
npm run package:check: OK, 106 files (inalterado)
npm run smoke: [DDAE smoke] OK
stable host validate: Status OK, Sessions found 2, Errors 0
stable host audit: Status OK, Sessions found 2, Errors 0, Warnings 8 (pré-existentes)
git diff --name-only -- src/: (vazio)

Technical commit: 8ab26b0221f001d46071a3c924da25b727e435ba
Technical CI: 31329699521 — success, 5/5 (primeira tentativa)
  ubuntu-latest / Node 22: success
  ubuntu-latest / Node 24: success
  ubuntu-latest / Node 26: success
  windows-latest / Node 24: success
  macos-latest / Node 24: success
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Bloco 10 — BUG-01 + Context Compiler Polish.

## 18. Commit Semântico Sugerido

```
test(context): add real consumer context smoke
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
