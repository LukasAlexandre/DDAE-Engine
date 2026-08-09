# Validação — Bloco 07: Context CLI build show validate

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
614890c222f0dc25702b1aa0806d0c57e0fa1c23

git rev-parse origin/main
614890c222f0dc25702b1aa0806d0c57e0fa1c23

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

Stable Host --version: 0.2.0
Candidate --version: 0.2.0
```

## Contrato fechado antes do código

Registrado em `05_blocks/bloco_07_context_cli_build_show_validate.md`, Seções 4 e 8, reaproveitando `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seções 10–15) e `plano_bloco_12.md` (Bloco 08).

## Reaproveitamento de convenções existentes (sem duplicação)

Antes de implementar, `src/cli.js`, `src/commands/block.js`, `src/commands/validate.js` e `test/helpers.js` foram lidos para extrair o parser real (`parseArgs`/`requireSubcommand`), a convenção de erro (`throw new Error` capturado por `bin/ddae-engine.js` para erros de uso; `process.exitCode` direto para estados de negócio esperados como VALID/STALE/INVALID), e o helper `projectNameOf(dir)` (`src/utils/text.js`) — todos reaproveitados sem duplicação. `src/cli.js` recebeu apenas 22 linhas puramente aditivas.

## Decisão de segurança central: modo estrutural fail-closed

`compileContext` é chamado com `candidates: []`, `claims: []`, `facts: { decisions: [], constraints: [], bugs: [], validation: [] }` — nenhum conteúdo de arquivo do projeto é transformado em `RelevanceCandidate` neste bloco. Testado explicitamente: um arquivo `.env` sintético colocado no consumidor TEMP nunca aparece em `manifest.json` nem em `CONTEXT.md`; `manifest.sources`/`manifest.relevant_files` ficam vazios em todo build deste bloco. Isso é uma decisão de segurança deliberada — o Sensitive Data Guard que autorizaria ler conteúdo real ainda não existe.

## Contrato público da CLI

```text
ddae-engine context build --goal "<text>" [--session <s>] [--budget minimal|standard|deep] [--dir <path>]
ddae-engine context show [--dir <path>]
ddae-engine context validate [--dir <path>]
```

`--goal` obrigatório (rejeita ausente e whitespace-only). `--budget` default `standard`, rejeita valor desconhecido. `--session` explícito nunca recua silenciosamente para `latest_canonical` se a sessão não existir — `context build` falha, sem escrever nada (testado).

## Build em memória primeiro

`compileContext` + `renderContextMarkdown` + montagem do receipt de validação acontecem inteiramente antes de qualquer verificação de segurança de destino ou escrita em disco. Se `goal`/`session` forem inválidos, a função lança antes de qualquer `fs.writeFileSync` — testado (`11. build com sessão explícita inexistente falha... nenhum pacote deve ser escrito em caso de falha`).

## Segurança de destino de escrita

`assertSafeOutputDir` rejeita `.ddae`/`.ddae/context` existindo como arquivo (sem sobrescrever), e rejeita symlink de `.ddae` resolvendo para fora de `projectRoot` — mesma disciplina de `fs.realpathSync` já usada em `scripts/release/smoke-distribution.mjs`, aplicada aqui ao destino de escrita da CLI em vez de ao pacote instalado. Teste de symlink usa capability detection (skip explícito, nunca falso verde, quando o privilégio de symlink não está disponível no runner).

## `.ddae/.gitignore` — self-ignore sem tocar o `.gitignore` raiz

`ensureDdaeGitignore` cria `.ddae/.gitignore` com o conteúdo exato `"*\n"` apenas se ausente — nunca sobrescreve conteúdo pré-existente. Provado em um repositório Git real (via `git init` no consumidor TEMP): `.ddae/` nunca aparece em `git status --porcelain`, aparece corretamente como `!! .ddae/` em `git status --porcelain --ignored`, e o `.gitignore` raiz do consumidor permanece byte-idêntico antes/depois do build.

## Determinismo dos artefatos

`manifest.json` e `validation.json` são serializados via `stableStringify` (reaproveitado de `fingerprint.js`, Bloco 05) — nunca uma segunda lógica de serialização. `CONTEXT.md` é escrito exatamente como `renderContextMarkdown(manifest)` retorna, sem pós-processamento. Builds repetidos sobre o mesmo estado produzem os 3 artefatos byte-idênticos — confirmado por comparação SHA-256 no consumidor TEMP (3/3) e por teste automatizado (`19. repeated builds with the same state are byte-identical`).

## `context show` e `context validate` — estritamente read-only

`context show` só lê `CONTEXT.md` e imprime — nunca recompila, nunca escreve. `context validate` lê `manifest.json` + `CONTEXT.md`, coleta apenas snapshots estruturais atuais já aprovados (`collectGitContext`/`collectDdaeContext`), e nunca reescreve `validation.json`. Ambos testados: hash dos 4 artefatos idêntico antes/depois de cada comando.

## Validator — VALID/STALE/INVALID

