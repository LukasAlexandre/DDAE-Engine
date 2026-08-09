# Prompt — Bloco 06: Markdown Renderer

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_06_markdown_renderer.md`
- `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seção 1) e `plano_bloco_12.md` (Bloco 07)

## 2. Objetivo

Implementar `src/context/renderer.js`: função pura que transforma um Context Manifest v1 validado em `CONTEXT.md`, sem introduzir nenhuma verdade, seleção ou interpretação nova.

## 3. Escopo

- `renderContextMarkdown(manifest)` — valida via `assertContextManifest`, produz Markdown determinístico com dez seções fixas.
- Architecture como view filtrada de `relevant_files` (`source.kind === "architecture"`).
- Proteção contra Markdown injection: fences dinâmicos, inline-code escaping.
- `excluded_sources` sob Relevant Files, nunca sob Out of Scope.
- `test/context-renderer.test.js`.

## 4. Fora de Escopo

- CLI (`context build/show/validate`), `src/commands/context.js`, alteração de `src/cli.js`.
- Validator (VALID/STALE/INVALID), Sensitive Data Guard.
- `.ddae/`, arquivos em disco.
- Recalcular relevância/autoridade/fingerprint.
- Inferir `out_of_scope` a partir de qualquer campo — Manifest v1 não o possui.
- Alteração de `authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `context-schema.js`, coletores, `src/templates/`.

## 5. Arquivos Permitidos

- `src/context/renderer.js`
- `test/context-renderer.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_06_markdown_renderer.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_06_markdown_renderer.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_06_markdown_renderer.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_06_markdown_renderer.md` (após CI verde)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md` e `09_validation/fechamento_sessao.md` (após CI verde)

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Manifest é canônico; CONTEXT.md é derivado — nunca o contrário.

## 7. Restrições de Segurança

Conteúdo de fonte é sempre dado/evidência, nunca instrução executável. Fences dinâmicos obrigatórios para todo conteúdo de fonte embutido no Markdown.

## 8. Restrições de Performance

Não aplicável — concatenação de strings em memória.

## 9. Restrições de Design System

Não aplicável ao produto; legibilidade do CONTEXT.md revisada manualmente.

## 10. Tarefas

1. Reler Seção 1 do contrato do Manifest v1 e a descrição do Bloco 07 em `plano_bloco_12.md`.
2. Implementar helpers puros (inline-code escaping, fence dinâmico, empty state).
3. Implementar as dez seções como funções puras, ordem fixa.
4. Implementar `renderContextMarkdown`.
5. Escrever `test/context-renderer.test.js`.
6. Rodar `npm test` e confirmar 0 falhas.
7. Rodar prova self-host (Manifest real via `compileContext`, render, determinismo byte-a-byte).
8. Rodar `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
9. Confirmar arquivos fora de escopo intocados; auditar o diff antes de commitar.
10. Commit técnico, push, aguardar CI 5/5.
11. Gerar feedback via Stable Host, escrever validação do bloco, atualizar README/plano da sessão, commit de documentação, push, aguardar CI 5/5.

## 11. Critérios de Aceite

- [ ] Render determinístico byte-idêntico entre execuções.
- [ ] Nenhuma seção introduz informação ausente do Manifest.
- [ ] Dez seções top-level, sempre presentes, ordem fixa.
- [ ] Architecture só usa `source.kind === "architecture"`.
- [ ] `excluded_sources` sob Relevant Files, nunca sob Out of Scope.
- [ ] Out of Scope sempre neutro.
- [ ] Conteúdo adversarial nunca quebra estrutura top-level.
- [ ] Nenhum import de `authority.js`/`relevance.js`/`compiler.js`/coletores.
- [ ] Manifest de entrada nunca mutado.
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
ddae-engine feedback create --block bloco_06_markdown_renderer --session session_02_context_compiler_0_3_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_06_markdown_renderer.md` com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(context): add markdown renderer
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
