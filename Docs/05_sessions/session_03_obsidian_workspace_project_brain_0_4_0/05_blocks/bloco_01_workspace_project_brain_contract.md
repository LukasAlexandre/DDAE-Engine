# Bloco 01 — workspace project brain contract

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-08-16

## 1. Objetivo

Formalizar, em documentação apenas (sem código de produção), o contrato técnico do Workspace/Project Brain — schema do manifesto, modelo de filesystem, superfície de CLI e regras de segurança não-negociáveis — de modo que os Blocos 02 em diante possam implementar sem reabrir decisões arquiteturais já tomadas.

## 2. Contexto

Sessão 03 aberta após o fechamento integral da linha `0.3.x` (Session 02: npm, tag, GitHub Release, Stable Host, zero P1/P2 aberto). A análise desta sessão (`02_analysis/analise_arquitetural.md`, `analise_funcional.md`, `analise_riscos.md`, `analise_tecnica.md`) já resolveu as decisões estruturais — este bloco é o primeiro a produzir um artefato de contrato formal a partir delas, começando pelo requisito funcional que ainda não existe.

## 3. Problema que Este Bloco Resolve

Sem um contrato fixado antes da implementação, cada bloco técnico (Discovery, Schema, Renderer, Validator, CLI) corre o risco de tomar decisões de schema/filesystem incompatíveis entre si, forçando retrabalho. Este bloco elimina esse risco fixando o contrato uma vez, no início.

## 4. Escopo

- Criar o(s) requisito(s) funcional(is) correspondente(s) em `Docs/01_product/requisitos_funcionais.md` (pré-requisito identificado em `02_analysis/analise_funcional.md`, Seção 6).
- Registrar a decisão arquitetural formal em `Docs/02_architecture/decisoes_tecnicas.md` (modelo de filesystem: `.ddae/brain/` efêmero, Vault = raiz do repositório).
- Redigir o rascunho do Brain Manifest Schema v1 (nomes de campo, `schema_version`, forma do fingerprint payload) — documentação de contrato, não `src/schemas/brain-schema.js` ainda.
- Confirmar nomes finais dos arquivos de view geradas (`Home.md` e os demais listados em `analise_funcional.md`, Seção 4).
- Fixar o contrato de CLI final (`workspace init/build/validate/show`) com exit codes/idempotência já documentados na Seção 5 de `analise_funcional.md`, sem alteração de fundo — apenas formalização.

## 5. Fora de Escopo

- Qualquer código em `src/workspace/` ou `src/commands/workspace.js` — implementação começa no Bloco 02.
- `npm version`, `npm publish`, alteração de `package.json`.
- Qualquer instalação/configuração real de Obsidian.
- Blocos 02–13 (ver `04_planning/plano_execucao.md`) — cada um será criado no início de sua própria execução.

## 6. Arquivos e Pastas Envolvidos

- `Docs/01_product/requisitos_funcionais.md` (novo requisito).
- `Docs/02_architecture/decisoes_tecnicas.md` (registro da decisão de filesystem/vault).
- `Docs/03_contracts/` — avaliar se um novo arquivo de contrato dedicado (`contrato_workspace_brain.md`, ou nome equivalente à convenção já usada) é justificado, ou se o contrato cabe inteiramente em `02_analysis/analise_arquitetural.md` + `analise_funcional.md` já escritos nesta sessão — decisão a tomar durante a execução deste bloco, não antecipada aqui.

## 7. Dependências

- `02_analysis/analise_arquitetural.md`, `analise_funcional.md`, `analise_riscos.md`, `analise_tecnica.md` (já escritos, aprovados nesta sessão).
- `Docs/00_ddae_engine/self_hosting.md` (modelo de Stable Host/self-hosting, referência de convenção).

## 8. Plano de Implementação

1. Ler as quatro análises de `02_analysis/` (já produzidas) como insumo — não redescobrir, formalizar.
2. Redigir o requisito funcional em `Docs/01_product/requisitos_funcionais.md`.
3. Registrar a decisão arquitetural em `Docs/02_architecture/decisoes_tecnicas.md`.
4. Redigir o rascunho do Brain Manifest Schema v1 (campos, versão, payload do fingerprint) como documentação de contrato.
5. Decidir e, se justificado, criar o arquivo de contrato dedicado em `Docs/03_contracts/`.
6. Confirmar nomes de arquivo finais das views e do contrato de CLI, sem mudança de fundo em relação a `analise_funcional.md`.
7. Gerar feedback e validação do bloco.

## 9. Critérios de Aceite

- [x] Requisito funcional criado em `Docs/01_product/requisitos_funcionais.md` (RF-01), referenciado pela análise funcional desta sessão.
- [x] Decisão arquitetural (modelo de filesystem/Vault) registrada em `Docs/02_architecture/decisoes_tecnicas.md` (DT-01).
- [x] Rascunho do Brain Manifest Schema v1 documentado (campos, `schema_version`, payload do fingerprint) — `Docs/03_contracts/contrato_workspace_project_brain.md`, Seção B.
- [x] Contrato de CLI final (4 comandos, sem adição/remoção em relação à análise) documentado — mesmo arquivo, Seção F.
- [x] Nenhum código em `src/` alterado.
- [x] `ddae-engine validate`/`audit` sem novo warning específico desta sessão (warning de "Bloco 01 sem feedback" fechado pela Seção 16 abaixo).

## 10. Validações Obrigatórias

- [x] `ddae-engine validate`
- [x] `ddae-engine audit`
- [x] `git diff --check`

## 11. Segurança

Não aplicável a este bloco especificamente (documentação apenas) — o threat model completo do Workspace (RS-01 a RS-04) já está registrado em `02_analysis/analise_riscos.md` e será endereçado em código no Bloco 09.

## 12. Performance

Não aplicável — nenhum código de produção neste bloco.

## 13. Design System / UX

Não aplicável — nenhuma UI própria; a "UX" relevante (navegação no Obsidian) já está descrita em `02_analysis/analise_funcional.md`, Seção 4, e será implementada no Bloco 04/05.

## 14. Riscos

- Risco de o contrato ficar genérico demais para guiar a implementação sem ambiguidade — mitigado por exigir que o Schema v1 e o contrato de CLI sejam concretos (nomes de campo reais, não apenas categorias), não apenas uma repetição em prosa da análise já escrita.

## 15. Pendências Esperadas

Nenhuma pendência P1/P2 esperada — este é um bloco de formalização de decisões já tomadas, não de descoberta nova.

## 16. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_01_workspace_project_brain_contract --session session_03_obsidian_workspace_project_brain_0_4_0`. Sem feedback preenchido, o bloco não está concluído._

## 17. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
docs(session-03): define workspace project brain contract
```
