# Levantamento Inicial

> Projeto: DDAE · Atualizado em: 2026-08-08

> Preencha isto antes de planejar blocos. O objetivo é capturar o que se sabe (e o que não se sabe) antes de comprometer um plano de execução.

## 1. Contexto

DDAE self-hosting: o DDAE-Engine deve ser capaz de consumir os mesmos contratos, sessões, validações e workflows que oferece a projetos consumidores. Esta sessão é a materialização física dessa propriedade — não apenas ter `ddae-engine` instalado dentro do próprio repositório, mas ser efetivamente governado por uma release pública estável dele.

**Stable Host:** `ddae-engine@0.2.0`, instalado local e efemeramente via `npm install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund`, em `node_modules/ddae-engine/` — nunca persistido em `package.json`, nunca versionado (coberto por `.gitignore`). Binário: `node node_modules/ddae-engine/bin/ddae-engine.js`.

**Candidate:** o checkout atual do repositório em desenvolvimento — `bin/`, `src/`, `test/`, `scripts/`. Binário: `node bin/ddae-engine.js`. Baseline no momento da criação desta sessão: commit `e0fbd5386bd0b09d02d97ad0f279b9ceb46a1751`.

**Legacy history (imutável):** `docs/sessions/` — sessões `session_00_framework_base` até `session_13_ddae_self_hosting_bootstrap`, incluindo `docs/sessions/session_12_context_compiler_foundation/` (Bloco 01 aprovado, Checkpoint 01.1 aprovado, Bloco 02 aprovado, Bloco 03 não iniciado — pausada em favor deste bootstrap).

**Canonical control plane:** `Docs/05_sessions/` (fisicamente o mesmo nó que `docs/` no Windows, por case-insensitivity — `sessions/` e `05_sessions/` são subdiretórios distintos, sem colisão). Esta é a primeira sessão desse namespace, criada pelo Stable Host.

## 2. Necessidades Levantadas

- Provar, com evidência física (paths distintos, hashes de `package.json` antes/depois, CI 5/5), que uma release pública real do DDAE governa a criação de sessões no próprio repositório — não apenas o checkout executando seu próprio código corrente.
- Preservar o histórico interno (`docs/sessions/`) sem migração, renumeração ou exclusão.
- Persistir o roadmap de produto (`0.3.0` Context Compiler, `0.4.0` Obsidian Workspace / Project Brain) em um documento canônico do próprio scaffold, não apenas na conversa entre usuário e agente.

## 3. Perguntas Abertas

- Onde exatamente o roadmap de produto deve ser registrado dentro de `Docs/01_product/` — qual documento do scaffold oficial é o canônico para essa informação? Resolvido nesta mesma sessão (ver `Docs/01_product/visao_produto.md`).
- O Stable Host `0.2.0` validará (`validate`/`audit`) o próprio repositório sem erro estrutural, dado que o repositório agora contém tanto `docs/sessions/` (legacy) quanto `Docs/05_sessions/` (canônico) sob o mesmo nó físico? Fica para o Bloco 04.

## 4. Fontes Consultadas

- `docs/sessions/session_13_ddae_self_hosting_bootstrap/contrato_self_hosting_v1.md` (contrato de self-hosting, corrigido no Checkpoint 01.1).
- `docs/sessions/session_13_ddae_self_hosting_bootstrap/validacao_bloco_02_stable_host_collision_scaffold.md` (evidência da instalação do Stable Host e do merge seguro do scaffold).
- `docs/sessions/session_12_context_compiler_foundation/README.md` (estado pausado do Context Compiler legacy).
- `node node_modules/ddae-engine/bin/ddae-engine.js --help` (sintaxe real de `session create` na release 0.2.0, consultada antes de executar o comando).

## 5. Primeiras Hipóteses de Escopo

Esta sessão cobre apenas o bootstrap: criação da sessão canônica e registro do roadmap. A validação formal (`validate`/`audit` via Stable Host) e o fechamento do bootstrap ficam para os blocos seguintes da sessão legacy de transição (`docs/sessions/session_13_.../`), que continua orquestrando este processo até ele ser dado como concluído.

## 6. Decisões Pendentes

Nome definitivo da próxima sessão canônica que retomará o Context Compiler (`session_02_context_compiler_0_3_0` é o nome provisório registrado no README desta sessão) — confirmado apenas quando essa sessão for de fato criada.
