# Feedback — Bloco 05: Context Manifest and Compiler

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Resumo Executivo

Implementado o núcleo canônico do Context Compiler 0.3.0: `src/schemas/context-schema.js` (validador puro do schema conceitual do Manifest v1), `src/context/fingerprint.js` (serialização canônica determinística + SHA-256 reproduzível), `src/context/manifest.js` (montagem/ordenação canônica + validação final) e `src/context/compiler.js` (orquestração completa: coletores → Source union → verificação content/hash → Authority Model → Relevance Engine → fingerprint → Manifest). `compileContext(input)` transforma o estado já coletado por um chamador autorizado em um Context Manifest v1 validado, determinístico e reproduzível, inteiramente em memória — sem tocar filesystem, rede, ou escrever qualquer arquivo. 83 testes novos (21 fingerprint + 26 manifest + 36 compiler), todos passando. Provado contra o próprio repositório self-hosted: manifesto real compilado a partir dos três coletores reais e `Source`s reais, determinismo confirmado (mesma entrada → mesmo fingerprint, independente de ordem de candidatos), validação de schema confirmada (`valid: true`, zero erros). CI técnica 5/5 na primeira tentativa. Bloco concluído conforme escopo.

## 2. Objetivo do Bloco

Implementar `src/context/manifest.js`, `src/context/fingerprint.js`, `src/context/compiler.js` e `src/schemas/context-schema.js` — a orquestração completa que transforma coletores + Source Model + Authority Model + Relevance Engine em um Context Manifest v1 canônico, validado e fingerprinted. Ver `05_blocks/bloco_05_context_manifest_and_compiler.md`.

## 3. Escopo Implementado

Exatamente o escopo planejado, sem divergência: os quatro módulos de produção, os três arquivos de teste, e a extensão mínima de `REQUIRED_SRC_PREFIXES` (`scripts/release/verify-package.mjs`) para incluir `src/schemas/`, agora que o diretório tem conteúdo de produção real. Nenhum Renderer, Validator CLI-facing, Sensitive Data Guard, ou comando `context ...` foi implementado — permanecem fora de escopo, como planejado. `authority.js`, `relevance.js` e os três coletores não foram alterados.

## 4. Arquivos Criados

- `src/schemas/context-schema.js`
- `src/context/fingerprint.js`
- `src/context/manifest.js`
- `src/context/compiler.js`
- `test/context-manifest.test.js`
- `test/context-fingerprint.test.js`
- `test/context-compiler.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_05_context_manifest_and_compiler.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_05_context_manifest_and_compiler.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_05_context_manifest_and_compiler.md` (este arquivo)

## 5. Arquivos Alterados

- `scripts/release/verify-package.mjs` — `src/schemas/` adicionado a `REQUIRED_SRC_PREFIXES` (Seção 16 do contrato do Manifest v1: o prefixo só entra na lista quando o diretório passa a ter conteúdo de produção real, o que agora é o caso).
- `test/package-check.test.js` — fixture sintética `VALID_FILES` atualizada para incluir um arquivo sob `src/schemas/`, mantendo o teste sincronizado com o novo prefixo obrigatório.

