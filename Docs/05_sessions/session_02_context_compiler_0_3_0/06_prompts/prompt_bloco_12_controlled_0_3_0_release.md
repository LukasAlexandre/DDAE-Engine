# Prompt — Bloco 12: Controlled 0.3.0 Release

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_12_controlled_0_3_0_release.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/checkpoint_11_1_final_release_gate_preflight.md` (fingerprint do RC)

## 2. Objetivo

Publicar `ddae-engine@0.3.0`, criar a tag `v0.3.0` e o GitHub Release, promover o Stable Host para `0.3.0`, e fechar a Session 02 — com três Human Gates explícitos antes de cada operação irreversível.

## 3. Escopo

- Release control (bloco/prompt) via Stable Host `0.2.0`.
- Human Gate A → `npm publish` real.
- Verificação pública + consumidor real via registro.
- Human Gate B → tag `v0.3.0`.
- Human Gate C → GitHub Release.
- Promoção do Stable Host para `0.3.0`.
- Fechamento da Session 02.

## 4. Fora de Escopo

- Alterar qualquer um dos 106 arquivos do pacote após o publish real.
- `npm unpublish`/`deprecate`/`dist-tag`/`owner`/`access`/`version`, force push/tag, mover `v0.2.0`.
- Iniciar `0.4.0`/Session 03/Obsidian/P3.
- Solicitar credenciais pelo chat.

## 5. Arquivos Permitidos

- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_12_controlled_0_3_0_release.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_12_controlled_0_3_0_release.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_12_controlled_0_3_0_release.md` (pós-promoção)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_12_controlled_0_3_0_release.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/13_release/release_notes.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md` e `09_validation/fechamento_sessao.md`
- `scripts/ci/verify-stable-host.mjs` (único arquivo técnico, fora do pacote publicado)

## 6. Regras Obrigatórias

- Três Human Gates obrigatórios, nunca agrupados, nunca presumidos: A (npm publish), B (tag), C (GitHub Release).
- Após o publish real, zero alteração nos 106 arquivos do pacote.
- Nenhuma credencial solicitada pelo chat — se autenticação for necessária, pare e peça ação manual do usuário.

## 7. Restrições de Segurança

`npm whoami`/`gh auth status` apenas para confirmar sessão — nunca inspecionar `.npmrc`/config/tokens/OTP. Ver Seção 11 do bloco.

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Provar baseline; reconfirmar Checkpoint 11.1.
2. Criar bloco/prompt via Stable Host `0.2.0`.
3. Commit de release control, CI 5/5, definir `RELEASE_HEAD`.
4. Reconfirmar fingerprint do RC; `release:check` + `publish --dry-run` finais.
5. Human Gate A → `npm publish` real.
6. Verificação pública + consumidor real via registro.
7. Human Gate B → tag `v0.3.0`.
8. Human Gate C → GitHub Release.
9. Promover Stable Host para `0.3.0`.
10. Commit de promoção, CI 5/5.
11. Feedback (via Stable Host 0.3.0), validação, release notes, fechamento da sessão.
12. Commit documental final, CI 5/5, prova final completa.

## 11. Critérios de Aceite

- [ ] `npm publish` real somente após Gate A.
- [ ] Fingerprint público idêntico ao RC.
- [ ] Consumidor real via registro → `VALID`, zero vazamento.
- [ ] Tag `v0.3.0` somente após Gate B, apontando para `RELEASE_HEAD`.
- [ ] GitHub Release somente após Gate C.
- [ ] Stable Host promovido para `0.3.0`, provado em CI.
- [ ] Session 02 fechada.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `npm run release:check` (pré-publish)
- [ ] Verificação pública pós-publish
- [ ] `ddae-engine validate`/`audit` via Stable Host 0.3.0 (pós-promoção)

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com (usando o Stable Host já promovido para 0.3.0):

```
ddae-engine feedback create --block bloco_12_controlled_0_3_0_release --session session_02_context_compiler_0_3_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_12_controlled_0_3_0_release.md` com o status final.

## 15. Commit Semântico Sugerido

```
docs(session-02): prepare controlled 0.3.0 release
chore(self-host): promote stable host to 0.3.0
docs(session-02): close context compiler 0.3.0 release
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Cada um dos três Human Gates (A/B/C) e cada commit exigem aprovação explícita e individual antes de executar.
