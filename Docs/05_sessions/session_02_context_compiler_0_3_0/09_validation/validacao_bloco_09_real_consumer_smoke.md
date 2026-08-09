# Validação — Bloco 09: Real Consumer Smoke and Agent Workflow

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
8ab26b0221f001d46071a3c924da25b727e435ba

git rev-parse origin/main
8ab26b0221f001d46071a3c924da25b727e435ba

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

Stable Host --version: 0.2.0
Candidate --version: 0.2.0
```

## Contrato fechado antes do código

Registrado em `05_blocks/bloco_09_real_consumer_smoke_and_agent_workflow.md`, Seções 2 e 4, reaproveitando `legacy/sessions/session_12_context_compiler_foundation/plano_bloco_12.md` (antigo Bloco 10 — Real Consumer Smoke/Agent Workflow) como contrato de referência. Diferente de todos os blocos anteriores desta sessão, este bloco não introduziu nenhuma API nova — o "contrato fechado antes do código" aqui é a lista explícita de regras que não podiam ser distorcidas por um teste: (a) Relevance v1 não tem threshold mínimo — exclusão só por pressão de orçamento; (b) `facts`/`claims` nunca são extraídos por NLP — apenas entrada formalmente estruturada.

## Natureza do bloco: validation-first, não implementation-first

Ao contrário de todos os blocos anteriores desta sessão (02–08), este bloco não tinha uma API a projetar — o objetivo era determinar, por prova empírica, se a composição das APIs já existentes (Blocos 01–08 + Checkpoint 07.1) é suficiente para um consumidor real. A regra obrigatória do prompt era explícita: **se um teste revelasse necessidade de alterar `src/`, o bloco deveria parar e reportar o gap, não implementar a correção.**

## Prova manual exploratória (antes de qualquer teste persistido)

Consumidor TEMP construído com `init` real + sessão canônica real (`session create`) + Git real (`git init`/`add`/`commit`, branch e HEAD reais) + conteúdo de domínio: código fonte (`src/auditoria_usuarios.js`, `src/usuarios.js`, `src/auth.js`), teste (`test/auditoria_usuarios.test.js`), arquitetura (`Docs/02_architecture/auditoria_usuarios.md`), decisão formal (`DEC-01` em `Docs/04_governance/registro_decisoes.md`), bug da sessão atual (`BUG-AUD-01` em `07_bugs/bugs_identificados.md`), evidência de validação (`09_validation/validacao_auditoria.md`), um documento não relacionado dimensionado deliberadamente (~11 KB, parágrafo repetido) para criar pressão real de orçamento sem alterar pesos, um binário (cabeçalho PNG real), e um `.env` com segredo sentinela (`DDAE_CONSUMER_SMOKE_SECRET_91B7F2`). Executado duas vezes, `context build` sob budget `standard` (default) e sob `--budget minimal`:

```text
standard: budget.used_chars 59952/60000
  relevant_files inclui: validation (score 19), architecture (16), test (16), bug (14),
    src/auditoria_usuarios.js (14), decision registro_decisoes.md (score 6) — TODOS presentes
  roadmap_future.md: excluded_sources, reason budget_exceeded, score 2

minimal: budget.used_chars 19922/20000
  relevant_files inclui: validation, architecture, test, bug, src/auditoria_usuarios.js — presentes
  decision registro_decisoes.md: excluded_sources, reason budget_exceeded (squeeze sob pressão forte)
  roadmap_future.md: excluded_sources, reason budget_exceeded, score 2

sentinel leak (ambos os runs): manifest=false, CONTEXT.md=false
manifest.decisions / bugs / validation / conflicts: [] em ambos os runs
```

**Achado 1 — Relevância e pressão de orçamento**: confirmado que a exclusão do documento não relacionado é sempre por `budget_exceeded`, nunca por um threshold de score (que não existe no Relevance Engine v1) — mesmo sob pressão extrema (`minimal`), onde até a decisão formal perde espaço, o padrão se mantém coerente com o contrato: ranking + orçamento, nunca um corte por nota mínima.

**Achado 2 — Fatos estruturados sempre vazios, por design**: `manifest.decisions`/`bugs`/`validation`/`conflicts` permanecem `[]` em ambos os runs, mesmo com decisão/bug/validação selecionados e presentes em `## Relevant Files` com `kind`/`authority_class` corretos. Avaliação: pacote objetivamente suficiente para um agente que lê o `CONTEXT.md` completo. Classificado como **P3 — melhoria de UX documentada** (não P2 — a informação está presente e corretamente rotulada, apenas não duplicada na seção de conveniência).

**Nenhum blocker de produto foi encontrado.** Nenhuma linha de `src/` foi alterada em nenhum momento — nem durante a exploração manual, nem durante a escrita dos testes.

## PROVA A — `test/context-consumer-smoke.test.js` (binário do checkout)

Fixture construída uma única vez via `before`/`after` do `node:test` (todos os testes leem o mesmo pacote já construído, exceto os que deliberadamente provam pressão de orçamento/determinismo/staleness com builds adicionais isolados). 26 testes cobrindo os 30 itens do prompt do bloco:

