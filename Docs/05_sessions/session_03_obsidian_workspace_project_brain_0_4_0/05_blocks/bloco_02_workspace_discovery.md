# Bloco 02 — workspace discovery

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-08-16

## 1. Objetivo

Implementar `src/workspace/discover.js` — a camada de descoberta do Workspace, que agrega sessão atual, decisões, riscos, bugs abertos, mudanças recentes, tarefas do bloco ativo e release state, reaproveitando `collectDdaeContext`/`collectGitContext` e as utilidades já exportadas de `src/utils/markdown-checks.js`, sem duplicar lógica de leitura de arquivo já existente.

## 2. Contexto

Primeiro bloco de implementação técnica da `0.4.0`, executado contra o contrato congelado no Bloco 01 (`Docs/03_contracts/contrato_workspace_project_brain.md`, Seções B e C). Segue exatamente a decomposição já definida em `04_planning/plano_execucao.md`.

## 3. Problema que Este Bloco Resolve

Sem uma camada de descoberta, o Compiler do Brain (Bloco 03) não teria de onde obter as entidades DERIVED/GENERATED VIEW definidas no contrato — e sem investigar antes de implementar, corre-se o risco de duplicar lógica de leitura de Markdown já existente em `ddae-context.js`/`markdown-checks.js`.

## 4. Architecture Delta Gate (2026-08-16)

Antes de implementar, as duas extensões originalmente propostas neste bloco foram reavaliadas contra o contrato congelado e o código real — não implementadas por inércia.

### DELTA A — `recent_commits.subject`

```text
1. O frozen Schema v1 (contrato, Seção B) exige subject de commit?
   NÃO. O campo `git` do Schema v1 é literalmente `{ available: bool, head: string|null }`
   — não menciona `recent_commits`/`subject`.

2. "Recent Changes" precisa ser resolvido neste Bloco 02?
   NÃO como requisito obrigatório — `04_planning/plano_execucao.md` descreve o escopo do
   Bloco 02 como "agrega sessão atual, decisões, riscos, bugs, release state", sem citar
   Recent Changes entre os obrigatórios.

3. Alterar collectGitContext() afetaria o Context Compiler existente?
   Verificado empiricamente: `compiler.js.buildGit()` faz pick seletivo de
   `branch`/`head`/`working_tree` — nunca lê `recent_commits`. Uma extensão aditiva
   não quebraria o Compiler.

4. Existem testes que travam a forma atual?
   SIM — `test/context-git.test.js:171` asserta
   `assert.deepEqual(Object.keys(commit), ['sha'])`, um invariante deliberado
   (documentado no próprio `git-context.js` como decisão consciente de manter a
   superfície de texto mínima). Mudar isso exige reescrever um teste que hoje
   trava a forma de propósito, não incidentalmente.
```

**Decisão: DEFER.** `git-context.js` não é alterado neste bloco. `recentChanges` usa exatamente o que já existe hoje sem modificação — a lista de `recent_commits[].sha` (sem assunto). Uma "Recent Changes" view textualmente rica (com mensagem de commit) fica para o bloco que efetivamente renderiza essa view (Bloco 04/05), decidida ali com justificativa própria — não aqui, por conveniência.

### DELTA B — `STABLE_HOST_VERSION` no runtime do produto

```text
1. Stable Host pertence ao contrato do Project Brain para QUALQUER projeto consumidor?
   NÃO. Stable Host é o modelo de self-hosting específico DESTE repositório
   (Docs/00_ddae_engine/self_hosting.md) — "Stable Host governa o Candidate" é uma
   propriedade de como o próprio DDAE Engine desenvolve a si mesmo, não um conceito
   que existe para um projeto consumidor genérico que instalou `ddae-engine`.

2. `scripts/` é distribuído a consumidores?
   NÃO — confirmado via `package.json.files` (`bin`, `src`, `README.md`, `LICENSE`,
   `CHANGELOG.md`): `scripts/ci/verify-stable-host.mjs` nunca existe em
   `node_modules/ddae-engine/` de um consumidor.

3. Existe campo `stable_host` no Brain Manifest Schema v1 congelado (Seção B)?
   NÃO — a lista de campos do contrato não inclui `stable_host` em lugar nenhum.

4. Workspace Discovery precisa desse dado para cumprir algum critério de aceite?
   NÃO, uma vez que os itens 1–3 acima removem a premissa — `releaseState` genérico
   (versão do `package.json` do próprio projeto consumidor + tag mais recente) já
   cobre o que o Schema v1 realmente pede, sem misturar infraestrutura de
   self-hosting do repositório DDAE Engine com o produto genérico.
```

