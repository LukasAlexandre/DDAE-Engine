# Bloco 04 — Relevance Engine v1

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Objetivo

Implementar `src/context/relevance.js` — um motor de relevância lexical, heurístico, determinístico e offline que responde "quais evidências importam para este objetivo?", nunca "qual evidência é verdadeira?" (Authority Model) nem "como construir o manifesto?" (Compiler, bloco futuro).

## 2. Contexto

Contrato de referência: `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seção 8, Budget model) e `plano_bloco_12.md` (Bloco 05 — Relevance Engine v1: "extração de termos do `--goal`; pontuação de arquivos/decisões/sources por filename match, path match, referência de sessão, referência de decisão, referência de bug, match de conteúdo, modificação recente em Git; aplicação do budget com tie-break `score DESC, path ASC`"). Esta sessão já entregou os três coletores (Blocos 01/02) e o Source/Authority Model (Bloco 03) — este bloco é a primeira camada que precisa decidir "o que importa", separada de "o que existe" (coletores) e "em quem confiar" (autoridade).

## 3. Problema que Este Bloco Resolve

Sem um motor de relevância, não há forma determinística de decidir quais das potencialmente centenas de fontes coletadas devem entrar em um contexto limitado por orçamento de caracteres. A alternativa ingênua — incluir tudo, ou incluir por ordem de filesystem — não escala e não é reproduzível. O erro arquitetural que este bloco evita explicitamente é confundir "mais relevante para o objetivo atual" com "mais autoritativo sobre um fato": um README pode ser muito relevante para um objetivo e mesmo assim não ter autoridade para sobrescrever o Git; uma decisão arquitetural pode ser autoritativa e ainda não ser relevante para uma tarefa específica.

## 4. Escopo

- `normalizeGoal(goal)` em `src/context/relevance.js` — tokenização lexical determinística, language-neutral (sem tradução, sem stemming, sem sinônimos).
- Um modelo local `RelevanceCandidate` (`{ source, content, signals }`) — nunca uma alteração ao Source Model canônico (`authority.js` permanece intocado).
- `scoreRelevanceCandidate(candidate, goal)` — score explicável (breakdown auditável) via filename/path/section/content match e sinais explícitos (`current_session`, `decision_reference`, `bug_reference`, `git_changed`).
- `rankRelevantSources(candidates, { goal, budget })` — ordenação determinística (score DESC, path ASC, id ASC) e seleção por orçamento de caracteres (`minimal`/`standard`/`deep`), sem truncar conteúdo.
- `test/context-relevance.test.js` cobrindo os 43 cenários do prompt deste bloco.

## 5. Fora de Escopo

- `src/context/compiler.js`, `src/context/manifest.js`, `src/context/renderer.js`, `src/context/validator.js`, `src/context/fingerprint.js`, `src/context/sensitive-files.js`, `src/commands/context.js`, `src/schemas/context-schema.js`.
- Qualquer output `.ddae/`, `manifest.json`, `CONTEXT.md`.
- Embeddings, banco vetorial, busca semântica, LLM, API remota, tradução automática, stemming complexo.
- Descoberta de sinais (`current_session`/`decision_reference`/`bug_reference`/`git_changed`) via leitura de filesystem/Git dentro deste módulo — sinais são sempre fornecidos explicitamente pelo chamador.
- Alteração de `src/context/authority.js`, `git-context.js`, `project-context.js`, `ddae-context.js`.
- Correção do BUG-01 e qualquer alteração em `src/templates/`.

## 6. Arquivos e Pastas Envolvidos

- `src/context/relevance.js` (novo).
- `test/context-relevance.test.js` (novo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_04_relevance_engine_v1.md` (este arquivo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_04_relevance_engine_v1.md` e `08_feedbacks/feedback_bloco_04_relevance_engine_v1.md` (gerados após a CI técnica verde).

## 7. Dependências

- `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seção 8 — Budget model) e `plano_bloco_12.md` (Bloco 05).
- `src/context/authority.js` (Bloco 03 desta sessão) — usado apenas como fonte de `Source`s reais para os testes de compatibilidade e a prova self-host; não modificado.
- `src/context/git-context.js`, `src/context/project-context.js`, `src/context/ddae-context.js` — usados apenas para a prova self-host, sem alteração.

## 8. Plano de Implementação

