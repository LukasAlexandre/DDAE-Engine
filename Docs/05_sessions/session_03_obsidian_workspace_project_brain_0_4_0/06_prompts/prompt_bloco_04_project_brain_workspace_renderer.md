# Prompt — Bloco 04: project brain workspace renderer

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/05_blocks/bloco_04_project_brain_workspace_renderer.md` (**inclusive as Decisões Resolvidas A–D e as Decisões Pendentes**)
- `Docs/03_contracts/contrato_workspace_project_brain.md` (fonte principal; não reabrir)
- `Docs/02_architecture/adr_knowledge_memory_context.md` e `DT-01`/`DT-02`
- `src/schemas/brain-schema.js`, `src/workspace/compiler.js`, `src/workspace/fingerprint.js`, `src/workspace/discover.js`, `src/context/renderer.js` (padrão de referência), `test/brain-fixtures.js`

## 2. Objetivo

Implementar `src/workspace/renderer.js` com `renderBrainWorkspace(manifest)`: função pura Brain Manifest v1 → array congelado de `{ path, content }` (7 arquivos de `BRAIN_VIEW_PATHS`, ordenados por `path`), **em memória, sem escrever em disco**. Exportar também `BRAIN_DIR` (`.ddae/brain`) e `BRAIN_VIEW_PATHS`.

**Pré-condição:** o usuário deve ter aprovado as Decisões Pendentes 1–3 do bloco (Seção 20). Se não aprovadas, pare e pergunte antes de codar; a Decisão 1 (Obsidian e pastas com ponto) não muda o Renderer, mas a 2 pode.

## 3. Escopo

Ver o bloco, Seções 5, 9, 10, 12–15: `Home.md`, `Sessions.md`, `Decisions.md`, `Risks.md`, `Bugs.md`, `Releases.md`, `Recent-Activity.md`; wikilinks de caminho completo com alias apenas para views geradas e `manifest.sources[].path` `.md`; conteúdo do Manifest sempre em inline code com fence dinâmico; whitespace colapsado; estados vazios explícitos; cabeçalho de arquivo gerado; sem frontmatter; `generated_at` nunca exibido; `recent_changes` na ordem recebida com nota de ordenação.

## 4. Fora de Escopo

Ler Git/`Docs/`, chamar Discovery/collectors, alterar o Manifest, escrever em disco, `Context-Packages.md`, frontmatter, hardening de links (Bloco 05), Validator, CLI, `status` por entidade, `views` no Compiler, Claude-Mem/MemoryProvider, plugin/API do Obsidian, rede, LLM, relógio, aleatoriedade. **Não alterar** `src/context/**`, schema, Compiler, Fingerprint, Discovery ou o contrato; se achar necessário, pare e reporte.

## 5. Arquivos Permitidos

- `src/workspace/renderer.js` (novo)
- `test/workspace-renderer.test.js` (novo)
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/` — bloco, `08_feedbacks/`, `09_validation/`, `README.md`

## 6. Regras Obrigatórias

- TDD: escreva os testes primeiro e confirme que falham.
- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md` e o padrão de `src/context/renderer.js`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Nenhum path absoluto/`\`/`..`; links só para caminhos do Manifest sem `[ ] | # ^ \` e sem controle; conteúdo do Manifest sempre inerte; nenhum acesso a filesystem, rede ou LLM.

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável. Princípio: clareza sobre decoração; headings consistentes; listas em bullets (sem tabelas); sem HTML.

## 10. Tarefas

1. Confirmar a aprovação das Decisões Pendentes 1–3.
2. Escrever `test/workspace-renderer.test.js` cobrindo os 22 itens do Plano TDD (bloco, Seção 17) e os testes de integração; confirmar vermelho.
3. Implementar `src/workspace/renderer.js` com o mínimo necessário.
4. Provar contra o self-host do DDAE (Discovery → Compiler → Renderer), sem escrever em disco.
5. Rodar a regressão completa, revisar o diff (I/O escondido? campo inventado? path absoluto? alteração fora do escopo?).
6. Preencher feedback e validação; atualizar o README da Session; sugerir o commit e aguardar confirmação.

## 11. Critérios de Aceite

Ver o bloco, Seção 21 (11 critérios).

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
ddae-engine feedback create --block bloco_04_project_brain_workspace_renderer --session session_03_obsidian_workspace_project_brain_0_4_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/09_validation/` com o status final do bloco (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(workspace): add project brain workspace renderer
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
