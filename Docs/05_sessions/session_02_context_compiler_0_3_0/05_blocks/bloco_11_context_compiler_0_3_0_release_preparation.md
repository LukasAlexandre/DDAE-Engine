# Bloco 11 — Context Compiler 0.3.0 Release Preparation

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Objetivo

Transformar o estado técnico já aprovado (Blocos 01–10) em um release candidate local formal `ddae-engine@0.3.0` — versão, documentação pública, changelog e prova via tarball instalado — sem publicar no npm e sem criar tag.

## 2. Contexto

Os Blocos 01–10 já provaram, de ponta a ponta, o cross-platform self-host canônico, o DDAE State Collector, o Authority & Source Model, o Relevance Engine v1, o Context Manifest + Compiler, o Markdown Renderer, a Context CLI (`build/show/validate`), a integridade do fingerprint, o Sensitive Data Guard, a ingestão segura de fontes, o Real Consumer Agent Workflow (incluindo tarball instalado), e a correção de BUG-01. Este bloco não desenvolve mais o Context Compiler — ele empacota o que já existe como `0.3.0`.

## 3. Problema que Este Bloco Resolve

Sem este bloco, o código do Context Compiler está pronto mas o pacote ainda se identifica como `0.2.0`, o README público não documenta a nova capability, e não existe um changelog nem release notes formais para `0.3.0`. Preparar ≠ publicar: este bloco fecha essa lacuna sem executar nenhuma ação irreversível (`npm publish`, tag, GitHub Release).

## 4. Escopo

- Auditoria da infraestrutura de release existente e classificação de toda referência a `0.2.0` antes de qualquer edição.
- Decisão formal de SemVer (`0.2.0` → `0.3.0`, MINOR).
- Auditoria da CLI real (`--help`) e documentação pública do Context Compiler no `README.md` (sem prometer o que não existe: sem NLP, sem Obsidian, sem MCP).
- Entrada de changelog para `0.3.0` (`CHANGELOG.md`).
- Bump de versão em `package.json` e no contrato de release local (`scripts/release/verify-package.mjs`), sem tocar o pin do Stable Host (`scripts/ci/verify-stable-host.mjs`, que permanece `0.2.0`).
- Prova via tarball `0.3.0` real, empacotado e instalado isoladamente (nunca o binário do checkout) — `context build/show/validate`, Sensitive Guard, zero vazamento de segredo.
- Regressão completa: suíte de testes, consumer smoke, BUG-01, núcleo do Context Compiler intocado.
- Prova formal de que nada foi publicado (`npm view ddae-engine@0.3.0` ausente) e nenhuma tag `v0.3.0` existe (local/remoto).
- `13_release/release_notes.md` da sessão, registrando o estado `RELEASE CANDIDATE PREPARED`.

## 5. Fora de Escopo

- `npm publish`, `npm unpublish`, `npm dist-tag`, `git tag v0.3.0`, `git push --tags`, `gh release create`, qualquer GitHub Release.
- Alterar a tag imutável `v0.2.0` ou promover o Stable Host para `0.3.0`.
- Qualquer alteração em `src/context/**`, `src/schemas/context-schema.js`, `src/commands/context.js`, pesos de Relevância/Autoridade, orçamentos, contrato do Manifest/fingerprint, ou regras do Sensitive Guard, sem blocker reproduzível.
- Implementação de NLP/extração semântica, Obsidian, MCP, Work Packets, Handoff.

## 6. Arquivos e Pastas Envolvidos

