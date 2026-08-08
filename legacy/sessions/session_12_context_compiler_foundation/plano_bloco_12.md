# Plano — Session 12: Context Compiler Foundation

## 1. Objetivo Geral

Construir a fundação do DDAE Context Compiler: uma camada determinística, offline, auditável e agnóstica de agente, capaz de compilar o estado de Git, projeto e DDAE de um projeto consumidor em um pacote de contexto (`manifest.json` + `CONTEXT.md`) consumível por Claude Code, Codex ou qualquer outro agente de IA — sem chamar nenhuma LLM dentro do próprio compiler.

## 2. Fora de Escopo (toda a sessão)

- `ddae work prepare` / Work Packets (Session 13).
- `ddae handoff` (Session 13).
- Servidor MCP (Session 14).
- Workspace/Vault Obsidian (Session 15).
- Embeddings, banco vetorial, Relevance Engine v2 semântico (Context Engine v2, futuro).
- Chamadas a qualquer LLM/API remota dentro do compiler.
- Adapters específicos por agente.
- Execução automática de código, commit automático, deploy automático.
- Alteração de `package.json.version`/`EXPECTED_VERSION` antes do Bloco 12.

## 3. Ordem e dependências

```text
01 Context Model & Architecture         (contrato — sem dependências)
   │
   ├──▶ 02 Git + Project Collectors     (depende de 01)
   ├──▶ 03 DDAE State Collector         (depende de 01)
   │
   └──▶ 04 Authority & Source Model     (depende de 01; consome os kinds de 02/03)
           │
           ▼
        05 Relevance Engine v1          (depende de 02, 03, 04)
           │
           ▼
        06 Context Manifest + Compiler  (depende de 02–05 — orquestra tudo)
           │
           ▼
        07 Markdown Renderer            (depende de 06 — manifest é a entrada)
           │
           ▼
        08 context build/show/validate  (depende de 06, 07)
           │
           ▼
        09 Sensitive Data Guard         (depende de 02, 06, 08 — atua nos collectors
                                          e é exercitado pelo CLI real)
           │
           ▼
        10 Real Consumer Smoke          (depende de 01–09 completos)
           │
           ▼
        11 Documentation + Release Readiness
           │
           ▼
        12 Release 0.3.0
```

Blocos 02 e 03 podem ser desenvolvidos em qualquer ordem entre si (ambos dependem só do Bloco 01), mas ambos precisam estar concluídos antes do Bloco 05. A ordem acima pode ser refinada durante a execução se a implementação revelar uma dependência objetiva não antecipada aqui — mudanças de ordem devem ser registradas explicitamente na validação do bloco afetado, não silenciosamente.

## 4. Blocos

### Bloco 01 — Context Model & Architecture

**Objetivo:** fechar o contrato completo do Context Compiler antes de qualquer implementação.

**Escopo:** Manifest v1, determinismo, Source Model, Authority Model por domínio, session selection, goal, budget, fingerprint, comportamento de Git (obrigatório vs. degradado), `.ddae/` e política de ignore, segurança/dados sensíveis, contrato de projeto (Docs/ vs. docs/sessions/), contrato de CLI, staleness, versionamento, estrutura de código alvo, schema conceitual do manifesto.

**Fora de escopo:** qualquer implementação em `src/`; `src/context/`, `src/schemas/` não são criados.

**Arquivos previstos:** `docs/sessions/session_12_context_compiler_foundation/{README.md,plano_bloco_12.md,contrato_context_manifest_v1.md,validacao_bloco_01_context_model_architecture.md}`.

**Dependências:** nenhuma.

