# Prompt — Bloco 03: project brain schema fingerprint compiler

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/05_blocks/bloco_03_project_brain_schema_fingerprint_compiler.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Implementar `brain-schema.js`, `fingerprint.js` e `compiler.js` em `src/workspace/`, transformando o snapshot de `discoverWorkspaceState` em um **Brain Manifest v1** validado e fingerprinted, **em memória, sem escrita em disco**. Antes de codar, resolva as **Decisões Abertas** (bloco, Seção 15) com o usuário. O Manifest representa Knowledge (`DT-02`); não modela Memory nem Persistent Memory Providers.

## 3. Escopo

Ver `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/05_blocks/bloco_03_project_brain_schema_fingerprint_compiler.md`, Seção 4: schema (`validateBrainManifest`/`assertBrainManifest`), fingerprint (`buildBrainFingerprintPayload`/`computeBrainFingerprint`, reutilizando `stableStringify`/`sha256Hex` de `src/context/fingerprint.js` sem modificá-los) e compiler (`compileBrainManifest`), mais testes (TDD).

## 4. Fora de Escopo

Escrita em disco / `.ddae/brain/`, Renderer, navegação Obsidian, integração com `.ddae/context/`, Validator (`VALID`/`STALE`/`INVALID`), CLI `workspace *`, qualquer alteração a `src/context/**`, `discover.js` (sem Delta Gate) ou ao contrato congelado. **Claude-Mem, MemoryProvider, entidade "Memory", `ddae doctor` e todo item de Future Agentic Environment (ADR) estão fora da `0.4.0`.**

## 5. Arquivos Permitidos

- `src/workspace/brain-schema.js` (novo)
- `src/workspace/fingerprint.js` (novo)
- `src/workspace/compiler.js` (novo)
- `test/workspace-brain-schema.test.js`, `test/workspace-brain-fingerprint.test.js`, `test/workspace-brain-compiler.test.js` (novos)
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/08_feedbacks/` e `09_validation/` (feedback/validação do Bloco 03)

Nomes de arquivo a confirmar contra o contrato na revisão.

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.

## 7. Restrições de Segurança

Sem novo ponto de leitura de filesystem; o compiler só consome o snapshot do Discovery. Rejeitar path absoluto e `` no schema. Nunca copiar conteúdo de arquivo para o manifesto (apenas referências/resumos de uma linha). Sem rede, sem LLM, sem embeddings, sem escrita em disco.

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Resolver as Decisões Abertas (bloco, Seção 15) e registrar as respostas no bloco.
2. Escrever os testes de `brain-schema.js` e implementá-lo.
3. Implementar `fingerprint.js` reutilizando o serializador canônico existente.
4. Implementar `compiler.js` (função pura sobre `discoverWorkspaceState`).
5. Provar determinismo, zero escrita e ausência de path absoluto; provar contra o self-host do DDAE.
6. Rodar a regressão completa e gerar feedback/validação.

## 11. Critérios de Aceite

Ver `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/05_blocks/bloco_03_project_brain_schema_fingerprint_compiler.md`, Seção 9 (10 critérios).

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `git diff --check`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_03_project_brain_schema_fingerprint_compiler --session session_03_obsidian_workspace_project_brain_0_4_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(workspace): add brain manifest schema, fingerprint and compiler
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
