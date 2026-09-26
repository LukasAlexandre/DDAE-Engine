# Bloco 03 — project brain schema fingerprint compiler

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-26

> **Status: CONCLUÍDO / APROVADO** (2026-09-26). As 5 Decisões (Seção 15) foram resolvidas antes de qualquer código; implementação em TDD. Ver `08_feedbacks/feedback_bloco_03_…md` e `09_validation/validacao_bloco_03_…md`.

## 1. Objetivo

Transformar o snapshot determinístico produzido por `src/workspace/discover.js` em um **Brain Manifest v1** estruturado, validável e com fingerprint reproduzível, sem escrever em disco e sem qualquer conceito de memória persistente.

## 2. Contexto

Terceiro bloco da `0.4.0` (Project Brain), executado contra o contrato congelado no Bloco 01 (`Docs/03_contracts/contrato_workspace_project_brain.md`, Seções B, C e H) e sobre a camada de descoberta aprovada no Bloco 02. Segue `04_planning/plano_execucao.md` (ordem 3; depende do Bloco 2). Requisito: `RF-01`. Decisão de base: `DT-01`.

A decisão arquitetural `DT-02` (`Docs/02_architecture/adr_knowledge_memory_context.md`) se aplica assim: o Brain Manifest é uma representação de **Knowledge** (estado canônico de `Docs/` + Git), derivada e recomputável. Ele **não** modela Memory nem Persistent Memory Providers; nada neste bloco referencia Claude-Mem ou provider algum.

## 3. Problema que Este Bloco Resolve

O Discovery entrega dados em memória sem forma contratual, sem validação e sem identidade. Sem um manifesto validado e fingerprinted, não há como o Renderer (Bloco 04) renderizar de forma determinística nem como o Validator (Bloco 07) distinguir `VALID` / `STALE` / `INVALID` — o modo de falha que o contrato proíbe é o Brain divergir silenciosamente de `Docs/`.

## 4. Escopo

- **Schema** (`brain-schema.js`): constante de versão `brain-manifest-v1`, `validateBrainManifest(manifest)` (retorna lista de erros, sem lançar) e `assertBrainManifest(manifest)` (lança). Cobre todos os campos da Seção B do contrato com type / obrigatoriedade / paths relativos com `/` / ordenação de arrays / ausência de path absoluto.
- **Fingerprint** (`fingerprint.js`): `buildBrainFingerprintPayload(manifestSemFingerprint)` e `computeBrainFingerprint(payload)` → `{ algorithm: "sha256", value }`. Payload canônico exclui `generated_at`, timestamps, UUIDs e qualquer ordenação dependente de SO.
- **Compiler** (`compiler.js`): `compileBrainManifest(projectRoot, options)` — chama `discoverWorkspaceState`, mapeia o snapshot para o manifesto (entidades por chave, `sources` como proveniência por referência, arrays ordenados), calcula o fingerprint e devolve o manifesto **em memória**.
- Testes do bloco (a escrever **na implementação**, não agora): schema, fingerprint, compiler, determinismo, zero escrita em disco, ausência de path absoluto, arrays ordenados, manifesto inválido rejeitado.

## 5. Fora de Escopo

- Escrever `.ddae/brain/manifest.json` ou qualquer arquivo em disco — persistência pertence ao CLI (Bloco 08); o compiler deste bloco é puro.
- Renderer / views Markdown (Bloco 04); navegação Obsidian (Bloco 05); integração com `.ddae/context/` (Bloco 06); Validator e o cálculo de `VALID`/`STALE`/`INVALID` (Bloco 07 — este bloco só fornece o fingerprint e o schema que o Validator usará); CLI `workspace *` (Bloco 08).
- Qualquer alteração a `src/context/**` e ao contrato congelado.
- Claude-Mem, `MemoryProvider`, entidade "Memory", `ddae doctor`, e todo item de "Future Agentic Environment" da ADR.
- Extração de kernel compartilhado com `context/validator.js` (avaliação explícita do Bloco 07, `ID-07`).

## 6. Arquivos e Pastas Envolvidos

Nomes a confirmar contra o contrato na revisão (a Seção B não fixa nomes de arquivo):

