# Feedback — Bloco 02: workspace discovery

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-08-17

## 1. Resumo Executivo

Primeiro bloco de código real da `0.4.0`: implementou `src/workspace/discover.js` (`discoverWorkspaceState`), a camada de descoberta read-only e determinística do Workspace, reaproveitando `collectDdaeContext`/`collectGitContext` sem nenhuma alteração a `src/context/**`. Antes de escrever qualquer código, um Architecture Delta Gate reavaliou as duas extensões cogitadas no draft original do bloco — ambas foram **rejeitadas/deferidas com evidência concreta** (não implementadas por inércia): `recent_commits.subject` foi verificado como não exigido pelo Schema v1 congelado e travado por um teste existente (`test/context-git.test.js:171`); `STABLE_HOST_VERSION` foi verificado como infraestrutura de self-hosting específica deste repositório, ausente de `package.json.files`, sem campo correspondente no Schema v1. Durante a implementação, três descobertas adicionais corrigiram premissas do plano original antes de virarem bugs: `registro_decisoes.md` usa prefixo `RD-`, não `DT-`; `matriz_riscos.md`/`bugs_identificados.md` são tabelas Markdown, não listas de bullets; e o heading de decisão não-preenchido (`_Título da decisão_`) precisava de um filtro de placeholder próprio, análogo ao já usado para linhas de tabela. 18 testes novos, todos passando; regressão completa (466 testes totais, 463 pass, 0 fail, 3 skip) sem nenhuma alteração em `src/context/**`. "Bloco concluído conforme escopo, **aprovado, sem blocker**."

## 2. Objetivo do Bloco

Implementar `src/workspace/discover.js`, a camada de descoberta determinística e read-only que agrega o estado canônico do projeto (sessão atual, decisões, riscos, bugs abertos, mudanças recentes, tarefas do bloco ativo, release state) para consumo futuro do Brain Compiler (Bloco 03).

## 3. Escopo Implementado

Exatamente o escopo revisado pós-Delta Gate (`05_blocks/bloco_02_workspace_discovery.md`, Seção 5) — as 7 entidades, com um parser mínimo de tabela Markdown compartilhado entre `risks`/`openBugs`. Nenhuma divergência em relação ao plano congelado após o Delta Gate.

## 4. Arquivos Criados

- `src/workspace/discover.js`
- `test/workspace-discover.test.js` (18 testes)
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/08_feedbacks/feedback_bloco_02_workspace_discovery.md` (este arquivo)
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/09_validation/validacao_bloco_02_workspace_discovery.md` (a seguir)

## 5. Arquivos Alterados

