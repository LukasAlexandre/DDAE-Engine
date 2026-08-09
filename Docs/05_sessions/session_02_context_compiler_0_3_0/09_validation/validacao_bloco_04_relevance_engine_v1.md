# Validação — Bloco 04: Relevance Engine v1

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
6f061804bc83fbfb1f27157aabdbc6d6cd851d96

git rev-parse origin/main
6f061804bc83fbfb1f27157aabdbc6d6cd851d96

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

Stable Host --version: 0.2.0
Candidate --version: 0.2.0
```

## Contrato fechado antes do código

Registrado em `05_blocks/bloco_04_relevance_engine_v1.md`, Seções 4 e 8, reaproveitando `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seção 8 — Budget model) e `plano_bloco_12.md` (descrição do Bloco 05 — Relevance Engine v1).

## API implementada

- `normalizeGoal(goal)` — síncrona, pura.
- `scoreRelevanceCandidate(candidate, goal)` — síncrona, pura.
- `rankRelevantSources(candidates, { goal, budget })` — síncrona, pura.
- `BUDGET_PROFILES`, `FIELD_WEIGHTS`, `SIGNAL_WEIGHTS` exportados como constantes congeladas.

## Fronteira arquitetural: Source Model não modificado

Confirmado por diff: `src/context/authority.js` não aparece em nenhum commit deste bloco. `RelevanceCandidate` (`{ source, content, signals }`) é um objeto local ao módulo `relevance.js`, nunca uma classe exportada nem uma extensão do Source Model canônico — testado explicitamente (`26. accepts real Sources produced by createSource() without modifying authority.js`).

## Goal normalization

Tokenização determinística, language-neutral: diacríticos removidos (`audítoria` → mesmos termos que `auditoria`), camelCase e separadores de path/identificador (`_ - / \ . :`) tratados como fronteira de termo, pontuação restante removida, termos deduplicados preservando ordem de primeira ocorrência. Nenhuma tradução, stemming ou sinônimo — testado explicitamente que um goal em português não casa com conteúdo em inglês equivalente.

## Scoring — fórmula e explicabilidade

| Campo/Sinal | Peso |
|---|---|
| `filename` | 5 |
| `path` | 4 |
| `section` | 3 |
| `content` | 2 |
| `signals.current_session` | 4 |
| `signals.decision_reference` | 5 |
| `signals.bug_reference` | 4 |
| `signals.git_changed` | 1 |

Cada termo do goal pontua no máximo uma vez por campo (matching por conjunto de termos presentes no campo, não por contagem bruta) — testado com conteúdo repetindo o mesmo termo 5 vezes sem multiplicar o score. `breakdown` retornado por `scoreRelevanceCandidate` permite recompor o `score` total exatamente — testado.

## Sinais — sempre explícitos

Nenhum sinal é inferido de `source.kind`: uma Source `kind: 'bug'` não vira `bug_reference: true` automaticamente. Testado diretamente (`signals are never inferred from source.kind`).

## Independência entre relevância e autoridade

Testado explicitamente (`24.`): duas Sources com conteúdo/path lexicalmente idênticos, mas `authority_class` diferente (`history` vs `architecture_intent`), recebem exatamente o mesmo score de relevância. `authority_class` nunca é lido por `relevance.js`.

## Budget profiles

`minimal = 20000`, `standard = 60000` (default), `deep = 120000`, caracteres — valores confirmados por teste direto contra `BUDGET_PROFILES`. Profile inválido é rejeitado com erro explícito.

## Ordenação e seleção

Tie-break de 3 níveis: `score DESC` → `path ASC` → `source.id ASC` (o terceiro nível completa o contrato do Manifest v1, que define apenas os dois primeiros, para garantir ordem total mesmo em empate completo). Custo por caractere normaliza `\r\n` → `\n` antes de contar. Seleção nunca ultrapassa `max_chars`. Um candidato que sozinho excede o orçamento é `skipped` com `reason: 'budget_exceeded'`, nunca truncado, e a avaliação continua com os candidatos menores — testado explicitamente, incluindo o caso onde o oversized é descartado e um candidato menor subsequente ainda é selecionado. `selected.length + skipped.length === candidates.length` sempre — testado.

## Determinismo e imutabilidade

`rankRelevantSources` produz `deepEqual` para a mesma entrada em chamadas repetidas e é independente da ordem de entrada dos candidatos — testado. Nenhuma mutação de `candidates`, `Source`s ou arrays de entrada — testado com comparação de serialização antes/depois e `Object.isFrozen`.

## Pureza estrutural

Teste dedicado confirma zero declarações de import no arquivo (`relevance.js` não depende de nenhum outro módulo, nem `node:*` nem `src/context/*`), nenhuma referência a leitura de filesystem, rede, embeddings, LLM, `.ddae`, `manifest.json`, `CONTEXT.md` ou lógica de CLI.

## Prova de interoperabilidade e relevância self-host

