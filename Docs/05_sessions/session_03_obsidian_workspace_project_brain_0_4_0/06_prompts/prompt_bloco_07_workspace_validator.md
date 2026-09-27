# Prompt — Bloco 07: workspace validator

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/05_blocks/bloco_07_workspace_validator.md` (**inclusive as Decisões Abertas, Seção 16**)
- `Docs/03_contracts/contrato_workspace_project_brain.md` (Seção H — Drift Contract; fonte principal, não reabrir)
- `src/context/validator.js` (padrão de referência conceitual — **nunca importado**)
- `src/schemas/brain-schema.js`, `src/workspace/fingerprint.js`, `src/workspace/compiler.js`, `test/brain-fixtures.js`

**Pré-condição:** as 3 Decisões Abertas do bloco (Seção 16) devem estar aprovadas pelo usuário antes de qualquer código. Se não estiverem, pare e pergunte.

## 2. Objetivo

Implementar `validateBrainWorkspace(manifest, options?)` em `src/workspace/validator.js`: função pura que classifica um Brain Manifest v1 como `VALID`/`STALE`/`INVALID`, seguindo exatamente o Drift Contract (contrato, Seção H) — integridade (schema, fingerprint, containment de path, views quando `expectedViews` é passado) e frescor (só quando `currentManifest` é passado).

## 3. Escopo

Ver o bloco, Seções 7–10: `validateBrainWorkspace(manifest, {currentManifest, expectedViews} = {})`; checagens de integridade (Seção 8.1) sempre avaliadas; checagens de frescor (Seção 8.2) só com `currentManifest`; `INVALID` sempre com prioridade sobre `STALE`; compatibilidade com `manifest.views = []` sem `expectedViews` (Seção 10).

## 4. Fora de Escopo

Qualquer alteração a `src/context/**` (nem importação); alterar `brain-schema.js`, `compiler.js`, `fingerprint.js`, `discover.js`, `renderer.js`, `context-packages.js`; extrair kernel compartilhado com `context/validator.js` (fechado como "não extrair" — Decisão Aberta 1); validar Context Packages; união de view producers, parâmetro `views` do Compiler, Writer, CLI, `workspace build/init`, `.gitignore` (Bloco 08); persistir `.ddae/brain/validation.json` (Bloco 08); hardening de superfícies externas — Obsidian Sync/Publish, `.obsidian/` (Bloco 09); Claude-Mem/MemoryProvider/MCP/LLM/rede. **Não alterar** nenhum arquivo fora da lista da Seção 5; se achar necessário, pare e reporte.

## 5. Arquivos Permitidos

- `src/workspace/validator.js` (novo)
- `test/workspace-validator.test.js` (novo)
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/` — bloco, `08_feedbacks/`, `09_validation/`, `README.md`

## 6. Regras Obrigatórias

- TDD: escreva os testes primeiro (Seção 14 do bloco, 24–30 cenários) e confirme que falham antes de implementar.
- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md` e o padrão de `src/context/validator.js` (conceitual, sem importar).
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

`reasons` nunca inclui `summary`/texto livre do Manifest — só códigos estáveis e `path`/`entity` (dados já públicos em outras views do Brain). Nenhum erro de schema propaga texto livre (`MANIFEST_SCHEMA_INVALID` genérico, sem `errors[]`). Nenhum novo ponto de leitura de filesystem; `validateBrainWorkspace` é inteiramente pura.

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Confirmar a aprovação das 3 Decisões Abertas (bloco, Seção 16).
2. Escrever `test/workspace-validator.test.js` cobrindo os 27 cenários da Seção 14 do bloco; confirmar vermelho.
3. Implementar `validateBrainWorkspace` (e `WORKSPACE_VALID_STATUSES`) em `src/workspace/validator.js`, reaproveitando `validateBrainManifest`/`buildBrainFingerprintPayload`/`computeBrainFingerprint` — zero import de `src/context/**`.
4. Implementar a checagem de containment de path como lógica própria e independente (não reaproveitar `docsDestination` privado do Renderer nem `sensitive-files.js`).
5. Provar contra o self-host (Manifest real do DDAE → `VALID`) e em integração (dois snapshots sintéticos de um projeto temporário → `STALE` com motivo correto).
6. Rodar a regressão completa; revisar o diff (import de `src/context/**`? vazamento de texto livre em `reasons`? `views = []` virando falso `INVALID`? alteração fora do escopo?).
7. Preencher feedback e validação; atualizar o README da Session; sugerir o commit e aguardar confirmação.

## 11. Critérios de Aceite

Ver o bloco, Seção 17 (10 critérios).

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
ddae-engine feedback create --block bloco_07_workspace_validator --session session_03_obsidian_workspace_project_brain_0_4_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/09_validation/` com o status final do bloco (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(workspace): add brain workspace validator
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