Nenhum arquivo existente foi alterado — nem `src/context/**`, nem `scripts/`, nem `package.json`. O comando `npm run package:check` passou a reportar 107 arquivos (era 106) puramente porque `src/workspace/discover.js` agora existe dentro de `src/`, que já fazia parte do `package.json.files` — nenhuma mudança à lista de arquivos em si.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
node --test test/workspace-discover.test.js
node -e "discoverWorkspaceState(process.cwd())" (prova contra o próprio self-host)
npm test
npm run package:check
npm run smoke
git status --short src/ scripts/ bin/ package.json
node bin/ddae-engine.js validate
node bin/ddae-engine.js audit
node bin/ddae-engine.js feedback create --block bloco_02_workspace_discovery --session session_03_obsidian_workspace_project_brain_0_4_0
```

## 8. Testes Realizados

- **18 testes novos** (`test/workspace-discover.test.js`), cobrindo: snapshot básico degradado sem exceção; determinismo (chamadas repetidas `deepEqual`); zero escrita em filesystem; zero path absoluto no retorno; degradação sem Git; zero sessões; seleção de sessão canônica mais recente; decisões via heading `RD-`, com filtro de placeholder (`_Título da decisão_`); riscos via tabela, com filtro de placeholder por coluna de conteúdo; bugs agregados entre sessões, filtrados por status aberto; `.ddae/context/`, `.ddae/brain/`, `.obsidian/` nunca tratados como fonte canônica; symlink de `matriz_riscos.md` não seguido (fail-closed, capability-skip se o SO não permitir); arquivo sensível fora dos três caminhos canônicos conhecidos nunca vaza; tarefas não marcadas extraídas apenas do bloco mais recente; `release_state` genérico (versão + tag), nunca Stable Host; forma de `recent_changes` idêntica à já existente (`{sha}` apenas); retorno congelado (`Object.isFrozen`).
- **Prova contra o próprio self-host do DDAE**: `discoverWorkspaceState(process.cwd())` executado diretamente contra este repositório — `git.available: true`, sessão atual corretamente identificada como `session_03_obsidian_workspace_project_brain_0_4_0`, `risks` corretamente mostrando `MR-01` (Mitigado), `decisions` corretamente vazio (RD-01 do template ainda não preenchido, filtrado como esperado), `current_tasks` corretamente mostrando os 12 itens não marcados do próprio `bloco_02_workspace_discovery.md` (6 critérios de aceite + 6 validações obrigatórias, ambos ainda não marcados no momento da execução), `release_state.version = "0.3.0"`, `release_state.latest_tag = "v0.3.0"`.

## 9. Validações Executadas

- `npm test` — 466 total, 463 pass, 0 fail, 3 skip (448 → 466, +18 novos, todos passando).
- `npm run package:check` — OK, 107 files (era 106 — divergência esperada e documentada, ver Seção 5).
- `npm run smoke` — `[DDAE smoke] OK`.
- `ddae-engine validate` — `Status: OK`, `Errors: 0`.
- `ddae-engine audit` — `Status: OK`, `Errors: 0`, warnings limitados aos 7 quality gates globais pré-existentes (o warning "Bloco 02 sem feedback" fecha com este arquivo).
- `git status --short src/ scripts/ bin/ package.json` — confirma apenas `src/workspace/` como novidade; `src/context/`, `scripts/`, `bin/`, `package.json` inalterados.

## 10. Decisões Técnicas

- **Architecture Delta Gate registrado no próprio bloco** (`05_blocks/bloco_02_workspace_discovery.md`, Seção 4) antes de qualquer código — Delta A (`recent_commits.subject`): DEFER, com evidência de que o Schema v1 não exige e um teste existente trava a forma atual (`test/context-git.test.js:171`). Delta B (`STABLE_HOST_VERSION` no runtime): REJECT, com evidência de que `scripts/` está ausente de `package.json.files` e o conceito de Stable Host não existe no Schema v1 nem é aplicável a um consumidor genérico.
- **`registro_decisoes.md` usa prefixo `RD-`, não `DT-`** — descoberto ao ler o template real antes de escrever o parser (não assumido do contrato, que só menciona "índice sobre `registro_decisoes.md`" sem especificar o prefixo). `decisoes_tecnicas.md`/`DT-` é um arquivo diferente, fora do escopo desta entidade.
- **`matriz_riscos.md`/`bugs_identificados.md` são tabelas Markdown, não bullets** — descoberto por leitura direta dos templates/arquivo real antes de assumir que `hasFilledListItem` (bullet-only) se aplicaria; um parser de tabela mínimo e dedicado foi implementado em vez disso.
- **Filtro de placeholder por coluna de conteúdo específica, não por "todas as células"** — a primeira tentativa (`cells.slice(1).every(...)`) falhou contra um teste real porque colunas como Status/Probabilidade podem legitimamente conter um valor curto real mesmo quando a coluna de conteúdo principal (Risco/Descrição) ainda é `_..._`. Corrigido para checar apenas a coluna de conteúdo relevante.
- **`readCanonicalFileSafe` local, não reaproveitando `readMarkdownFile`** — `readMarkdownFile` (`markdown-checks.js`) usa `fs.statSync` (segue symlink); `readCanonicalFile` em `ddae-context.js` usa `fs.lstatSync` e recusa symlink explicitamente. Como o Security Contract exige fail-closed contra symlink, uma cópia local do padrão `lstat`-based foi escrita em vez de reaproveitar o helper mais permissivo — mesma classe de duplicação mínima e deliberada já presente entre `ddae-context.js`/`git-context.js` (cada um mantém sua própria cópia de `toPortablePath`/`lstatOrNull`).

## 11. Problemas Encontrados

Quatro bugs reais encontrados pelos próprios testes durante a implementação (não em produção) — ver Seção 12.

## 12. Correções Aplicadas Durante o Bloco

1. `discoverDecisions` retornava `[]` não congelado no caminho de erro antecipado — corrigido para `Object.freeze([])`.
2. `isPlaceholderRow` checava todas as células em vez da coluna de conteúdo específica — corrigido, com teste de regressão.
3. Teste "Git indisponível" usava `env: { PATH: '' }`, insuficiente no Windows — corrigido para usar diretório vazio real em `PATH`/`Path` (mesma técnica já usada em `test/context-git.test.js`).
4. `discoverDecisions` não filtrava o heading placeholder `_Título da decisão_` do próprio template, descoberto ao provar contra o self-host real (o RD-01 do template apareceu como decisão real na primeira execução) — corrigido com `PLACEHOLDER_TITLE_PATTERN`, com teste de regressão dedicado (11b).

## 13. Pendências

### P1 — Crítica

Nenhuma.

### P2 — Importante

Nenhuma.

### P3 — Melhoria Recomendada

- Ordenação de tags puramente lexicográfica (herdada de `collectGitContext`, não modificada aqui) insuficiente além de `v0.9.x` → `v0.10.0` — já registrado no bloco (Seção 15), não bloqueante no tamanho atual do projeto.

### P4 — Opcional

- "Recent Changes" com apenas SHA (sem assunto de commit) — deferido para o bloco que efetivamente renderiza essa view (Bloco 04/05), decisão própria ali.

## 14. Riscos Restantes

Nenhum risco novo. Os 7 riscos já identificados em `02_analysis/analise_riscos.md` permanecem com seus planos de mitigação atribuídos aos blocos futuros correspondentes.

## 15. Evidências

```text
npm test:              466 total, 463 pass, 0 fail, 3 skip
package:check:          OK, 107 files (era 106 — src/workspace/discover.js somado, esperado)
smoke:                    OK
ddae-engine validate:      Status OK, Errors 0
ddae-engine audit:          Status OK, Errors 0, Session-03-specific warnings 0 (após este feedback)

Self-host proof (discoverWorkspaceState(process.cwd())):
  git.available:      true
  current_session:      session_03_obsidian_workspace_project_brain_0_4_0 (latest_canonical)
  decisions:              [] (RD-01 placeholder corretamente filtrado)
  risks:                    [{ id: 'MR-01', status: 'Mitigado' }]
  current_tasks:              12 itens (bloco ativo)
  release_state:                { version: '0.3.0', latest_tag: 'v0.3.0' }
  frozen:                         true

src/context/** touched:            NO (confirmado via git status --short)
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Bloco 03 — Project Brain Schema, Fingerprint & Compiler, a ser criado formalmente no início de sua própria execução, consumindo `discoverWorkspaceState` como fonte de dados para o Brain Manifest v1.

## 18. Commit Semântico Sugerido

```
feat(workspace): add deterministic workspace discovery
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
