# Validação — Bloco 03: Project Brain Schema, Fingerprint & Compiler

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-26

## 1. Escopo

Verificar se `src/schemas/brain-schema.js`, `src/workspace/fingerprint.js` e `src/workspace/compiler.js` transformam o snapshot do Discovery em um Brain Manifest v1 conforme o contrato congelado, de forma pura, determinística e sem tocar `src/context/**`.

## 2. Contract Compliance

```text
Brain Manifest Schema v1 (Seção B):     campos exatos do contrato, campo-set fechado — PASS
                                          (git = {available, head}; views = []; entities = 6 chaves)
Entidades (Seção C):                     6 entidades DERIVED/GENERATED do snapshot; Memory EXCLUDED — PASS
Generated Files (Seção D):                Nenhum arquivo gerado neste bloco — N/A, não violado
Ownership (Seção E):                       Nenhum artefato MACHINE GENERATED escrito — PASS
CLI (Seção F) / Drift (Seção H):            Fora de escopo (Blocos 07/08) — N/A
Security (Seção I):                         Sem path absoluto, sem novo ponto de leitura — PASS
```

## 3. Decisões Abertas — Verificação

D1–D5 resolvidas antes do código (`05_blocks/bloco_03_…md`, Seção 15) e refletidas no código e nos testes: D1 (`git`), D2 (Discovery expõe `ddae`; Compiler não coleta), D3 (`views: []`), D4 (`engine_version` no fingerprint), D5 (entidades mínimas, sem Memory).

## 4. Architectural Review (pré-commit)

| # | Pergunta | Resultado |
|---|---|---|
| 1 | Compiler realiza I/O escondido? | Não — teste lê o código-fonte e proíbe fs/rede/relógio/aleatoriedade/coletores |
| 2 | Discovery continua sendo a fronteira de coleta? | Sim — única mudança foi expor dados que ele já coletava |
| 3 | Schema segue exatamente o contrato? | Sim — campo-set fechado, testado campo a campo |
| 4 | Algum campo foi inventado? | Não — `generated_at` é opcional e previsto na Seção B |
| 5 | Há paths absolutos? | Não — testado no Compiler, no Fingerprint, no Discovery e na integração |
| 6 | Há nondeterminismo? | Não — `deepEqual` entre compilações; comparação por code point |
| 7 | Fingerprint depende de dados voláteis? | Não — exclui `generated_at`, `project.name`, `git.branch` (não faz parte do v1) |
| 8 | Houve alteração em `src/context/**`? | Não |
| 9 | Algo do Bloco 04 entrou? | Não — `views: []`, sem renderer, sem escrita |
| 10 | Claude-Mem apareceu em runtime? | Não — teste garante |

## 5. Regressão

`npm test` 520 total / 517 pass / 0 fail / 3 skip. `package:check` OK (110 arquivos). `smoke` OK. `validate` e `audit` com 0 erros. `git diff --check` limpo. `git status --short src/context scripts bin package.json` vazio.

## 6. Matriz de Aceite

| # | Critério | Resultado |
|---|---|---|
| 1 | `compileBrainManifest` produz manifesto válido (self-host e projeto vazio/degradado) | PASS |
| 2 | Todos os campos da Seção B presentes, `schema_version = brain-manifest-v1` | PASS |
| 3 | Duas execuções → `deepEqual` e mesmo fingerprint | PASS |
| 4 | Fingerprint muda com entrada canônica e não muda com `generated_at` | PASS |
| 5 | Manifesto malformado rejeitado/lançado pelo schema | PASS |
| 6 | Sem escrita em disco, sem `.ddae/brain/`, sem rede, sem LLM | PASS |
| 7 | Sem path absoluto; arrays em ordem canônica independente do SO | PASS |
| 8 | Nenhum arquivo de `src/context/**`, `scripts/`, `bin/`, `package.json`, contrato alterado | PASS |
| 9 | Nenhuma referência a Claude-Mem/MemoryProvider/entidade Memory no código | PASS |
| 10 | Regressão completa verde | PASS |

## 7. Resultado

```text
APPROVED
```

Nenhuma pendência P1/P2. P3/P4 registradas no feedback.

## 8. Próximo Passo

Bloco 04 — Workspace Renderer, a ser criado formalmente após revisão.