**Decisão: REJECT.** Nenhuma extração de `STABLE_HOST_VERSION` para `src/`. `scripts/ci/verify-stable-host.mjs` permanece intocado. `releaseState` em `discoverWorkspaceState` inclui apenas `package.json.version` (do projeto sendo descoberto) e a tag mais recente — dados genéricos, válidos para qualquer consumidor, não para o self-hosting específico deste repositório.

## 5. Escopo (revisado pós-Delta Gate)

`src/workspace/discover.js` (novo) — exporta `discoverWorkspaceState(projectRoot, options)`, retornando, sem nenhuma alteração a `src/context/**`:

- `currentSession` — via `collectDdaeContext` (`current_session` + `selection.reason`).
- `decisions` — índice parseado a partir de `governance.decisions.content` (já retornado por `collectDdaeContext`, sem nova leitura de arquivo), extraindo headings `### RD-\d+ — Título` de `Docs/04_governance/registro_decisoes.md` (confirmado: este arquivo usa prefixo `RD-`, não `DT-` — `decisoes_tecnicas.md`/`DT-` é um documento diferente, fora do escopo desta entidade conforme o contrato).
- `risks` — índice parseado diretamente de `Docs/04_governance/matriz_riscos.md`. Confirmado que este arquivo é uma **tabela Markdown** (`| ID | Risco | Área | Probabilidade | Impacto | Status |`), não uma lista de bullets — `hasFilledListItem` não se aplica; um parser de tabela mínimo e dedicado é necessário.
- `openBugs` — agregado entre todas as sessões (via `sessions[]` já retornado por `collectDdaeContext`), lendo `<sessão>/07_bugs/bugs_identificados.md` de cada uma. Confirmado que este arquivo também é uma **tabela Markdown** (`| ID | Descrição | Severidade | Onde foi encontrado | Status |`, 5 colunas, diferente da tabela de riscos) — mesmo parser mínimo de tabela, reaproveitado, não uma segunda implementação.
- `recentChanges` — via `collectGitContext().recent_commits` **sem modificação** (Delta A: DEFER) — lista de SHAs, sem assunto.
- `currentTasks` — itens de checklist não marcados (`- [ ]`) do bloco mais recente da sessão atual (`current_session.blocks`), extraídos por regex local (não apenas `hasChecklistItem`, que só confirma presença — aqui precisamos extrair o texto de cada item).
- `releaseState` — `package.json.version` do projeto descoberto + tag mais recente de `collectGitContext().tags` (Delta B: REJECT Stable Host).

## 6. Fora de Escopo

- `src/workspace/brain-schema.js`, `fingerprint.js`, `compiler.js`, `renderer.js`, `validator.js`, `src/commands/workspace.js` — Blocos 03–08.
- Qualquer view Markdown renderizada (`.ddae/brain/*.md`) — Discovery retorna dados estruturados em memória, nunca escreve em disco.
- Leitura de `.ddae/context/manifest.json` (Context Compiler Integration) — Bloco 06.
- Qualquer alteração a `src/context/**` — rejeitada explicitamente pelo Architecture Delta Gate (Seção 4).
- `subject` em `recent_commits` — deferido, não implementado (Delta A).
- Extração/exposição de `STABLE_HOST_VERSION` no runtime do produto — rejeitado (Delta B).

## 7. Arquivos e Pastas Envolvidos

- `src/workspace/discover.js` (novo).
- `test/workspace-discover.test.js` (novo).

**Nenhum arquivo em `src/context/`, `scripts/`, `bin/`, `package.json` é tocado neste bloco.**

## 8. Dependências

