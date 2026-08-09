# Bloco 05 — Context Manifest and Compiler

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Objetivo

Implementar o núcleo canônico do Context Compiler 0.3.0 — `src/context/manifest.js`, `src/context/fingerprint.js`, `src/context/compiler.js`, `src/schemas/context-schema.js` — transformando coletores, Source Model, Authority Model e Relevance Engine em um Context Manifest v1 validado e fingerprinted, inteiramente em memória.

## 2. Contexto

Contrato de referência: `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md`, Seções 4 (Source Model), 5 (Authority Model), 8 (Budget), 9 (Fingerprint), 18 (schema conceitual do Manifest v1), e `plano_bloco_12.md` (Bloco 06 — Context Manifest + Compiler: "`compiler.js` orquestra collectors → authority → relevance → serialização estável → fingerprint → `manifest.json`"). Esta sessão já entregou os três coletores (Blocos 01/02), o Source/Authority Model (Bloco 03) e o Relevance Engine (Bloco 04) — este bloco é a primeira camada que produz o artefato canônico central do produto: o Context Manifest.

## 3. Problema que Este Bloco Resolve

Sem um Compiler, o estado coletado, a proveniência, a resolução de autoridade e o ranking de relevância existem como peças desconectadas, sem uma forma canônica, validável e reproduzível de combiná-las. O risco concreto que este bloco evita: (1) um `.ddae/context/` gerado sem um passo de validação prévio, permitindo referências órfãs (um `relevant_file` apontando para um `source_id` que não existe) ou incoerências entre conteúdo e proveniência (`content` divergente do `content_hash` do `Source` que ele alega representar); (2) o Compiler tentando "descobrir" conflitos por similaridade textual (NLP), reintroduzindo exatamente o risco que o Authority Model foi desenhado para eliminar; (3) um fingerprint não-reproduzível por incluir timestamp, ordem de filesystem, ou por hashear a si mesmo.

## 4. Escopo

- `src/schemas/context-schema.js` — `validateContextManifest(manifest)` / `assertContextManifest(manifest)`, validação JS pura do schema conceitual (Seção 18 do contrato), incluindo estados degradados válidos (`session.id = null`, `git.available = false`) e rejeição de referências órfãs, paths não-relativos, `source` duplicado, fingerprint malformado.
- `src/context/fingerprint.js` — `stableStringify` (serialização canônica determinística), `computeContextFingerprint` (SHA-256 genérico), `buildFingerprintPayload` (seleção dos campos do contrato, Seção 9), `sha256Hex` (helper público reaproveitado para verificação de integridade conteúdo/hash).
- `src/context/manifest.js` — `createContextManifest(input)`: monta o shape canônico, ordena `sources` por `id` ASC, anexa o fingerprint fornecido (nunca calcula um), valida via `context-schema.js` antes de retornar.
- `src/context/compiler.js` — `compileContext(input)`: orquestra `normalizeGoal`/`rankRelevantSources` (Relevance Engine), união determinística de `Source`s com verificação de integridade `content`/`content_hash`, resolução de claims explícitos via `resolveAuthorityConflict` (Authority Model, nunca por similaridade textual), montagem de `relevant_files`/`excluded_sources` a partir do ranking, cálculo do fingerprint, e montagem final via `manifest.js`.
- `test/context-manifest.test.js`, `test/context-fingerprint.test.js`, `test/context-compiler.test.js`.
- `src/schemas/` adicionado a `REQUIRED_SRC_PREFIXES` (`scripts/release/verify-package.mjs`), agora que o diretório tem conteúdo de produção real (contrato, Seção 16).

## 5. Fora de Escopo

