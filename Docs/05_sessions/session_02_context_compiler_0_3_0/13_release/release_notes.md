# Release Notes

> Projeto: DDAE · Atualizado em: 2026-08-16

> Diferente do changelog (técnico, granular), release notes são para quem vai usar a mudança — linguagem direta, foco em valor.

## 0. Status desta Entrega

**Target:** `ddae-engine@0.3.0`

**Status:** **PUBLISHED ON NPM — GIT TAG AND GITHUB RELEASE PENDING** — o release candidate preparado pelo Bloco 11 e validado pelo Checkpoint 11.1 já está publicado no registro npm; a publicação foi descoberta fora da sequência de Human Gates documentada no Bloco 12 (nenhum Gate A/B/C havia sido executado neste checkout) e reconciliada com evidência forense no Bloco 13 e no Checkpoint 12.1.

- Publicação no registro npm: **EXECUTADA**. `npm view ddae-engine@0.3.0` retorna metadados reais; `dist-tags.latest = 0.3.0`; publicado em `2026-08-10T01:52:59.338Z`.
- Equivalência de artefato: **PROVADA**. `npm shasum e41ede33157278f700247d3b4f074a141fc2d9b6` e `SHA-256 c332de44979e4069ff93b2e35c3076fdd36aa5c1e5115317893abf9c7982271c` idênticos entre o tarball publicado e o tarball gerado do HEAD local; 106/106 arquivos; `diff -rq` recursivo do conteúdo extraído = 0 diferenças (Bloco 13).
- Canonical release commit: **`0ca3f904be7b292115412dcba27539ac277ad8be`**, provado pelo campo `gitHead` do próprio registro npm (não inferido por timestamp), com o mesmo mecanismo cross-validado contra `v0.2.0` e `v0.1.0` (Checkpoint 12.1).
- Tag `v0.3.0`: **NÃO CRIADA** (local e remoto) — Human Gate B pendente de autorização explícita.
- GitHub Release `v0.3.0`: **NÃO CRIADO** — Human Gate C pendente de autorização explícita.
- `v0.2.0` (tag imutável, `2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9`): **inalterada**.
- Uma tentativa posterior de `npm publish` foi corretamente recusada com `You cannot publish over the previously published versions: 0.3.0` — isto é a garantia de imutabilidade de versão do npm funcionando como projetado, não uma falha de release.
- Stable Host que governa este checkout: **`ddae-engine@0.2.0`** (permanece publicado; promoção para `0.3.0` reservada para depois dos Gates B/C).
- Veredito de versionamento (Bloco 13): `NO NEW RELEASE REQUIRED`, `0.3.1 NOT REQUIRED` — o estado local é byte a byte equivalente ao publicado.

## 1. Destaques

- **Context Compiler** — `ddae-engine context build --goal "<text>" [--session <name>] [--budget minimal|standard|deep]` compila o estado atual do Git, dos arquivos do projeto e da sessão DDAE em um pacote de contexto determinístico (`manifest.json`, `CONTEXT.md`, `validation.json` sob `.ddae/context/`), para que um agente de IA comece uma tarefa lendo um único arquivo em vez de explorar o repositório inteiro. Todo o pipeline é local: zero chamada a LLM, zero acesso a rede, zero embeddings.
- **`ddae-engine context show`** — leitura read-only do `CONTEXT.md` já construído.
- **`ddae-engine context validate`** — verificação de frescor read-only, reportando `VALID` / `STALE` / `INVALID` (exit code `0`/`1`).
- **Sensitive Data Guard** — antes de qualquer conteúdo ser lido, cada arquivo passa por deny-list de nome, limite de tamanho, detecção de binário, containment de path, symlink fail-closed e heurística de conteúdo sensível (`PRIVATE KEY`, `API_KEY=`, `TOKEN=`, `PASSWORD=`, `SECRET=`) — permitindo ingestão segura de texto real do projeto sem exigir curadoria manual prévia.
- **Motor de relevância lexical, goal-driven, orçamento de caracteres** — sem tradução/stemming/sinônimos, sem threshold mínimo de relevância; a exclusão de conteúdo não relacionado acontece por pressão de orçamento, nunca por corte de nota.
- **BUG-01 corrigido** — o template do glossário (`Docs/00_ddae_engine/glossario.md`) agora documenta corretamente, de forma literal, os tokens `{{PROJECT_NAME}}`/`{{CURRENT_DATE}}` em sua tabela de referência, em vez de renderizá-los.
- Validado ponta a ponta contra um consumidor real (código, arquitetura, decisão, bug, validação, documento não relacionado, binário, segredo sentinela) e contra o tarball `ddae-engine-0.3.0.tgz` empacotado e instalado isoladamente — nunca apenas contra o checkout local.
- Zero dependências de runtime ou desenvolvimento preservado (`dependencies`/`devDependencies` continuam vazios).

## 2. Impacto para Usuários Existentes

Nenhuma ação de migração é necessária. Todos os comandos existentes (`init`, `session create`, `block create`, `prompt create`, `feedback create`, `validate`, `audit`) continuam com o mesmo comportamento e a mesma interface — esta é uma release `MINOR` (`0.2.0` → `0.3.0`): capability nova, aditiva, sem quebra de compatibilidade. `ddae-engine context build/show/validate` são comandos inteiramente novos; nenhum projeto existente é afetado até que decida usá-los.

## 3. Conhecidos Problemas / Limitações

- **Structured context completeness (P3, não bloqueante)** — as seções estruturadas do manifesto (`decisions`, `bugs`, `validation`) só são populadas a partir de entrada formalmente estruturada; não há extração automática por NLP a partir de Markdown. Até que um projeto forneça essa entrada estruturada, as seções `## Decisions` / `## Known Bugs` / `## Validation` do `CONTEXT.md` mostram "None recorded.", mesmo quando o conteúdo de decisão/bug/validação correspondente já foi selecionado e está disponível, corretamente rotulado, em `## Relevant Files`. Registrado em `09_validation/validacao_bloco_09_real_consumer_smoke.md`.
- **Heurística de conteúdo sensível é deliberadamente conservadora** — arquivos legítimos que contenham os próprios padrões de detecção como texto/regex/fixture/documentação são excluídos por segurança, mesmo sem conter um segredo real. Risco aceito e documentado (Bloco 08): segurança vence recall nesta versão.
- **Fora de escopo desta versão**: extração semântica/NLP, servidor MCP, integração com Obsidian, Work Packets, sistema de Handoff — reservados para `0.4.0` (ver `Docs/01_product/visao_produto.md`).

## 4. Decisões Pendentes

Nenhuma decisão de produto pendente para o escopo desta release. `npm publish` já ocorreu (ver Status desta Entrega). As decisões operacionais restantes são puramente processuais: criar a tag `v0.3.0` no canonical release commit `0ca3f904be7b292115412dcba27539ac277ad8be` (Human Gate B) e criar o GitHub Release `v0.3.0` (Human Gate C) — cada uma mediante autorização humana explícita e individual, tratada no Bloco 12.
