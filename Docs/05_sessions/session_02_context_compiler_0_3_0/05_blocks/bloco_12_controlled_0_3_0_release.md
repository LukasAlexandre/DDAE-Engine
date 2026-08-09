# Bloco 12 — Controlled 0.3.0 Release

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Objetivo

Transformar o release candidate `ddae-engine@0.3.0` (preparado no Bloco 11, validado no Checkpoint 11.1) em release público real — `npm publish`, tag `v0.3.0`, GitHub Release — e promover o Stable Host de `0.2.0` para `0.3.0`, fechando formalmente a Session 02.

## 2. Contexto

O Bloco 11 preparou o candidate; o Checkpoint 11.1 provou formalmente o gate de publicação (`release:check`/`prepublishOnly`) sem publicar nada. Este bloco é o primeiro desta sessão a executar operações externas irreversíveis. Ele contém três **Human Gates** explícitos — autorização humana imediatamente antes de cada ação irreversível (`npm publish`, criação/push da tag `v0.3.0`, criação do GitHub Release) — nenhum deles agrupado ou presumido por autorização anterior.

## 3. Problema que Este Bloco Resolve

Sem este bloco, `ddae-engine@0.3.0` permanece apenas um artefato local, provado mas não disponível para nenhum consumidor real via `npx ddae-engine`/`npm install`. O Stable Host deste próprio repositório também permanece em `0.2.0`, incapaz de governar o checkout com a versão que ele mesmo acabou de aprovar.

## 4. Escopo

- Reconfirmação de baseline e do fingerprint do RC (`shasum e41ede33157278f700247d3b4f074a141fc2d9b6`) imediatamente antes de cada etapa crítica.
- Bloco/prompt de release control, commit e CI antes de qualquer operação externa.
- **Human Gate A**: `npm publish` real de `ddae-engine@0.3.0`.
- Verificação pública do pacote publicado (versão, dist-tags, shasum, integrity) e um consumidor real instalado a partir do registro (não do checkout, não de tarball local).
- **Human Gate B**: criação e push da tag `v0.3.0` apontando para o `RELEASE_HEAD`, preservando a convenção de tag já usada por `v0.2.0`.
- **Human Gate C**: criação do GitHub Release `v0.3.0`.
- Promoção do Stable Host (`scripts/ci/verify-stable-host.mjs`) de `0.2.0` para `0.3.0`, com prova de que o artefato publicado continua byte-idêntico ao fingerprint do RC.
- Fechamento formal da Session 02.

## 5. Fora de Escopo

- Qualquer alteração nos 106 arquivos do pacote (`package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`, `bin/**`, `src/**`) após o `npm publish` real — mudá-los exigiria uma nova versão.
- `npm unpublish`, `npm deprecate`, `npm dist-tag add/remove`, `npm owner`, `npm access`, `npm version`, force push, force tag, mover `v0.2.0`.
- Iniciar `0.4.0`, criar Session 03, implementar Obsidian/MCP, implementar o P3 de structured context.
- Solicitar token/senha/OTP pelo chat — qualquer necessidade de autenticação interativa é reportada ao usuário para ação manual no terminal.

## 6. Arquivos e Pastas Envolvidos

- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_12_controlled_0_3_0_release.md` (este arquivo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_12_controlled_0_3_0_release.md`.
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_12_controlled_0_3_0_release.md` (após promoção, gerado pelo Stable Host 0.3.0).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_12_controlled_0_3_0_release.md`.
- `Docs/05_sessions/session_02_context_compiler_0_3_0/13_release/release_notes.md` (estado final `PUBLISHED`).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md`, `09_validation/fechamento_sessao.md` (fechamento da sessão).
- `scripts/ci/verify-stable-host.mjs` (promoção do pin, único arquivo técnico alterado neste bloco, fora do pacote publicado).

## 7. Dependências

- Bloco 11 aprovado, Checkpoint 11.1 aprovado — fingerprint `shasum e41ede33157278f700247d3b4f074a141fc2d9b6` já capturado e confirmado byte-idêntico duas vezes.
- Autenticação npm (`npm whoami`) e GitHub CLI (`gh auth status`) já configuradas no ambiente do usuário — não criadas nem alteradas por este bloco.

## 8. Plano de Implementação

1. Provar baseline; reconfirmar Checkpoint 11.1/Bloco 11.
2. Criar bloco/prompt via Stable Host ainda `0.2.0`.
3. Commit de release control (apenas `Docs/**`), CI 5/5, definir `RELEASE_HEAD`.
4. Reconfirmar fingerprint do RC inalterado; `release:check` + `npm publish --dry-run` finais.
5. **Human Gate A** → `npm publish` real.
6. Verificação pública (versão, dist-tags, shasum, integrity) + consumidor real via registro (com prova de zero vazamento de segredo sentinela).
7. **Human Gate B** → criar e empurrar a tag `v0.3.0` no `RELEASE_HEAD`.
8. **Human Gate C** → criar o GitHub Release `v0.3.0`.
9. Promover o Stable Host para `0.3.0` (`scripts/ci/verify-stable-host.mjs`), provando que o artefato publicado permanece byte-idêntico.
10. Commit de promoção, CI 5/5 (com o step de self-host agora provando `0.3.0`).
11. Feedback (gerado pelo Stable Host 0.3.0), validação do bloco, release notes finais, fechamento da Session 02.
12. Commit documental final, CI 5/5, prova final completa.

## 9. Critérios de Aceite

- [ ] `npm publish` real executado somente após Human Gate A.
- [ ] `npm view ddae-engine version` → `0.3.0`; `dist.shasum`/`dist.integrity` públicos idênticos ao RC.
- [ ] Consumidor real instalado a partir do registro (`ddae-engine@0.3.0`, nunca tarball local/checkout) prova `context build/show/validate` → `VALID`, zero vazamento de segredo sentinela.
- [ ] Tag `v0.3.0` criada e empurrada somente após Human Gate B, apontando exatamente para `RELEASE_HEAD`; `v0.2.0` inalterada.
- [ ] GitHub Release `v0.3.0` criado somente após Human Gate C.
- [ ] Stable Host promovido para `0.3.0`, provado via CI nos 5 ambientes.
- [ ] Artefato publicado permanece byte-idêntico ao fingerprint do RC em toda verificação subsequente.
- [ ] Session 02 fechada (`CONCLUÍDA`).

## 10. Validações Obrigatórias

- [ ] `npm run release:check` (final, pré-publish)
- [ ] `npm publish --dry-run` (final, pré-publish)
- [ ] Verificação pública pós-publish (`npm view`, dist-tags, dist)
- [ ] Consumidor real via registro
- [ ] `ddae-engine validate`/`audit` via Stable Host 0.3.0 (pós-promoção)
- [ ] `npm test`, `npm run package:check`, `npm run smoke` (pós-promoção)

## 11. Segurança

Nenhum token, senha, OTP ou credencial é exibido, solicitado pelo chat, ou registrado em qualquer documento. `npm whoami`/`gh auth status` são usados apenas para confirmar sessão autenticada, nunca para inspecionar `.npmrc`/config/tokens. Se autenticação interativa for necessária, o bloco para e pede ação manual do usuário no terminal.

## 12. Performance

Não aplicável.

## 13. Design System / UX

Não aplicável.

## 14. Riscos

- **Publicação é irreversível** — `name@version` publicado no npm não pode ser reutilizado, mesmo após unpublish. Mitigado pelos três Human Gates e pela reconfirmação do fingerprint imediatamente antes do Gate A.
- **Divergência de fingerprint pós-publish** — se o artefato público não corresponder byte a byte ao RC aprovado, o bloco para e classifica como "RELEASE INTEGRITY INCIDENT", sem tentar corrigir automaticamente (sem unpublish, sem republish).

## 15. Pendências Esperadas

- P3 — Structured context completeness: permanece aberta, não bloqueante, registrada como evolução futura.
- Session 03 — Obsidian Workspace / Project Brain (`0.4.0`): planejada mas não iniciada neste bloco.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_12_controlled_0_3_0_release --session session_02_context_compiler_0_3_0`, **usando o Stable Host já promovido para `0.3.0`** — prova adicional de que a promoção funcionou.

## 17. Commit Semântico Sugerido

```
docs(session-02): prepare controlled 0.3.0 release
chore(self-host): promote stable host to 0.3.0
docs(session-02): close context compiler 0.3.0 release
```
