# Validação — Bloco 07: Workspace Validator

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-27

## 1. Escopo

Verificar se `validateBrainWorkspace` classifica corretamente um Brain Manifest v1 como `VALID`/`STALE`/`INVALID` conforme o Drift Contract (contrato, Seção H), sem duplicar o Context Compiler, sem alterar nenhuma outra camada do Brain, e sem regressão.

## 2. Contract Compliance

```text
Enum e prioridade INVALID > STALE > VALID (Seção H):            confirmado — teste 16 — PASS
VALID exige integridade + frescor (Seção H):                       confirmado — testes 2, 10 — PASS
INVALID: schema/schema_version/fingerprint/path/views (Seção H):    confirmado — testes 3, 4, 5-8, 19 — PASS
STALE: Docs/DDAE/Git mudaram desde o build (Seção H):                confirmado — testes 11-15, 27b — PASS
Modelo reaproveitado sem refatorar Context Validator (Seção H):        confirmado — zero import de src/context/** — PASS
```

## 3. Decisões D1–D3 — Verificação

| Decisão | Aplicada como |
|---|---|
| D1 — kernel não extraído | `src/context/validator.js` intocado; nenhum módulo `*-kernel.js`/`shared-validator.js` criado (confirmado via `git diff --stat` e listagem de arquivos novos) |
| D2 — `currentManifest` implementado | Opcional, puro; validado estruturalmente antes de comparar (`assertOptions`); lança se inválido (teste 16b), nunca produz `STALE` por omissão (teste 9) |
| D3 — `PATH_ESCAPES_ROOT` fecha RS-01 | Checagem lexical própria, independente do Renderer e da Sensitive Data Guard; Brain Schema inalterado; Renderer inalterado (testes 5-8d) |

## 4. Evidência por Estado

| Estado | Gatilho | Resultado |
|---|---|---|
| `VALID` | Manifesto íntegro, sem opções | `reasons: []` (teste 2) |
| `VALID` (com `currentManifest`) | Segundo Manifest idêntico | `reasons: []` (teste 10) |
| `INVALID` (schema) | `schema_version` incompatível / campo desconhecido | `MANIFEST_SCHEMA_INVALID` genérico, sem eco (testes 3, 3b) |
| `INVALID` (fingerprint) | `fingerprint.value` adulterado, ou campo fingerprintado alterado sem recompute | `FINGERPRINT_MISMATCH` (testes 4, 4b, 4c) |
| `INVALID` (path) | `..`, `.`, segmento vazio, valor tipo-esquema em `sources[]`/`entities.*[]` | `PATH_ESCAPES_ROOT`, com `field`/`index`; path seguro nunca dispara; múltiplas ocorrências reportadas (testes 5-8e) |
| `INVALID` (views) | `expectedViews` fornecido e diferente de `manifest.views` | `VIEWS_MISMATCH` (teste 19); omitido nunca falha por `views = []` (teste 17) |
| `STALE` | `engine_version`/`git.head`/`current_session`/entidade divergente, com `currentManifest` | código correto por campo, múltiplos motivos coexistindo (testes 11-15) |
| `INVALID` > `STALE` | Manifesto adulterado + `currentManifest` divergente | só `FINGERPRINT_MISMATCH`, frescor nem avaliado (teste 16) |

## 5. Evidência de Segurança (Sensitive Data)

| Verificação | Resultado |
|---|---|
| `PRIVATE_SUMMARY_TEXT_123` (sentinela em `summary`) | Ausente de `reasons` (teste 26) |
| Path absoluto de máquina | Ausente de `reasons` (teste 26) |
| Manifesto inteiro embutido no resultado | Ausente — `reasons` só carrega códigos/`field`/`index`/`entity` (teste 26b) |
| `currentManifest` estruturalmente inválido | Nunca produz frescor arbitrária — lança (teste 16b) |

## 6. Regressão

`npm test` 641/638/0/3 (era 598/595/0/3, +43 novos). `package:check` OK, 113 arquivos (+1 de produção, esperado). `smoke` OK. `validate`/`audit` 0 erros (warning esperado de "sem feedback", fechado por este bloco). `git diff --check` limpo. `git diff --stat` confirma zero alteração em `src/context/`, `src/workspace/compiler.js`, `fingerprint.js`, `discover.js`, `renderer.js`, `context-packages.js`, `src/schemas/brain-schema.js`.

## 7. Matriz de Aceite

| # | Critério | Resultado |
|---|---|---|
| 1 | As 3 Decisões fechadas antes do código | PASS |
| 2 | `validateBrainWorkspace(manifest)` sem opções → nunca `STALE` | PASS |
| 3 | `INVALID` cobre schema/fingerprint/path/views | PASS |
| 4 | `STALE` cobre engine/git/sessão/entidades, só com `currentManifest` | PASS |
| 5 | `manifest.views = []` sem `expectedViews` nunca é `INVALID` | PASS |
| 6 | `INVALID` sempre precede `STALE` | PASS |
| 7 | Zero import de `src/context/**`; zero alteração a outras camadas do Brain | PASS |
| 8 | Nenhuma escrita em disco | PASS |
| 9 | `reasons` nunca carrega texto livre/summary | PASS |
| 10 | Determinístico, puro, sem mutação de input | PASS |
| 11 | Regressão completa verde | PASS |

## 8. Resultado

```text
APPROVED
```

Nenhuma pendência P1/P2. P3/P4 herdadas e duas novas P4 registradas no feedback (ID-07 fechado; `DOCS_CONTENT_CHANGED` sem granularidade de causa).

## 9. Próximo Passo

Confirmar/criar formalmente o Bloco 08 (CLI) em execução futura, conforme `mapa_dependencias.md` (depende dos Blocos 04, 05, 06 e 07 — todos agora aprovados).
