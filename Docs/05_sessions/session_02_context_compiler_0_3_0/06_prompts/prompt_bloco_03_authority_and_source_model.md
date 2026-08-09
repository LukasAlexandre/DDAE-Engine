# Prompt — Bloco 03: Authority and Source Model

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_03_authority_and_source_model.md`
- `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md`, Seções 4 (Source Model) e 5 (Authority Model)

## 2. Objetivo

Implementar o Source Model v1 e o Authority Model v1 (`src/context/authority.js`): normalizar evidência coletada em `Source`s canônicos e resolver conflitos entre fontes por domínio de autoridade — nunca por score numérico, nunca por inferência de prosa.

## 3. Escopo

- `createSource()`, `SOURCE_KINDS`, `AUTHORITY_DOMAINS`, `resolveAuthorityConflict()` em `src/context/authority.js`.
- `test/context-authority.test.js` cobrindo criação de Source, os 7 domínios, resolução de conflito (incluindo o caso nomeado JWT vs HttpOnly), estados `unresolved`, preservação de fontes perdedoras, determinismo/imutabilidade.

## 4. Fora de Escopo

- Relevance Engine, Context Manifest, Compiler, Markdown Renderer, fingerprint, CLI `context ...`, output `.ddae/`.
- NLP/inferência semântica para determinar `domain` a partir de `kind` ou de conteúdo.
- Qualquer alteração em `src/templates/` (BUG-01 continua aberto).

## 5. Arquivos Permitidos

- `src/context/authority.js`
- `test/context-authority.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_03_authority_and_source_model.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_03_authority_and_source_model.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_03_authority_and_source_model.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_03_authority_source_model.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md` e `09_validation/fechamento_sessao.md` (atualização de status, após CI verde)

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- `domain` é sempre explícito no chamador — nunca inferido de `kind` nem de prosa.

## 7. Restrições de Segurança

Não aplicável — módulo puro, sem I/O, sem rede. Único cuidado: rejeitar (nunca reescrever silenciosamente) qualquer path não-relativo-ao-projeto passado a `createSource`.

## 8. Restrições de Performance

Não aplicável — operações síncronas em memória sobre número pequeno de objetos.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Reler Seções 4 e 5 do contrato do Manifest v1.
2. Implementar `SOURCE_KINDS`, `AUTHORITY_DOMAINS`, `createSource()`, `resolveAuthorityConflict()` em `src/context/authority.js`.
3. Escrever `test/context-authority.test.js` cobrindo todos os cenários do bloco, incluindo o caso nomeado JWT vs HttpOnly.
4. Rodar `npm test` e confirmar 0 falhas.
5. Construir Sources a partir de saída real dos três coletores existentes (prova de interoperabilidade) e de um conflito representativo self-host (prova de autoridade).
6. Rodar `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
7. Confirmar `src/templates/` e BUG-01 intocados; auditar o diff antes de commitar.
8. Commit técnico, push, aguardar CI 5/5.
9. Gerar feedback via Stable Host, escrever validação do bloco, atualizar README/plano da sessão, commit de documentação, push, aguardar CI 5/5.

## 11. Critérios de Aceite

- [ ] `createSource` produz a forma canônica exata do contrato.
- [ ] Os 10 `kind`s e os 7 `domain`s do contrato são exatamente os implementados.
- [ ] `future_intent`/`history` nunca vencem uma fonte presente-autoritativa.
- [ ] Caso JWT vs HttpOnly resolve a favor da decisão atual, roadmap preservado em `conflicting_sources`.
- [ ] Toda fonte perdedora preservada com `reason_superseded` categórico.
- [ ] Conflito com zero/duas-ou-mais fontes presente-autoritativas retorna `unresolved`, `winner: null`.
- [ ] Independente de ordem de entrada; não muta as fontes recebidas.
- [ ] Nenhum acesso a filesystem/rede/LLM; nenhuma lógica de relevância/score.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_03_authority_and_source_model --session session_02_context_compiler_0_3_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_03_authority_source_model.md` com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(context): add authority and source model
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
