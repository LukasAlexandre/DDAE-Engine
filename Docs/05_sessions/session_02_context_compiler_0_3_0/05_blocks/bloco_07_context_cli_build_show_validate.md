# Bloco 07 — Context CLI build show validate

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Objetivo

Expor o Context Compiler 0.3.0 — até aqui um kernel em memória — como uma capability pública do consumidor via `ddae-engine context build/show/validate`, persistindo o pacote de contexto sob `.ddae/context/`, em modo estrutural seguro (fail-closed) até o Sensitive Data Guard existir.

## 2. Contexto

Contrato de referência: `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seções 10, 11, 12, 14, 15 — Git degraded mode, política de `.ddae/`, segurança, contrato de CLI, staleness) e `plano_bloco_12.md` (Bloco 08 — CLI). Esta sessão já entregou o Compiler (Bloco 05) e o Renderer (Bloco 06); este bloco é o primeiro a produzir um artefato persistente e a primeira vez que o Context Compiler é alcançável sem escrever código.

## 3. Problema que Este Bloco Resolve

Sem uma CLI, o Compiler e o Renderer só são utilizáveis programaticamente. O risco concreto que este bloco evita: implementar `context build` já com descoberta ampla de conteúdo textual de projeto, antes de o Sensitive Data Guard existir para filtrar `.env`/segredos/binários — isso duplicaria, de forma improvisada, exatamente a política de segurança que um bloco futuro deve centralizar. A decisão deste bloco é rodar `context build` em **modo estrutural seguro**: compila um Manifest real (Git, projeto, sessão DDAE) mas nunca transforma conteúdo de arquivo em `RelevanceCandidate`, mantendo o sistema fail-closed até a Etapa 08 (Sensitive Data Guard) habilitar ingestão textual segura.

## 4. Escopo

- `src/context/validator.js` — `validateContextState({...})`, kernel puro (VALID/STALE/INVALID) que nunca escreve, nunca varre filesystem, nunca abre `source.path` por conta própria.
- `src/commands/context.js` — `contextBuildCommand`, `contextShowCommand`, `contextValidateCommand`.
- `src/cli.js` — comando `context build|show|validate` integrado ao parser existente, reaproveitando `parseArgs`/`requireSubcommand` sem duplicação.
- `context build`: único comando que escreve, sempre em modo estrutural (candidates/claims/facts vazios), grava `.ddae/.gitignore` (`*`, nunca sobrescreve conteúdo existente, nunca toca o `.gitignore` raiz do consumidor), `.ddae/context/manifest.json` (serialização determinística via `stableStringify`), `.ddae/context/CONTEXT.md` (byte-a-byte igual a `renderContextMarkdown(manifest)`), `.ddae/context/validation.json` (receipt fixo).
- `context show`: estritamente read-only, imprime `CONTEXT.md`.
- `context validate`: estritamente read-only, classifica o pacote já construído como `VALID`/`STALE`/`INVALID`, nunca reescreve `validation.json`, nunca recompila.
- Segurança de destino de escrita: rejeita `.ddae`/`.ddae/context` existindo como arquivo, rejeita symlink escapando `projectRoot`.
- `test/context-validator.test.js`, `test/cli-context.test.js`.

## 5. Fora de Escopo

- `src/context/sensitive-files.js` (Sensitive Data Guard completo) — bloco futuro.
- Descoberta ampla de arquivos, leitura de conteúdo arbitrário, transformação de qualquer arquivo do projeto em `RelevanceCandidate`.
- Leitura de `.env`, segredos, source code arbitrário, conteúdo de `collectDdaeContext()` (módulos/blocos/bugs/decisões) como texto pesquisável.
- Work Packets, Handoff, MCP, Obsidian, LLM, embeddings, busca semântica, API remota.
- Alteração de `src/context/authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `renderer.js`, `src/schemas/context-schema.js`, os três coletores, `src/templates/`.
- Bump de versão (`package.json.version` permanece `0.2.0` até o Bloco 12, Seção 16 do contrato).

## 6. Arquivos e Pastas Envolvidos

- `src/context/validator.js` (novo).
- `src/commands/context.js` (novo).
- `src/cli.js` (alterado — novo comando `context`, help text atualizado).
- `test/context-validator.test.js`, `test/cli-context.test.js` (novos).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_07_context_cli_build_show_validate.md` (este arquivo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_07_context_cli_build_show_validate.md` e `08_feedbacks/feedback_bloco_07_context_cli_build_show_validate.md` (gerados após a CI técnica verde).

## 7. Dependências

