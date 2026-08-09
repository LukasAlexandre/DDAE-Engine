# Validação — Bloco 11: Context Compiler 0.3.0 Release Preparation

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
1f609025c6a90831ab11a661012baf69cedd81bb

git rev-parse origin/main
1f609025c6a90831ab11a661012baf69cedd81bb

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

npm view ddae-engine@0.3.0 version
404 Not Found (esperado)

Stable Host --version: 0.2.0
Candidate --version: 0.2.0
```

## Contrato fechado antes do código

Registrado em `05_blocks/bloco_11_context_compiler_0_3_0_release_preparation.md`, Seções 1–5: PREPARAR ≠ PUBLICAR, sem `npm publish`/tag/GitHub Release, sem reabrir o núcleo do Context Compiler. Decisão de SemVer confirmada: `0.2.0` → `0.3.0` é `MINOR` — capability nova e aditiva (`context build/show/validate`), sem quebra de compatibilidade de nenhum comando pré-existente.

## Auditoria da infraestrutura de release (antes de qualquer edição)

Toda ocorrência de `0.2.0`/`EXPECTED_VERSION` no runtime/infra de release foi localizada e classificada antes de editar:

| Ocorrência | Classificação | Ação |
|---|---|---|
| `package.json:3` (`version`) | D — Current Candidate | bumpado para `0.3.0` |
| `scripts/release/verify-package.mjs:10` (`EXPECTED_VERSION`) | D — Current Candidate | bumpado para `0.3.0` |
| `scripts/release/smoke-distribution.mjs` (usa `EXPECTED_VERSION` importado) | derivado de D | nenhuma edição direta necessária — segue automaticamente |
| `scripts/ci/verify-stable-host.mjs:14` (`STABLE_HOST_VERSION`) | C — Stable Host Pin | **não alterado**, conforme regra do bloco |

Nenhuma ocorrência ambígua foi encontrada; nenhum arquivo fora dessa lista referenciava `0.2.0` de forma versionada (`.github/workflows/ci.yml` lê a versão dinamicamente via `node bin/ddae-engine.js --version`, sem hardcode).

## Auditoria da CLI real antes de documentar

```text
node bin/ddae-engine.js --help
→ confirma exatamente: init, session create, block create, prompt create,
  feedback create, validate, audit, context build --goal, context show,
  context validate, com --dir/--force/--goal/--session/--budget

node bin/ddae-engine.js context build --help
→ "Unknown option: --help" (exit 1) — subcomandos não suportam --help
  individual; confirmado antes de documentar qualquer flag no README
```

Nenhuma flag documentada no README que não exista na implementação real.

## Documentação pública (README + CHANGELOG)

`README.md` não tinha, antes deste bloco, nenhuma menção ao Context Compiler — confirmado por busca textual antes de editar. Adicionada uma seção dedicada "Context Compiler" (uso, budgets, arquivos de saída, modelo VALID/STALE/INVALID, Sensitive Data Guard, limitação conhecida de structured facts), a CLI reference estendida com os três comandos reais, e a seção "Project status" atualizada (estava desatualizada, ainda descrevendo `v0.1.0`). `CHANGELOG.md` ganhou a entrada `[0.3.0]` no formato já estabelecido pelas entradas `[0.2.0]`/`[0.1.0]`. Nenhuma menção a NLP/Obsidian/MCP como implementados — a limitação de structured facts é declarada explicitamente.

## Bump de versão e verificação

```text
package.json: version 0.2.0 → 0.3.0
scripts/release/verify-package.mjs: EXPECTED_VERSION 0.2.0 → 0.3.0
scripts/ci/verify-stable-host.mjs: STABLE_HOST_VERSION inalterado (0.2.0)

node bin/ddae-engine.js --version → 0.3.0 (Candidate)
node node_modules/ddae-engine/bin/ddae-engine.js --version → 0.2.0 (Stable Host)
```

Divergência Stable Host (0.2.0) vs. Candidate (0.3.0) confirmada como o comportamento correto e esperado do modelo de self-hosting.

## Prova via tarball 0.3.0 real, instalado isoladamente

```text
npm pack --dry-run --json:
  name: ddae-engine, version: 0.3.0, filename: ddae-engine-0.3.0.tgz, entryCount: 106