`RelevanceCandidate`s construídos a partir da saída real de `collectGitContext`/`collectProjectContext`/`collectDdaeContext` e `Source`s reais via `createSource`, contra o próprio repositório:

```text
goal: "Context Compiler relevance authority"
budget: minimal (20000 chars), used: 558, remaining: 19442

ranked:
  src/context/authority.js                                    score=20
  Docs/.../bloco_03_authority_and_source_model.md              score=19
  Docs/.../07_bugs/bugs_identificados.md (BUG-01)               score=16
  src/context/ddae-context.js                                  score=13
  legacy/sessions/session_00_bootstrap_inicial/README.md       score=4

selected: 5/5 candidates (0 skipped)
determinism: segunda chamada independente produz saída idêntica (deepEqual)
```

Ordem resultante é coerente com a relevância real ao objetivo declarado, sem qualquer intervenção manual de score.

## Testes

`test/context-relevance.test.js` — 47 testes, 47 pass, 0 fail, 0 skip. Cobertura: os 43 cenários listados no prompt do bloco, mais 4 testes adicionais de robustez (validação de candidate inválido, `rankRelevantSources` exige array, sinal não-booleano rejeitado, matches em campos distintos não se sobrepõem).

## Package protection

`REQUIRED_SRC_PREFIXES` (`scripts/release/verify-package.mjs`) já protegia `src/context/` desde o Bloco 02 da Session 12 legacy — não foi necessário alterar. `npm pack --dry-run --json` confirma `src/context/relevance.js` presente, 98 arquivos totais (97 → 98, variação explicada pelo novo arquivo, não forçada), zero vazamento de `Docs/`/`legacy/`/`node_modules/`/`package-lock.json`.

## Regressão

```text
npm test        → 174 tests, 171 pass, 0 fail, 3 skip
npm run package:check → OK, 98 files
npm run smoke    → [DDAE smoke] OK
stable host validate  → Status OK, Sessions found 2, Errors 0
stable host audit     → Status OK, Sessions found 2, Errors 0, Warnings 7 (pré-existentes, quality gates pendentes)
```

## Incidente de CI e correção

O commit técnico inicial (`5359c9b81958e507198f3aeed324fbd0d3a588c6`) falhou em 1 dos 5 ambientes (`windows-latest / Node 24`) por um bug no próprio helper de teste `stripLineComments` (não normalizava `\r\n` → `\n` antes de dividir em linhas, causando falha silenciosa da regex de remoção de comentário sob CRLF — introduzido pelo checkout Windows da CI, nunca reproduzido localmente por padrão). **`src/context/relevance.js` nunca foi alterado por esta correção** — o bug estava inteiramente no teste. Corrigido e verificado localmente (simulação manual de CRLF) antes do push de correção. Ver `08_feedbacks/feedback_bloco_04_relevance_engine_v1.md`, Seções 11–12, para o relato completo.

## Commit técnico e CI

- Commit técnico inicial: `5359c9b81958e507198f3aeed324fbd0d3a588c6` — CI run `31293208309` — **failure**, 1/5 (`windows-latest / Node 24`).
- Commit de correção: `0037c652cf262a3dba1bf37e86bf41dd649b83c9` — CI run `31293304476` — `success`, 5/5:
  - `ubuntu-latest / Node 22`: success
  - `ubuntu-latest / Node 24`: success
  - `ubuntu-latest / Node 26`: success
  - `windows-latest / Node 24`: success
  - `macos-latest / Node 24`: success
- Step de prova do Stable Host (`scripts/ci/verify-stable-host.mjs`) confirmado verde nos 5 ambientes no commit de correção.

## Riscos

Relevance Engine v1 é puramente lexical por design de contrato — um goal em um idioma não casa com conteúdo em outro idioma equivalente (comportamento intencional, testado). BUG-01 (template do glossário) permanece aberto, P3, não relacionado a este bloco.

## Pendências para o Bloco 05

- Context Manifest + Compiler: orquestrar coletores (02, 03) → Authority Model (03) → Relevance Engine (04) → serialização estável → fingerprint → `manifest.json`, implementando o schema conceitual da Seção 18 do contrato do Manifest v1.

## Confirmação de zero implementação além do escopo

- `src/context/authority.js`, `git-context.js`, `project-context.js`, `ddae-context.js` — não alterados.
- `src/context/compiler.js`, `manifest.js`, `renderer.js`, `validator.js`, `fingerprint.js`, `sensitive-files.js`, `src/commands/context.js`, `src/schemas/context-schema.js` — não criados.
- `.ddae/`, `manifest.json`, `CONTEXT.md` — não criados.
- `src/templates/` — não alterado (BUG-01 continua aberto, deliberadamente).
- `package.json`, `package-lock.json` — não alterados/ausente.
- `legacy/sessions/session_12_context_compiler_foundation/` — não alterado (predecessor histórico preservado).