- `src/context/renderer.js`, `src/context/validator.js`, `src/context/sensitive-files.js`, `src/commands/context.js`.
- `.ddae/`, `manifest.json` em disco, `CONTEXT.md`, `validation.json`.
- Comandos `context build`/`context show`/`context validate`.
- LLM, embeddings, tradução, busca semântica, rede.
- Descoberta automática de claims conflitantes por comparação de texto — claims são sempre grupos explícitos fornecidos pelo chamador.
- Conversão automática de todo o conteúdo Markdown de `collectDdaeContext()` em `RelevanceCandidate`s — o Sensitive Data Guard que autorizaria essa leitura ainda não existe.
- Alteração de `src/context/authority.js`, `relevance.js`, `git-context.js`, `project-context.js`, `ddae-context.js`, `src/templates/`.

## 6. Arquivos e Pastas Envolvidos

- `src/schemas/context-schema.js` (novo).
- `src/context/fingerprint.js` (novo).
- `src/context/manifest.js` (novo).
- `src/context/compiler.js` (novo).
- `test/context-manifest.test.js`, `test/context-fingerprint.test.js`, `test/context-compiler.test.js` (novos).
- `scripts/release/verify-package.mjs` (alterado — `src/schemas/` adicionado a `REQUIRED_SRC_PREFIXES`).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_05_context_manifest_and_compiler.md` (este arquivo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_05_context_manifest_and_compiler.md` e `08_feedbacks/feedback_bloco_05_context_manifest_and_compiler.md` (gerados após a CI técnica verde).

## 7. Dependências

- `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seções 4, 5, 8, 9, 18) e `plano_bloco_12.md` (Bloco 06).
- `src/context/authority.js` (Bloco 03) — `SOURCE_KINDS`, `AUTHORITY_DOMAINS`, `resolveAuthorityConflict`, usado sem alteração.
- `src/context/relevance.js` (Bloco 04) — `normalizeGoal`, `rankRelevantSources`, `BUDGET_PROFILES`, usado sem alteração.
- `src/context/git-context.js`, `project-context.js`, `ddae-context.js` — usados apenas como fonte de snapshots já coletados pelo chamador (nunca invocados internamente pelo Compiler), e para a prova self-host.

## 8. Plano de Implementação

1. Reler as Seções 4, 5, 8, 9 e 18 do contrato do Manifest v1 e a descrição do Bloco 06 em `plano_bloco_12.md`.
2. Implementar `src/schemas/context-schema.js`: validação de cada seção do manifesto, incluindo os estados degradados válidos e a rejeição de toda referência órfã (`relevant_files`, `excluded_sources`, `decisions`/`constraints`/`bugs`/`validation`, `conflicts`) e de `source` duplicado/malformado.
3. Implementar `src/context/fingerprint.js`: `stableStringify` (chaves de objeto ordenadas ASC, arrays preservam ordem do chamador, rejeita `undefined`/função/`Map`/`Set`), `computeContextFingerprint`, `buildFingerprintPayload` (seleciona exatamente os campos do contrato, ordena `selected_sources` por id e `constraints` alfabeticamente para determinismo independente da ordem de entrada), `sha256Hex` (normaliza CRLF→LF, espelhando `authority.js`).
4. Implementar `src/context/manifest.js`: `createContextManifest` monta o shape, ordena `sources` por `id` ASC, preserva a ordem de `relevant_files` vinda do Relevance Engine, anexa o fingerprint fornecido, valida via `assertContextManifest` antes de retornar.
5. Implementar `src/context/compiler.js`: `compileContext` valida input obrigatório (`engineVersion`, `project`, `goal`, `gitContext`, `ddaeContext`, `candidates`), verifica integridade `content`/`content_hash` de cada candidato, roda `rankRelevantSources`, recupera `content` de cada candidato selecionado via `source.id` (nunca via `rankRelevantSources`, que não devolve `content`), constrói `relevant_files`/`excluded_sources`, resolve `claims` explícitos via `resolveAuthorityConflict`, une `Source`s (candidatos + claims) rejeitando divergência sob o mesmo `id`, calcula o fingerprint, monta o manifesto final via `manifest.js`.
6. Escrever os três arquivos de teste cobrindo os cenários do prompt do bloco.
7. Rodar `npm test` e confirmar 0 falhas.
8. Adicionar `src/schemas/` a `REQUIRED_SRC_PREFIXES` em `scripts/release/verify-package.mjs`.
9. Rodar a prova self-host: compilar um Manifest real contra o próprio repositório, usando os três coletores reais e `Source`s reais via `createSource`, provando determinismo (duas compilações idênticas) e validade de schema.
10. Rodar `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
11. Confirmar `src/templates/`, `authority.js`, `relevance.js` e os três coletores intocados; auditar o diff antes de commitar.

