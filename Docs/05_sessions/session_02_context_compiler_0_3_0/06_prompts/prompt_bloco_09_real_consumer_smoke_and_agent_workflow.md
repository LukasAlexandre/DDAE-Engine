# Prompt — Bloco 09: Real Consumer Smoke and Agent Workflow

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_09_real_consumer_smoke_and_agent_workflow.md`
- `legacy/sessions/session_12_context_compiler_foundation/plano_bloco_12.md` (antigo Bloco 10)

## 2. Objetivo

Provar empiricamente, sem alterar `src/`, que o Context Compiler entrega a um consumidor real um pacote de contexto suficiente, seguro, determinístico e auditável.

## 3. Escopo

- Prova manual exploratória contra consumidor TEMP realista.
- `test/context-consumer-smoke.test.js` (PROVA A, binário do checkout).
- Extensão mínima de `scripts/release/smoke-distribution.mjs` (PROVA B, tarball instalado).
- Prova de Authority em memória com claim explícito.

## 4. Fora de Escopo

- Qualquer alteração em `src/**`.
- NLP, threshold de relevância, alteração de pesos.
- LLM real, embeddings, MCP, Obsidian.
- BUG-01, bump de versão, publicação npm, tag, Session 03.

## 5. Arquivos Permitidos

- `test/context-consumer-smoke.test.js`
- `scripts/release/smoke-distribution.mjs`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_09_real_consumer_smoke_and_agent_workflow.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_09_real_consumer_smoke_and_agent_workflow.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_09_real_consumer_smoke_and_agent_workflow.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_09_real_consumer_smoke.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md` e `09_validation/fechamento_sessao.md` (após CI verde)

## 6. Regras Obrigatórias

- **Se um teste revelar necessidade de alterar `src/`, PARE e reporte o gap — não implemente a correção.**
- Não existe threshold mínimo de relevância — não afirme que "todo arquivo irrelevante deve ser excluído" se ele couber no orçamento.
- Não fabricar `facts`/`claims` a partir de conteúdo — apenas entradas formalmente estruturadas.
- Registre toda pendência com prioridade P1–P4.

## 7. Restrições de Segurança

Segredo sentinela dedicado, nunca real. Zero vazamento em qualquer canal (Manifest, CONTEXT.md, validation.json, stdout, stderr, tarball instalado).

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Reler `plano_bloco_12.md` (antigo Bloco 10) e o runtime atual completo.
2. Construir e explorar manualmente um consumidor TEMP realista sob budget `standard` e `minimal`.
3. Avaliar suficiência do pacote sem alterar `src/`.
4. Escrever `test/context-consumer-smoke.test.js`.
5. Estender `scripts/release/smoke-distribution.mjs` minimamente.
6. Escrever a prova de Authority em memória.
7. Rodar `npm test`, `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
8. Auditar o diff, confirmando `src/` intocado.
9. Commit técnico, push, aguardar CI 5/5.
10. Gerar feedback via Stable Host, escrever validação do bloco, atualizar README/plano da sessão, commit de documentação, push, aguardar CI 5/5.

## 11. Critérios de Aceite

- [ ] Consumidor real + tarball instalado funcionam via `context build/show/validate`.
- [ ] Sources classificadas corretamente, com proveniência completa.
- [ ] Conteúdo core rankeia acima de conteúdo não relacionado; exclusão por orçamento, não por threshold.
- [ ] Segredo sentinela zero vazamento em todos os canais.
- [ ] `CONTEXT.md` suficiente para um agente identificar goal/Git/sessão/arquivos core.
- [ ] Determinismo e staleness guardada comprovados.
- [ ] Estado real de fatos estruturados documentado sem NLP.
- [ ] Zero alteração em `src/**`.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_09_real_consumer_smoke_and_agent_workflow --session session_02_context_compiler_0_3_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_09_real_consumer_smoke.md` com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
test(context): add real consumer context smoke
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
