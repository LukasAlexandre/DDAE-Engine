# Validação — Bloco 03: Authority and Source Model

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
8dc657314625070c54aaa129d6f6fca5b1976a83

git rev-parse origin/main
8dc657314625070c54aaa129d6f6fca5b1976a83

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

Stable Host --version: 0.2.0
Candidate --version: 0.2.0
```

## Contrato fechado antes do código

Registrado em `05_blocks/bloco_03_authority_and_source_model.md`, Seções 4 e 8, e reaproveitado literalmente de `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md`, Seções 4 (Source Model) e 5 (Authority Model) — nada foi redefinido, apenas implementado.

## API implementada

- `createSource({ kind, domain, path, section, identity, content })` — síncrona, pura, em `src/context/authority.js`.
- `resolveAuthorityConflict(sources)` — síncrona, pura.
- `SOURCE_KINDS` (10) e `AUTHORITY_DOMAINS` (7) exportados como listas fechadas.

## `kind` vs `domain` — independência garantida

`domain` é sempre um parâmetro explícito e obrigatório de `createSource`, sem default derivado de `kind` e sem inferência de conteúdo. Testado diretamente (`createSource` aceita os 10 kinds com qualquer domínio válido) e indiretamente (o caso JWT vs HttpOnly usa `kind: 'documentation'` para a fonte perdedora e `kind: 'decision'` para a vencedora, mas o critério de decisão usado pelo módulo é sempre `authority_class`/domain, nunca `kind`).

## Regra de resolução de conflito

- `future_intent` e `history` nunca vencem uma fonte presente-autoritativa — incondicional, sem exceção testada.
- Exatamente uma fonte presente-autoritativa → ela vence; demais preservadas em `conflicting_sources` com `reason_superseded: "current_<domínio_vencedor>_over_<domínio_perdedor>"`.
- Zero ou duas-ou-mais fontes presente-autoritativas → `status: 'unresolved'`, `winner: null`, todas as fontes preservadas, ordenadas por `id`.
- Nenhuma fonte perdedora é descartada em nenhum dos dois casos — testado explicitamente (`conflicting_sources.length` sempre igual a `sources.length - 1` no caso resolvido, ou `sources.length` no caso `unresolved`).

## Caso nomeado: JWT vs HttpOnly

Teste dedicado (`test/context-authority.test.js`): uma fonte `history` afirmando "usar JWT no browser" (roadmap antigo) conflitando com uma fonte `architecture_intent` afirmando "usar sessão opaca com cookie HttpOnly" (decisão atual aprovada). Resultado: `status: 'resolved'`, vencedora a decisão HttpOnly, `reason_superseded: 'current_architecture_intent_over_history'`, roadmap JWT preservado em `conflicting_sources`. Este é exatamente o cenário motivador do contrato da Session 12 — confirmado, não apenas assumido.

## Determinismo e imutabilidade

- `id` derivado de SHA-256(`kind:identidade:section`) — nunca de `Date.now()`, posição de array ou `randomUUID()`. Mesma entrada lógica → mesmo `id`, testado.
- `content_hash` normaliza `\r\n` para `\n` antes do hash — mesmo conteúdo semântico produz o mesmo hash em Windows e Linux, testado.
- `resolveAuthorityConflict` é independente de ordem de entrada (`resolveAuthorityConflict([a,b])` `deepEqual` `resolveAuthorityConflict([b,a])`) e nunca muta as fontes recebidas (`Object.freeze` em todos os objetos retornados; testado com verificação de `Object.isFrozen` e comparação de serialização antes/depois).

## Path safety

`assertProjectRelativePath` rejeita (nunca reescreve) qualquer `path` começando com `/` ou `C:\`-style, ou contendo `\` — testado com casos Windows e POSIX.

## Verificação estrutural (sem filesystem/rede/LLM/relevância)

Teste dedicado lê o próprio `src/context/authority.js` e confirma, via regex, ausência de `import 'node:fs'`, chamadas de leitura de arquivo, acesso de rede, e qualquer termo associado a relevância/score/embedding — o módulo é comprovadamente puro, não apenas por inspeção manual.

## Prova de interoperabilidade com os coletores existentes

Sources construídas a partir da saída real (não sintética) dos três coletores desta sessão, contra o próprio repositório:

```text
collectGitContext(ROOT).head            → Source(kind: git, domain: repository_state)
collectProjectContext(ROOT).markers     → Source(kind: project_metadata, domain: runtime_metadata)
collectDdaeContext(ROOT).current_session → Source(kind: bug, domain: active_bug_state, path: .../07_bugs/bugs_identificados.md, section: BUG-01)
  — construída apenas porque current_session estava formalmente disponível; nenhuma inferência.
