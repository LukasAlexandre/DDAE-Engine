# Plano de Execução

> Projeto: DDAE · Atualizado em: 2026-08-16

## 1. Etapas

| Ordem | Bloco planejado | Objetivo resumido | Depende de |
|---|---|---|---|
| 1 | Workspace & Project Brain Contract | Fixar schema (rascunho), modelo de filesystem, contrato de CLI e regras de segurança não-negociáveis — sem código de produção. | — |
| 2 | Workspace Discovery | `src/workspace/discover.js` — agrega sessão atual, decisões, riscos, bugs, release state, reaproveitando `ddae-context.js`/`git-context.js`. | Bloco 1 |
| 3 | Project Brain Schema, Fingerprint & Compiler | `brain-schema.js`, `fingerprint.js`, `compiler.js` — Manifest v1 do Brain, validado e fingerprinted. | Bloco 2 |
| 4 | Workspace Renderer | `renderer.js` — Manifest → `Home.md` + views de índice, função pura. | Bloco 3 |
| 5 | Obsidian Navigation Hardening | Wikilinks path-safe (reaproveitando `sensitive-files.js`), frontmatter para Graph View, eliminação de links ambíguos por nome-base. | Bloco 4 |
| 6 | Context Compiler Integration | Leitura read-only de `.ddae/context/manifest.json` quando presente, para popular "Important Files"/"Context Packages". | Bloco 4 |
| 7 | Workspace Validator | `validator.js` — VALID/STALE/INVALID; avaliação real (não especulativa) de extrair kernel compartilhado com `context/validator.js` (ID-07), agora com dois usos reais lado a lado para guiar a extração. | Bloco 3 |
| 8 | CLI | `workspace init/build/validate/show`, integrado a `src/cli.js`. | Blocos 4, 5, 6, 7 |
| 9 | Security Hardening | Fecha RS-01–RS-04: containment de link, symlink fail-closed, aviso de Obsidian Sync/Publish, gitignore de `.obsidian/`. | Bloco 8 |
| 10 | Existing Project Migration | Prova formal de RS-06: projeto `0.3.0` existente, nunca rodando `workspace *`, permanece byte-idêntico após atualização. | Bloco 8 |
| 11 | Real Consumer Smoke | Prova ponta a ponta contra um consumidor real (mesmo padrão do Bloco 09 da Session 02) e contra o próprio self-host do DDAE. | Blocos 8, 9, 10 |
| 12 | Documentation / Polish | README, `self_hosting.md`/documentação equivalente, Timeline view (ID-08) se o tempo permitir. | Bloco 11 |
| 13 | Release Preparation | Candidate local `0.4.0` — versão, changelog, README, tarball provado isoladamente (mesmo padrão do Bloco 11 da Session 02). Publicação real fica em bloco controlado separado, com Human Gates, como na `0.3.0`. | Bloco 12 |

## 2. Cronograma

Sem datas absolutas — este projeto não tem deadline externo fixo. Ordem e dependência (Seção 1) governam o sequenciamento, não estimativa de tempo.

## 3. Critério de Sequenciamento

Ordem de dependência técnica direta, com um princípio adicional: **segurança e migração (Blocos 9–10) vêm antes do smoke de consumidor real (Bloco 11)** — não depois — porque o smoke deve provar o sistema já endurecido, não descobrir problemas de segurança/compatibilidade *durante* a prova final (mesmo raciocínio já aplicado na Session 02, onde o Sensitive Data Guard — Bloco 08 — veio antes do Real Consumer Smoke — Bloco 09).

Blocos 5 (Navigation) e 6 (Context Compiler Integration) são paralelizáveis entre si (ambos dependem só do Bloco 4, não um do outro) — a ordem 5→6 aqui é apenas de exposição, não uma dependência real.

## 4. Perguntas Orientadoras

- **Algum bloco está descrito vagamente demais?** Não — cada um tem escopo, arquivos esperados e critério de aceite definidos em `05_blocks/` (Bloco 01 já criado nesta sessão; os demais serão criados um a um, no início de cada execução futura, seguindo a regra do projeto de não pular direto para implementação sem bloco documentado).
- **Existe um bloco crítico que invalida o resto se removido?** Bloco 1 (Contract) — sem o schema/modelo de filesystem fixado, todos os blocos seguintes reabririam decisões já tomadas na arquitetura. Está claramente marcado como o primeiro e único bloco desta execução.

## 5. Decisões Pendentes

Nenhuma — decomposição fechada para o escopo conhecido hoje. Ajustes de granularidade (ex.: fundir Blocos 5/6) podem ocorrer no início de cada bloco individual, como já é prática normal do projeto.