npm run smoke (empacota, instala em TEMP fora do checkout, executa o binário instalado):
  Tarball: OK (ddae-engine-0.3.0.tgz)
  Package install: OK
  CLI --version: OK
  Context compiler: OK   <- context build/show/validate + Sensitive Guard + zero-leak
                             contra o artefato instalado, nunca o checkout
  [DDAE smoke] OK

Nenhum .tgz remanescente no checkout após o empacotamento.
```

## Regressão

```text
npm test                              → 448 tests, 445 pass, 0 fail, 3 skip (inalterado desde o Bloco 10)
test/context-consumer-smoke.test.js    → 26 pass, 0 fail
test/text-render-template.test.js +
test/cli-init.test.js (BUG-01)         → 14 pass, 0 fail
test/context-sensitive-guard.test.js   → 29 pass, 0 fail
npm run package:check                  → OK, ddae-engine@0.3.0, 106 files
stable host validate                   → Status OK, Errors 0
stable host audit                      → Status OK, Errors 0, Warnings 8 (7 pré-existentes + 1 esperado)
```

## Diff auditado — núcleo do Context Compiler intocado

```text
git diff --name-only -- src/context/ src/schemas/ src/commands/context.js
(vazio)

git diff --name-only
CHANGELOG.md
Docs/05_sessions/session_02_context_compiler_0_3_0/13_release/release_notes.md
README.md
package.json
scripts/release/verify-package.mjs
```

Confirmado antes do commit técnico — nenhuma alteração em `src/context/**`, `src/schemas/context-schema.js`, `src/commands/context.js`, pesos, orçamentos, contrato do Manifest/fingerprint, ou regras do Sensitive Guard.

## Commit técnico e CI

- Commit técnico: `ede702ad3ec83f902024d1cf1a801656cce27efd` — CI run `31339547060` — `success`, 5/5, primeira tentativa:
  - `ubuntu-latest / Node 22`: success
  - `ubuntu-latest / Node 24`: success
  - `ubuntu-latest / Node 26`: success
  - `windows-latest / Node 24`: success
  - `macos-latest / Node 24`: success
- Step "CLI --version" confirmado `0.3.0` nos 5 ambientes; step "Self-host: prove published stable host governs this checkout" confirmado verde, continuando a usar `ddae-engine@0.2.0` publicado.

## Prova formal de não-publicação

```text
npm view ddae-engine version → 0.2.0 (inalterado)
npm view ddae-engine@0.3.0 version → 404 Not Found (esperado)

git tag --list "v0.3.0" → (vazio)
git ls-remote --tags origin "refs/tags/v0.3.0" → (vazio)
git rev-parse "v0.2.0^{}" → 2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9 (inalterado)
```

## Riscos

Nenhum risco novo. O release candidate está pronto mas explicitamente **não publicado** — nenhuma ação irreversível (`npm publish`, tag, GitHub Release) foi executada neste bloco.

## Pendências para o Bloco 12

- Bloco 12 — Controlled 0.3.0 Release: `npm publish`, tag `v0.3.0`, GitHub Release, mediante autorização humana explícita e checkpoints antes de cada operação irreversível.
- Structured context completeness (P3, não bloqueante) permanece registrada em `13_release/release_notes.md` como limitação conhecida da release.

## Confirmação de zero implementação além do escopo

- `src/context/authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `renderer.js`, `validator.js`, `sensitive-files.js`, `src/schemas/context-schema.js`, `src/commands/context.js`, os três coletores, `src/cli.js`, `src/utils/text.js` — não alterados.
- `scripts/ci/verify-stable-host.mjs` (`STABLE_HOST_VERSION`) — não alterado, permanece `0.2.0`.
- `.github/workflows/ci.yml` — não alterado.
- `package-lock.json` — não alterado/ausente.
- `npm publish`, `git tag`, `gh release create` — nenhum executado.

## Resultado Final

**BLOCO 11 — CONTEXT COMPILER 0.3.0 RELEASE PREPARATION: APROVADO**
