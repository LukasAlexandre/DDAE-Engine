# Prompt — Bloco 02: workspace discovery

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/05_blocks/bloco_02_workspace_discovery.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Implementar `src/workspace/discover.js` (`discoverWorkspaceState`), reaproveitando `collectDdaeContext`/`collectGitContext`/`src/utils/markdown-checks.js` **sem nenhuma alteração a `src/context/**`** — as duas extensões originalmente cogitadas (subject de commit, extração de Stable Host) foram reavaliadas pelo Architecture Delta Gate (`05_blocks/bloco_02_workspace_discovery.md`, Seção 4) e **rejeitadas/deferidas** com evidência concreta, não implementadas.

## 3. Escopo

Ver `05_blocks/bloco_02_workspace_discovery.md`, Seção 5 (pós-Delta Gate) — 7 entidades (`currentSession`, `decisions`, `risks`, `openBugs`, `recentChanges`, `currentTasks`, `releaseState`), incluindo um parser mínimo de tabela Markdown para `risks`/`openBugs` (ambos arquivos são tabelas, não listas de bullets — confirmado por leitura direta antes de implementar).

## 4. Fora de Escopo

`brain-schema.js`, `fingerprint.js`, `compiler.js`, `renderer.js`, `validator.js`, `src/commands/workspace.js`, qualquer view Markdown renderizada, leitura de `.ddae/context/manifest.json`. **Qualquer alteração a `src/context/**` — rejeitada pelo Delta Gate, não reabrir sem nova evidência técnica registrada em `Docs/02_architecture/decisoes_tecnicas.md`.** `subject` em `recent_commits` e extração de `STABLE_HOST_VERSION` para o produto — ambos fora de escopo por decisão explícita (Delta A: DEFER, Delta B: REJECT).

## 5. Arquivos Permitidos

- `src/workspace/discover.js` (novo)
- `test/workspace-discover.test.js` (novo)
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/08_feedbacks/feedback_bloco_02_workspace_discovery.md`
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/09_validation/validacao_bloco_02_workspace_discovery.md`

**Nenhum arquivo em `src/context/`, `scripts/`, `bin/`, `package.json` está na lista — se algo parecer exigir tocar neles, PARE e reporte antes de agir.**

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Reaproveite `readCanonicalFile`/`readMarkdownFile`/`hasFilledListItem`/`hasChecklistItem` já existentes onde a forma do arquivo permitir (bullets) — para `risks`/`openBugs` (tabelas), implemente um parser mínimo dedicado, sem forçar os helpers de bullet a um formato que não é o deles.
- Não reabra o Architecture Delta Gate (Seção 4 do bloco) sem evidência técnica nova.

## 7. Restrições de Segurança

Nenhuma nova leitura de filesystem fora de `Docs/`/Git. `src/context/**` permanece intocado — nenhuma superfície de segurança já auditada do Context Compiler é reaberta. Ver `Docs/03_contracts/contrato_workspace_project_brain.md`, Seção I.

## 8. Restrições de Performance

Não aplicável — mesmo volume de dados já processado por `collectDdaeContext`/`collectGitContext`.

## 9. Restrições de Design System

Não aplicável — sem saída visual neste bloco.

## 10. Tarefas

1. Implementar o parser mínimo de tabela Markdown (compartilhado, colunas interpretadas posicionalmente por arquivo), testado contra o `matriz_riscos.md` real (que já tem formatação rica: `~~strikethrough~~`, crases, links).
2. Implementar `discoverWorkspaceState`, entidade por entidade, com testes isolados por entidade.
3. Provar contra o próprio self-host do DDAE.
4. Regressão completa (`npm test`, `package:check`, `smoke`) — sem alteração esperada, já que `src/context/**` não foi tocado.
5. Gerar feedback e validação do bloco.

## 11. Critérios de Aceite

Ver `05_blocks/bloco_02_workspace_discovery.md`, Seção 10 (6 critérios).

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `git diff --check`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_02_workspace_discovery --session session_03_obsidian_workspace_project_brain_0_4_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(workspace): add workspace discovery layer
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