**Critérios de aceite:**
- [x] Manifest v1 definido (Seção 18 do contrato).
- [x] Contrato de determinismo fechado, sem timestamp no payload canônico.
- [x] Source Model v1 definido com `kind`s previstos.
- [x] Authority Model por domínio definido, rejeitando escala universal ingênua.
- [x] Session selection determinístico definido (`explicit`/`latest_canonical`/`null`).
- [x] Goal contract definido (`context build` exige `--goal`; `show`/`validate` não).
- [x] Budget model definido (`minimal`/`standard`/`deep`, caracteres, tie-break).
- [x] Fingerprint v1 definido (SHA-256, campos incluídos/excluídos, serialização estável).
- [x] Comportamento de Git definido (opção B — degradado com warning).
- [x] Estratégia `.ddae/`/ignore testada empiricamente e decidida.
- [x] Política de segurança/dados sensíveis definida.
- [x] Contrato de CLI (`build`/`show`/`validate`) com inputs/outputs/side effects/falhas/exit.
- [x] Staleness (`VALID`/`STALE`/`INVALID`) definido com códigos estruturados.
- [x] Decisão de versionamento registrada (nenhum bump nesta etapa).
- [x] Zero implementação de runtime confirmada.

**Testes:** não aplicável — bloco documental. Regressão confirmada via `npm test`/`package:check`/`smoke` contra o baseline `0.2.0` inalterado.

**Estratégia de compatibilidade:** nenhum comando existente é tocado; apenas arquivos novos sob `docs/sessions/session_12_.../`.

**Definição de pronto:** os 4 documentos criados, `git diff --name-only`/`--stat` confirmando que somente `docs/sessions/session_12_context_compiler_foundation/` foi alterado, `npm test`/`package:check`/`smoke` verdes contra o baseline, commit e push autorizados explicitamente pelo usuário para este bloco específico.

---

### Bloco 02 — Git + Project Collectors

**Objetivo:** implementar `src/context/git-context.js` e `src/context/project-context.js` conforme o contrato do Bloco 01.