- `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seções 10–15) e `plano_bloco_12.md` (Bloco 08).
- `src/context/compiler.js`, `renderer.js`, `fingerprint.js` (Blocos 05/06) — reaproveitados sem alteração.
- `src/cli.js`, `src/commands/block.js`, `src/commands/validate.js` — convenções existentes reaproveitadas: `parseArgs`/`requireSubcommand` (não duplicado), `projectNameOf(dir)` (`src/utils/text.js`, não duplicado), padrão `process.exitCode` (não `throw`) para estados de negócio esperados (VALID/STALE/INVALID), padrão `throw new Error(...)` para erros de uso (capturado por `bin/ddae-engine.js`).

## 8. Plano de Implementação

1. Inspecionar `src/cli.js`, `bin/ddae-engine.js`, `src/commands/block.js`, `src/commands/validate.js`, `test/helpers.js` para identificar convenções reais antes de escrever qualquer código novo.
2. Reler Seções 10–15 do contrato do Manifest v1 (Git degraded mode, política `.ddae/`, segurança, contrato de CLI, staleness).
3. Implementar `src/context/validator.js`: checks de integridade interna (goal hash, fingerprint, CONTEXT.md) sempre primeiro (produzem `INVALID`, nunca `STALE`), depois checks de staleness contra estado atual (Git HEAD, sessão, frescor de source) — ordem fixa e determinística.
4. Implementar `src/commands/context.js`: `contextBuildCommand` monta o Manifest inteiramente em memória (compile + render + receipt) antes de tocar o filesystem; só escreve se tudo suceder. `contextShowCommand`/`contextValidateCommand` são estritamente leitura.
5. Integrar `context build|show|validate` em `src/cli.js`, atualizando `HELP`.
6. Escrever `test/context-validator.test.js` e `test/cli-context.test.js`.
7. Rodar `npm test` e confirmar 0 falhas.
8. Rodar a prova self-host em consumidor TEMP (nunca no próprio checkout do DDAE-Engine): build/show/validate, prova de determinismo byte-a-byte, prova de `.gitignore` self-ignore, prova Git degradado, prova de segurança de destino (arquivo colidindo, symlink escapando).
9. Rodar `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
10. Confirmar `src/templates/`, `authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `renderer.js`, `context-schema.js` intocados; confirmar `.ddae/` ausente do próprio repositório; auditar o diff antes de commitar.

## 9. Critérios de Aceite

- [x] `context build` exige `--goal`; rejeita goal vazio/só-espaço; aceita `--budget minimal|standard|deep` (default `standard`); `--session` explícito nunca recua silenciosamente se a sessão não existir.
- [x] `context build` roda em modo estrutural: `candidates`/`claims`/facts vazios; zero leitura de conteúdo de arquivo além dos coletores estruturais já aprovados (Git/Project/DDAE).
- [x] `context build` escreve `.ddae/.gitignore` (`*`) apenas se ausente; nunca toca o `.gitignore` raiz do consumidor.
- [x] `context build` rejeita `.ddae`/`.ddae/context` existindo como arquivo, e symlink escapando `projectRoot`, sem escrever nada.
- [x] Build em memória primeiro: nenhum artefato parcial é deixado se `compileContext`/`renderContextMarkdown` falhar.
- [x] `manifest.json`, `CONTEXT.md`, `validation.json` são determinísticos — mesmo estado lógico produz os mesmos bytes em builds repetidos.
- [x] `context show` é estritamente read-only; falha claramente se não houver build.
- [x] `context validate` é estritamente read-only (nunca reescreve `validation.json`); classifica `VALID`/`STALE`/`INVALID` com `reasons` determinísticos; exit 0 apenas para `VALID`.
- [x] Git indisponível nunca torna o pacote inválido/stale sozinho.
- [x] `.ddae/` nunca aparece como untracked em um repositório Git real.
- [x] Nenhum arquivo sensível (`.env`) é lido ou vaza para `CONTEXT.md`/`manifest.json`.

## 10. Validações Obrigatórias

- [x] `npm test` — suíte completa, 0 falhas.
- [x] `npm run package:check` — OK, delta de arquivos explicado (não forçado).
- [x] `npm run smoke` — `[DDAE smoke] OK`.
- [x] `ddae-engine validate`/`audit` via Stable Host — `Status: OK`, `Errors: 0`.
- [x] CI remota 5/5 (a confirmar após push).

## 11. Segurança

Este é o primeiro bloco desta sessão que escreve no filesystem do consumidor — a superfície de segurança relevante é inteiramente sobre o **destino** da escrita, não sobre o conteúdo lido: containment de path (rejeitar `.ddae`/`.ddae/context` como arquivo, rejeitar symlink escapando `projectRoot`, mesma disciplina de `fs.realpathSync` já usada em `scripts/release/smoke-distribution.mjs`), e nunca modificar o `.gitignore` raiz do consumidor. Sobre conteúdo: `context build` roda deliberadamente em modo estrutural — zero leitura de arquivo de projeto arbitrário, zero `.env`, zero segredo — porque o Sensitive Data Guard que autorizaria isso ainda não existe. Essa é uma restrição de segurança, não uma limitação técnica.

## 12. Performance

Não aplicável a novo vetor — build em modo estrutural é rápido (3 coletores leves + compilação/render em memória, sem candidatos textuais). Escrita de 3 arquivos pequenos por build.

## 13. Design System / UX

Não aplicável ao produto DDAE-Engine, mas a saída de `context build`/`context show`/`context validate` foi desenhada para ser um relatório curto e claro em stdout, consistente com o estilo já usado por `validate`/`audit`.

## 14. Riscos

- Um `context build` em modo estrutural produz um Manifest/CONTEXT.md sem nenhum arquivo relevante selecionado — o valor prático da capability fica limitado até o Sensitive Data Guard (Bloco 08) habilitar ingestão textual segura. Risco aceito e documentado, decisão explícita para manter o sistema fail-closed em vez de improvisar um scanner de segurança dentro da CLI.
- BUG-01 (template do glossário) continua aberto — não afeta este bloco.

## 15. Pendências Esperadas

- Nenhuma pendência P1/P2 esperada. A limitação de modo estrutural (Seção 14) é uma decisão de segurança deliberada, não uma lacuna de implementação — será resolvida formalmente no Bloco 08 (Sensitive Data Guard + Safe Source Ingestion).

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_07_context_cli_build_show_validate --session session_02_context_compiler_0_3_0` (Stable Host), somente após a CI técnica verde.

## 17. Commit Semântico Sugerido

```
feat(context): add context build show validate CLI
```
