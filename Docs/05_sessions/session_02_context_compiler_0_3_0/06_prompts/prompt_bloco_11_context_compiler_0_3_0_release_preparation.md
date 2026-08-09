# Prompt — Bloco 11: Context Compiler 0.3.0 Release Preparation

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_11_context_compiler_0_3_0_release_preparation.md`
- `scripts/ci/verify-stable-host.mjs` (pin do Stable Host — não alterar)

## 2. Objetivo

Transformar o estado técnico já aprovado (Blocos 01–10) em um release candidate local formal `ddae-engine@0.3.0`, sem publicar e sem criar tag.

## 3. Escopo

- Auditoria e classificação de toda referência a `0.2.0` antes de editar.
- Documentação pública do Context Compiler no README.
- Entrada de changelog `[0.3.0]`.
- Bump de versão (`package.json`, `EXPECTED_VERSION`) — sem tocar o pin do Stable Host.
- Prova via tarball `0.3.0` real instalado isoladamente.
- Regressão completa e prova formal de não-publicação.

## 4. Fora de Escopo

- `npm publish`, tag `v0.3.0`, GitHub Release.
- `src/context/**`, `src/schemas/context-schema.js`, `src/commands/context.js`, pesos, orçamentos, contrato do Manifest/fingerprint, regras do Sensitive Guard.
- NLP, Obsidian, MCP.

## 5. Arquivos Permitidos

- `package.json`
- `scripts/release/verify-package.mjs`
- `README.md`
- `CHANGELOG.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/13_release/release_notes.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_11_context_compiler_0_3_0_release_preparation.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_11_context_compiler_0_3_0_release_preparation.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_11_context_compiler_0_3_0_release_preparation.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_11_context_compiler_0_3_0_release_preparation.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md` e `09_validation/fechamento_sessao.md` (após CI verde)

## 6. Regras Obrigatórias

- Preparar ≠ publicar — nenhuma ação irreversível neste bloco.
- Não expandir o escopo sem reportar e obter confirmação primeiro.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Não aplicável — nenhuma superfície de segurança nova; a prova via tarball 0.3.0 reconfirma o Sensitive Data Guard já estabelecido.

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Provar baseline (git/versões/tags/npm).
2. Criar bloco e prompt via Stable Host.
3. Auditar infraestrutura de release e classificar toda referência a `0.2.0`.
4. Documentar o Context Compiler no README (CLI real, sem inventar flags).
5. Adicionar entrada de changelog `[0.3.0]`.
6. Bump de versão (`package.json`, `EXPECTED_VERSION`).
7. Rodar suíte completa, `package:check`, `smoke` (tarball 0.3.0), consumer smoke, BUG-01, `validate`/`audit`.
8. Provar ausência de publicação npm e de tag `v0.3.0`.
9. Atualizar `release_notes.md`.
10. Auditar o diff — núcleo do Context Compiler deve permanecer vazio.
11. Commit técnico, push, CI 5/5.
12. Feedback, validação, atualização de README/fechamento, commit de documentação, push, CI 5/5.

## 11. Critérios de Aceite

- [ ] Candidate `--version` = `0.3.0`; Stable Host permanece `0.2.0`.
- [ ] README/CHANGELOG documentam o Context Compiler de forma honesta.
- [ ] Tarball `0.3.0` instalado isoladamente funciona de ponta a ponta.
- [ ] Zero alteração em `src/context/**`, `src/schemas/context-schema.js`, `src/commands/context.js`.
- [ ] Nenhuma publicação/tag executada.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_11_context_compiler_0_3_0_release_preparation --session session_02_context_compiler_0_3_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_11_context_compiler_0_3_0_release_preparation.md` com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
chore(release): prepare ddae-engine 0.3.0
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
