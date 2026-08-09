# Prompt — Bloco 04: Relevance Engine v1

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_04_relevance_engine_v1.md`
- `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seção 8, Budget model) e `plano_bloco_12.md` (Bloco 05)

## 2. Objetivo

Implementar `src/context/relevance.js`: motor de relevância lexical, heurístico, determinístico, offline, goal-driven, budget-aware — responde "o que importa para este objetivo?", nunca "o que é verdadeiro?" (Authority Model) nem "como montar o manifesto?" (Compiler).

## 3. Escopo

- `normalizeGoal(goal)`, modelo `RelevanceCandidate` local, `scoreRelevanceCandidate(candidate, goal)`, `rankRelevantSources(candidates, { goal, budget })` em `src/context/relevance.js`.
- `test/context-relevance.test.js` cobrindo os cenários do bloco.

## 4. Fora de Escopo

- Compiler, Manifest, Renderer, Validator, Fingerprint, Sensitive Data Guard, CLI `context ...`, output `.ddae/`.
- Embeddings, banco vetorial, LLM, tradução automática, stemming complexo.
- Descoberta automática de sinais via filesystem/Git — sinais são sempre explícitos.
- Alteração de `src/context/authority.js`, `git-context.js`, `project-context.js`, `ddae-context.js`, `src/templates/`.

## 5. Arquivos Permitidos

- `src/context/relevance.js`
- `test/context-relevance.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_04_relevance_engine_v1.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_04_relevance_engine_v1.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_04_relevance_engine_v1.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_04_relevance_engine_v1.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md` e `09_validation/fechamento_sessao.md` (atualização de status, após CI verde)

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Relevância nunca decide verdade — `authority_class` nunca influencia o score.

## 7. Restrições de Segurança

Não aplicável — módulo puro, sem I/O, sem rede. Nunca lê `source.path` do disco; usa exclusivamente `candidate.content` fornecido pelo chamador.

## 8. Restrições de Performance

Não aplicável — operações síncronas em memória sobre número pequeno de objetos.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Reler a Seção 8 do contrato do Manifest v1 e a descrição do Bloco 05 em `plano_bloco_12.md`.
2. Implementar tokenização lexical determinística (`normalizeGoal`).
3. Implementar `scoreRelevanceCandidate` com pesos explícitos e breakdown auditável.
4. Implementar `rankRelevantSources` com budget profiles, tie-break de 3 níveis, custo por caractere, política de oversized-skip sem truncar.
5. Escrever `test/context-relevance.test.js`.
6. Rodar `npm test` e confirmar 0 falhas.
7. Construir candidates a partir de saída real dos três coletores e `createSource`, provar relevância self-host.
8. Rodar `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
9. Confirmar `src/templates/`, `authority.js` e os três coletores intocados; auditar o diff antes de commitar.
10. Commit técnico, push, aguardar CI 5/5.
11. Gerar feedback via Stable Host, escrever validação do bloco, atualizar README/plano da sessão, commit de documentação, push, aguardar CI 5/5.

## 11. Critérios de Aceite

- [ ] `normalizeGoal` determinístico, rejeita goal vazio, normaliza diacríticos/camelCase/separadores, deduplica termos.
- [ ] Source Model canônico (`authority.js`) não alterado.
- [ ] Score explicável — breakdown recompõe o total exatamente.
- [ ] Termo repetido não multiplica score dentro do mesmo campo.
- [ ] Sinais sempre explícitos, nunca inferidos de `kind`.
- [ ] `authority_class` nunca influencia relevância.
- [ ] Ordenação determinística: score DESC, path ASC, id ASC.
- [ ] Budget: minimal=20000, standard=60000 (default), deep=120000.
- [ ] Candidate oversized é skipped sem truncar; avaliação continua.
- [ ] `selected.length + skipped.length === candidates.length`.
- [ ] Determinismo e imutabilidade comprovados por teste.
- [ ] Nenhum acesso a filesystem/rede/LLM; zero dependências externas.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_04_relevance_engine_v1 --session session_02_context_compiler_0_3_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_04_relevance_engine_v1.md` com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(context): add relevance engine v1
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
