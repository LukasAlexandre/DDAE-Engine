# Validação — Bloco 06: Markdown Renderer

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
cf8f7da827c44ff20993b2ef2923a0cb6f43da37

git rev-parse origin/main
cf8f7da827c44ff20993b2ef2923a0cb6f43da37

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

Stable Host --version: 0.2.0
Candidate --version: 0.2.0
```

## Contrato fechado antes do código

Registrado em `05_blocks/bloco_06_markdown_renderer.md`, Seções 4 e 8, reaproveitando `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seção 1) e `plano_bloco_12.md` (Bloco 07).

## API implementada

- `src/context/renderer.js` — `renderContextMarkdown(manifest)` (síncrona, pura) e `SECTION_TITLES` (constante exportada, usada por testes para verificar ordem/unicidade das seções).

## Direção canônica — Manifest → Markdown, nunca o contrário

Confirmado por diff e por teste estrutural: `renderer.js` não implementa nenhum parser Markdown → Manifest, não escreve em `manifest.fingerprint.value`, e o único import de produção é `assertContextManifest` de `context-schema.js`. `manifest.js`, `fingerprint.js`, `compiler.js`, `authority.js`, `relevance.js` e os três coletores nunca são importados.

## Título e seções top-level

O documento sempre começa com `# DDAE Agent Context`, seguido de exatamente dez seções `##`, sempre na mesma ordem documentada (`SECTION_TITLES`), sempre presentes mesmo vazias — testado com um Manifest mínimo (todas as coleções vazias) e recontado após injetar conteúdo adversarial em `relevant_files[].content` (`# Fake Top-Level Heading`), confirmando que a contagem/ordem de seções nunca muda.

## Architecture — view, não fato novo

`renderArchitecture` filtra `manifest.relevant_files` por `sourceById.get(entry.source_id)?.kind === 'architecture'` — nenhuma inferência textual. Testado com um caso positivo (Source `kind: 'architecture'` presente) e um caso negativo explícito (Source `kind: 'documentation'` cujo conteúdo contém literalmente a palavra "architecture" em prosa) confirmando que o segundo nunca aparece na seção.

## `excluded_sources` ≠ Out of Scope

`excluded_sources` é renderizado como subseção `### Excluded Sources` dentro de `## Relevant Files`. Testado explicitamente que um `excluded_sources` presente nunca vaza para dentro do conteúdo de `## Out of Scope`, que sempre renderiza a frase neutra fixa `"None explicitly recorded in Manifest v1."` — Manifest v1 não tem campo `out_of_scope`, e o Renderer nunca infere um a partir de `constraints`/`excluded_sources`/`kind`/texto livre.

## Proteção estrutural contra Markdown injection

`codeBlock` conta a maior sequência consecutiva de backticks no conteúdo e usa uma fence de `max+1` backticks (mínimo 3). Testado com conteúdo contendo um fence de 3 backticks aninhado (Renderer usa 4 backticks) e com conteúdo simulando `"# Fake Top-Level Heading"` seguido de mais texto (permanece inteiramente dentro do bloco fenced, nunca cria uma seção top-level real — confirmado recontando `SECTION_TITLES` após a renderização). `inlineCode` aplica o mesmo princípio de escaping a valores estruturais (paths, ids, hashes).

## Provenance e conflitos — apresentação, não nova resolução

Decisions/constraints/bugs/validation são renderizados com `value` + referência de proveniência (`source_id`, `path`, `section` quando disponíveis) via `renderProvenance` — nunca busca de texto adicional. Conflitos `resolved` e `unresolved` são renderizados fielmente a partir de `manifest.conflicts` (`winner`/`conflicting_sources` já resolvidos pelo Authority Model no Bloco 05) — teste estrutural confirma que `resolveAuthorityConflict` nunca é referenciado dentro de `renderer.js`.

## Determinismo, imutabilidade, pureza

- Duas renderizações do mesmo Manifest produzem exatamente a mesma string (`===`), incluindo o mesmo Manifest compilado com `candidates` em ordem invertida no `compileContext` (Bloco 05) — a propriedade de determinismo do Manifest já comprovada no Bloco 05 se propaga intacta através do Renderer.
- O documento termina com exatamente um `\n` final; nenhum timestamp em nenhuma seção.
- `manifest` de entrada nunca é mutado (`JSON.stringify` idêntico antes/depois; `Object.isFrozen(manifest)` continua `true`).
- Teste estrutural confirma zero acesso a filesystem/rede/escrita, zero uso de LLM/embeddings, e ausência de qualquer chamada a `compileContext`/`rankRelevantSources`/`resolveAuthorityConflict`/`normalizeGoal`.

