# Prompt — Bloco 06: context compiler integration

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/05_blocks/bloco_06_context_compiler_integration.md` (**inclusive as Decisões Resolvidas, Seção 11, e as Decisões Abertas, Seção 12**)
- `Docs/03_contracts/contrato_workspace_project_brain.md` (Seções B.1, C, D) — não reabrir
- `src/context/compiler.js`, `src/context/validator.js`, `src/context/manifest.js`, `src/schemas/context-schema.js`, `src/commands/context.js` (Context Compiler real, só leitura/reuso, nunca alteração)
- `src/workspace/renderer.js`, `test/workspace-renderer.test.js` (padrão de referência)

**Pré-condição:** as 3 Decisões Abertas do bloco (Seção 12) devem estar aprovadas pelo usuário antes de qualquer código. Se não estiverem, pare e pergunte.

## 2. Objetivo

Implementar `src/workspace/context-packages.js` com dois exports — `collectContextPackageState(projectRoot)` (I/O: lê `.ddae/context/manifest.json`/`validation.json` se existirem, reutiliza `validateContextState` sem reverificar conteúdo de arquivo) e `renderContextPackagesView(state)` (pura: estado → `{ path: 'DDAE-Brain/Context-Packages.md', content }`) — e adicionar, pontualmente, o 8º link de navegação em `Home.md` (`src/workspace/renderer.js`, só a lista estática) mais o link de volta na nova view.

## 3. Escopo

Ver o bloco, Seções 8–11: seções "Status" e "Important Files" (sempre presentes, mesmo vazias); nunca `relevant_files[].content` nem `goal.text`/`goal.normalized`; reuso de `validateContextState` com `currentSourceHashes: null`; marcador de arquivo gerado, LF, uma newline final, sem frontmatter, inline code para todo dado, link de volta a Home; nenhum link para `.ddae/context/`.

## 4. Fora de Escopo

Reimplementar qualquer parte do Context Compiler; alterar `src/context/**`; alterar `brain-schema.js`/`compiler.js`/`fingerprint.js`; `manifest.views`/parâmetro `views` do Compiler/Orchestrator/Writer/CLI (Bloco 08); kernel de freshness compartilhado (Bloco 07); defesa em profundidade do Schema (Bloco 07); histórico de builds; Claude-Mem/MemoryProvider/MCP/embeddings/LLM/rede; plugin Obsidian/frontmatter/wikilinks/Dataview. **Não alterar** `src/workspace/discover.js`, `src/workspace/compiler.js`, `src/workspace/fingerprint.js`, `src/schemas/brain-schema.js`; se achar necessário, pare e reporte.

## 5. Arquivos Permitidos

- `src/workspace/context-packages.js` (novo)
- `src/workspace/renderer.js` (alteração pontual: lista de navegação de `Home.md`, incluindo o link para `Context-Packages.md`)
- `test/workspace-context-packages.test.js` (novo)
- `test/workspace-renderer.test.js` (ajuste dos testes de navegação afetados pelo 8º link, se necessário)
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/` — bloco, `08_feedbacks/`, `09_validation/`, `README.md`

## 6. Regras Obrigatórias

- TDD: escreva os testes primeiro (Seção 15 do bloco, 18–22 cenários) e confirme que falham antes de implementar.
- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md` e o padrão de `src/workspace/discover.js`/`renderer.js`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

`relevant_files[].content` e `goal.text`/`goal.normalized` nunca podem alcançar a saída — teste dedicado obrigatório. Nenhum link para `.ddae/context/` (dotfolder). Nenhum path absoluto. `collectContextPackageState` nunca re-lê conteúdo de arquivo do projeto (Sensitive Data Guard não é reinvocada aqui — `currentSourceHashes: null`).

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável. Mesmos princípios do Bloco 04/05: clareza, Markdown puro, sem frontmatter, sem HTML.

## 10. Tarefas

1. Confirmar a aprovação das 3 Decisões Abertas (bloco, Seção 12).
2. Escrever `test/workspace-context-packages.test.js` cobrindo os 22 cenários da Seção 15 do bloco; confirmar vermelho.
3. Implementar `collectContextPackageState` e `renderContextPackagesView` em `src/workspace/context-packages.js`.
4. Adicionar o link para `Context-Packages.md` na lista de navegação de `Home.md` (`renderer.js`), sem tocar em nenhuma lógica de dados; ajustar/estender os testes de navegação existentes (`test/workspace-renderer.test.js`) para o grafo de 8 views.
5. Provar contra o self-host (com e sem `.ddae/context/` local) e em integração de ponta a ponta (Context Package sintético em diretório temporário).
6. Rodar a regressão completa; revisar o diff (I/O escondido em `renderContextPackagesView`? conteúdo de arquivo vazando? link para dotfolder? alteração fora do escopo?).
7. Preencher feedback e validação; atualizar o README da Session; sugerir o commit e aguardar confirmação.

## 11. Critérios de Aceite

Ver o bloco, Seção 18 (11 critérios).

## 12. Validações Locais Obrigatórias

- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `git diff --check`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_06_context_compiler_integration --session session_03_obsidian_workspace_project_brain_0_4_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/09_validation/` com o status final do bloco (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(workspace): add context compiler integration view
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
