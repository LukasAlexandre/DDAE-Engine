# Prompt — Bloco 10: BUG-01 and Context Compiler Polish

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_10_bug_01_and_context_compiler_polish.md`
- `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_identificados.md` (registro original de BUG-01)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_09_real_consumer_smoke.md` (documento com a inexatidão de provenance a corrigir)

## 2. Objetivo

Corrigir BUG-01 com o menor mecanismo possível, sem tocar o núcleo do Context Compiler já provado no Bloco 09, e fechar o polish documental pendente da Session 02.

## 3. Escopo

- Reprodução de BUG-01 antes de qualquer alteração de código.
- Escape mínimo em `renderTemplate` (`src/utils/text.js`).
- Aplicação do escape em `src/templates/docs_root/00_ddae_engine/glossario.md`.
- Testes de regressão unitários e E2E.
- Auditoria de P3/P4.
- Correção documental de provenance no Bloco 09.

## 4. Fora de Escopo

- `src/context/**`, `src/schemas/context-schema.js`, `src/commands/context.js`.
- NLP fact extraction / popular `manifest.decisions`/`bugs`/`validation`.
- Version bump, publish, tag, release.

## 5. Arquivos Permitidos

- `src/utils/text.js`
- `src/templates/docs_root/00_ddae_engine/glossario.md`
- `test/text-render-template.test.js`
- `test/cli-init.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_10_bug_01_and_context_compiler_polish.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_10_bug_01_and_context_compiler_polish.md`
- `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_identificados.md` e `bugs_corrigidos.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_10_bug_01_and_context_compiler_polish.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_10_bug_01_context_compiler_polish.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_09_real_consumer_smoke.md` (após CI verde — correção factual apenas)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md` e `09_validation/fechamento_sessao.md` (após CI verde)

## 6. Regras Obrigatórias

- Reproduzir o bug antes de corrigir — não corrigir por suposição.
- Não alterar o núcleo do Context Compiler sem blocker objetivo.
- Não expandir o escopo sem reportar e obter confirmação primeiro.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Não aplicável — a correção não altera nenhuma política de segurança já estabelecida (Sensitive Data Guard, containment, etc.).

## 8. Restrições de Performance

Não aplicável — `renderTemplate` continua sendo uma única passada de regex, sem I/O adicional.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Provar baseline (git/versões).
2. Criar bloco e prompt via Stable Host.
3. Reler estado final da sessão; localizar por leitura de código o template-fonte e o mecanismo central de renderização.
4. Reproduzir BUG-01 contra o Candidate antes de qualquer alteração.
5. Investigar todos os call sites de `renderTemplate`.
6. Implementar o escape mínimo.
7. Aplicar o escape no glossário-fonte.
8. Escrever testes de regressão (unitários + E2E).
9. Rodar `npm test`, `package:check`, `smoke`, `validate`/`audit`.
10. Auditar o diff — `src/context/`, `src/schemas/`, `src/commands/context.js` devem permanecer vazios.
11. Commit técnico, push, CI 5/5.
12. Feedback, validação, correção de provenance do Bloco 09, atualização de README/fechamento, mover BUG-01 para corrigido, commit de documentação, push, CI 5/5.

## 11. Critérios de Aceite

- [ ] BUG-01 reproduzido e corrigido, com teste de regressão.
- [ ] Placeholder operacional continua funcionando; placeholder documentado sobrevive literal.
- [ ] Zero alteração em `src/context/**`, `src/schemas/context-schema.js`, `src/commands/context.js`.
- [ ] Determinismo preservado.
- [ ] P3/P4 auditados, nenhum reaberto sem evidência nova.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_10_bug_01_and_context_compiler_polish --session session_02_context_compiler_0_3_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_10_bug_01_context_compiler_polish.md` com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
fix(init): preserve literal glossary placeholders
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