1. Reler a Seção 8 do contrato do Manifest v1 (budget model) e a descrição do Bloco 05 em `plano_bloco_12.md` antes de escrever qualquer código.
2. Implementar a tokenização lexical determinística (`normalizeGoal`) — diacríticos, camelCase, separadores de path/identificador, deduplicação preservando ordem.
3. Definir o modelo `RelevanceCandidate` local ao módulo (não exportar uma classe; plain object validado pela API).
4. Implementar `scoreRelevanceCandidate` com pesos explícitos por campo (`filename`/`path`/`section`/`content`) e por sinal (`current_session`/`decision_reference`/`bug_reference`/`git_changed`), com breakdown auditável.
5. Implementar `rankRelevantSources` com os 3 profiles de budget, tie-break de 3 níveis (score DESC, path ASC, id ASC), custo por caractere (normalizado CRLF→LF), e política de "oversized skip sem truncar".
6. Escrever `test/context-relevance.test.js` cobrindo os cenários do prompt do bloco.
7. Rodar `npm test` e confirmar 0 falhas.
8. Construir `RelevanceCandidate`s a partir de saída real dos três coletores existentes e de `Source`s reais via `createSource`, e rodar uma prova de relevância self-host contra o próprio repositório.
9. Rodar `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
10. Confirmar `src/templates/`, `authority.js`, `git-context.js`, `project-context.js`, `ddae-context.js` intocados.

## 9. Critérios de Aceite

- [x] `normalizeGoal` rejeita goal ausente/vazio/só-espaço; é determinístico; normaliza diacríticos e separadores de camelCase/path; deduplica termos.
- [x] O Source Model canônico (`authority.js`) não foi alterado — `content` não foi adicionado a ele.
- [x] `RelevanceCandidate` é um objeto local (`{ source, content, signals }`), não uma classe exportada.
- [x] Score é explicável: `breakdown` permite recomputar o `score` total exatamente.
- [x] Cada termo do goal pontua no máximo uma vez por campo (repetição de conteúdo não multiplica score).
- [x] Sinais são sempre explícitos — nunca inferidos de `source.kind`.
- [x] `authority_class` nunca influencia o score de relevância (testado com duas Sources idênticas lexicalmente, domínios diferentes).
- [x] Ordenação: score DESC → path ASC → source id ASC (determinística mesmo em empate total).
- [x] Budget: `minimal=20000`, `standard=60000` (default), `deep=120000`, caracteres.
- [x] Seleção nunca ultrapassa `max_chars`; candidate oversized é `skipped` com `reason: 'budget_exceeded'`, nunca truncado; avaliação continua para candidates menores.
- [x] `selected.length + skipped.length === candidates.length` sempre.
- [x] Determinismo: mesma entrada → mesma saída (`deepEqual`), independente da ordem de entrada.
- [x] Imutabilidade: nenhuma mutação de `candidates`, `Source`s, ou arrays de entrada.
- [x] Módulo não acessa filesystem, rede, ou LLM; nenhuma dependência externa (zero imports).

## 10. Validações Obrigatórias

- [x] `npm test` — suíte completa, 0 falhas.
- [x] `npm run package:check` — OK, delta de arquivos explicado (não forçado).
- [x] `npm run smoke` — `[DDAE smoke] OK`.
- [x] `ddae-engine validate`/`audit` via Stable Host — `Status: OK`, `Errors: 0`.
- [x] CI remota 5/5 (a confirmar após push).

## 11. Segurança

Não aplicável a novo vetor — módulo puro (sem I/O, sem rede). Único cuidado: o módulo nunca lê `source.path` do disco, usa exclusivamente `candidate.content` fornecido pelo chamador — isso evita que o Relevance Engine se torne, sem querer, um segundo ponto de leitura de arquivo fora do Sensitive Data Guard (ainda não implementado, Bloco 08/09 futuro).

## 12. Performance

Não aplicável — operações síncronas em memória (tokenização, filtragem de arrays pequenos, ordenação). Custo por caractere é calculado sobre `content` já em memória, sem I/O.

## 13. Design System / UX

Não aplicável.

## 14. Riscos

- A tokenização lexical v1 não entende sinônimos nem tradução — um goal em português não casa com conteúdo em inglês equivalente (comportamento intencional, documentado e testado explicitamente na fixture principal). Isso é uma limitação conhecida do v1, não um bug; evolução semântica é explicitamente Context Engine v2 (fora de escopo, `plano_bloco_12.md`).
- BUG-01 (template do glossário) continua aberto — não afeta este bloco.

## 15. Pendências Esperadas

- Nenhuma pendência P1/P2 esperada. A limitação lexical (sem tradução/sinônimos) é um risco de design documentado (Seção 14), não uma lacuna de implementação.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_04_relevance_engine_v1 --session session_02_context_compiler_0_3_0` (Stable Host), somente após a CI técnica verde.

## 17. Commit Semântico Sugerido

```
feat(context): add relevance engine v1
```