```

## Prova de autoridade contra estado real (self-host)

```text
resolveAuthorityConflict(staleDoc[history], gitSource[repository_state]):
  status: resolved
  winner_domain: repository_state
  conflicting_count: 1
  reason_superseded: current_repository_state_over_history

resolveAuthorityConflict(staleDoc[history], bugSource[active_bug_state]):
  status: resolved
  winner_domain: active_bug_state
  reason_superseded: current_active_bug_state_over_history
```

## Testes

`test/context-authority.test.js` — 34 testes, 34 pass, 0 fail, 0 skip. Cobertura: forma canônica, os 10 kinds, os 7 domínios, validação de entrada inválida, path safety, determinismo de id/hash, ausência de timestamp, resolução de conflito para os 5 domínios presente-autoritativos (incluindo JWT vs HttpOnly), `future_intent`/`history` nunca vencendo, preservação de fontes perdedoras, estados `unresolved` (mesmo domínio, domínios diferentes, apenas não-presente-autoritativos), independência de ordem, imutabilidade, verificação estrutural.

## Package protection

`REQUIRED_SRC_PREFIXES` (`scripts/release/verify-package.mjs`) já protegia `src/context/` desde o Bloco 02 da Session 12 legacy — não foi necessário alterar. `npm pack --dry-run --json` confirma `src/context/authority.js` presente, 97 arquivos totais (96 → 97, variação explicada pelo novo arquivo, não forçada), zero vazamento de `Docs/`/`legacy/`/`node_modules/`/`package-lock.json`.

## Regressão

```text
npm test        → 127 tests, 124 pass, 0 fail, 3 skip
npm run package:check → OK, 97 files
npm run smoke    → [DDAE smoke] OK
stable host validate  → Status OK, Sessions found 2, Errors 0
stable host audit     → Status OK, Sessions found 2, Errors 0, Warnings 8 (pré-existentes, quality gates pendentes)
```

## Commit técnico e CI

- Commit: `79bfc8ab268b5747f6efa8807ac1c512e9dac755`
- CI run: `31291787161` — `success`, 5/5
  - `ubuntu-latest / Node 22`: success
  - `ubuntu-latest / Node 24`: success
  - `ubuntu-latest / Node 26`: success
  - `windows-latest / Node 24`: success
  - `macos-latest / Node 24`: success
- Step de prova do Stable Host (`scripts/ci/verify-stable-host.mjs`) confirmado verde nos 5 ambientes para este mesmo commit.

## Riscos

Conflito entre dois domínios presente-autoritativos diferentes retorna `unresolved` por design (nenhuma ordem entre os 5 domínios presente-autoritativos foi definida pelo contrato) — risco aceito e documentado, não uma lacuna. BUG-01 (template do glossário) permanece aberto, P3, herdado do Bloco 01 — não relacionado a este bloco.

## Pendências para o Bloco 04

- Relevance Engine v1: usar o Source Model e o Authority Model deste bloco como entrada para ranquear fontes por relevância ao objetivo da sessão atual — ainda sem tocar Manifest/Compiler/Renderer.

## Confirmação de zero implementação além do escopo

- `src/context/git-context.js`, `src/context/project-context.js`, `src/context/ddae-context.js` — não alterados.
- `src/commands/context.js`, `src/context/compiler.js`, `src/context/relevance.js`, `src/context/renderer.js`, `src/context/fingerprint.js` — não criados.
- `.ddae/`, `manifest.json`, `CONTEXT.md` — não criados.
- `src/templates/` — não alterado (BUG-01 continua aberto, deliberadamente).
- `package.json`, `package-lock.json` — não alterados/ausente.
- `legacy/sessions/session_12_context_compiler_foundation/` — não alterado (predecessor histórico preservado).
