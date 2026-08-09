# Validação — Bloco 08: Sensitive Data Guard and Safe Source Ingestion

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
cad4e063f9130f635b38ac64e04a48ebdef13425

git rev-parse origin/main
cad4e063f9130f635b38ac64e04a48ebdef13425

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

Stable Host --version: 0.2.0
Candidate --version: 0.2.0
```

## Contrato fechado antes do código

Registrado em `05_blocks/bloco_08_sensitive_data_guard_and_safe_source_ingestion.md`, Seções 4 e 8, reaproveitando `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seção 12) e `plano_bloco_12.md` (antigo Bloco 09).

## Confirmação factual do gap (antes de codar)

Confirmado por leitura direta de `context-schema.js` (`checkReferenceList` exigia `source_id` não-vazio e existente para TODA entrada de `excluded_sources`), `renderer.js` (assumia `source_id`/`score`/`char_cost` sempre presentes) e `compiler.js` (só produzia exclusões a partir de `ranking.skipped`, shape de relevância) — as três premissas do bloco (A/B/C) confirmadas antes de qualquer edição.

## API implementada

- `src/context/sensitive-files.js` — `MAX_SOURCE_BYTES`, `collectSafeProjectSources(projectRoot)`, `readSafeProjectSource(projectRoot, relativePath)`, `collectSafeCurrentSourceHashes(projectRoot, relativePaths)`.
- `src/schemas/context-schema.js` — `checkExcludedSources` (interno, chamado por `validateContextManifest`).
- `src/context/compiler.js` — `compileContext` aceita `input.securityExclusions`.
- `src/context/renderer.js` — `renderExcludedSources` reconhece os dois shapes.
- `src/commands/context.js` — `contextBuildCommand`/`contextValidateCommand` integrados ao Guard.

## Pipeline único de segurança

`inspectPath(root, absolutePath, relativePath)` é a única função que decide se um arquivo é seguro — reaproveitada tanto por `collectSafeProjectSources` (traversal) quanto por `readSafeProjectSource` (releitura pontual, usada por `context validate`). Ordem de checagem, do mais barato ao mais caro: symlink (via `lstat`, sem I/O de conteúdo) → deny de nome → tipo textual reconhecido → tamanho (via `stat`, sem ler conteúdo) → containment via `realpath` → leitura do buffer → detecção de binário (byte NUL) → heurística de conteúdo sensível (só sobre texto já decodificado e normalizado). Nenhuma etapa cara acontece antes de todas as etapas baratas terem passado.

## Deny list e diretórios ignorados

11 padrões de nome (`.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa`, `id_ed25519`, `.npmrc`, `credentials*`, `secrets*`, `*.p12`, `*.pfx`), case-insensitive, aplicados ao basename antes de qualquer leitura. 7 diretórios nunca percorridos (`.git`, `.ddae`, `node_modules`, `dist`, `build`, `coverage`, `vendor`) — testado explicitamente que `.ddae/context/` (mesmo já contendo um build anterior simulado) nunca é visitado, prevenindo self-recursion.

## Symlink — fail-closed

Testado com symlink de arquivo, de diretório, e escapando `projectRoot`: nenhum é seguido, todos gerando uma exclusão de segurança categórica (`reason: 'symlink'`). Teste usa capability detection (skip explícito, nunca falso verde, quando o privilégio de symlink não está disponível — confirmado necessário neste ambiente Windows).

## Tamanho e binário

`MAX_SOURCE_BYTES = 262144` (256 KiB) — validado contra os arquivos de texto reais do próprio projeto antes de ser fixado: o maior arquivo de texto legítimo do repositório tem ~23 KB, tornando 256 KiB um limite generoso (11x) e plausível. Verificado via `stat.size` antes de qualquer leitura de conteúdo — arquivo oversized nunca tem seu conteúdo lido integralmente. Binário detectado via byte NUL sobre o buffer bruto, antes de qualquer interpretação como texto UTF-8.

## Heurística de conteúdo sensível

