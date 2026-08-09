# Bloco 10 — BUG-01 and Context Compiler Polish

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Objetivo

Corrigir BUG-01 (o template do glossário renderiza, em vez de documentar, os tokens `{{PROJECT_NAME}}`/`{{CURRENT_DATE}}`) com o menor mecanismo possível, e fechar o polish documental pendente da Session 02, sem tocar o núcleo do Context Compiler já provado no Bloco 09.

## 2. Contexto

O Bloco 09 provou, contra um consumidor real e contra o tarball Candidate instalado, que o Context Compiler 0.3.0 já funciona de ponta a ponta. Com o risco arquitetural principal eliminado, este bloco é deliberadamente um bloco de polish/correção/release-readiness — não de nova arquitetura. BUG-01 é um bug conhecido desde `session_01_ddae_self_hosting_bootstrap` (Bloco 04 daquela sessão), registrado como `OPEN / DEFERRED TO SESSION 02` em `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_identificados.md`, com a fonte (`src/templates/docs_root/00_ddae_engine/glossario.md`) deliberadamente não corrigida até este momento.

## 3. Problema que Este Bloco Resolve

`src/templates/docs_root/00_ddae_engine/glossario.md` tem uma tabela ("Placeholders Reconhecidos pelo CLI") cujo propósito é mostrar, literalmente, os tokens `{{PROJECT_NAME}}`, `{{CURRENT_DATE}}`, `{{SESSION_NUMBER}}`, etc. Só que `{{PROJECT_NAME}}`/`{{CURRENT_DATE}}` fazem parte do mapa de substituição real usado por `docTransform` (`src/commands/init.js`) para todo template de `docs_root/` — inclusive o cabeçalho do próprio glossário (linha 3, `> Projeto: {{PROJECT_NAME}} · Atualizado em: {{CURRENT_DATE}}`, que deve mesmo ser substituído). O `renderTemplate` (`src/utils/text.js`) não tinha nenhuma forma de distinguir "este token deve ser substituído aqui" de "este token deve ser documentado literalmente aqui", então as duas primeiras linhas da tabela saíam já renderizadas com o valor real, em vez do token.

## 4. Escopo