**Escopo:**
- `git-context.js`: branch, HEAD, `origin/<branch>` quando disponível, working tree (`clean`/`dirty`), commits recentes, arquivos modificados/untracked, tags — via `execFileSync('git', [...])`, seguindo o padrão já validado em `scripts/ci/verify-clean-tree.mjs`. Implementa o modo degradado da Seção 10 do contrato (`git.available = false` + warning quando Git ausente ou diretório não é repositório).
- `project-context.js`: detecção de stack (presença de `package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `Dockerfile`, `docker-compose.yml`) e de diretórios convencionais (`src/`, `Backend/`, `Frontend/`, `Tests/`) — apenas detecção, sem compreensão de framework.

**Fora de escopo:** estado DDAE (Bloco 03); relevância (Bloco 05); qualquer escrita em `.ddae/` (isso só acontece no Bloco 06/08, quando o compiler orquestra a escrita real).

**Arquivos previstos:** `src/context/git-context.js` (novo), `src/context/project-context.js` (novo), testes correspondentes.

**Dependências:** Bloco 01 (contrato).

**Critérios de aceite:**
- Coleta de Git funciona em repositório real, limpo e sujo.
- Modo degradado ativa corretamente fora de um repositório Git e quando o binário `git` está ausente do PATH (simulável manipulando `PATH` no processo de teste).
- Nenhum path absoluto no output — apenas dados normalizados (Seção 3 do contrato).
- Detecção de stack funciona contra fixtures sintéticas de múltiplos ecossistemas.

**Testes:** `test/context-git-collector.test.js`, `test/context-project-collector.test.js` — funções puras testadas diretamente, sem depender do CLI.

**Estratégia de compatibilidade:** nenhum comando existente importa esses módulos ainda — zero risco de regressão nos comandos atuais.

**Definição de pronto:** testes verdes; nenhuma regressão em `npm test` completo.

**Resultado:** Bloco concluído — commit técnico `7860bf6`, CI 5/5 (run `31276247468`). Nomes de arquivo de teste ajustados de `test/context-git-collector.test.js`/`test/context-project-collector.test.js` (previstos aqui) para `test/context-git.test.js`/`test/context-project.test.js`, por consistência com o padrão já existente na suíte (`test/cli-init.test.js`, `test/cli-session.test.js`, sem sufixo `-collector`). Um refinamento real de contrato foi descoberto durante a implementação e não estava previsto neste plano: em filesystems case-insensitive (Windows, macOS padrão), checar `docs` e `Docs` separadamente via `lstat` produz falso positivo de dupla detecção quando só um dos dois existe fisicamente; corrigido com verificação de capitalização exata via `fs.realpathSync.native()`, sem introduzir leitura de diretório. Detalhe completo em `validacao_bloco_02_git_project_collectors.md`.

---

### Bloco 03 — DDAE State Collector

**Objetivo:** implementar `src/context/ddae-context.js`.

**Escopo:** coleta de sessão atual (reusando `listSessionDirs`/`parseSessionFolderName`/`nextSessionNumber` de `src/utils/session.js`, nunca duplicando essa lógica), status da sessão, decisões, bugs, resultados de validação, feedbacks — normalizados conforme o Source Model (Seção 4 do contrato).

**Fora de escopo:** relevância (Bloco 05); autoridade (Bloco 04, embora este bloco produza os dados que o Bloco 04 vai classificar).

**Arquivos previstos:** `src/context/ddae-context.js` (novo), testes.

**Dependências:** Bloco 01. Reaproveita utilitários existentes de `src/utils/session.js` — não os duplica.

**Critérios de aceite:**
- Sessão selecionada corretamente conforme Seção 6 do contrato (`explicit`/`latest_canonical`/`null`).
- Nunca confunde módulo interno com sessão.
- Decisões/bugs/validações coletados com `source.path` project-relative.

**Testes:** `test/context-ddae-collector.test.js`.

**Estratégia de compatibilidade:** mesma — nenhum comando existente afetado.

**Definição de pronto:** testes verdes; `npm test` completo sem regressão.

---

### Bloco 04 — Authority & Source Model

**Objetivo:** implementar `src/context/authority.js` conforme o Authority Model por domínio (Seção 5 do contrato).

**Escopo:** classificação de cada source nos domínios definidos (estado do repositório, metadados de pacote/runtime, intenção arquitetural, resultado de teste, estado de bug ativo, intenção futura, história); resolução de conflitos com `winner`/`conflicting_sources` explícitos, nunca descarte silencioso.

**Fora de escopo:** relevância (isso é "o que é importante para o objetivo", diferente de "o que é autoritativo sobre um fato" — Bloco 05).

**Arquivos previstos:** `src/context/authority.js` (novo), testes.

**Dependências:** Blocos 02 e 03 (consome os `kind`s que eles produzem).

**Critérios de aceite:**
- Caso motivador do contrato comprovado por teste: decisão atual aprovada vence roadmap histórico conflitante, com `conflicting_sources` preservando o registro do que foi superado.
- Nenhuma escala numérica universal entre `kind`s é usada internamente.

**Testes:** `test/context-authority.test.js`, incluindo o caso JWT vs. HttpOnly session do contrato como fixture de teste nomeada.

**Definição de pronto:** testes verdes; conflitos sempre rastreáveis, nunca apagados.

---

### Bloco 05 — Relevance Engine v1

**Objetivo:** implementar `src/context/relevance.js` — heurístico, determinístico, sem embeddings.

**Escopo:** extração de termos do `--goal`; pontuação de arquivos/decisões/sources por filename match, path match, referência de sessão, referência de decisão, referência de bug, match de conteúdo, modificação recente em Git; aplicação do budget (Seção 8 do contrato) com tie-break `score DESC, path ASC`.

**Fora de escopo:** qualquer forma de embedding, busca semântica, banco vetorial, dependência nova.

**Arquivos previstos:** `src/context/relevance.js` (novo), testes.

**Dependências:** Blocos 02, 03, 04.

**Critérios de aceite:**
- Mesmo `goal` + mesmo estado produz sempre a mesma pontuação e o mesmo corte por budget (determinismo comprovado por teste rodando o mesmo input múltiplas vezes).
- Critério de pontuação documentado e coberto por teste unitário por critério.
- Corte por budget nunca ultrapassa o `max_chars` do profile ativo.

**Testes:** `test/context-relevance.test.js`.

**Definição de pronto:** testes verdes, incluindo teste de determinismo (múltiplas execuções, mesmo resultado byte-a-byte).

---

### Bloco 06 — Context Manifest + Compiler

**Objetivo:** implementar `src/context/manifest.js`, `src/context/fingerprint.js`, `src/context/compiler.js` e `src/schemas/context-schema.js` — a orquestração completa que produz `manifest.json`.

**Escopo:** implementação real do schema conceitual da Seção 18 do contrato em `src/schemas/context-schema.js` (validação em JS puro, sem lib externa); `compiler.js` orquestra collectors (02, 03) → authority (04) → relevance (05) → serialização estável → fingerprint (Seção 9) → `manifest.json`.

**Fora de escopo:** renderer Markdown (Bloco 07); CLI (Bloco 08); ainda não escreve em `.ddae/` no filesystem do consumidor de forma exposta via comando — a escrita real do pacote de contexto é amarrada ao comando `context build` no Bloco 08, mas a função de compilação em si (retornando o manifesto em memória) é testável já neste bloco.

**Arquivos previstos:** `src/context/manifest.js`, `src/context/fingerprint.js`, `src/context/compiler.js`, `src/schemas/context-schema.js` (todos novos), testes.

**Dependências:** Blocos 02–05.

**Critérios de aceite:**
- `manifest.json` produzido valida contra `context-schema.js`.
- Fingerprint reproduzível: mesmo input → mesmo fingerprint, em execuções separadas.
- `session.id = null` e `git.available = false` aceitos pelo schema como estados válidos.
- Nenhum path absoluto, nenhum timestamp no payload canônico.

**Testes:** `test/context-manifest.test.js`, `test/context-fingerprint.test.js`, `test/context-compiler.test.js`.

**Definição de pronto:** testes verdes; `REQUIRED_SRC_PREFIXES` em `scripts/release/verify-package.mjs` passa a incluir `src/context/` e `src/schemas/` (Seção 16 do contrato — só agora, porque só agora esses diretórios têm conteúdo de produção real).

---

### Bloco 07 — Markdown Renderer

**Objetivo:** implementar `src/context/renderer.js` — função pura de `manifest.json` para `CONTEXT.md`.

**Escopo:** seções fixas e legíveis por LLM (Goal, Project State, Current Session, Architecture, Relevant Files, Decisions, Constraints, Known Bugs, Validation, Out of Scope), derivadas estritamente do manifesto — sem lógica de seleção própria no renderer.

**Fora de escopo:** CLI (Bloco 08).

**Arquivos previstos:** `src/context/renderer.js` (novo), testes.

**Dependências:** Bloco 06.

**Critérios de aceite:**
- `CONTEXT.md` gerado a partir de um `manifest.json` fixo é sempre byte-idêntico entre execuções (mesmo teste de determinismo do Bloco 05, aplicado à renderização).
- Nenhuma seção do Markdown introduz informação ausente do manifesto.

**Testes:** `test/context-renderer.test.js`.

**Definição de pronto:** testes verdes; revisão manual de legibilidade de um `CONTEXT.md` de exemplo.

---

### Bloco 08 — `context build/show/validate` CLI

**Objetivo:** implementar `src/commands/context.js` e integrar ao roteador em `src/cli.js`.

**Escopo:** `contextBuildCommand`, `contextShowCommand`, `contextValidateCommand`, conforme a tabela de contrato da Seção 14; escrita real de `.ddae/context/{manifest.json,CONTEXT.md,validation.json}` e `.ddae/.gitignore` (Seção 11 do contrato) pelo `context build`; `--help` atualizado com os 3 novos comandos.

**Fora de escopo:** guarda de dados sensíveis completa (Bloco 09, embora um guard mínimo já precise estar ativo aqui para não escrever nada sensível durante o desenvolvimento deste bloco).

**Arquivos previstos:** `src/commands/context.js` (novo), `src/cli.js` (roteamento + `--help`), testes de integração via `runCli`.

**Dependências:** Blocos 06, 07.

**Critérios de aceite:**
- `context build --goal "..."` sem repositório Git funciona em modo degradado.
- `context build` sem `--goal` falha com mensagem clara, exit 1.
- `context show` sem build prévio falha com mensagem clara, exit 1.
- `context show`/`context validate` nunca escrevem no filesystem.
- `.ddae/.gitignore` criado automaticamente, mantendo `git status --porcelain` limpo em um projeto consumidor versionado.
- `--help` documenta os 3 comandos novos.

**Testes:** `test/cli-context.test.js`, seguindo o padrão de `test/cli-init.test.js`/`test/cli-session.test.js` (subprocess real via `runCli`).

**Definição de pronto:** testes verdes; `npm run package:check` continua `OK` com os novos arquivos de `src/` empacotados.

---

### Bloco 09 — Sensitive Data Guard

**Objetivo:** implementar `src/context/sensitive-files.js` e integrá-lo aos collectors (02) e ao compiler (06/08).

**Escopo:** deny list de arquivo e heurística de conteúdo (Seção 12 do contrato); realpath containment; proteção contra symlink escapando `PROJECT_ROOT`; exclusão de binário; limite de tamanho de arquivo-fonte (valor definido nesta etapa); prevenção de leitura recursiva do próprio `.ddae/context/`.

**Fora de escopo:** qualquer alteração em `FORBIDDEN_PATTERNS`/`FORBIDDEN_PREFIXES` de `scripts/release/verify-package.mjs` — são listas de escopo diferente (Seção 12 do contrato), não compartilhadas.

**Arquivos previstos:** `src/context/sensitive-files.js` (novo), testes, possivelmente ajuste em `git-context.js`/`project-context.js` para invocar o guard antes de qualquer leitura de conteúdo.

**Dependências:** Blocos 02, 06, 08.

**Critérios de aceite:**
- `.env`, `*.pem`, `*.key`, `id_rsa`, `.npmrc`, `credentials*`, `secrets*` nunca aparecem no conteúdo do contexto compilado, apenas como `excluded_sources` com path, nunca com valor.
- Heurística de conteúdo (`PRIVATE KEY`, `API_KEY=`, `TOKEN=`, `PASSWORD=`, `SECRET=`) pega arquivos que passam pelo filtro de nome mas contêm segredo.
- Symlink escapando `PROJECT_ROOT` nunca é seguido (teste dedicado).
- Arquivo binário nunca é lido como texto.

**Testes:** `test/context-sensitive-guard.test.js` — deliberadamente extenso, dado o custo de uma falha aqui.

**Definição de pronto:** todos os critérios cobertos por teste automatizado; nenhuma falha aceitável nesta área sem correção antes de avançar.

---

### Bloco 10 — Real Consumer Smoke / Agent Workflow

**Objetivo:** provar, com um fixture real, que um agente recebe um pacote de contexto suficiente para iniciar uma feature sem reconstruir manualmente o contexto inteiro.

**Escopo:** `test/fixtures/context-project/` — projeto DDAE consumidor sintético com `Docs/` (sessão, decisão, bug), `src/` (`auth.js`, `users.js`, `audit.js`), `test/` (`audit.test.js`). Objetivo de teste: `"Adicionar auditoria de usuários"`. Verificação de que o contexto compilado inclui `audit.js`, `users.js`, `audit.test.js`, a decisão relevante e o bug relevante — e exclui `logo.png`/roadmap não relacionado/`.env`.

**Fora de escopo:** qualquer integração real com Claude Code ou Codex como processo externo — o smoke valida o pacote de contexto, não a integração com um agente real.

**Arquivos previstos:** `test/fixtures/context-project/**` (novo), `test/context-consumer-smoke.test.js`, possível extensão de `scripts/release/smoke-distribution.mjs` para incluir `context build` na jornada de distribuição real.

**Dependências:** Blocos 01–09 completos.

**Critérios de aceite:** todos os itens de "Acceptance criteria da Session 12" definidos na proposta original do usuário — replicados aqui:
- `context build --goal "..."` gera contexto válido fora dos Docs históricos.
- Contexto registra Git HEAD, branch e working tree.
- Sessão atual identificada corretamente.
- Decisões, bugs e validações relevantes coletados.
- Arquivos relevantes identificados por heurística determinística.
- Todo fato importante possui `source`.
- Hierarquia/modelo de autoridade presente e correto.
- Fingerprint presente e estável.
- `context validate` detecta contexto stale.
- Arquivos sensíveis excluídos automaticamente.
- Nenhuma dependência externa adicionada.
- Windows/Linux/macOS passam.
- Node 22/24/26 passam.
- Comandos atuais permanecem compatíveis.
- `package:check`, smoke e gates de release continuam verdes.

**Testes:** `test/context-consumer-smoke.test.js` + validação manual do `CONTEXT.md` gerado.

**Definição de pronto:** todos os critérios acima comprovados, CI 5/5 verde.

---

### Bloco 11 — Documentation + Release Readiness

**Objetivo:** alinhar `README.md`, `metodologia.md`, `glossario.md`, `folder_schema.md` e `CHANGELOG.md` ao Context Compiler, e preparar a release.

**Escopo:** documentação de produto (não interna) explicando `context build/show/validate`; entrada `[0.3.0]` em `CHANGELOG.md`; revisão final de compatibilidade.

**Fora de escopo:** o bump de versão em si (Bloco 12).

**Arquivos previstos:** `README.md`, `src/templates/docs_root/00_ddae_engine/{metodologia.md,glossario.md,folder_schema.md}` (se o Context Compiler for exposto como parte do scaffold gerado — a decidir durante o bloco), `CHANGELOG.md`.

**Dependências:** Bloco 10.

**Critérios de aceite:** documentação sem referência residual a comportamento não implementado; `CHANGELOG.md` `[0.3.0]` completo e preciso.

**Testes:** `npm test`/`package:check`/`smoke` finais antes da release.

**Definição de pronto:** documentação revisada, pronta para o bump de versão.

---

### Bloco 12 — Release 0.3.0

**Executado somente após autorização humana explícita e separada, seguindo o mesmo padrão de gates graduais da Session 11 (05A–05E).**

**Objetivo:** publicar `ddae-engine@0.3.0` de forma rastreável.

**Escopo:** bump de `package.json.version` e `EXPECTED_VERSION` para `0.3.0`; atualização de `REQUIRED_SRC_PREFIXES` se ainda pendente; commit, push, CI verde; tag `v0.3.0`; publicação `npm publish`; verificação independente do registro (mesmo padrão do Bloco 05D da Session 11); GitHub Release.

**Fora de escopo:** qualquer nova funcionalidade; início da Session 13.

**Dependências:** Bloco 11 aprovado; CI verde; autorização humana específica para este bloco, gate por gate.

**Critérios de aceite:** mesmo padrão de verificação independente (hash, `npm view`, instalação isolada) já estabelecido na Session 11 — nenhuma claim de sucesso aceita sem evidência correspondente.

**Definição de pronto:** `0.3.0` publicada e verificada; tag `v0.3.0` imutável; `v0.2.0` permanece intocada.

## 5. Estratégia de testes (visão geral)

Cada bloco de implementação (02–10) adiciona seu próprio arquivo de teste `node:test`, seguindo o padrão já estabelecido: funções puras testadas diretamente sem tocar o filesystem quando possível (mesmo padrão de `checkMetadata`/`checkRequiredFiles` em `verify-package.mjs`), testes de integração de CLI via `runCli`/`makeTempDir` de `test/helpers.js`, e um smoke real de consumidor (Bloco 10) como prova final. Nenhum framework de teste novo é introduzido — `node:test` continua sendo o único executor.

## 6. Estratégia de compatibilidade

`context` é um namespace inteiramente novo e aditivo. Nenhum bloco desta sessão modifica o comportamento de `init`, `session`, `block`, `prompt`, `feedback`, `validate` ou `audit`. Um projeto scaffolded sob `0.2.0` continua idêntico sob `0.3.0`.

## 7. Estratégia de release

`package.json.version` e `EXPECTED_VERSION` permanecem `0.2.0` até o Bloco 12. A tag `v0.2.0` e o pacote `ddae-engine@0.2.0` publicado são tratados como imutáveis durante toda a Session 12. A release `0.3.0` segue o mesmo padrão de gates explícitos, graduais e verificados independentemente já validado na Session 11.