- Bloco 01 (Contract) aprovado — `Docs/03_contracts/contrato_workspace_project_brain.md`.
- `src/context/ddae-context.js`, `src/context/git-context.js`, `src/utils/markdown-checks.js` (reaproveitados, sem modificação).

## 9. Plano de Implementação

1. Implementar `discoverWorkspaceState` em `src/workspace/discover.js`, entidade por entidade (Seção 5), com testes por entidade.
2. Implementar o parser mínimo de tabela Markdown (compartilhado entre `risks`/`openBugs`, colunas interpretadas posicionalmente por arquivo).
3. Provar contra o próprio self-host do DDAE (mesmo padrão de todos os blocos técnicos da Session 02).
4. Rodar regressão completa (`npm test`, `package:check`, `smoke`) — nenhuma quebra esperada, já que `src/context/**` não foi tocado.
5. Gerar feedback e validação do bloco.

## 10. Critérios de Aceite

- [ ] `discoverWorkspaceState` retorna as 7 entidades da Seção 5, cada uma testada isoladamente.
- [ ] Nenhum arquivo em `src/context/`, `scripts/`, `bin/`, `package.json` alterado.
- [ ] Nenhuma duplicação de lógica de leitura de Markdown já coberta por `ddae-context.js`/`markdown-checks.js`.
- [ ] Regressão completa (448+ testes, `package:check`, `smoke`) permanece verde, sem nenhuma mudança em `src/context/**` para causar regressão.
- [ ] `ddae-engine validate`/`audit` sem novo warning específico da sessão.
- [ ] Architecture Delta Gate (Seção 4) registrado e resolvido antes da implementação, não durante/depois.

## 11. Validações Obrigatórias

- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `git diff --check`

## 12. Segurança

Reaproveita, não reimplementa: qualquer leitura de arquivo dentro de `Docs/` usa os mesmos helpers já existentes (`readCanonicalFile`/`readMarkdownFile`), que já resolvem path relativo à raiz do projeto — nenhum novo ponto de leitura de filesystem fora de `Docs/`/Git é introduzido. Nenhum ponto de leitura fora de `Docs/`/Git é adicionado; `src/context/**` permanece intocado (Delta Gate, Seção 4), então nenhuma superfície de segurança já auditada do Context Compiler é reaberta.

## 13. Performance

Não aplicável a este bloco especificamente — `discoverWorkspaceState` opera sobre o mesmo volume de dados que `collectDdaeContext`/`collectGitContext` já processam hoje; nenhuma nova varredura de filesystem em larga escala é introduzida.

## 14. Design System / UX

Não aplicável — nenhuma saída visual neste bloco (dados estruturados em memória, sem renderização).

## 15. Riscos

- Ordenação alfabética de `tags` (já existente em `collectGitContext`) pode falhar para determinar "a tag mais recente" além de `v0.9.x` → `v0.10.0` (ordem lexicográfica quebra numericamente) — não é um risco novo introduzido por este bloco, mas um limite pré-existente que `releaseState` herda; registrado como pendência P3, não bloqueante para este projeto no tamanho atual de sua própria numeração.
- Parser de tabela Markdown mínimo (risks/bugs) mal interpretar uma linha real como placeholder, ou vice-versa — mitigado por testes explícitos com fixtures reais (`Docs/04_governance/matriz_riscos.md` atual, que já tem uma linha real com formatação rica — `~~strikethrough~~`, crases, links).

## 16. Pendências Esperadas

- P3 — Ordenação de tags puramente lexicográfica insuficiente para semver de dois dígitos (ver Seção 15) — registrar em `Docs/04_governance/matriz_riscos.md` se/quando o projeto se aproximar de `v0.10.0`, não antes.
- P4 — "Recent Changes" com apenas SHA (sem assunto de commit) tem valor de navegação limitado — deferido para o bloco que renderiza a view (Bloco 04/05), com decisão própria sobre estender `git-context.js` naquele momento, não aqui.

## 17. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_02_workspace_discovery --session session_03_obsidian_workspace_project_brain_0_4_0`. Sem feedback preenchido, o bloco não está concluído._

## 18. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
feat(workspace): add workspace discovery layer
```