## Prova self-host — renderização, determinismo byte-a-byte, canonicidade

```text
output length: 2208
section headings: Goal, Project State, Current Session, Architecture, Relevant Files,
                   Decisions, Constraints, Known Bugs, Validation, Out of Scope
goal.normalized: context compiler markdown renderer manifest
session.id: session_02_context_compiler_0_3_0
relevant file paths: src/context/compiler.js, src/context/manifest.js,
                      Docs/.../07_bugs/bugs_identificados.md, src/context/relevance.js
conflict count: 0
fingerprint: 94dce77a86cfabc6d974adbdc52c85dadb6dc2ca143951710c0025b8cc761a98

render(manifest) === render(manifest): true
render byte-identical (candidates reversed at compile time): true
fingerprint.value unchanged after render: true
manifest still Object.isFrozen after render: true
```

Trecho revisado manualmente para legibilidade (primeiros 600 caracteres) — confirmado que um leitor consegue identificar objetivo, estado do projeto e sessão atual sem consultar o Manifest JSON bruto.

## Testes

`test/context-renderer.test.js` — 47 testes, 47 pass, 0 fail, 0 skip. Cobertura: os 49 cenários listados no prompt do bloco (alguns consolidados em um único teste quando naturalmente relacionados, ex. purismo estrutural), incluindo os dois testes negativos críticos (Architecture não promove documentação por menção textual; conteúdo adversarial não quebra a estrutura top-level).

## Package protection

`REQUIRED_SRC_PREFIXES` (`scripts/release/verify-package.mjs`) já protegia `src/context/` — não foi necessário alterar. `npm pack --dry-run` confirma `src/context/renderer.js` presente, 103 arquivos totais (102 → 103, variação explicada pelo novo arquivo, não forçada), zero vazamento de `Docs/`/`legacy/`/`node_modules/`/`package-lock.json`/`.ddae/`.

## Regressão

```text
npm test        → 304 tests, 301 pass, 0 fail, 3 skip
npm run package:check → OK, 103 files
npm run smoke    → [DDAE smoke] OK
stable host validate  → Status OK, Sessions found 2, Errors 0
stable host audit     → Status OK, Sessions found 2, Errors 0, Warnings 8 (pré-existentes, quality gates pendentes)
```

## Commit técnico e CI

- Commit técnico: `f5e0a4135a82bfd3c604a973c0a1d150aaa30649` — CI run `31295571156` — `success`, 5/5, primeira tentativa:
  - `ubuntu-latest / Node 22`: success
  - `ubuntu-latest / Node 24`: success
  - `ubuntu-latest / Node 26`: success
  - `windows-latest / Node 24`: success
  - `macos-latest / Node 24`: success
- Step de prova do Stable Host (`scripts/ci/verify-stable-host.mjs`) confirmado verde nos 5 ambientes.

## Riscos

Architecture depende inteiramente de Sources formalmente `kind: "architecture"` estarem entre os `relevant_files` selecionados pelo Compiler — se nenhuma existir, a seção aparece vazia mesmo havendo documentação de arquitetura relevante sob outro `kind`. Risco aceito e documentado (nunca inferir por NLP). BUG-01 permanece aberto, P3, não relacionado a este bloco.

## Pendências para o Bloco 07

- Context CLI (`context build/show/validate`): expor `compileContext` + `renderContextMarkdown` como comando real, escrevendo `.ddae/context/{manifest.json,CONTEXT.md}` pela primeira vez — este bloco (06) nunca escreveu nenhum arquivo.

## Confirmação de zero implementação além do escopo

- `src/context/authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `src/schemas/context-schema.js`, os três coletores — não alterados.
- `src/context/validator.js`, `sensitive-files.js`, `src/commands/context.js` — não criados.
- `.ddae/`, `manifest.json` em disco, `CONTEXT.md` em disco, `validation.json` — não criados.
- `src/templates/` — não alterado (BUG-01 continua aberto, deliberadamente).
- `package.json`, `package-lock.json` — não alterados/ausente.
- `legacy/sessions/session_12_context_compiler_foundation/` — não alterado (predecessor histórico preservado).
