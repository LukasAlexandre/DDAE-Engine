# Feedback — Bloco 04: Relevance Engine v1

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Resumo Executivo

Implementado `src/context/relevance.js` — o motor de relevância v1 do Context Compiler: lexical, heurístico, determinístico, offline, goal-driven, budget-aware, zero dependências. `normalizeGoal` tokeniza um objetivo em texto livre em termos lexicais estáveis (sem tradução, sem stemming, sem sinônimos). `scoreRelevanceCandidate` pontua um `RelevanceCandidate` (`{ source, content, signals }` — modelo local, não uma alteração ao Source Model canônico) contra o goal, com breakdown auditável por campo (filename/path/section/content) e por sinal explícito (`current_session`/`decision_reference`/`bug_reference`/`git_changed`). `rankRelevantSources` ordena deterministicamente (score DESC, path ASC, id ASC) e seleciona candidatos dentro de um orçamento de caracteres (`minimal`/`standard`/`deep`), nunca truncando conteúdo — um candidato que sozinho excede o orçamento é pulado (`budget_exceeded`), e a seleção continua com os menores. 47 testes novos, incluindo a fixture nomeada de auditoria/usuários e testes explícitos de independência entre relevância e autoridade. Provado contra o próprio repositório self-hosted, usando `Source`s reais construídas a partir da saída real dos três coletores existentes. Um problema real foi encontrado e corrigido durante o bloco: dois testes estruturais falharam apenas no runner `windows-latest` por um bug no próprio helper de teste (não no código de produção) — ver Seção 11/12. Bloco concluído conforme escopo.

## 2. Objetivo do Bloco

Implementar `src/context/relevance.js`: motor de relevância que responde "quais evidências importam para este objetivo?", nunca "qual evidência é verdadeira?" (Authority Model, Bloco 03) nem "como construir o manifesto?" (Compiler, bloco futuro). Ver `05_blocks/bloco_04_relevance_engine_v1.md`.

## 3. Escopo Implementado

Exatamente o escopo planejado, sem divergência: `normalizeGoal`, o modelo local `RelevanceCandidate`, `scoreRelevanceCandidate`, `rankRelevantSources`, os 3 budget profiles, tie-break de 3 níveis, custo por caractere (CRLF→LF), política de oversized-skip sem truncar. Nenhum código de Compiler, Manifest, Renderer, CLI ou `.ddae/` foi implementado — permanecem fora de escopo, como planejado. O Source Model canônico (`authority.js`) não foi tocado.

## 4. Arquivos Criados

- `src/context/relevance.js`
- `test/context-relevance.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_04_relevance_engine_v1.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_04_relevance_engine_v1.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_04_relevance_engine_v1.md` (este arquivo)

## 5. Arquivos Alterados