5 padrões (`PRIVATE KEY`, `API_KEY=`, `TOKEN=`, `PASSWORD=`, `SECRET=`), case-insensitive, tolerantes a espaço opcional ao redor de `=`. Qualquer match exclui o arquivo inteiro — nunca reaproveita, redige, ou retorna o trecho/valor que disparou a regra. Testado explicitamente que o registro de exclusão de segurança nunca contém o conteúdo, valor, ou trecho correspondente (`Object.keys` da exclusão é exatamente `['path', 'reason']`).

## Classificação de Source — puramente estrutural

Nenhuma leitura de conteúdo influencia `kind`/`domain` — apenas o path. Testado que `Docs/02_architecture/**` → `architecture`/`architecture_intent`, `Docs/04_governance/registro_decisoes.md` → `decision`/`architecture_intent`, `Docs/**/07_bugs/**` → `bug`/`active_bug_state`, `Docs/**/09_validation/**` → `validation`/`test_result`, extensões de código → `source_code`/`runtime_metadata`, metadados de projeto conhecidos → `project_metadata`/`runtime_metadata`, e o resto → `documentation`/`history`. Caso nomeado testado explicitamente: `test/app.test.js` é `source_code`, nunca `test_result` automaticamente — código de teste não é evidência de que um teste passou.

## Dual-shape de `excluded_sources`

Discriminado pela ausência de `source_id` (nunca um campo `type` separado — uma exclusão de segurança nunca teve `source_id` para começo de conversa). Schema rejeita explicitamente qualquer campo `content`/`value`/`snippet`/`match`/`secret` em uma exclusão de segurança. Renderer mostra apenas `path`/`reason` para esse shape, nunca tentando um lookup de `sourceById`. Compiler compõe exclusões de relevância (ordem já determinística do Relevance Engine) com exclusões de segurança (ordenadas por `path`/`reason` ASC), sem I/O — `securityExclusions` chega como dado já pronto.

## Integração no build

`context build` agora chama `collectSafeProjectSources(dir)` e passa `candidates`/`securityExclusions` reais para `compileContext`. O receipt de `validation.json` é produzido chamando `validateContextState` de verdade (não mais um objeto `{status: 'VALID'}` fixo), usando os hashes que o Guard já computou durante a própria coleta — nenhuma segunda leitura de arquivo só para montar o receipt.

## Integração no validate

`context validate` constrói `currentSourceHashes` chamando `collectSafeCurrentSourceHashes` sobre os paths dos `relevant_files` do Manifest, mapeando path → `source_id`. Nunca um `fs.readFileSync` direto de `source.path`. Testado ponta a ponta: source alterado → `STALE`/`SOURCE_CONTENT_CHANGED`; source que passa a conter um segredo → nunca `VALID`, nunca vaza o segredo.

## Prova E2E — vazamento zero de segredo sentinela

```text
Consumidor TEMP real, via binário Candidate, segredo sentinela DDAE_SENTINEL_SECRET_7F4A91 em `.env` e em um `.txt` com PASSWORD=:

build exit: 0
manifest.json: sentinel ausente
CONTEXT.md: sentinel ausente
validation.json: sentinel ausente
stdout: sentinel ausente
stderr: sentinel ausente
show: sentinel ausente
validate: sentinel ausente

excluded_sources: config/.env (sensitive_name), config/hidden-secret.txt (sensitive_content)
```

## Prova E2E — frescor guardado

```text
build (goal: "context compiler architecture notes") → validate: Status VALID
notes.md alterado → validate: Status STALE, reason SOURCE_CONTENT_CHANGED
notes.md substituído por conteúdo com PASSWORD=<sentinel> → validate: nunca VALID, sentinel nunca aparece no stdout
```

## Prova E2E — determinismo com ingestão real

Dois builds consecutivos sobre o mesmo estado (conteúdo real ingerido, não mais candidates vazios): `manifest.json`, `CONTEXT.md`, `validation.json` byte-idênticos.

## Regressão de Markdown injection com ingestão real

