# Validação — Checkpoint 07.1: Fingerprint Session Selection Integrity

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## Baseline confirmado antes do checkpoint

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
974061a9f4d66e211a9cd66dc1a187ba3798239c

git rev-parse origin/main
974061a9f4d66e211a9cd66dc1a187ba3798239c

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

Stable Host --version: 0.2.0
Candidate --version: 0.2.0
```

## Bug encontrado

Após a aprovação funcional do Bloco 07, uma auditoria cruzada entre `src/context/fingerprint.js` (Bloco 05) e o contrato de seleção de sessão (`session.selection_reason`, distinguindo `explicit` de `latest_canonical`) revelou uma lacuna de integridade: o fingerprint canônico incorporava `session.id`, mas nunca `session.selection_reason`. Dois Manifests referenciando a mesma sessão, um com `--session` explícito e outro com seleção automática (`latest_canonical`), podiam produzir o **mesmo fingerprint** se todo o resto do estado fosse idêntico — apesar de representarem estados canônicos logicamente diferentes (o Manifest em si já registra essa diferença em `session.selection_reason`, mas o fingerprint não a refletia).

## Causa

`buildFingerprintPayload` (`src/context/fingerprint.js`) nunca recebia `sessionSelectionReason` como parâmetro, e o payload canônico nunca incluía `session_selection_reason`. `src/context/compiler.js` (ao montar o fingerprint) e `src/context/validator.js` (ao recompô-lo para verificação de integridade) só passavam `sessionId: session.id`, nunca a razão da seleção.

## Risco

Classificado como **P2 — integridade do Context Compiler**: não quebra o funcionamento básico da CLI (build/show/validate continuavam funcionando), mas comprometia a propriedade central do fingerprint — identificar de forma completa e única o estado canônico que ele alega representar (contrato do Manifest v1, Seção 9). Corrigido antes do Bloco 08 (Sensitive Data Guard + Safe Source Ingestion) para não carregar essa lacuna para a fronteira em que o Context Compiler passa a ingerir conteúdo textual real.

## Payload anterior

```text
schema_version
compiler_contract_version
goal_normalized
session_id
budget_profile
budget_max_chars
git_head
selected_sources
constraints
```

## Payload corrigido

```text
schema_version
compiler_contract_version
goal_normalized
session_id
session_selection_reason   ← adicionado
budget_profile
budget_max_chars
git_head
selected_sources
constraints
```

## Compiler integration

`compileContext` (`src/context/compiler.js`) agora passa `sessionSelectionReason: session.selection_reason` para `buildFingerprintPayload`, usando o **mesmo objeto `session`** que é persistido no Manifest — nenhuma reseleção, nenhuma nova chamada a `collectDdaeContext`. A identidade usada pelo fingerprint é garantidamente a mesma identidade registrada no Manifest final.

## Validator integration

`validateContextState` (`src/context/validator.js`), ao recompor o payload de fingerprint para verificação de integridade, agora também passa `sessionSelectionReason: manifest.session.selection_reason`. Isso significa que adulterar **apenas** `manifest.session.selection_reason` (sem atualizar `manifest.fingerprint.value`) é detectado como `INVALID`/`FINGERPRINT_MISMATCH` — mesmo que `CONTEXT.md` seja re-renderizado para permanecer coerente com o Manifest adulterado (prova de que a proteção não depende só do `CONTEXT_MARKDOWN_MISMATCH`).

## Prova de tampering (Manifest + CONTEXT.md coerentes, fingerprint antigo)

```text
manifest.session.selection_reason original: latest_canonical
adulterado para: explicit
CONTEXT.md re-renderizado a partir do Manifest adulterado (coerente)
fingerprint.value: mantido do build original (não recalculado pelo "atacante")

validateContextState(...) →
  status: INVALID
  reasons: contém { code: 'FINGERPRINT_MISMATCH' }
```

Testado em `test/context-validator.test.js` (`Checkpoint 07.1. tampering only session.selection_reason...`).

## Prova explicit vs. latest_canonical (mesma sessão, mesmo estado lógico)

Dois consumidores TEMP idênticos (mesmo `init`, mesma sessão criada, nenhum Git em nenhum dos dois — estado Git equivalente):

```text
Build A: ddae-engine context build --goal "session fingerprint integrity" --dir <TEMP_A>
  (sem --session)
  session.id: session_01_proof
  session.selection_reason: latest_canonical

Build B: ddae-engine context build --goal "session fingerprint integrity" --session session_01_proof --dir <TEMP_B>
  session.id: session_01_proof
  session.selection_reason: explicit

mesmo session.id: true
mesmo estado Git (ambos sem Git): true
fingerprintA: 5145f60204d99a98114951e1a401f4687bbbf2811fbcce176c7b1b3018f52545
fingerprintB: 50de2f6031b20d4dd12659401f3f8a0b8e2d2208ad4c743bcfff3b87912fd924
fingerprints diferentes: true
```

Ambos os consumidores TEMP foram removidos ao final da prova; nenhum deles foi o próprio checkout do DDAE-Engine.

## Determinismo pós-correção

```text
Consumer TEMP único, mesma sessão, mesmo goal, dois builds consecutivos sem mudança de estado:

