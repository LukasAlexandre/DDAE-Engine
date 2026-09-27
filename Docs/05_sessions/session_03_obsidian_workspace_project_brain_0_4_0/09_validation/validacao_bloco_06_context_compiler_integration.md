# Validação — Bloco 06: Context Compiler Integration

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-26

## 1. Escopo

Verificar se `src/workspace/context-packages.js` projeta com segurança o estado do Context Compiler (`.ddae/context/`) para `DDAE-Brain/Context-Packages.md` — metadata-only, sem duplicar o Context Compiler, sem alterar Brain Manifest v1 ou `src/context/**`, e sem regressão.

## 2. Contract Compliance

```text
Context Packages classificado como producer independente (contrato B.1):  confirmado — não entra em manifest.entities — PASS
"Important Files" como seção, não view própria (achado da preparação):     confirmado — Context-Packages.md tem as 2 seções — PASS
Context-Packages nunca autoritativo (DT-01/DT-02):                          confirmado — DERIVED, recomputável — PASS
Nenhum plugin/API/Dataview/wikilink do Obsidian:                             confirmado (mesmo padrão do Bloco 04/05) — PASS
src/context/** intocado:                                                      confirmado via git diff --stat — PASS
```

## 3. Decisões D1–D3 — Verificação

| Decisão | Aplicada como |
|---|---|
| D1 — metadata-only | Safe State (Seção 12.3 do bloco) contém só status/reasons/schema_version/engine_version/goal_hash/budget/fingerprint/counts/relevant_files(`path`,`score`,`char_cost`) — nunca `content`, `goal.text`, `goal.normalized` (testes 12–15) |
| D2 — Collector + Pure Projector | `collectContextPackageState` (I/O) e `renderContextPackagesView` (pura), único módulo; guarda de código-fonte confirma ausência de fs/rede/relógio/aleatoriedade/coletores no Projector (teste 22) |
| D3 — integração adiada | `src/workspace/renderer.js` e `test/workspace-renderer.test.js` não tocados (confirmado via `git diff --stat`); `Context-Packages.md` linka `Home.md`, o inverso não existe ainda (teste 21) |

## 4. Evidência por Estado

| Estado | Gatilho | Resultado |
|---|---|---|
| `missing` | `.ddae/context/` ausente | Estado e view determinísticos, sem exceção (testes 2, 3) |
| `partial` | `.ddae/context/` existe sem `manifest.json` | Tratado como `missing` (teste 9) |
| `VALID` | Manifesto sem `relevant_files` | `VALID`, `reasons: []` (teste 4) |
| `STALE` | Manifesto com `relevant_files` (freshness de conteúdo nunca reverificada por design) | `STALE`/`SOURCE_FRESHNESS_UNVERIFIED` — nunca falso `VALID` (teste 5) |
| `CORRUPT` (JSON) | `manifest.json` não é JSON válido | `CORRUPT`/`MANIFEST_JSON_INVALID` (teste 7) |
| `CORRUPT` (schema) | `manifest.json` válido mas falha o Context Schema (inclusive `schema_version` incompatível) | `CORRUPT`/`MANIFEST_SCHEMA_INVALID`, sem vazar o valor malformado (testes 6, 10) |
| `validation.json` corrompido | JSON inválido | Nunca bloqueia um `manifest.json` válido (teste 8) |

## 5. Evidência de Segurança (Sensitive Data)

| Sentinela | Onde foi injetada | Resultado |
|---|---|---|
| `SUPER_SECRET_CONTENT_123` | `relevant_files[].content` do manifesto real | Ausente do estado seguro e da view (testes 12, 14, 15) |
| `PRIVATE_GOAL_TEXT_456` | `goal.text` | Ausente; apenas `goal.hash` (sha256) é exposto (testes 12, 14) |
| `normalized_private_goal_789`-like | `goal.normalized` | Ausente (testes 12, 14) |
| Conteúdo de `CONTEXT.md` no disco | arquivo real ao lado do manifesto | Nunca lido pelo Collector (teste 15) |
| Path absoluto/dotfolder | diretório temporário real | Nunca aparece na saída; nenhum link para `.ddae/context/` (testes 16, 17) |

## 6. Regressão

`npm test` 598/595/0/3 (era 574/571/0/3, +24 novos). `package:check` OK, 112 arquivos (+1 de produção, esperado). `smoke` OK. `validate`/`audit` 0 erros (warning esperado de "sem feedback", fechado por este bloco). `git diff --check` limpo. `git diff --stat` confirma zero alteração em `src/context/`, `src/workspace/renderer.js`, `test/workspace-renderer.test.js`, `src/workspace/compiler.js`, `src/schemas/brain-schema.js`.

## 7. Matriz de Aceite

| # | Critério | Resultado |
|---|---|---|
| 1 | As 3 Decisões Abertas aprovadas antes do código | PASS |
| 2 | `Context-Packages.md` com seções Status/Important Files sempre presentes | PASS |
| 3 | `relevant_files[].content` e `goal.text`/`goal.normalized` nunca na saída | PASS |
| 4 | Todos os estados determinísticos, sem exceção não tratada | PASS |
| 5 | `validateContextState` reutilizado sem reimplementação; sem re-hash de conteúdo | PASS |
| 6 | `src/context/**` inalterado | PASS |
| 7 | Brain Manifest v1 inalterado | PASS |
| 8 | `renderer.js` não alterado (D3) | PASS |
| 9 | Nenhum link para `.ddae/context/`; nenhum path absoluto/dotfolder | PASS |
| 10 | Nenhuma referência a Claude-Mem/MemoryProvider/rede/LLM/relógio/aleatoriedade | PASS |
| 11 | Regressão completa verde | PASS |

## 8. Resultado

```text
APPROVED
```

Nenhuma pendência P1/P2. P3/P4 herdadas e uma nova P4 registrada no feedback (chamada a `validateContextState` sem Git/DDAE atuais).

## 9. Próximo Passo

Confirmar/criar formalmente o Bloco 07 (Workspace Validator) em execução futura, conforme `mapa_dependencias.md` (depende do Bloco 03, já aprovado).
