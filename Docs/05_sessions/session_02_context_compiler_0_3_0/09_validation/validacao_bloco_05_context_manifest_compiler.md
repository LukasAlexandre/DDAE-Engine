# Validação — Bloco 05: Context Manifest and Compiler

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
a9a4a21978401747f9e86fecd2cefb980e10e67e

git rev-parse origin/main
a9a4a21978401747f9e86fecd2cefb980e10e67e

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

Stable Host --version: 0.2.0
Candidate --version: 0.2.0
```

## Contrato fechado antes do código

Registrado em `05_blocks/bloco_05_context_manifest_and_compiler.md`, Seções 4 e 8, reaproveitando `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seções 4, 5, 8, 9, 18) e `plano_bloco_12.md` (Bloco 06).

## APIs implementadas

- `src/schemas/context-schema.js` — `CONTEXT_SCHEMA_VERSION`, `validateContextManifest(manifest)`, `assertContextManifest(manifest)`.
- `src/context/fingerprint.js` — `FINGERPRINT_ALGORITHM`, `sha256Hex(text)`, `stableStringify(value)`, `computeContextFingerprint(payload)`, `buildFingerprintPayload({...})`.
- `src/context/manifest.js` — `CONTEXT_SCHEMA_VERSION` (re-exportado), `createContextManifest(input)`.
- `src/context/compiler.js` — `CONTEXT_COMPILER_NAME`, `CONTEXT_COMPILER_CONTRACT_VERSION`, `compileContext(input)`.

## Separação arquitetural — quatro módulos, não um único compiler.js

Confirmada por diff: cada responsabilidade vive em seu próprio arquivo — validação de schema (`context-schema.js`), hashing/serialização canônica (`fingerprint.js`), montagem/ordenação (`manifest.js`), orquestração (`compiler.js`). `compiler.js` importa os outros três; nenhum deles importa `compiler.js` de volta — sem ciclo.

## Schema — estados degradados e rejeições