manifest.json byte-idêntico: true
CONTEXT.md byte-idêntico: true
validation.json byte-idêntico: true
fingerprint idêntico: true
```

## Testes

- `test/context-fingerprint.test.js` — 3 testes novos (Checkpoint 07.1 A/B/C): mesma sessão + `selection_reason` diferente → fingerprint diferente; mesma sessão + mesmo `selection_reason` → fingerprint idêntico em chamadas repetidas; sessão nula permanece determinística (`none` vs. `explicit_not_found` também produzem fingerprints diferentes entre si).
- `test/context-compiler.test.js` — 1 teste novo: `compileContext` com o mesmo `session.id` mas `selection_reason` diferente (`latest_canonical` vs. `explicit`) produz `manifest.fingerprint.value` diferente.
- `test/context-validator.test.js` — 1 teste novo: prova de tampering (ver seção acima).
- Todos os testes pré-existentes das quatro suítes afetadas (`context-fingerprint`, `context-compiler`, `context-validator`, `cli-context`) continuam passando sem modificação — a correção é aditiva, não alterou nenhum comportamento de fingerprint para o caso de uma única sessão por teste.

## Regressão completa

```text
npm test        → 368 tests, 365 pass, 0 fail, 3 skip (363 pré-existentes + 5 novos)
npm run package:check → OK, 105 files (inalterado — nenhum arquivo de produção novo foi necessário)
npm run smoke    → [DDAE smoke] OK
stable host validate  → Status OK, Sessions found 2, Errors 0
stable host audit     → Status OK, Sessions found 2, Errors 0, Warnings 7 (pré-existentes, quality gates pendentes)
```

## Package

105 arquivos, número inalterado em relação ao Bloco 07 — nenhum arquivo de produção novo foi criado, apenas três arquivos existentes (`fingerprint.js`, `compiler.js`, `validator.js`) receberam uma linha adicional cada. Zero vazamento de `Docs/`/`legacy/`/`node_modules/`/`.ddae/`/`package-lock.json`.

## Commit técnico e CI

- Commit técnico: `8e48f21d0650c3b327b736f2ee6185fbc72bedfc` — CI run `31298189704` — `success`, 5/5, primeira tentativa:
  - `ubuntu-latest / Node 22`: success
  - `ubuntu-latest / Node 24`: success
  - `ubuntu-latest / Node 26`: success
  - `windows-latest / Node 24`: success
  - `macos-latest / Node 24`: success
- Step de prova do Stable Host (`scripts/ci/verify-stable-host.mjs`) confirmado verde nos 5 ambientes.

## Confirmação: Bloco 08 ainda não foi iniciado

- `src/context/sensitive-files.js` — ausente.
- Ingestão textual ampla / broad filesystem source scan — ausente.
- Safe Structural Mode — ativo (inalterado por este checkpoint; `context build` continua com `candidates`/`claims`/facts vazios).
- `src/commands/context.js` — não alterado por este checkpoint (só os três módulos de fingerprint/compiler/validator).
- `schema_version` — permanece `"1"` (nenhuma quebra de compatibilidade; esta correção fecha uma omissão de implementação do contrato já vigente, não cria um Manifest v2).
- `package.json.version` — permanece `0.2.0`.

## Compatibilidade

`CONTEXT_SCHEMA_VERSION` inalterado (`"1"`). `CONTEXT_COMPILER_CONTRACT_VERSION` inalterado (`"1"`). Esta correção é estritamente aditiva ao payload de fingerprint — nenhum Manifest existente muda de shape; apenas o valor do fingerprint calculado para um Manifest cujo `session.selection_reason` já era diferente do que o payload anterior conseguia capturar passa a refletir corretamente essa diferença.

## Riscos remanescentes

Nenhum novo. BUG-01 (template do glossário) permanece aberto, P3, não relacionado a este checkpoint.

## Confirmação de zero implementação além do escopo

- `src/context/authority.js`, `relevance.js`, `manifest.js`, `renderer.js`, `src/schemas/context-schema.js`, os três coletores, `src/commands/context.js`, `src/cli.js` — não alterados.
- `src/context/sensitive-files.js` — não criado.
- `.ddae/` — ausente do próprio repositório DDAE-Engine.
- `src/templates/` — não alterado (BUG-01 continua aberto, deliberadamente).
- `package.json`, `package-lock.json` — não alterados/ausente.
- `legacy/sessions/session_12_context_compiler_foundation/` — não alterado.

## Status

**Checkpoint 07.1 — APROVADO.**

## Próxima Ação

Bloco 08 — Sensitive Data Guard + Safe Source Ingestion.