Nenhum arquivo de produto pré-existente foi alterado. `src/context/authority.js`, `git-context.js`, `project-context.js`, `ddae-context.js` e `src/templates/` permanecem intocados.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
node node_modules/ddae-engine/bin/ddae-engine.js block create "Relevance Engine v1" --session session_02_context_compiler_0_3_0 --dir .
node node_modules/ddae-engine/bin/ddae-engine.js prompt create --block bloco_04_relevance_engine_v1 --session session_02_context_compiler_0_3_0 --dir .
node --test test/context-relevance.test.js
npm test
npm run package:check
npm run smoke
node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
node node_modules/ddae-engine/bin/ddae-engine.js audit --dir .
npm pack --dry-run --json
node node_modules/ddae-engine/bin/ddae-engine.js feedback create --block bloco_04_relevance_engine_v1 --session session_02_context_compiler_0_3_0 --dir .
```

## 8. Testes Realizados

- `test/context-relevance.test.js` — 47 testes cobrindo: obrigatoriedade e determinismo de `normalizeGoal`, normalização de diacríticos/camelCase/separadores de path, deduplicação de termos, ausência de tradução automática (fixture explícita em português não casa com conteúdo em inglês), score por filename/path/section/content com peso explícito, não-multiplicação de score por repetição de termo, os 4 sinais explícitos (individualmente e combinados), prova de que sinais nunca são inferidos de `source.kind`, breakdown que soma exatamente ao score total, candidato de score zero preservado (não descartado), ordenação score DESC → path ASC → id ASC (incluindo empate total), independência de ordem de entrada, determinismo em chamadas repetidas, imutabilidade de candidates/Sources/arrays de entrada, independência entre relevância e `authority_class` (duas Sources lexicalmente idênticas com domínios de autoridade diferentes recebem o mesmo score), fixture nomeada de "auditoria de usuários" (match lexical explícito > README genérico com overlap parcial > fonte sem nenhum match), compatibilidade com `Source`s reais via `createSource`, os 3 budget profiles e o default `standard`, rejeição de profile inválido, custo de caractere normalizado CRLF→LF, seleção nunca excede `max_chars`, candidato oversized pulado sem truncar e sem interromper a avaliação dos menores, `selected + skipped` preserva todos os candidatos, e verificação estrutural (zero imports, nenhum acesso a filesystem/rede/LLM/embeddings, nenhuma lógica de Compiler/Manifest/CLI) — 47 pass, 0 fail.
- Prova de relevância self-host (script ad-hoc, não persistido no repositório): `RelevanceCandidate`s construídos a partir da saída real de `collectGitContext`/`collectProjectContext`/`collectDdaeContext` e `Source`s reais via `createSource`, contra o próprio repositório, com o goal `"Context Compiler relevance authority"` e budget `minimal`. Resultado: `src/context/authority.js` (score 20) e o bloco 03 desta sessão (score 19) no topo, `BUG-01` (score 16, via `bug_reference` + match de path) em seguida, `ddae-context.js` (score 13) depois, e um README histórico irrelevante (score 4, apenas match fraco de conteúdo) por último — ordem coerente com a relevância real ao objetivo. Todos os 5 candidatos selecionados dentro do orçamento (558 de 20000 caracteres usados). Determinismo confirmado por duas chamadas independentes produzindo saída idêntica.

## 9. Validações Executadas

- `npm test` — 174 testes, 171 pass, 0 fail, 3 skip (127 pré-existentes + 47 novos).
- `npm run package:check` — `OK`, 98 arquivos (97 → 98, exatamente pelo novo `src/context/relevance.js`, variação explicada, não forçada).
- `npm run smoke` — `[DDAE smoke] OK`.
- `ddae-engine validate --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`.
- `ddae-engine audit --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`, `Warnings: 7` (quality gates pendentes de conteúdo, pré-existentes, não relacionados a este bloco).
- `npm pack --dry-run --json` — 98 arquivos, `src/context/relevance.js` presente, zero vazamento de `Docs/`/`legacy/`/`node_modules/`/`package-lock.json`.
- CI remota: commit técnico inicial `5359c9b81958e507198f3aeed324fbd0d3a588c6` — **falhou** 1/5 (`windows-latest / Node 24`, ver Seção 11); commit de correção `0037c652cf262a3dba1bf37e86bf41dd649b83c9` — `success`, 5/5 (`ubuntu-latest / Node 22`, `ubuntu-latest / Node 24`, `ubuntu-latest / Node 26`, `windows-latest / Node 24`, `macos-latest / Node 24`), incluindo o step de prova do Stable Host continuando verde nos 5 ambientes.

## 10. Decisões Técnicas

- **`RelevanceCandidate` é um objeto local ao módulo, nunca uma alteração ao Source Model canônico.** Esta é a decisão arquitetural central do bloco, explicitamente exigida: `authority.js` permanece fechado em `{id, kind, path, section, authority_class, content_hash}` — proveniência canônica. `content` (texto pesquisável) é dado operacional temporário, vive apenas em `RelevanceCandidate`, nunca em `Source`.
- **Sinais (`current_session`, `decision_reference`, `bug_reference`, `git_changed`) são sempre explícitos, nunca inferidos de `source.kind`.** Um `kind: 'bug'` não vira automaticamente `bug_reference: true` — só o chamador, com acesso ao estado formal do objetivo atual, decide quais sinais se aplicam. Testado explicitamente (`signals are never inferred from source.kind`).
- **Matching por campo usa o *conjunto* de termos do campo, não a contagem bruta de ocorrências**, para que repetir uma palavra 50 vezes no conteúdo nunca multiplique o score — decisão direta do contrato ("cada termo deve pontuar no máximo uma vez por campo").
- **Tie-break de 3 níveis (score DESC, path ASC, source id ASC)**, o terceiro nível adicionado além dos 2 exigidos pelo contrato do Manifest v1 (Seção 8: apenas score DESC, path ASC) para garantir ordem total determinística mesmo quando duas Sources sem path (ou com o mesmo path) empatam em score — sem alterar o contrato principal, apenas completando-o para os casos que ele deixa ambíguos.
- **Tokenização compartilhada entre `normalizeGoal` e o matching de campo** (mesma função `tokenize` interna) — garante que "o que conta como um termo" seja idêntico dos dois lados da comparação, evitando um descasamento sutil entre como o goal é tokenizado e como o conteúdo é tokenizado.

## 11. Problemas Encontrados

Um problema real, não bloqueante, encontrado apenas na CI remota (nunca reproduzido localmente antes do push, porque o checkout local usa LF): o commit técnico inicial (`5359c9b`) passou em 4 dos 5 ambientes da matriz, mas falhou em `windows-latest / Node 24` — 2 dos 47 testes de `context-relevance.test.js` (os testes estruturais "não deve implementar embeddings/LLM" e "não deve implementar Compiler/Manifest/CLI") reportaram falso positivo. Causa raiz: o helper de teste `stripLineComments` (que remove comentários `//` antes de checar o código-fonte de `relevance.js`, para não confundir prosa legítima como "nunca chama uma LLM" com uma implementação real) dividia o arquivo por `\n` sem antes normalizar `\r\n` → `\n`. No checkout Windows da CI (que converte para CRLF), cada linha ficava com um `\r` residual ao final; a regex `/\/\/.*$/` (sem flag `m`) não conseguia mais casar até o fim real da string nessas linhas, porque `$` sem `m` só ancora no fim absoluto da string e `.` não casa `\r` — o comentário parava de ser removido, e a prosa arquitetural (que menciona legitimamente "LLM" e "Compiler" para explicar o que o módulo propositalmente não faz) vazava para dentro do "código" verificado pelo teste, disparando um falso positivo.