- Reprodução do BUG-01 contra o binário Candidate antes de qualquer alteração de código.
- Mecanismo mínimo de escaping em `renderTemplate` (`src/utils/text.js`): um `\` imediatamente antes de `{{KEY}}` preserva o token literal, removendo apenas a barra.
- Aplicação do escape nas duas linhas afetadas de `src/templates/docs_root/00_ddae_engine/glossario.md`, mais uma frase curta documentando a própria convenção de escape.
- Testes de regressão: unitários sobre `renderTemplate` (`test/text-render-template.test.js`) e end-to-end via `ddae-engine init` real (`test/cli-init.test.js`).
- Auditoria dos P3/P4 conhecidos da Session 02 (sem reabrir nenhum sem evidência nova de blocker).
- Correção documental de uma inexatidão de provenance no `09_validation/validacao_bloco_09_real_consumer_smoke.md` do Bloco 09 (baseline registrado incorretamente como o próprio commit técnico do Bloco 09).

## 5. Fora de Escopo

- Qualquer alteração em `src/context/**`, `src/schemas/context-schema.js`, `src/commands/context.js` — o núcleo do Context Compiler já foi provado no Bloco 09 e não é reaberto sem blocker objetivo.
- Implementação de NLP fact extraction ou qualquer forma de popular `manifest.decisions`/`bugs`/`validation` a partir de Markdown — o achado P3 do Bloco 09 permanece documentado, não implementado.
- Version bump, `npm publish`, tag `v0.3.0`, GitHub Release — pertence ao Bloco 11 (Release Preparation).
- Obsidian, MCP, integração real com qualquer LLM, embeddings — reservado para `0.4.0`.

## 6. Arquivos e Pastas Envolvidos

- `src/utils/text.js` (alterado — `renderTemplate` ganha suporte a escape `\{{KEY}}`).
- `src/templates/docs_root/00_ddae_engine/glossario.md` (alterado — as duas linhas afetadas usam o escape; nota curta documentando a convenção).
- `test/text-render-template.test.js` (novo — 8 testes unitários).
- `test/cli-init.test.js` (alterado — 2 testes E2E novos).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_10_bug_01_and_context_compiler_polish.md` (este arquivo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_10_bug_01_and_context_compiler_polish.md`.
- `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_identificados.md` e `bugs_corrigidos.md` (após CI verde — mover BUG-01 de aberto para corrigido).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_10_bug_01_and_context_compiler_polish.md` e `09_validation/validacao_bloco_10_bug_01_context_compiler_polish.md` (após CI verde).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_09_real_consumer_smoke.md` (após CI verde — correção factual de provenance, não reabertura do resultado técnico do Bloco 09).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md`, `09_validation/fechamento_sessao.md` (após CI verde).

## 7. Dependências

- Bloco 09 (Real Consumer Smoke) aprovado — o núcleo do Context Compiler não é reaberto aqui.
- BUG-01 conforme registrado em `session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_identificados.md`.

## 8. Plano de Implementação

1. Provar baseline (`git status`, `HEAD`, `origin/main`, tag `v0.2.0`, versões Stable Host/Candidate/npm).
2. Criar bloco e prompt via Stable Host.
3. Reler o estado final da sessão e localizar, por leitura de código (não suposição), o template-fonte e o mecanismo central de renderização.
4. Reproduzir BUG-01 contra o binário Candidate, capturando EXPECTED vs. ACTUAL antes de qualquer alteração.
5. Investigar `renderTemplate` e todos os call sites (`init.js`, `session.js`, `block.js`, `prompt.js`, `feedback.js`) para entender o comportamento atual e confirmar que nenhum template depende de um comportamento que a correção quebraria.
6. Implementar o escape mínimo em `renderTemplate`.
7. Aplicar o escape nas duas linhas afetadas do glossário-fonte, mais uma frase documentando a convenção.
8. Escrever testes de regressão (unitários + E2E real via `ddae-engine init`).
9. Rodar a suíte completa, `package:check`, `smoke`, `validate`/`audit` via Stable Host.
10. Auditar o diff, confirmando que `src/context/`, `src/schemas/`, `src/commands/context.js` permanecem intocados.
11. Commit técnico, push, aguardar CI 5/5.
12. Gerar feedback, validação do bloco, corrigir a provenance do Bloco 09, atualizar README/fechamento da sessão, mover BUG-01 para corrigido, commit de documentação, push, aguardar CI 5/5.

## 9. Critérios de Aceite

- [x] BUG-01 reproduzido antes de qualquer alteração de código.
- [x] Placeholder operacional (`{{PROJECT_NAME}}`/`{{CURRENT_DATE}}` no cabeçalho) continua sendo substituído normalmente.
- [x] Placeholder documentado literalmente (na tabela) sobrevive como token, não como valor real.
- [x] Nenhum outro template/placeholder existente regrediu.
- [x] Determinismo preservado (duas gerações equivalentes produzem glossário byte-idêntico).
- [x] Zero alteração em `src/context/**`, `src/schemas/context-schema.js`, `src/commands/context.js`.
- [x] Testes de regressão cobrindo tanto o mecanismo (unitário) quanto o comportamento observável via CLI real (E2E).
- [x] P3/P4 conhecidos auditados, nenhum reaberto sem evidência nova de blocker.

## 10. Validações Obrigatórias

- [x] `npm test`
- [x] `npm run package:check`
- [x] `npm run smoke`
- [x] `ddae-engine validate` / `audit` via Stable Host

## 11. Segurança

Nenhuma superfície nova. A correção não toca o Sensitive Data Guard, containment de paths, ou qualquer política de segurança já estabelecida — apenas a lógica de substituição de placeholders em templates estáticos do próprio DDAE Engine, sem entrada de usuário externa envolvida no mecanismo em si (o `PROJECT_NAME` já era derivado do nome do diretório alvo antes deste bloco, sem mudança de comportamento aqui).

## 12. Performance

Não aplicável — `renderTemplate` continua sendo uma única passada de regex sobre o conteúdo do template, sem I/O adicional.

## 13. Design System / UX

Não aplicável ao produto DDAE-Engine em si; o próprio glossário gerado é o objeto da correção (ver Seção 3).

## 14. Riscos

- Nenhum risco novo introduzido. A mudança em `renderTemplate` é aditiva (um novo padrão de escape opcional) e não altera o comportamento de nenhum placeholder pré-existente que não usa o escape.

## 15. Pendências Esperadas

- P3 — Structured context completeness (herdada do Bloco 09): mantida como P3, não implementada aqui, por não haver evidência nova de blocker.
- P3 — Documentation provenance accuracy (Bloco 09): corrigida neste bloco, ver Seção 6.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_10_bug_01_and_context_compiler_polish --session session_02_context_compiler_0_3_0` (Stable Host), somente após a CI técnica verde.

## 17. Commit Semântico Sugerido

```
fix(init): preserve literal glossary placeholders
```