Nenhum outro arquivo de produto pré-existente foi alterado. `src/context/authority.js`, `relevance.js`, `git-context.js`, `project-context.js`, `ddae-context.js` e `src/templates/` permanecem intocados.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
node node_modules/ddae-engine/bin/ddae-engine.js block create "Context Manifest and Compiler" --session session_02_context_compiler_0_3_0 --dir .
node node_modules/ddae-engine/bin/ddae-engine.js prompt create --block bloco_05_context_manifest_and_compiler --session session_02_context_compiler_0_3_0 --dir .
node --test test/context-manifest.test.js test/context-fingerprint.test.js test/context-compiler.test.js
npm test
npm run package:check
npm run smoke
node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
node node_modules/ddae-engine/bin/ddae-engine.js audit --dir .
node node_modules/ddae-engine/bin/ddae-engine.js feedback create --block bloco_05_context_manifest_and_compiler --session session_02_context_compiler_0_3_0 --dir .
```

## 8. Testes Realizados

- `test/context-fingerprint.test.js` — 21 testes: determinismo de `computeContextFingerprint`/`stableStringify` (mesma entrada, ordem de chaves invertida, `selectedSources`/`constraints` em ordem diferente), sensibilidade a mudança em cada campo do payload (goal, session, budget, Git HEAD, source selecionado, content_hash, constraint), ausência de timestamp, algoritmo `sha256`, formato do valor (64 hex), rejeição de `undefined`/função/`Map`/`Set` em `stableStringify`, `sha256Hex` normalizando CRLF→LF (paridade com `authority.js`), verificação estrutural (import único: `node:crypto`).
- `test/context-manifest.test.js` — 26 testes: shape completo do Manifest v1, `schema_version` fixo, passagem de `compiler`/`project`/`goal`/`session`/`git`, estados degradados válidos (`session.id = null`, `git.available = false`), ordenação de `sources` por `id` ASC independente da ordem de entrada, rejeição de `source` duplicado (idêntico ou divergente), rejeição de referência órfã em `relevant_files`/fatos, preservação de conflitos resolvidos e `unresolved`, preservação de `excluded_sources`, ausência de timestamp, rejeição de path absoluto/com barra invertida, determinismo em chamadas repetidas, imutabilidade profunda do retorno (`Object.freeze` recursivo).
- `test/context-compiler.test.js` — 36 testes: obrigatoriedade de `goal`/`engineVersion`/`project`, default `standard` de budget, uso real do Relevance Engine (ranking, ordem preservada em `relevant_files`, conteúdo recuperado via `source.id` — nunca de `rankRelevantSources`, que não devolve `content`), verificação de integridade `content`/`content_hash` (match aceito, mismatch rejeitado, ausência de hash com conteúdo rejeitada), mapeamento de candidatos excedentes de orçamento para `excluded_sources`, fatos explícitos incluídos/órfãos rejeitados, claims explícitos resolvidos via `resolveAuthorityConflict` (incluindo o caso nomeado JWT vs HttpOnly, preservado ponta a ponta no manifesto, e o caso `unresolved`), confirmação de que o Compiler nunca agrupa claims por conta própria, estados degradados de sessão/Git válidos, união determinística de Sources independente de ordem, rejeição de Sources divergentes sob o mesmo id, independência entre autoridade e relevância dentro do Compiler, validação do manifesto de saída via `context-schema.js`, presença de fingerprint, determinismo e imutabilidade de input, e verificação estrutural (zero filesystem/rede/escrita/`.ddae`/Renderer/CLI) — 36 pass, 0 fail (1 falso positivo corrigido durante o bloco, ver Seção 11/12).
- Prova de compilação self-host (script ad-hoc, não persistido no repositório): manifesto real compilado a partir de `collectGitContext`/`collectProjectContext`/`collectDdaeContext` e `Source`s reais (`authority.js`, `compiler.js`, BUG-01), goal `"Context Compiler manifest relevance authority"`, budget `minimal`. Resultado: 3 sources, 3 `relevant_files` selecionados (nenhum excluído), 0 conflitos (nenhum claim explícito fornecido nesta prova), fingerprint válido. Determinismo confirmado (mesma chamada duas vezes → `deepEqual` total e fingerprint idêntico; ordem de candidatos invertida → fingerprint e `sources` idênticos). Validação de schema confirmada (`valid: true`, `errors: []`).

## 9. Validações Executadas

- `npm test` — 257 testes, 254 pass, 0 fail, 3 skip (174 pré-existentes + 83 novos).
- `npm run package:check` — `OK`, 102 arquivos (98 → 102, exatamente pelos 4 novos arquivos de produção — `manifest.js`, `fingerprint.js`, `compiler.js`, `context-schema.js` —, variação explicada, não forçada).
- `npm run smoke` — `[DDAE smoke] OK`.
- `ddae-engine validate --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`.
- `ddae-engine audit --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`, `Warnings: 8` (7 quality gates pendentes de conteúdo, pré-existentes, mais 1 aviso legítimo de bloco sem feedback, capturado antes deste próprio feedback existir).
- CI remota: commit técnico `e78e6a0262bc5db4c6a00d0068d94b7119845581`, run `31294540273`, `success`, 5/5 na primeira tentativa (`ubuntu-latest / Node 22`, `ubuntu-latest / Node 24`, `ubuntu-latest / Node 26`, `windows-latest / Node 24`, `macos-latest / Node 24`), incluindo o step de prova do Stable Host continuando verde nos 5 ambientes.

## 10. Decisões Técnicas

- **`RelevanceCandidate.content` nunca é devolvido por `rankRelevantSources` — o Compiler mantém `candidateBySourceId` a partir do input original e recupera `content` via `source.id` após o ranking.** Decisão explícita para não reacoplar o Relevance Engine (Bloco 04) à persistência do Manifest — o Relevance Engine continua retornando apenas proveniência + score, nunca o payload textual.
- **Verificação de integridade `content`/`content_hash` implementada no Compiler, reaproveitando `sha256Hex` de `fingerprint.js`** (não em `authority.js`, que permanece intocado) — um candidato com `content` não-vazio cujo hash diverge do `content_hash` do seu `Source`, ou cujo `Source` não tem `content_hash`, é rejeitado com erro explícito, nunca aceito silenciosamente.
- **Claims são sempre grupos explícitos fornecidos pelo chamador (`{id, domain, entries: [{source, value}]}`) — o Compiler nunca descobre conflitos por comparação de texto.** `resolveAuthorityConflict` (Bloco 03) é aplicado apenas às Sources de um claim group já formado; testado explicitamente que Sources relacionadas sem um claim explícito nunca geram um conflito no manifesto.
- **`manifest.js` delega toda validação estrutural/referencial a `context-schema.js` via `assertContextManifest`, em vez de duplicar regras de integridade.** `createContextManifest` é responsável apenas por montagem e ordenação canônica (`sources` por `id` ASC); a definição de "manifesto válido" vive em um único lugar.
- **`sources` ordenado por `id` ASC (não `path`/`id`)** — escolha documentada no bloco (Seção 11 do prompt permitia qualquer uma das duas), preferida por manter a mesma chave de ordenação usada para dedup e para o tie-break terciário do Relevance Engine, evitando duas noções distintas de "ordem canônica de Source" no mesmo sistema.
- **`buildFingerprintPayload` ordena `selected_sources` por `id` e `constraints` alfabeticamente internamente**, em vez de confiar na ordem entregue pelo chamador — o fingerprint deve ser uma função da identidade lógica selecionada, não da ordem em que o Relevance Engine (ou qualquer outro componente) as produziu.

## 11. Problemas Encontrados

Dois falsos positivos encontrados e corrigidos durante a escrita dos próprios testes (nunca no código de produção):
1. O teste estrutural "nenhuma referência a `.ddae`" em `context-compiler.test.js` usava o regex `/\.ddae/`, que casava com o parâmetro legítimo `input.ddaeContext` (a saída de `collectDdaeContext()`) — corrigido para `/\.ddae(?![a-zA-Z])/`, que só rejeita `.ddae` como caminho de output (`.ddae/...`), não como prefixo de um identificador como `ddaeContext`.
2. O gate pré-existente `test/package-check.test.js` (`checkMetadata and checkRequiredFiles pass against synthetic valid input`) começou a falhar após `src/schemas/` ser adicionado a `REQUIRED_SRC_PREFIXES`, porque sua fixture sintética `VALID_FILES` não incluía nenhum arquivo sob esse prefixo — corrigido adicionando `src/schemas/context-schema.js` à fixture (Seção 5).

## 12. Correções Aplicadas Durante o Bloco

Ver Seção 11 — ambas as correções foram em arquivos de teste (`context-compiler.test.js`, `package-check.test.js`), nunca em `src/context/compiler.js` ou nos demais módulos de produção deste bloco.

## 13. Pendências

### P1 — Crítica

Nenhuma.

### P2 — Importante

Nenhuma.

### P3 — Melhoria Recomendada

- BUG-01 (template do glossário, herdado do Bloco 01 desta sessão) continua aberto — alvo de bloco futuro desta mesma sessão (Bloco 10, conforme plano do README).

### P4 — Opcional

- O modelo de `claims` explícitos (Seção 14 do bloco) coloca a responsabilidade de agrupar afirmações conflitantes no chamador — comportamento intencional e documentado, não uma lacuna.

## 14. Riscos Restantes

Nenhum novo além do já registrado no bloco (Seção 14 de `05_blocks/bloco_05_context_manifest_and_compiler.md`). BUG-01 permanece aberto, P3, não relacionado a este bloco.

## 15. Evidências

```text
Self-host compile + determinism + schema proof (execução direta contra o próprio repositório):
schema_version: 1
compiler: { name: 'ddae-context-compiler', contract_version: '1', engine_version: '0.2.0' }
project: { name: 'DDAE Engine', root_kind: 'ddae' }
goal.normalized: context compiler manifest relevance authority
session.id: session_02_context_compiler_0_3_0
budget: { profile: 'minimal', max_chars: 20000, used_chars: 176 }
git.head: a9a4a21978401747f9e86fecd2cefb980e10e67e (HEAD do repositório no momento em que a prova foi executada, antes do commit técnico)
source count: 3
relevant_files: compiler.js (24), BUG-01 (16), authority.js (15)
excluded count: 0
conflict count: 0
fingerprint: sha256, 64 hex chars

deepEqual (duas chamadas independentes): true
fingerprint idêntico: true
fingerprint idêntico (ordem de candidatos invertida): true
sources idênticos (ordem de candidatos invertida): true
schema válido: true, errors: []

npm test: 257 tests, 254 pass, 0 fail, 3 skip
npm run package:check: OK, 102 files
npm run smoke: [DDAE smoke] OK
stable host validate: Status OK, Sessions found 2, Errors 0
stable host audit: Status OK, Sessions found 2, Errors 0, Warnings 8 (pré-existentes)

Technical commit: e78e6a0262bc5db4c6a00d0068d94b7119845581
Technical CI: 31294540273 — success, 5/5 (primeira tentativa)
  ubuntu-latest / Node 22: success
  ubuntu-latest / Node 24: success
  ubuntu-latest / Node 26: success
  windows-latest / Node 24: success
  macos-latest / Node 24: success
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Bloco 06 — Markdown Renderer.

## 18. Commit Semântico Sugerido

```
feat(context): add manifest compiler core
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
