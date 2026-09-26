# Prompt — Bloco 05: obsidian navigation hardening

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/05_blocks/bloco_05_obsidian_navigation_hardening.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Endurecer, com evidência e testes, a segurança e a robustez da navegação (Home ⇄ 7 views ⇄ `Docs/`) já produzida pelo Renderer (Bloco 04) — sem mecanismo Obsidian-específico obrigatório, sem tocar no Manifest v1, sem duplicar proteção já existente em camada anterior.

## 3. Escopo

- Testes adversariais de path/link (Seção 13 do bloco): traversal literal e disfarçado em `source_path`, double-encoding, prefixo de esquema (`http://`, `javascript:`), Unicode confusable/RTL, simetria de navegação Home ⇄ views, determinismo e ausência de exceção sob entrada adversarial.
- Correção pontual em `src/workspace/renderer.js` **apenas se** a TDD revelar uma lacuna real de produção (não hipotética) — nunca especulativa.
- Decisão explícita sobre frontmatter para Graph View (bloco, Seção 10) — implementar com escopo formal OU registrar rejeição/adiamento; nunca implementar silenciosamente sem essa decisão estar resolvida com o usuário primeiro.
- Registrar a lacuna de defesa em profundidade do Schema (bloco, Seção 9.3) como pendência P4 — não corrigir `brain-schema.js` nesta execução salvo decisão explícita em contrário do usuário.

## 4. Fora de Escopo

- Wikilinks path-safe e eliminação de ambiguidade por nome-base — obsoletos (`DT-03`; ver bloco, Seção 6).
- RS-02 (symlink na descoberta) — já mitigado no Bloco 02.
- RS-03/RS-04 (Obsidian Sync/Publish, `.obsidian/workspace.json`) — Bloco 09.
- Validação de existência física de link no disco — Bloco 07/08, nunca este bloco (o Renderer é puro).
- `Context-Packages.md` (Bloco 06), `manifest.views`/parâmetro `views` do Compiler/Orchestrator (Bloco 08), `recent_changes` sem recência (P4 herdada), `status` de entidade (fora do Manifest v1).
- Qualquer novo diretório (`navigation/`, `links/`, `paths/`, `utils/`, `helpers/`) sem necessidade real comprovada durante a execução.
- Claude-Mem, MemoryProvider, MCP, plugin Obsidian, CLI, Writer.

## 5. Arquivos Permitidos

- `test/workspace-renderer.test.js` — alterado (novos cenários adversariais).
- `src/workspace/renderer.js` — alteração condicional, só se um gap real de produção for encontrado.
- `Docs/02_architecture/decisoes_tecnicas.md` — alteração condicional, só se a decisão de frontmatter (Seção 10 do bloco) for resolvida com o usuário nesta execução.
- `Docs/03_contracts/contrato_workspace_project_brain.md` — alteração condicional, só junto com a decisão de frontmatter acima, nunca isoladamente.
- `08_feedbacks/feedback_bloco_05_obsidian_navigation_hardening.md`, `09_validation/validacao_bloco_05_obsidian_navigation_hardening.md`, README da Session — ao final.

**Não tocar** (reportar antes, nunca alterar sem confirmação): `src/context/**`, `src/schemas/brain-schema.js` (exceto registrar a pendência, nunca corrigir), `src/workspace/compiler.js`, `src/workspace/fingerprint.js`, `src/workspace/discover.js`, `scripts/`, `bin/`, `package.json`.

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- A decisão de frontmatter (bloco, Seção 10) precisa ser resolvida com o usuário **antes** de qualquer código relacionado a ela — não decida sozinho.
- Não confunda pure path/link validation (deste bloco) com validação de existência física (Bloco 07/08) — mantenha a separação explícita mesmo nos testes.

## 7. Restrições de Segurança

Foco do bloco: geração de link segura a partir de dados controlados por `Docs/` (Markdown/link injection, path traversal, injeção de protocolo, Unicode confusable) — ver bloco, Seções 9 e 13. Nenhum novo ponto de leitura/escrita de filesystem é introduzido; o Renderer permanece puro (zero I/O). Ver `Docs/03_contracts/contrato_workspace_project_brain.md`, Seção I.

## 8. Restrições de Performance

Não aplicável — mudança é em lógica pura de string, sem I/O, sem impacto de performance mensurável.

## 9. Restrições de Design System

Não aplicável — sem UI própria; apresentação em Markdown já fixada pelo Bloco 04.

## 10. Tarefas

1. Ler o bloco completo (`05_blocks/bloco_05_obsidian_navigation_hardening.md`) e confirmar que o estado do código (`src/workspace/renderer.js`, `test/workspace-renderer.test.js`) ainda corresponde ao auditado na Seção 4/9 do bloco.
2. Resolver a decisão de frontmatter (Seção 10 do bloco) com o usuário antes de qualquer código.
3. TDD: escrever os cenários adversariais da Seção 13 do bloco, confirmar RED/GREEN honesto (a maioria deve já passar, pois a lógica de containment já existe — documentar isso explicitamente, não fingir TDD clássico onde não há).
4. Se e somente se um teste revelar um gap real de produção, corrigir o mínimo necessário em `renderer.js`, registrando a decisão.
5. Registrar a lacuna do Schema (Seção 9.3 do bloco) como pendência P4 no feedback.
6. Rodar a regressão completa e as validações da Seção 12 abaixo.
7. Gerar feedback e validação do bloco; atualizar o README da Session.
8. Aguardar aprovação explícita do usuário antes de comitar.

## 11. Critérios de Aceite

- [ ] Todos os cenários adversariais da Seção 13 do bloco cobertos, com resultado real documentado.
- [ ] Nenhuma alteração de comportamento observável nas 38 saídas já existentes do Bloco 04, salvo gap real corrigido e justificado.
- [ ] Decisão de frontmatter registrada explicitamente (implementada ou rejeitada/adiada) — nunca implícita.
- [ ] Lacuna do Schema registrada como pendência P4, não corrigida nesta execução salvo decisão em contrário do usuário.
- [ ] Nenhum módulo novo sem necessidade real comprovada.
- [ ] Nenhuma alteração a `manifest.views`, Compiler, Fingerprint, Discovery ou Schema (salvo decisão explícita do usuário).
- [ ] Regressão completa verde.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `node --test test/workspace-renderer.test.js`
- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `git diff --check` / `git diff --cached --check`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_05_obsidian_navigation_hardening --session session_03_obsidian_workspace_project_brain_0_4_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
test(workspace): harden project brain renderer link generation
```

A mensagem final depende do que a execução realmente produzir: se apenas testes, `test(...)`; se também houver correção pontual de produção, `fix(...)`/`feat(...)`, a determinar no fechamento do bloco.

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