## 9. Critérios de Aceite

- [x] `manifest.json` produzido (em memória) valida contra `context-schema.js`.
- [x] Fingerprint reproduzível: mesmo input lógico → mesmo fingerprint, em chamadas separadas e independente da ordem de entrada dos candidatos/sources.
- [x] `session.id = null` e `git.available = false` aceitos pelo schema como estados válidos, preservando a semântica de `selection_reason` do coletor (`none`/`explicit_not_found`).
- [x] Nenhum path absoluto, nenhum timestamp no payload canônico do manifesto ou do fingerprint.
- [x] Nenhuma referência órfã (`relevant_files`, `excluded_sources`, fatos, conflitos) passa pela validação.
- [x] `Source`s com o mesmo `id` mas conteúdo canônico divergente são rejeitadas com erro explícito, nunca silenciosamente escolhidas.
- [x] `content` de um candidato é verificado contra `source.content_hash`; divergência ou ausência de hash com conteúdo não-vazio é rejeitada.
- [x] Claims conflitantes são sempre grupos explícitos fornecidos pelo chamador — o Compiler nunca descobre conflito por comparação de texto.
- [x] `relevant_files` preserva exatamente a ordem de seleção do Relevance Engine (score DESC, path ASC, source id ASC).
- [x] O Compiler nunca acessa filesystem, rede, ou escreve qualquer arquivo.

## 10. Validações Obrigatórias

- [x] `npm test` — suíte completa, 0 falhas.
- [x] `npm run package:check` — OK, delta de arquivos explicado (não forçado).
- [x] `npm run smoke` — `[DDAE smoke] OK`.
- [x] `ddae-engine validate`/`audit` via Stable Host — `Status: OK`, `Errors: 0`.
- [x] CI remota 5/5 (a confirmar após push).

## 11. Segurança

O Compiler é um kernel de compilação em memória fechado por construção: nunca varre o filesystem, nunca abre `source.path`, nunca lê `.env`/`node_modules`/conteúdo arbitrário — todo `content` chega já coletado por um chamador autorizado. Essa fronteira é deliberada: o Sensitive Data Guard completo (Bloco 09/10 futuro) ainda não existe, então este bloco mantém o Compiler como um kernel puro que nunca decide por conta própria o que ler, apenas o que fazer com o que já foi entregue a ele.

## 12. Performance

Não aplicável a novo vetor — operações síncronas em memória (hash SHA-256, ordenação, validação estrutural) sobre um número pequeno de objetos, sem I/O.

## 13. Design System / UX

Não aplicável.

## 14. Riscos

- O modelo de `claims` explícitos coloca a responsabilidade de agrupar afirmações conflitantes no chamador (futura CLI/Compiler caller), não no Compiler — isso é intencional (evita NLP), mas significa que um conflito real nunca será detectado automaticamente se o chamador não o declarar explicitamente. Risco aceito e documentado, consistente com a decisão da Session 12 de nunca inferir semântica de prosa.
- BUG-01 (template do glossário) continua aberto — não afeta este bloco.

## 15. Pendências Esperadas

- Nenhuma pendência P1/P2 esperada. O risco de claims explícitos (Seção 14) é uma decisão de design documentada, não uma lacuna de implementação.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_05_context_manifest_and_compiler --session session_02_context_compiler_0_3_0` (Stable Host), somente após a CI técnica verde.

## 17. Commit Semântico Sugerido

```
feat(context): add manifest compiler core
```
