# Prompt — Bloco 07: Context CLI build show validate

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_07_context_cli_build_show_validate.md`
- `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seções 10–15) e `plano_bloco_12.md` (Bloco 08)

## 2. Objetivo

Expor o Context Compiler através de `ddae-engine context build/show/validate`, persistindo o pacote sob `.ddae/context/`, em modo estrutural seguro (fail-closed) até o Sensitive Data Guard existir.

## 3. Escopo

- `src/context/validator.js` — VALID/STALE/INVALID, kernel puro.
- `src/commands/context.js` — build/show/validate.
- `src/cli.js` — integração do comando `context`.
- `test/context-validator.test.js`, `test/cli-context.test.js`.

## 4. Fora de Escopo

- Sensitive Data Guard, ingestão textual ampla, leitura de `.env`/segredos/source arbitrário.
- Work Packets, Handoff, MCP, Obsidian, LLM, embeddings.
- Alteração de `authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `renderer.js`, `context-schema.js`, coletores, `src/templates/`.
- Bump de versão.

## 5. Arquivos Permitidos

- `src/context/validator.js`
- `src/commands/context.js`
- `src/cli.js`
- `test/context-validator.test.js`
- `test/cli-context.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_07_context_cli_build_show_validate.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_07_context_cli_build_show_validate.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_07_context_cli_build_show_validate.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_07_context_cli.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md` e `09_validation/fechamento_sessao.md` (após CI verde)

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- `context build` roda em modo estrutural — nunca ler conteúdo de arquivo de projeto arbitrário.

## 7. Restrições de Segurança

Único comando que escreve. Containment de path obrigatório (rejeitar arquivo colidindo, symlink escapando `projectRoot`). Nunca modificar `.gitignore` raiz do consumidor. Zero leitura de `.env`/segredos.

## 8. Restrições de Performance

Não aplicável — build em modo estrutural é leve.

## 9. Restrições de Design System

Não aplicável ao produto; saída em stdout consistente com `validate`/`audit`.

## 10. Tarefas

1. Inspecionar CLI/comandos/testes existentes antes de implementar.
2. Reler Seções 10–15 do contrato do Manifest v1.
3. Implementar `validator.js`.
4. Implementar `commands/context.js` (build/show/validate).
5. Integrar em `cli.js`.
6. Escrever os dois arquivos de teste.
7. Rodar `npm test` e confirmar 0 falhas.
8. Rodar prova self-host em consumidor TEMP (nunca no próprio checkout).
9. Rodar `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
10. Confirmar arquivos fora de escopo intocados; `.ddae/` ausente do próprio repo; auditar o diff antes de commitar.
11. Commit técnico, push, aguardar CI 5/5.
12. Gerar feedback via Stable Host, escrever validação do bloco, atualizar README/plano da sessão, commit de documentação, push, aguardar CI 5/5.

## 11. Critérios de Aceite

- [ ] `context build` exige `--goal`; budget minimal/standard/deep; sessão explícita sem fallback silencioso.
- [ ] Modo estrutural: zero candidates/claims/facts textuais.
- [ ] `.ddae/.gitignore` criado só se ausente; `.gitignore` raiz nunca tocado.
- [ ] Containment de path: arquivo colidindo e symlink escapando rejeitados.
- [ ] Build em memória primeiro; sem artefato parcial em falha.
- [ ] Builds repetidos byte-idênticos.
- [ ] `show`/`validate` estritamente read-only.
- [ ] `validate` classifica VALID/STALE/INVALID corretamente; exit 0 só VALID.
- [ ] Git indisponível não invalida sozinho.
- [ ] `.ddae/` nunca untracked em repo Git real.
- [ ] Nenhum `.env`/segredo lido ou vazado.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_07_context_cli_build_show_validate --session session_02_context_compiler_0_3_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_07_context_cli.md` com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(context): add context build show validate CLI
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
