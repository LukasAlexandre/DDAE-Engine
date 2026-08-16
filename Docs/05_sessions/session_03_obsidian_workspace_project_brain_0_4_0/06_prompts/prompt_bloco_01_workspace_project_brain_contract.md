# Prompt — Bloco 01: workspace project brain contract

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/05_blocks/bloco_01_workspace_project_brain_contract.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

## 2. Objetivo

Formalizar em documentação (sem código de produção) o contrato do Workspace/Project Brain: requisito funcional, decisão arquitetural de filesystem/Vault, rascunho do Brain Manifest Schema v1, e contrato final de CLI — a partir das quatro análises já aprovadas em `02_analysis/` desta sessão.

## 3. Escopo

- Criar o requisito funcional correspondente em `Docs/01_product/requisitos_funcionais.md`.
- Registrar a decisão arquitetural (Vault = raiz do repositório, `.ddae/brain/` efêmero) em `Docs/02_architecture/decisoes_tecnicas.md`.
- Redigir o rascunho do Brain Manifest Schema v1 (campos, `schema_version`, payload do fingerprint).
- Decidir se um contrato dedicado em `Docs/03_contracts/` é justificado; se sim, criá-lo.
- Confirmar, sem alteração de fundo, o contrato de CLI já definido em `02_analysis/analise_funcional.md` Seção 5.

## 4. Fora de Escopo

- Qualquer código em `src/workspace/` ou `src/commands/workspace.js`.
- `npm version`, `npm publish`, alteração de `package.json`.
- Instalação/configuração real de Obsidian.
- Blocos 02–13 do roadmap (`04_planning/plano_execucao.md`).

## 5. Arquivos Permitidos

- `Docs/01_product/requisitos_funcionais.md`
- `Docs/02_architecture/decisoes_tecnicas.md`
- `Docs/03_contracts/` (novo arquivo, se justificado)
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/05_blocks/bloco_01_workspace_project_brain_contract.md`
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/08_feedbacks/feedback_bloco_01_workspace_project_brain_contract.md`
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/09_validation/validacao_bloco_01_workspace_project_brain_contract.md`

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Não reabra decisões já tomadas em `02_analysis/` sem justificativa explícita — este bloco formaliza, não redescobre.

## 7. Restrições de Segurança

Não aplicável a este bloco (documentação apenas). Threat model completo em `02_analysis/analise_riscos.md`, endereçado em código no Bloco 09.

## 8. Restrições de Performance

Não aplicável — nenhum código de produção neste bloco.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Ler as quatro análises de `02_analysis/`.
2. Redigir o requisito funcional.
3. Registrar a decisão arquitetural.
4. Redigir o rascunho do Schema v1.
5. Avaliar e, se justificado, criar o contrato dedicado.
6. Confirmar o contrato de CLI final.
7. Gerar feedback e validação do bloco.

## 11. Critérios de Aceite

- [ ] Requisito funcional criado.
- [ ] Decisão arquitetural registrada.
- [ ] Rascunho do Schema v1 documentado com campos concretos.
- [ ] Contrato de CLI final documentado.
- [ ] Nenhum código em `src/` alterado.
- [ ] `ddae-engine validate`/`audit` sem novo warning desta sessão.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `git diff --check`

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_01_workspace_project_brain_contract --session session_03_obsidian_workspace_project_brain_0_4_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
docs(session-03): define workspace project brain contract
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
