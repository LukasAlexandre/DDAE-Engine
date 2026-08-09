# Prompt — Bloco 05: Context Manifest and Compiler

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_05_context_manifest_and_compiler.md`
- `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seções 4, 5, 8, 9, 18) e `plano_bloco_12.md` (Bloco 06)

## 2. Objetivo

Implementar o núcleo do Context Compiler 0.3.0: `src/schemas/context-schema.js`, `src/context/fingerprint.js`, `src/context/manifest.js`, `src/context/compiler.js` — transformando coletores + Source/Authority Model + Relevance Engine em um Context Manifest v1 validado e fingerprinted, inteiramente em memória.

## 3. Escopo

- `validateContextManifest`/`assertContextManifest` (schema).
- `stableStringify`/`computeContextFingerprint`/`buildFingerprintPayload`/`sha256Hex` (fingerprint).
- `createContextManifest` (manifest).
- `compileContext` (compiler): orquestração completa, união de Sources, integridade content/hash, claims via Authority Model, relevância via Relevance Engine, fingerprint.
- `test/context-manifest.test.js`, `test/context-fingerprint.test.js`, `test/context-compiler.test.js`.

## 4. Fora de Escopo

- Renderer, Validator CLI-facing, Sensitive Data Guard, CLI `context ...`.
- `.ddae/`, `manifest.json` em disco, `CONTEXT.md`.
- Descoberta automática de claims conflitantes por NLP/similaridade textual.
- Conversão automática de conteúdo `collectDdaeContext()` em candidates.
- Alteração de `authority.js`, `relevance.js`, os três coletores, `src/templates/`.

## 5. Arquivos Permitidos

- `src/schemas/context-schema.js`
- `src/context/fingerprint.js`
- `src/context/manifest.js`
- `src/context/compiler.js`
- `test/context-manifest.test.js`
- `test/context-fingerprint.test.js`
- `test/context-compiler.test.js`
- `scripts/release/verify-package.mjs` (apenas para adicionar `src/schemas/` a `REQUIRED_SRC_PREFIXES`)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_05_context_manifest_and_compiler.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_05_context_manifest_and_compiler.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_05_context_manifest_and_compiler.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_05_context_manifest_compiler.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md` e `09_validation/fechamento_sessao.md` (após CI verde)

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Claims conflitantes são sempre grupos explícitos — nunca descoberta automática por texto.

## 7. Restrições de Segurança

O Compiler é um kernel puro: nunca varre filesystem, nunca abre `source.path`, todo conteúdo chega já coletado pelo chamador. Sensitive Data Guard ainda não existe — não expandir o que o Compiler lê.

## 8. Restrições de Performance

Não aplicável — operações síncronas em memória sobre número pequeno de objetos.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Reler Seções 4, 5, 8, 9, 18 do contrato do Manifest v1 e a descrição do Bloco 06 em `plano_bloco_12.md`.
2. Implementar `context-schema.js`.
3. Implementar `fingerprint.js`.
4. Implementar `manifest.js`.
5. Implementar `compiler.js`.
6. Escrever os três arquivos de teste.
7. Rodar `npm test` e confirmar 0 falhas.
8. Adicionar `src/schemas/` a `REQUIRED_SRC_PREFIXES`.
9. Rodar prova self-host (manifesto real, determinismo, validação de schema).
10. Rodar `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
11. Confirmar arquivos fora de escopo intocados; auditar o diff antes de commitar.
12. Commit técnico, push, aguardar CI 5/5.
13. Gerar feedback via Stable Host, escrever validação do bloco, atualizar README/plano da sessão, commit de documentação, push, aguardar CI 5/5.

## 11. Critérios de Aceite

- [ ] Manifesto produzido valida contra `context-schema.js`.
- [ ] Fingerprint reproduzível, independente de ordem de entrada.
- [ ] `session.id = null` e `git.available = false` aceitos como estados válidos.
- [ ] Nenhum path absoluto, nenhum timestamp no payload canônico.
- [ ] Nenhuma referência órfã passa pela validação.
- [ ] Sources com mesmo id e conteúdo divergente rejeitadas.
- [ ] Integridade content/content_hash verificada.
- [ ] Claims sempre explícitos, resolvidos via Authority Model.
- [ ] `relevant_files` preserva a ordem do Relevance Engine.
- [ ] Nenhum acesso a filesystem/rede/escrita.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_05_context_manifest_and_compiler --session session_02_context_compiler_0_3_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_05_context_manifest_compiler.md` com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(context): add manifest compiler core
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