- `package.json` (alterado — `version`).
- `scripts/release/verify-package.mjs` (alterado — `EXPECTED_VERSION`).
- `README.md` (alterado — seção Context Compiler, CLI reference, Project status).
- `CHANGELOG.md` (alterado — entrada `[0.3.0]`).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/13_release/release_notes.md` (alterado).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_11_context_compiler_0_3_0_release_preparation.md` (este arquivo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_11_context_compiler_0_3_0_release_preparation.md`.
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_11_context_compiler_0_3_0_release_preparation.md` e `09_validation/validacao_bloco_11_context_compiler_0_3_0_release_preparation.md` (após CI verde).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md`, `09_validation/fechamento_sessao.md` (após CI verde).

## 7. Dependências

- Blocos 01–10 aprovados — o núcleo do Context Compiler não é reaberto aqui.
- `scripts/ci/verify-stable-host.mjs` — não alterado; permanece pinado em `ddae-engine@0.2.0` publicado.

## 8. Plano de Implementação

1. Provar baseline (git/versões/tags/npm) antes de qualquer alteração.
2. Criar bloco e prompt via Stable Host.
3. Auditar infraestrutura de release existente (`package.json`, `CHANGELOG.md`, `README.md`, `.github/workflows/ci.yml`, `scripts/release/`, `scripts/ci/verify-stable-host.mjs`).
4. Classificar cada ocorrência de `0.2.0` (histórica, release imutável, pin do Stable Host, expectativa do candidate atual, fixture de teste) antes de editar.
5. Auditar a CLI real (`--help`) e documentar o Context Compiler no README, sem inventar flags.
6. Adicionar a entrada de changelog `[0.3.0]`.
7. Bump de versão em `package.json` e `EXPECTED_VERSION`.
8. Rodar a suíte completa, `package:check`, `smoke` (tarball 0.3.0 real), consumer smoke, regressão de BUG-01, `validate`/`audit` via Stable Host.
9. Provar formalmente ausência de publicação npm e de tag `v0.3.0` (local/remoto).
10. Atualizar `release_notes.md` da sessão.
11. Auditar o diff, confirmando núcleo do Context Compiler intocado.
12. Commit técnico, push, aguardar CI 5/5.
13. Feedback, validação do bloco, atualizar README/fechamento da sessão, commit de documentação, push, aguardar CI 5/5.

## 9. Critérios de Aceite

- [x] `package.json.version` = `0.3.0`; Candidate `--version` = `0.3.0`; Stable Host `--version` permanece `0.2.0`.
- [x] README documenta `context build/show/validate` com flags reais, sem prometer capability inexistente.
- [x] `CHANGELOG.md` tem entrada `[0.3.0]` proporcional, orientada ao usuário do pacote.
- [x] Tarball `ddae-engine-0.3.0.tgz` empacotado e instalado isoladamente funciona (`context build/show/validate`, Sensitive Guard, zero vazamento).
- [x] Regressão completa verde (suíte, consumer smoke, BUG-01, `validate`/`audit`).
- [x] Zero alteração em `src/context/**`, `src/schemas/context-schema.js`, `src/commands/context.js`.
- [x] `npm view ddae-engine@0.3.0` ausente; `v0.3.0` ausente local e remoto; `v0.2.0` peeled inalterado.
- [x] Nenhuma ação irreversível executada (`publish`/tag/release).

## 10. Validações Obrigatórias

- [x] `npm test`
- [x] `npm run package:check`
- [x] `npm run smoke`
- [x] `ddae-engine validate` / `audit` via Stable Host

## 11. Segurança

Nenhuma superfície nova. A prova via tarball 0.3.0 reconfirma o Sensitive Data Guard e o zero-vazamento de segredo já estabelecidos nos Blocos 08/09/10, agora contra o artefato que se tornará o candidate real.

## 12. Performance

Não aplicável — nenhuma mudança de runtime além do número de versão.

## 13. Design System / UX

Não aplicável ao produto DDAE-Engine em si; a documentação pública do Context Compiler no README é o único artefato "voltado ao usuário" deste bloco.

## 14. Riscos

- Risco de confundir "preparar" com "publicar" — mitigado por prova explícita, em cada etapa, de que nada foi publicado e nenhuma tag foi criada, e por manter a Session 02 como `EM ANDAMENTO` (não `CONCLUÍDA`) ao final deste bloco.

## 15. Pendências Esperadas

- P3 — Structured context completeness (herdada do Bloco 09): mantida, registrada em `release_notes.md` como limitação conhecida, não bloqueante.
- A publicação real (`npm publish`, tag, GitHub Release) fica para o Bloco 12, mediante autorização humana explícita.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_11_context_compiler_0_3_0_release_preparation --session session_02_context_compiler_0_3_0` (Stable Host), somente após a CI técnica verde.

## 17. Commit Semântico Sugerido

```
chore(release): prepare ddae-engine 0.3.0
```