- Inicialização, sessão canônica correta, Git real (branch/HEAD/working tree limpo).
- `context build/show/validate` funcionam via binário do checkout.
- Classificação correta de Source por tipo (`source_code`/`architecture`/`decision`/`bug`/`validation`), incluindo o caso nomeado `test/*.test.js` → sempre `source_code`, nunca `test_result` por nome.
- Proveniência completa (`id`/`kind`/`path`/`section`/`authority_class`/`content_hash`) em todo `relevant_files`.
- Conteúdo core rankeando acima do documento não relacionado; exclusão por pressão de orçamento comprovada em build dedicado sob `--budget minimal`, com comentário explícito no teste afirmando a invariante "zero-score sources são cidadãos válidos do ranking".
- `.env` excluído por nome, nunca vira Source; binário nunca vira Source; segredo sentinela com zero ocorrências em manifest/CONTEXT.md/validation.json/stdout/stderr de build+show+validate.
- Ausência de qualquer path absoluto em qualquer artefato.
- `CONTEXT.md` sozinho permite identificar goal, branch, HEAD, sessão, arquivos core, `DEC-01`, `BUG-AUD-01`, texto de validação, com `Kind: `decision``/`Kind: `bug``/`Kind: `validation`` corretos.
- Builds repetidos byte-idênticos; fingerprint estável.
- Mutação de source selecionado (restaurada em `finally`) → `STALE`/`SOURCE_CONTENT_CHANGED`, sem vazamento.
- `show`/`validate` estritamente read-only (nenhuma escrita em `.ddae/context/`).
- Estado real dos arrays de fatos estruturados documentado explicitamente (`decisions`/`bugs`/`validation`/`conflicts` sempre `[]`, conteúdo real disponível via `Relevant Files`).
- **Authority gate A**: todo `authority_class` do consumidor real pertence ao conjunto de 7 domínios válidos.
- **Authority gate B**: claim explícito (roadmap histórico vs. decisão atual, dados no estilo do consumidor) resolvido corretamente tanto via `resolveAuthorityConflict` direto quanto via `compileContext` real, sem alterar `authority.js`.

```text
node --test test/context-consumer-smoke.test.js
pass 26
fail 0
```

## PROVA B — extensão de `scripts/release/smoke-distribution.mjs` (tarball instalado)

Nova função `contextCompilerJourney(binPath, contextConsumerDir)`, puramente aditiva, chamada como uma nova etapa (`Context compiler`) após a etapa `Legacy detection` já existente. Usa segredo sentinela dedicado (`DDAE_DISTRIBUTION_SMOKE_SECRET_3C91EA`, distinto do usado na PROVA A e do usado no Bloco 08). Executa `init` → escreve `README.md` e `.env` com o sentinela → `context build --goal "distribution smoke proof"` → confirma mensagem de sucesso e zero sentinela no stdout → lê `manifest.json`/`CONTEXT.md` do tarball instalado, confirma zero sentinela em ambos → confirma `.env` em `excluded_sources` com `reason: 'sensitive_name'` → confirma `README.md` em `sources` → `context show` byte-idêntico ao `CONTEXT.md` em disco → `context validate` retorna `Status: VALID`.

```text
npm run smoke
...
Context compiler: OK
[DDAE smoke] OK
```

## Prova de Authority em memória (Etapa 19 do bloco)

Incluída como parte da PROVA A (`Authority gate B`, acima) — não um arquivo separado. Usa `createSource`/`resolveAuthorityConflict`/`compileContext` reais, com dados no estilo do consumidor (`Docs/01_product/roadmap_future.md` histórico vs. `DEC-01` em `Docs/04_governance/registro_decisoes.md`), sem tocar `src/context/authority.js`.

## Zero alteração em `src/`

```text
git diff --name-only -- src/
(vazio)
```

Confirmado antes do commit técnico — a restrição central deste bloco.

## Regressão

```text
npm test              → 438 tests, 435 pass, 0 fail, 3 skip (412 pré-existentes + 26 novos)
npm run package:check  → OK, 106 files (inalterado — nenhum arquivo de produção novo)
npm run smoke          → [DDAE smoke] OK (incluindo a nova etapa Context compiler: OK)
stable host validate   → Status OK, Sessions found 2, Errors 0
stable host audit      → Status OK, Sessions found 2, Errors 0, Warnings 8 (pré-existentes, quality gates pendentes)
```

## Commit técnico e CI

- Commit técnico: `8ab26b0221f001d46071a3c924da25b727e435ba` — CI run `31329699521` — `success`, 5/5, primeira tentativa:
  - `ubuntu-latest / Node 22`: success
  - `ubuntu-latest / Node 24`: success
  - `ubuntu-latest / Node 26`: success
  - `windows-latest / Node 24`: success
  - `macos-latest / Node 24`: success
- Step de prova do Stable Host (`scripts/ci/verify-stable-host.mjs`) confirmado verde nos 5 ambientes.

## Riscos

- **P3 — melhoria de UX documentada**: `## Decisions`/`## Known Bugs`/`## Validation` sempre leem "None recorded." mesmo com conteúdo correspondente selecionado (presente, correto, em `## Relevant Files`). Fora de escopo deste bloco por ser estritamente validation-first; candidato a bloco futuro dedicado.
- BUG-01 permanece aberto, P3, não relacionado a este bloco.

## Pendências para o Bloco 10

- BUG-01 (template do glossário) + Context Compiler Polish — incluindo avaliação da melhoria de UX P3 registrada acima, a critério do usuário.

## Confirmação de zero implementação além do escopo

- `src/**` — **não alterado em nenhum arquivo**, confirmado por `git diff --name-only -- src/` vazio antes do commit técnico.
- `src/context/authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `renderer.js`, `sensitive-files.js`, os três coletores, `src/cli.js`, `src/commands/context.js`, `scripts/release/verify-package.mjs` — não alterados.
- `src/templates/` — não alterado (BUG-01 continua aberto, deliberadamente).
- `.ddae/` — ausente do próprio repositório DDAE-Engine.
- `package.json`, `package-lock.json` — não alterados.
- `legacy/sessions/session_12_context_compiler_foundation/` — não alterado (predecessor histórico preservado, usado apenas como contrato de referência).

## Resultado Final

**BLOCO 09 — REAL CONSUMER SMOKE / AGENT WORKFLOW: APROVADO**