- `src/schemas/brain-schema.js` (novo — segue o padrão existente `src/schemas/context-schema.js`; o rascunho dizia `src/workspace/brain-schema.js`)
- `src/workspace/fingerprint.js` (novo)
- `src/workspace/compiler.js` (novo)
- `src/workspace/discover.js` (alteração mínima, aditiva — ver Decisão 2)
- `test/workspace-brain-schema.test.js`, `test/workspace-brain-fingerprint.test.js`, `test/workspace-brain-compiler.test.js` (novos); `test/workspace-discover.test.js` (casos adicionais para `ddae`/`project.name`)
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/` — feedback e validação do bloco.

**Não tocar:** `src/context/**`, `scripts/`, `bin/`, `package.json`, `Docs/03_contracts/**`.

## 7. Dependências

- Bloco 01 (contrato) e Bloco 02 (`discover.js`) aprovados.
- Reuso, **sem modificar**, de `src/context/fingerprint.js` (`stableStringify`, `sha256Hex`, `FINGERPRINT_ALGORITHM` — todos já exportados) para não duplicar serialização canônica. A adequação exata é confirmada na implementação.
- `DT-01` e `DT-02`.

## 8. Plano de Implementação

1. Revisar este bloco e resolver as **Decisões Abertas** (Seção 15) antes de codar.
2. Escrever os testes de `brain-schema.js` primeiro (TDD), depois implementá-lo.
3. Implementar `fingerprint.js` reutilizando o serializador canônico do Context Compiler.
4. Implementar `compiler.js` como função pura sobre `discoverWorkspaceState`, com mapeamento snake_case do snapshot → campos da Seção B.
5. Provar determinismo (duas execuções → `deepEqual`), zero escrita e ausência de path absoluto; provar contra o próprio self-host do DDAE.
6. Rodar a regressão completa e gerar feedback/validação do bloco.

## 9. Critérios de Aceite

- [x] `compileBrainManifest` produz um manifesto que passa `validateBrainManifest` para o self-host do DDAE e para um projeto scaffolded vazio.
- [x] Todos os campos da Seção B do contrato estão presentes, com `schema_version = "brain-manifest-v1"`.
- [x] Duas execuções sobre o mesmo estado produzem manifestos `deepEqual` e o mesmo fingerprint.
- [x] O fingerprint muda quando muda qualquer entrada canônica (ex.: risco, decisão, bug aberto, `git.head`) e **não** muda com `generated_at`.
- [x] Manifesto malformado (campo ausente, tipo errado, `schema_version` incompatível, path absoluto ou com `\`) é reportado por `validateBrainManifest` e lançado por `assertBrainManifest`.
- [x] Nenhuma escrita em disco; nenhuma criação de `.ddae/brain/`; nenhum acesso à rede; nenhum LLM.
- [x] Nenhum path absoluto de máquina no manifesto; arrays ordenados de forma independente de filesystem/SO.
- [x] Nenhum arquivo de `src/context/**`, `scripts/`, `bin/`, `package.json` ou `Docs/03_contracts/**` alterado.
- [x] Nenhuma referência a Claude-Mem, memory provider ou entidade "Memory" no código.
- [x] Regressão completa verde (520 testes, `package:check`, `smoke`).

## 10. Validações Obrigatórias

- [x] `npm test`
- [x] `npm run package:check`
- [x] `npm run smoke`
- [x] `ddae-engine validate`
- [x] `ddae-engine audit`
- [x] `git diff --check`

## 11. Segurança

Sem novo ponto de leitura de filesystem: o compiler consome apenas o snapshot já produzido pelo Discovery (que reaproveita os helpers e a política fail-closed existentes). O schema rejeita path absoluto e `\`. Nenhum conteúdo de arquivo é copiado para o manifesto — apenas referências e resumos de uma linha extraídos verbatim (Seção B/C do contrato). Nenhuma escrita em disco reduz a superfície ao mínimo.

## 12. Performance

Não aplicável — operação sobre dados já em memória, do mesmo volume que o Discovery.

## 13. Design System / UX

Não aplicável — nenhuma saída visual.

## 14. Riscos

- **Deriva de schema** entre o contrato (Seção B) e o código: mitigada testando o schema campo a campo contra a Seção B.
- **Fingerprint instável** por incluir dado não determinístico (ex.: `generated_at`, ordem de filesystem): mitigado por testes de determinismo e pela exclusão explícita dos campos voláteis.
- **Duplicar a serialização canônica** do Context Compiler: mitigado reutilizando `stableStringify`/`sha256Hex` sem modificá-los.
- **Manifesto virar segunda fonte de verdade:** mitigado por o compiler ser puro, não persistir e só referenciar (nunca copiar) conteúdo de `Docs/`.

## 15. Decisões Resolvidas (2026-09-26)

Princípios: **Discovery = coleta determinística. Compiler = transformação determinística (função pura do snapshot). Schema = contrato estrutural. Fingerprint = identidade do input/semântica relevante.**

Todas as 5 decisões abertas foram resolvidas **antes** de escrever código.

1. **D1 — campo `git`: RESOLVIDA.** O Manifest v1 segue estritamente o contrato: `git = { available, head }`. `repository` e `branch` permanecem apenas no snapshot interno do Discovery e **não** entram no manifesto (sem mudança formal de contrato).
2. **D2 — campo `ddae`: RESOLVIDA.** O Compiler **não** chama `collectDdaeContext`/`collectGitContext` nem faz nenhuma descoberta. Verificado: `discoverWorkspaceState` já chama `collectDdaeContext` internamente, mas só expunha `current_session` e derivados. Correção da fronteira, a menor possível e aditiva, em `discover.js`: expor `ddae` (resumo estrutural: `available`, `docs_root`, `sessions_root`, `sessions[{name,path}]`, e da sessão atual `name`/`path`/`status`/`modules[{name,exists}]`/`counts{blocks,prompts,feedbacks}`) — **sem conteúdo de arquivo e sem path absoluto** — e `project.name` (basename da raiz, já que o contrato exige `project.name` e o Compiler não pode ler o filesystem). Nenhuma lógica duplicada; `src/context/**` intocado.
3. **D3 — `views`: RESOLVIDA.** Contrato Seção B define `views` como "quais arquivos `.ddae/brain/*.md` foram gerados **nesta build**". Como este bloco não gera nenhuma view (Renderer = Bloco 04), `views: []`. A lista de nomes da Seção D do contrato não é usada aqui, pois incluiria arquivos ainda não gerados (e `Context-Packages.md` depende do Bloco 06).
4. **D4 — `engine_version`: RESOLVIDA.** Incluído no payload do fingerprint; upgrade do engine invalida o Brain anterior como STALE (invalidação segura). Sem distinção de versões compatíveis. Como o Compiler não lê o filesystem, `engine_version` é um **parâmetro explícito** (`compileBrainManifest(snapshot, { engineVersion })`), fornecido pelo chamador (CLI, Bloco 08).
5. **D5 — entidades: RESOLVIDA.** Seção B do contrato: "uma chave por entidade da Seção C", cada uma um array de referências `{ id, source_path, summary }`. Interpretação mínima: entram apenas as entidades **DERIVED/GENERATED VIEW que o snapshot do Discovery já fornece**: `decisions`, `risks`, `open_bugs`, `recent_changes`, `current_tasks`, `release_state`. "Active Session" é o campo de topo `current_session`. Entradas CANONICAL REFERENCE (link), `important_files`/`context_packages` (Bloco 06) e `timeline` (Bloco 12) ficam fora; **Memory permanece EXCLUDED**. Evolução por nova versão de schema.

Interpretações adicionais registradas (não alteram o contrato):

- **Forma da referência:** `source_path` é `string` para entradas originadas em arquivo de `Docs/`/`package.json` e `null` para entradas originadas em Git (`recent_changes`, tag de `release_state`), que não têm arquivo-fonte. `summary` é o texto de uma linha extraído verbatim pelo Discovery.
- **Ordenação:** conforme a Seção B ("alfabética de path ou de id"), por comparação de code points (nunca `localeCompare`): `entities.*` por `(id, source_path)`, `sources` por `(path, entity)`. `recent_changes` fica ordenado por SHA, não por recência — a ordem de recência não é exigida pelo Schema v1.
- **Campos das entidades:** apenas `id`/`source_path`/`summary` (o contrato não prevê `status`); ver pendência P4.
- **Fingerprint:** payload = todo o manifesto **exceto** `fingerprint`, `generated_at` e `project.name` (o nome da pasta local depende da máquina). `generated_at`, quando fornecido pelo chamador, é informativo e fica fora do fingerprint.
- **Pureza:** o Compiler não escreve em disco, não lê o relógio (`generated_at` é parâmetro opcional) e não persiste nada.

## 15.1 Resultado da Implementação

- **Criados:** `src/schemas/brain-schema.js`, `src/workspace/fingerprint.js`, `src/workspace/compiler.js`; testes `workspace-brain-schema/fingerprint/compiler.test.js`, `workspace-discover-ddae.test.js`, `brain-fixtures.js`.
- **Alterado:** `src/workspace/discover.js` (aditivo, 34 linhas: `ddae`, `project.name`). `src/context/**` intocado.
- **Evidência:** `npm test` 520 total / 517 pass / 0 fail / 3 skip; `package:check` OK (110 arquivos); `smoke` OK; `validate`/`audit` 0 erros. Self-host compila para manifesto válido e determinístico.
- **Entrega:** ver feedback e validação do bloco.

## 16. Pendências Esperadas

- P4 — Entidades sem `status` (riscos/bugs): se o Renderer (Bloco 04) precisar, exige mudança formal de contrato.
- P3 — Ordenação lexicográfica de tags (herdada do Bloco 02) afeta `release_state`; sem ação neste bloco.
- P3 — Kernel de freshness compartilhado (`ID-07`) continua para o Bloco 07.
- P4 — `recent_commits` sem assunto (herdado do Bloco 02, Delta A) — decisão no Bloco 04/05.

## 17. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_03_project_brain_schema_fingerprint_compiler --session session_03_obsidian_workspace_project_brain_0_4_0`. Sem feedback preenchido, o bloco não está concluído._

## 18. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
feat(workspace): add brain manifest schema, fingerprint and compiler
```