`validateContextManifest` aceita explicitamente `session.id = null` (com `selection_reason` restrito a `none`/`explicit_not_found`, preservando a semântica exata do enum de `collectDdaeContext`) e `git.available = false` (com `repository`/`branch`/`head`/`working_tree` forçados a `false`/`null`). Rejeita: `schema_version` desconhecida, `compiler`/`goal`/`budget`/`git` incompletos, `source` sem id/kind/authority_class inválidos, path absoluto ou com backslash, `source` duplicado, `fingerprint` com algoritmo diferente de `sha256` ou valor malformado, e toda referência órfã em `relevant_files`/`excluded_sources`/fatos/`conflicts` — testado em `test/context-manifest.test.js` e `test/context-compiler.test.js` (via `compileContext`'s uso de `assertContextManifest`).

## Fronteira Source Model — content nunca entra em Source

Confirmado por diff: `src/context/authority.js` não foi alterado. O Compiler mantém `candidateBySourceId` a partir do `input.candidates` original e recupera `content` por `source.id` **depois** de `rankRelevantSources` (que nunca devolve `content` — decisão deliberada do Bloco 04, não revisitada). `relevant_files[].content` é o único lugar do manifesto onde texto pesquisável aparece; `sources[]` permanece proveniência pura.

## Integridade content/content_hash

`assertContentHashIntegrity` (interno a `compiler.js`, reaproveitando `sha256Hex` de `fingerprint.js`) rejeita: candidato com `content` não-vazio e `source.content_hash === null`; candidato cujo `sha256Hex(content)` diverge de `source.content_hash`. Testado explicitamente nos dois casos (`test/context-compiler.test.js`, cenários 9–10).

## Claims explícitos — sem descoberta automática

`compileContext` só produz um `conflicts[]` para claim groups explicitamente fornecidos em `input.claims` (`{id, domain, entries: [{source, value}]}`). Testado que duas Sources relacionadas (ex.: Git HEAD atual e um documento histórico sobre o mesmo fato) presentes como candidates comuns, sem um claim explícito, **não** geram nenhum conflito no manifesto — a única forma de um conflito aparecer é o chamador declará-lo. `resolveAuthorityConflict` (Bloco 03) é reaproveitado sem alteração; o caso nomeado JWT vs HttpOnly foi reproduzido ponta a ponta através do Compiler e preservado corretamente no manifesto final (`status: resolved`, `winner.source_id` = decisão HttpOnly, roadmap JWT em `conflicting_sources` com `reason_superseded`).

## Relevância integrada, autoridade não influencia score

`compileContext` chama `rankRelevantSources` (Bloco 04) diretamente sobre `input.candidates`, com o mesmo `normalizedGoal` usado para `goal.hash` — nunca re-tokeniza o goal duas vezes. `relevant_files` preserva a ordem exata do ranking (score DESC, path ASC, source id ASC). Testado explicitamente que duas Sources lexicalmente idênticas com `authority_class` diferente recebem o mesmo score dentro do Compiler — autoridade e relevância seguem eixos independentes também nesta camada de orquestração.

## Fingerprint — reprodutibilidade

`buildFingerprintPayload` seleciona exatamente os campos do contrato (Seção 9): `schema_version`, `compiler_contract_version`, `goal_normalized`, `session_id`, `budget_profile`, `budget_max_chars`, `git_head`, `selected_sources` (ordenado por id, com `content_hash`), `constraints` (ordenado alfabeticamente) — nunca inclui o próprio valor do fingerprint, timestamp, path absoluto, ou ordem de filesystem. `stableStringify` serializa com chaves de objeto ordenadas ASC e arrays preservados na ordem já canônica dada pelo chamador. Testado: mesmo input lógico → mesmo fingerprint (incluindo ordem de criação de chaves invertida); qualquer campo relevante alterado → fingerprint muda; ordem de entrada de `selectedSources`/`constraints` não influencia o resultado (ordenação interna).

## Prova self-host — compilação, determinismo, validação de schema

```text
schema_version: 1
compiler: { name: 'ddae-context-compiler', contract_version: '1', engine_version: '0.2.0' }
project: { name: 'DDAE Engine', root_kind: 'ddae' }
goal.normalized: context compiler manifest relevance authority
session.id: session_02_context_compiler_0_3_0
budget: { profile: 'minimal', max_chars: 20000, used_chars: 176 }
git.head: a9a4a21978401747f9e86fecd2cefb980e10e67e
source count: 3
relevant_files: compiler.js (score 24), BUG-01 (score 16), authority.js (score 15)
excluded count: 0
conflict count: 0
fingerprint: sha256, 64 caracteres hex

deepEqual (duas chamadas independentes): true
fingerprint idêntico (duas chamadas independentes): true
fingerprint idêntico (ordem de candidatos invertida): true
sources idênticos (ordem de candidatos invertida): true
validateContextManifest: valid=true, errors=[]
```

## Testes

- `test/context-fingerprint.test.js` — 21 testes, 21 pass.
- `test/context-manifest.test.js` — 26 testes, 26 pass.
- `test/context-compiler.test.js` — 36 testes, 36 pass.

Cobertura: os cenários listados no prompt do bloco (Etapas 32–34), incluindo os casos nomeados JWT vs HttpOnly e unresolved, integridade content/hash, purismo estrutural (zero filesystem/rede/escrita/`.ddae`/Renderer/CLI em `compiler.js` e `fingerprint.js`), determinismo e imutabilidade.

## Package protection

`REQUIRED_SRC_PREFIXES` (`scripts/release/verify-package.mjs`) atualizado para incluir `src/schemas/`, conforme a Seção 16 do contrato do Manifest v1 ("esses prefixos entram na lista assim que os diretórios existirem com conteúdo real"). `npm pack --dry-run` confirma os 4 novos arquivos de produção presentes, 102 arquivos totais (98 → 102, variação explicada, não forçada), zero vazamento de `Docs/`/`legacy/`/`node_modules/`/`package-lock.json`/`.ddae/`.

## Regressão

```text
npm test        → 257 tests, 254 pass, 0 fail, 3 skip
npm run package:check → OK, 102 files
npm run smoke    → [DDAE smoke] OK
stable host validate  → Status OK, Sessions found 2, Errors 0
stable host audit     → Status OK, Sessions found 2, Errors 0, Warnings 8 (pré-existentes, quality gates pendentes)
```

## Incidentes durante o bloco (ambos em testes, nunca em produção)

1. Falso positivo no teste estrutural "sem referência a `.ddae`" de `context-compiler.test.js` — o regex `/\.ddae/` casava com o identificador legítimo `ddaeContext`. Corrigido para `/\.ddae(?![a-zA-Z])/`.
2. O gate pré-existente `test/package-check.test.js` passou a falhar após `src/schemas/` entrar em `REQUIRED_SRC_PREFIXES`, porque sua fixture sintética `VALID_FILES` não tinha nenhum arquivo sob esse prefixo. Corrigido adicionando `src/schemas/context-schema.js` à fixture.

`src/context/compiler.js`, `fingerprint.js`, `manifest.js` e `src/schemas/context-schema.js` nunca foram alterados por nenhuma dessas correções.

## Commit técnico e CI

- Commit técnico: `e78e6a0262bc5db4c6a00d0068d94b7119845581` — CI run `31294540273` — `success`, 5/5, primeira tentativa:
  - `ubuntu-latest / Node 22`: success
  - `ubuntu-latest / Node 24`: success
  - `ubuntu-latest / Node 26`: success
  - `windows-latest / Node 24`: success
  - `macos-latest / Node 24`: success
- Step de prova do Stable Host (`scripts/ci/verify-stable-host.mjs`) confirmado verde nos 5 ambientes.

## Riscos

Claims conflitantes são sempre explícitos — se um chamador futuro (a CLI do Bloco 07/08) não declarar um claim group, um conflito real nunca aparecerá automaticamente no manifesto. Risco aceito e documentado (decisão deliberada, evita reintroduzir NLP). BUG-01 permanece aberto, P3, não relacionado a este bloco.

## Pendências para o Bloco 06

- Markdown Renderer: função pura de `manifest.json` (em memória, produzido por `compileContext`) para `CONTEXT.md` — sem lógica de seleção própria, sem tocar filesystem neste bloco (a escrita real fica para o CLI).

## Confirmação de zero implementação além do escopo

- `src/context/authority.js`, `relevance.js`, `git-context.js`, `project-context.js`, `ddae-context.js` — não alterados.
- `src/context/renderer.js`, `validator.js`, `sensitive-files.js`, `src/commands/context.js` — não criados.
- `.ddae/`, `manifest.json` em disco, `CONTEXT.md`, `validation.json` — não criados.
- `src/templates/` — não alterado (BUG-01 continua aberto, deliberadamente).
- `package.json`, `package-lock.json` — não alterados/ausente.
- `legacy/sessions/session_12_context_compiler_foundation/` — não alterado (predecessor histórico preservado).
