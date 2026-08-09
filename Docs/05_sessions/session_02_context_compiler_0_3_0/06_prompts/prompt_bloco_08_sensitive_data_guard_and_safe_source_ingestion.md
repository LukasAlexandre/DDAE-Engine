# Prompt — Bloco 08: Sensitive Data Guard and Safe Source Ingestion

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_08_sensitive_data_guard_and_safe_source_ingestion.md`
- `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seção 12) e `plano_bloco_12.md` (antigo Bloco 09)

## 2. Objetivo

Implementar a fronteira de segurança (`src/context/sensitive-files.js`) que permite `context build` sair do Safe Structural Mode e ingerir conteúdo textual real, com política fail-closed centralizada.

## 3. Escopo

- `sensitive-files.js`: deny list, diretórios ignorados, symlink fail-closed, limite de tamanho, detecção de binário, heurística de conteúdo sensível, classificação por path.
- `context-schema.js`/`renderer.js`/`compiler.js`: suporte mínimo ao dual-shape de `excluded_sources` (relevância vs. segurança).
- `commands/context.js`: `context build` ingere candidatos reais; `context validate` releem via o Guard.
- `test/context-sensitive-guard.test.js` + testes de forma dupla.

## 4. Fora de Escopo

- BUG-01, Obsidian, MCP, LLM, embeddings, NLP.
- Alteração de `authority.js`, `relevance.js`, coletores, `src/cli.js`, `src/templates/`, `legacy/`, `scripts/release/verify-package.mjs`.
- Bump de versão, publicação npm, tag, Session 03.

## 5. Arquivos Permitidos

- `src/context/sensitive-files.js`
- `src/schemas/context-schema.js`
- `src/context/compiler.js`
- `src/context/renderer.js`
- `src/commands/context.js`
- `test/context-sensitive-guard.test.js`
- `test/context-manifest.test.js`
- `test/context-renderer.test.js`
- `test/context-compiler.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_08_sensitive_data_guard_and_safe_source_ingestion.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_08_sensitive_data_guard_and_safe_source_ingestion.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_08_sensitive_data_guard_and_safe_source_ingestion.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_08_sensitive_data_guard_safe_source_ingestion.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md` e `09_validation/fechamento_sessao.md` (após CI verde)

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- O Guard atua ANTES da ingestão — nunca é um sanitizer pós-processamento.

## 7. Restrições de Segurança

Ver Seção 4/11 do bloco. Fail-closed por padrão. Nenhum conteúdo/valor/trecho sensível é reaproveitado — arquivo inteiro excluído.

## 8. Restrições de Performance

Early-exit por nome/extensão/tamanho antes de qualquer leitura de conteúdo.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Reler Seção 12 do contrato e o antigo Bloco 09.
2. Confirmar o gap de `excluded_sources` antes de codar.
3. Estender schema para dual-shape.
4. Atualizar renderer.
5. Implementar `sensitive-files.js`.
6. Validar `MAX_SOURCE_BYTES` contra arquivos reais do projeto.
7. Atualizar compiler para `securityExclusions`.
8. Integrar no build/validate da CLI.
9. Escrever testes.
10. Rodar `npm test`.
11. Prova E2E com segredo sentinela, zero vazamento.
12. Rodar `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
13. Confirmar escopo e diff antes de commitar.

## 11. Critérios de Aceite

- [ ] Nenhum conteúdo chega ao Manifest sem passar pelo Guard.
- [ ] Deny list, diretórios ignorados, symlink fail-closed, limite de tamanho, binário, heurística de conteúdo — todos aplicados.
- [ ] Exclusão de segurança nunca carrega source_id/conteúdo/valor.
- [ ] Classificação por path, sem NLP.
- [ ] Determinismo preservado.
- [ ] Zero vazamento de segredo sentinela em qualquer canal.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_08_sensitive_data_guard_and_safe_source_ingestion --session session_02_context_compiler_0_3_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_08_sensitive_data_guard_safe_source_ingestion.md` com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(context): add sensitive data guard
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