## 12. Correções Aplicadas Durante o Bloco

Corrigido `stripLineComments` em `test/context-relevance.test.js` para normalizar `\r\n` → `\n` antes de dividir em linhas — commit de correção `0037c652cf262a3dba1bf37e86bf41dd649b83c9`. **`src/context/relevance.js` (código de produção) nunca foi alterado por essa correção** — o bug estava inteiramente no helper de teste, não no motor de relevância. A correção foi verificada localmente antes do push simulando o cenário CRLF (conversão manual do arquivo-fonte para `\r\n` e execução da lógica do helper corrigido), confirmando que os dois falsos positivos desaparecem, e depois confirmada pela CI real 5/5 no commit de correção.

## 13. Pendências

### P1 — Crítica

Nenhuma.

### P2 — Importante

Nenhuma.

### P3 — Melhoria Recomendada

- BUG-01 (template do glossário, herdado do Bloco 01 desta sessão) continua aberto — alvo de bloco futuro desta mesma sessão (Bloco 10, conforme plano do README).

### P4 — Opcional

- O Relevance Engine v1 é puramente lexical, por design do contrato (`plano_bloco_12.md`: "Relevance Engine v2 semântico" é explicitamente Context Engine v2, fora de escopo). Um goal em um idioma nunca casa com conteúdo em outro idioma equivalente — comportamento intencional e testado, não uma lacuna.

## 14. Riscos Restantes

Nenhum novo além do já registrado no bloco (Seção 14 de `05_blocks/bloco_04_relevance_engine_v1.md`). BUG-01 permanece aberto, P3, não relacionado a este bloco.

## 15. Evidências

```text
Self-host relevance proof (execução direta contra o próprio repositório):
goal.normalized: context compiler relevance authority
budget: {"profile":"minimal","max_chars":20000,"used_chars":558,"remaining_chars":19442}

ranked:
  src/context/authority.js                                          score=20
  Docs/.../05_blocks/bloco_03_authority_and_source_model.md          score=19
  Docs/.../07_bugs/bugs_identificados.md                             score=16
  src/context/ddae-context.js                                       score=13
  legacy/sessions/session_00_bootstrap_inicial/README.md            score=4

selected: all 5 (0 skipped)
determinism (second independent call): deepEqual = true

npm test: 174 tests, 171 pass, 0 fail, 3 skip
npm run package:check: OK, 98 files
npm run smoke: [DDAE smoke] OK
stable host validate: Status OK, Sessions found 2, Errors 0
stable host audit: Status OK, Sessions found 2, Errors 0, Warnings 7 (pré-existentes)

Technical commit (initial): 5359c9b81958e507198f3aeed324fbd0d3a588c6
Technical CI (initial): 31293208309 — FAILURE, 1/5 (windows-latest / Node 24)

Fix commit: 0037c652cf262a3dba1bf37e86bf41dd649b83c9
Fix CI: 31293304476 — success, 5/5
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

Bloco 05 — Context Manifest + Compiler.

## 18. Commit Semântico Sugerido

```
feat(context): add relevance engine v1
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