Ajuste de metodologia (não do Renderer): conteúdo Docs/ legítimo ingerido contém seus próprios sub-headings `##` reais dentro do bloco fenced — esperado e seguro (a proteção do Renderer contra heading falso já foi comprovada com fixture controlada no Bloco 06, teste #25/#26). A prova E2E deste bloco verifica que as dez seções fixas aparecem, na ordem correta, como subsequência do documento — não que `##` nunca apareça em outro lugar.

## Prova self-host (read-only, sem `.ddae/` no repositório)

```text
files considered: 307
safe candidates: 300
security exclusions: 7 (todas sensitive_content)
elapsed: ~200ms

exclusões legítimas (todas por conterem os padrões de detecção como regex/fixture/documentação, não como segredo real):
  Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_08_...md
  legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md
  legacy/sessions/session_12_context_compiler_foundation/plano_bloco_12.md
  src/context/sensitive-files.js
  test/cli-context.test.js
  test/context-manifest.test.js
  test/context-sensitive-guard.test.js

deepEqual (duas coletas independentes): true
.ddae/ ausente do repositório após a prova: true
marcadores sensíveis (PRIVATE KEY/API_KEY=/PASSWORD=/SECRET=/TOKEN=) na saída serializada: nenhum presente
```

## Testes

- `test/context-sensitive-guard.test.js` — 29 testes, 29 pass.
- `test/context-manifest.test.js`, `test/context-renderer.test.js`, `test/context-compiler.test.js` — 3 testes de forma dupla cada, todos pass.
- `test/cli-context.test.js` — 5 testes reescritos + 5 testes E2E novos, todos pass.

## Package protection

`REQUIRED_SRC_PREFIXES` já protegia `src/context/` — não foi necessário alterar. `npm pack --dry-run` confirma `src/context/sensitive-files.js` presente, 106 arquivos totais (105 → 106, variação explicada pelo novo arquivo, não forçada), zero vazamento de `Docs/`/`legacy/`/`node_modules/`/`.ddae/`/`package-lock.json`.

## Regressão

```text
npm test        → 412 tests, 409 pass, 0 fail, 3 skip
npm run package:check → OK, 106 files
npm run smoke    → [DDAE smoke] OK
stable host validate  → Status OK, Sessions found 2, Errors 0
stable host audit     → Status OK, Sessions found 2, Errors 0, Warnings 8 (pré-existentes, quality gates pendentes)
```

## Commit técnico e CI

- Commit técnico: `4bbb759c277c4562e080ed1072eb2ac32fa46b23` — CI run `31301941179` — `success`, 5/5, primeira tentativa:
  - `ubuntu-latest / Node 22`: success
  - `ubuntu-latest / Node 24`: success
  - `ubuntu-latest / Node 26`: success
  - `windows-latest / Node 24`: success
  - `macos-latest / Node 24`: success
- Step de prova do Stable Host (`scripts/ci/verify-stable-host.mjs`) confirmado verde nos 5 ambientes.

## Riscos

Heurística de conteúdo sensível é deliberadamente conservadora — a própria prova self-host excluiu 7 arquivos legítimos do repositório (fixtures de teste, documentação de contrato, o código do próprio Guard) por conterem os padrões de detecção como texto/regex/fixture. Risco aceito e documentado: segurança vence recall nesta versão. BUG-01 permanece aberto, P3, não relacionado a este bloco.

## Pendências para o Bloco 09

- Real Consumer Smoke / Agent Workflow: exercitar `context build/show/validate` contra um consumidor real (não sintético), validando a experiência de um agente de IA consumindo `CONTEXT.md` de ponta a ponta.

## Confirmação de zero implementação além do escopo

- `src/context/authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, os três coletores, `src/cli.js`, `scripts/release/verify-package.mjs` — não alterados.
- `src/templates/` — não alterado (BUG-01 continua aberto, deliberadamente).
- `.ddae/` — ausente do próprio repositório DDAE-Engine.
- `package.json`, `package-lock.json` — não alterados/ausente.
- `legacy/sessions/session_12_context_compiler_foundation/` — não alterado (predecessor histórico preservado).