`validateContextState` nunca importa nenhum coletor, `authority.js`, `relevance.js` ou `compiler.js` — reconstrói a integridade interna (goal hash via `sha256Hex`, fingerprint via `buildFingerprintPayload`/`computeContextFingerprint`, `CONTEXT.md` via `renderContextMarkdown`) inteiramente a partir do próprio Manifest recebido. `INVALID` tem prioridade sobre `STALE` (testado). Reason codes reais implementados: `MANIFEST_INVALID`, `SCHEMA_VERSION_MISMATCH`, `GOAL_HASH_CHANGED`, `FINGERPRINT_MISMATCH`, `CONTEXT_MARKDOWN_MISMATCH`, `GIT_HEAD_CHANGED`, `SESSION_SOURCE_CHANGED`, `SOURCE_FRESHNESS_UNVERIFIED`, `SOURCE_CONTENT_CHANGED`. Frescor de fonte nunca declara `VALID` por omissão — na ausência de `currentSourceHashes`, o resultado é `STALE`/`SOURCE_FRESHNESS_UNVERIFIED`, nunca um falso positivo.

## Git degradado

Git indisponível/não-repositório em ambos os lados (Manifest e snapshot atual) nunca torna o pacote `STALE`/`INVALID` sozinho — testado tanto no Validator isolado quanto via `context build` real em um consumidor sem `git init`.

## Prova end-to-end em consumidor TEMP (via binário Candidate)

```text
init: 50 file(s) created
build exit: 0 | "Context package built successfully." / "Structural context only: textual source ingestion is deferred until the Sensitive Data Guard."
show exit: 0 | length: 1136 | starts with: "# DDAE Agent Context\n\n##"
validate exit: 0 | "Status: VALID"

repeated build determinism: 3/3 artifacts byte-identical (SHA-256)

gitignore proof (repositório Git real):
.ddae untracked em `git status --porcelain`: false
`git status --porcelain --ignored`: "!! .ddae/"

self-host repo cleanliness: .ddae/ ausente do próprio checkout do DDAE-Engine: true
```

## Testes

- `test/context-validator.test.js` — 24 testes, 24 pass.
- `test/cli-context.test.js` — 35 testes, 35 pass.

Cobertura: os cenários listados no prompt do bloco (Etapas 29–30 do prompt histórico correspondente), incluindo os testes de segurança de destino de escrita (arquivo colidindo, symlink escapando), a prova de que um `.env` sintético nunca é lido, e a prova de que `sensitive-files.js` ainda não existe.

## Package protection

`REQUIRED_SRC_PREFIXES` já protegia `src/context/` e `src/commands/` — não foi necessário alterar. `npm pack --dry-run` confirma `src/context/validator.js` e `src/commands/context.js` presentes, 105 arquivos totais (103 → 105, variação explicada pelos dois novos arquivos, não forçada), zero vazamento de `Docs/`/`legacy/`/`node_modules/`/`.ddae/`/`package-lock.json`.

## Regressão

```text
npm test        → 363 tests, 360 pass, 0 fail, 3 skip
npm run package:check → OK, 105 files
npm run smoke    → [DDAE smoke] OK
stable host validate  → Status OK, Sessions found 2, Errors 0
stable host audit     → Status OK, Sessions found 2, Errors 0, Warnings 8 (pré-existentes, quality gates pendentes)
```

## Commit técnico e CI

- Commit técnico: `4c7f1d8dab0e62ea4c51c812f513a467f9650464` — CI run `31296468999` — `success`, 5/5, primeira tentativa:
  - `ubuntu-latest / Node 22`: success
  - `ubuntu-latest / Node 24`: success
  - `ubuntu-latest / Node 26`: success
  - `windows-latest / Node 24`: success
  - `macos-latest / Node 24`: success
- Step de prova do Stable Host (`scripts/ci/verify-stable-host.mjs`) confirmado verde nos 5 ambientes.

## Riscos

O valor prático imediato de `context build` fica limitado pelo modo estrutural — sem nenhum `relevant_file` selecionado até o Bloco 08 habilitar ingestão textual segura. Risco aceito e documentado, sistema permanece fail-closed no meio tempo. BUG-01 permanece aberto, P3, não relacionado a este bloco.

## Pendências para o Bloco 08

- Sensitive Data Guard + Safe Source Ingestion: implementar `src/context/sensitive-files.js` (deny list de arquivo/conteúdo, realpath containment, exclusão de binário, limite de tamanho) e então habilitar `context build` a transformar conteúdo de projeto filtrado em `RelevanceCandidate`s reais.

## Confirmação de zero implementação além do escopo

- `src/context/authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `renderer.js`, `src/schemas/context-schema.js`, os três coletores — não alterados.
- `src/context/sensitive-files.js` — não criado (Bloco 08).
- `.ddae/` — ausente do próprio repositório DDAE-Engine.
- `src/templates/` — não alterado (BUG-01 continua aberto, deliberadamente).
- `package.json`, `package-lock.json` — não alterados/ausente.
- `legacy/sessions/session_12_context_compiler_foundation/` — não alterado (predecessor histórico preservado).
