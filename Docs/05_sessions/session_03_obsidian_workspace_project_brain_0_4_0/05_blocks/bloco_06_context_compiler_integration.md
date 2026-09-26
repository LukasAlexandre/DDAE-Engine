# Bloco 06 — context compiler integration

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-26

> **Status: PREPARADO — NÃO INICIADO.** Este documento especifica o bloco a partir do código real do Context Compiler (`0.3.0`) e do Renderer (Bloco 04), não do planejamento de 2026-08-16. Há 3 decisões abertas (Seção 12) que exigem aprovação do usuário antes de qualquer código. Nenhum arquivo de produção foi tocado.

## 1. Objetivo

Expor, em uma nova view `DDAE-Brain/Context-Packages.md`, o estado do Context Compiler (`.ddae/context/`) já produzido pela `0.3.0` — status VALID/STALE/INVALID e metadados do último `context build` — **reutilizando** as funções existentes (`validateContextState`, o próprio Manifest v1 do Context Compiler), nunca reimplementando lógica de frescor, nunca duplicando o Context Compiler, e nunca copiando conteúdo de arquivo para dentro do Brain.

## 2. Contexto

Sexto bloco da `0.4.0`. Segundo `04_planning/mapa_dependencias.md`, depende apenas do Bloco 04 (Renderer) — **inalterado pelo Amendment 1/Bloco 05**: confirmado por leitura, nada em `DT-03` ou no Bloco 05 introduz uma dependência nova. É paralelizável com o Bloco 05 (ambos só dependem do Bloco 04); como o Bloco 05 já foi executado, este bloco parte de um estado mais recente (`d5149bc`), sem contradição.

O contrato (Seção C) já classifica duas entidades ligadas a este bloco: **"Important Files"** (`DERIVED, condicional a .ddae/context/manifest.json existir`) e **"Context Packages"** (`DERIVED — status via context validate existente, nunca recomputado pelo Brain`). A Seção D, porém, só define **um** arquivo gerado para isso: `DDAE-Brain/Context-Packages.md`. Achado desta preparação (Seção 5): **"Important Files" não é uma view própria — é uma seção dentro de `Context-Packages.md`.** Não há `Important-Files.md` em nenhum lugar do contrato.

## 3. Problema que Este Bloco Resolve

Hoje, quem quer saber "existe um Context Package construído? está atualizado?" precisa rodar `ddae-engine context validate` na linha de comando. O Project Brain (as 7 views do Bloco 04) não menciona o Context Compiler em nenhum lugar — `Home.md` nem linka para a view (deliberadamente, Bloco 04: "evita link quebrado até o Bloco 06"). Sem este bloco, a promessa da Seção C do contrato ("Context Packages: Exibido... nunca recomputado pelo Brain") fica sem implementação, e a integração entre as duas features fica invisível para o humano navegando o Brain.

## 4. Estado Herdado (o que já existe, não reinventar)

Auditado diretamente contra `src/context/**`, `src/commands/context.js`, `src/schemas/context-schema.js`:

- **Pipeline real do Context Compiler:** `collectGitContext`/`collectDdaeContext` (coleta) → `collectSafeProjectSources` (Sensitive Data Guard, único ponto que lê conteúdo de arquivo) → `compileContext` (`src/context/compiler.js`, pura: authority + relevância + Manifest v1 + fingerprint) → `renderContextMarkdown` (pura) → `context build` (`src/commands/context.js`) escreve `.ddae/context/{manifest.json, CONTEXT.md, validation.json}` (únicos pontos de escrita).
- **`.ddae/context/validation.json`** é um **recibo de build-time**: `{ schema_version, status, fingerprint, reasons }`, escrito apenas por `context build` (sempre `VALID` no momento em que é escrito — é o snapshot de quando o pacote foi criado, não um monitor contínuo).
- **`.ddae/context/manifest.json`** é o Context Manifest v1 completo (`stableStringify`, uma linha de JSON): `schema_version`, `compiler {name, contract_version, engine_version}`, `project {name, root_kind}`, `goal {text, normalized, hash}`, `session {id, path, selection_reason}`, `budget {profile, max_chars}`, `git {available, repository, branch, head, working_tree}`, `sources[]`, `relevant_files[]` (cada um com `source_id`, `path`, `content` — **o texto real do arquivo**, `score`, `char_cost`), `excluded_sources[]`, `decisions/constraints/bugs/validation[]` (claims), `conflicts[]`, `fingerprint {algorithm, value}`.
- **`validateContextState({manifest, contextMarkdown, currentGitContext, currentDdaeContext, currentSourceHashes})`** (`src/context/validator.js`) é a **única** lógica de frescor que existe — pura, já testada, usada tanto por `context build` quanto por `context validate`. Retorna `{status: 'VALID'|'STALE'|'INVALID', reasons: [{code, ...}]}`. Motivos possíveis, todos códigos estruturados sem conteúdo livre: `MANIFEST_INVALID`, `SCHEMA_VERSION_MISMATCH`, `GOAL_HASH_CHANGED`, `FINGERPRINT_MISMATCH`, `CONTEXT_MARKDOWN_MISMATCH`, `GIT_HEAD_CHANGED`, `SESSION_SOURCE_CHANGED`, `SOURCE_FRESHNESS_UNVERIFIED`, `SOURCE_CONTENT_CHANGED`. Com `currentSourceHashes = null`/ausente e `relevant_files.length > 0`, o resultado é sempre `STALE` com `SOURCE_FRESHNESS_UNVERIFIED` — **nunca** um falso `VALID` (`checkSourceFreshness`, `src/context/validator.js`).
- **Presets** `minimal`/`standard`/`deep` existem em `BUDGET_PROFILES` (`src/context/relevance.js`) — cada um com `max_chars`; `manifest.budget.profile`/`max_chars` registra qual foi usado no último build.
- **Sensitive Data Guard:** já filtrou todo conteúdo antes de ele existir no Manifest/`CONTEXT.md` — mas o **conteúdo em si** (`relevant_files[].content`, texto de arquivo real, possivelmente extenso) permanece no Manifest e no `CONTEXT.md`. Isso nunca deve ser copiado para dentro do Brain (Seção 9).
- **Renderer do Brain (Bloco 04):** puro sobre o Brain Manifest v1; `Home.md` não linka `Context-Packages.md`; nenhuma dependência do Context Compiler hoje.

## 5. Mapeamento do Escopo Original × Estado Real

| Item do plano original (`plano_execucao.md`, 2026-08-16) | Classificação |
|---|---|
| "Leitura read-only de `.ddae/context/manifest.json` quando presente" | **Ainda necessário** — é o núcleo deste bloco. |
| Popular "Important Files" | **Realizado como seção, não como view própria** — o contrato Seção D não define `Important-Files.md`; vira a seção "Important Files" dentro de `Context-Packages.md` (Seção 8 abaixo). |
| Popular "Context Packages" | **Ainda necessário** — seção "Status" da mesma view. |
| Dependência: Bloco 4 | **Confirmada, inalterada** por `DT-03`/Bloco 05 (Seção 2). |
| "Frontmatter para Graph View" (falava do Bloco 05, não deste) | **Não aplicável aqui** — já decidido (Bloco 05): não usado no v1. |
| Kernel de freshness compartilhado (`context/validator.js` ↔ `workspace/validator.js`, `ID-07`) | **Fora de escopo, não obsoleto** — continua atribuído ao Bloco 07, agora com um segundo uso real (este bloco reutiliza `validateContextState` diretamente, não cria um segundo algoritmo) para informar essa extração futura. |

Nenhum item do escopo original foi descartado; nenhum trabalho artificial foi adicionado.

## 6. Princípio Central

```text
Context Compiler (0.3.0)          Project Brain (0.4.0)
= gera/representa contexto        = representa estado do projeto
  para agentes                      para humanos

Relação: reuse / projection / navigation — nunca duplicate / fork / reimplement.
```

`src/context/**` permanece **inteiramente intocado** por este bloco (só importado). O Context Compiler nunca depende do Brain — `context build/show/validate` continuam funcionando de forma idêntica se o Workspace nunca foi inicializado (nenhuma dependência circular).

## 7. Knowledge × Memory × Context (DT-02)

O Context Compiler consome exclusivamente **Knowledge** (Git, `Docs/`, sessão) — nenhum Persistent Memory Provider existe hoje. Este bloco projeta esse estado de Knowledge (via Context Compiler) para dentro do Project Brain, que também é uma projeção de Knowledge. **Nenhuma Memory, Claude-Mem, MemoryProvider, Context Budget runtime, embeddings, LLM ou rede** entram neste bloco — reafirmado explicitamente porque é o bloco mais próximo, em nome, do assunto da ADR (`adr_knowledge_memory_context.md`), mas seu escopo é zero relacionado a memória persistente.

## 8. `Context-Packages.md` — Contrato da View

### 8.1 O que representa

Duas seções, nesta ordem, sempre presentes (mesmo vazias):

1. **Status** — existe um Context Package? Se sim: `status` (VALID/STALE/INVALID), `reasons` (códigos estruturados, sem prosa livre), `schema_version`, `compiler.engine_version`, `budget.profile`/`max_chars`, `fingerprint.value`, contagem de `sources`/`relevant_files`/`excluded_sources`.
2. **Important Files** — os `relevant_files[].path` do último build, com `score`/`char_cost`, **nunca `content`**. Path apenas (inline code), sem link (Seção 12.3).

### 8.2 O que NUNCA contém

- `relevant_files[].content` (texto de arquivo real) — nunca, em nenhuma circunstância.
- `manifest.goal.text`/`goal.normalized` (texto livre digitado pelo usuário em `context build --goal`) — pode conter informação de negócio arbitrária; nunca extraído verbatim para uma view sempre-visível.
- `excluded_sources[].reason` detalhado além do necessário para status (os motivos de exclusão por relevância já são visíveis via `context show`; aqui só a contagem).
- Qualquer prosa de `manifest.decisions/constraints/bugs/validation` (claims) — são dados do próprio Context Compiler para consumo de agente, não do Brain.
- Path absoluto de máquina, backslash, dotfolder na saída.

### 8.3 Fonte dos dados

`.ddae/context/manifest.json` e `.ddae/context/validation.json`, lidos como **arquivos de máquina já existentes** (nunca escritos, nunca modificados por este bloco). Ver arquitetura (Seção 9) para o desenho exato de onde essa leitura acontece.

### 8.4 Path

`DDAE-Brain/Context-Packages.md` — sob `BRAIN_DIR` (reexportado de `renderer.js`, nunca redefinido).

## 9. Arquitetura Proposta

```text
Docs / Git ──► Discovery ──► Snapshot ──► Compiler ──► Brain Manifest v1 ──► Renderer ──┐
                                                                                          ├─► [{path, content}] × 8 ──► [Bloco 08 escreve]
.ddae/context/{manifest.json, validation.json} ──► Context Package Collector ──► Context Package State ──► Context Packages Projector ─┘
                                                         (I/O, novo)              (dado puro)                    (pura, nova)
```

**Duas cadeias de produção paralelas e desacopladas**, unidas só pelo futuro Orchestrator (Bloco 08) — nunca uma dentro da outra:

- **Cadeia do Brain** (Blocos 02–04, inalterada): Discovery → Compiler → Schema → Fingerprint → Renderer → 7 views.
- **Cadeia do Context Package** (este bloco, novo, independente): Collector (I/O) → Projector (puro) → 1 view.

`renderBrainWorkspace` (Bloco 04) **não muda de assinatura** e **não lê** `.ddae/context/`. `compileBrainManifest`/Brain Manifest v1 **não muda** — Context Packages não entra em `entities` nem em nenhum campo do Manifest (Decisão resolvida, Seção 11).

### 9.1 Módulo previsto

`src/workspace/context-packages.js` (novo, único arquivo de produção), com dois exports, seguindo a mesma separação já usada em `discover.js`/`renderer.js` — coleta (I/O) e projeção (pura) no mesmo arquivo, como o próprio Discovery já faz para múltiplas entidades:

- `collectContextPackageState(projectRoot)` — **I/O**: verifica existência de `.ddae/context/manifest.json`; se ausente, retorna `{ exists: false }`. Se presente, faz `JSON.parse` (captura erro → estado `corrupt`); coleta `collectGitContext(projectRoot)`/`collectDdaeContext(projectRoot)` (leves, sem Sensitive Data Guard) e chama `validateContextState({ manifest, contextMarkdown: undefined, currentGitContext, currentDdaeContext, currentSourceHashes: null })` — **reutilizado, nunca reimplementado**; `currentSourceHashes: null` é uma escolha deliberada (Decisão resolvida, Seção 11.2), nunca lê conteúdo de arquivo do projeto. Devolve um objeto de dados simples e congelado (nunca o Manifest inteiro — só os campos da Seção 8.1/8.2 permitidos).
- `renderContextPackagesView(state)` — **pura**: `state` → `{ path: 'DDAE-Brain/Context-Packages.md', content }`. Mesma disciplina do Renderer do Bloco 04 (marcador de arquivo gerado, LF, uma newline final, sem frontmatter, inline code para todo dado, link de volta a Home). Reexporta `BRAIN_DIR` de `renderer.js`, não redefine.

### 9.2 Por que não em `renderer.js`

`renderBrainWorkspace` só aceita Brain Manifest v1 como entrada — introduzir um segundo tipo de entrada (Context Package State) quebraria essa garantia de pureza sobre um único contrato e obrigaria `renderer.js` a saber sobre `.ddae/context/`, violando a separação de responsabilidades que os Blocos 02–04 já estabeleceram (accoplamento proibido pela Seção 16 do prompt de preparação). Um módulo irmão, mesma pasta (`src/workspace/`), resolve sem tocar no que já existe e sem inventar abstração especulativa (nenhuma pasta `integrations/`, nenhum `context-service.js`).

## 10. Authority / I/O Boundary

- **Acoplamento:** unidirecional. `src/workspace/context-packages.js` importa de `src/context/**` (`validateContextState`, `collectGitContext`, `collectDdaeContext` — já reaproveitados por `discover.js`, sem alteração). `src/context/**` nunca importa nada de `src/workspace/**`.
- **Authority:** Context Package State é `DERIVED`/`non-authoritative`/`recomputable` — nunca uma segunda fonte de verdade. Hierarquia inalterada: `Docs/`+Git → Context Compiler state → Project Brain projection (DT-01, DT-02). `Context-Packages.md` nunca é lido como entrada por nenhum comando DDAE — mesma regra já aplicada a `.ddae/brain/`/`DDAE-Brain/` no geral.
- **I/O boundary:** todo I/O deste bloco vive em `collectContextPackageState` — mesmo padrão que separa `discover.js` (I/O) de `renderer.js` (puro). `renderContextPackagesView` nunca acessa filesystem/rede/relógio.

## 11. Decisões Resolvidas Nesta Preparação

1. **Context Packages não entra no Brain Manifest v1.** É um producer independente (contrato B.1: "o produtor de `Context-Packages.md` declara seu próprio path"), não uma entidade de `manifest.entities`. Nenhuma alteração a `brain-schema.js`/`compiler.js`/`fingerprint.js`.
2. **Frescor reutiliza `validateContextState` sem reverificar conteúdo de arquivo** (`currentSourceHashes: null`). Reusa 100% da lógica existente (zero duplicação); quando há `relevant_files`, o resultado nunca é um falso `VALID` — degrada para `STALE`/`SOURCE_FRESHNESS_UNVERIFIED`, o comportamento seguro já embutido no validador. Evita adicionar ao Brain uma segunda passada pela Sensitive Data Guard só para exibir status.
3. **"Important Files" é uma seção de `Context-Packages.md`, não uma view própria** (Seção 5) — o contrato Seção D não define `Important-Files.md`.
4. **Nenhum link para `.ddae/context/`** (dotfolder — mesmo problema que motivou `DT-03`). Quando o usuário precisar do conteúdo completo, a view instrui rodar `ddae-engine context show`/`context validate` (texto, não link).
5. **`Home.md` ganha o 8º link de navegação** para `Context-Packages.md`, e a nova view linka de volta a Home — mudança pontual e prevista em `renderer.js` (a lista estática de navegação, não a lógica de dados), justificada porque o Bloco 04 deixou esse link deliberadamente de fora só até este bloco existir.

## 12. Decisões Abertas — Requerem Aprovação do Usuário

1. **[Importante] Escopo de conteúdo: metadata-only está correto?** Proposta desta preparação: `Context-Packages.md` mostra apenas status/metadados/paths de `relevant_files` (Seção 8.1), nunca `goal.text` nem `content`. Alternativa rejeitada por padrão: incluir um resumo do `goal` (poderia ser útil para navegação, mas é texto livre do usuário, potencialmente sensível a negócio) — se aprovado, entraria como campo adicional explícito, não por inferência.
2. **[Importante] Congelar `collectContextPackageState`/`renderContextPackagesView` como a API deste bloco?** Nomes e assinatura propostos (Seção 9.1) — confirmar antes de qualquer teste, já que TDD parte deles.
3. **[Confirmação] Adicionar o link de `Home.md` para `Context-Packages.md` neste bloco** (Seção 11.5), tocando `renderer.js` pontualmente (só a lista estática, sem novo input) — ou adiar essa mudança para o Bloco 08 (Orchestrator), quando todos os 8 paths estiverem unificados. Recomendação: fazer aqui, já que `BRAIN_RENDERER_VIEW_PATHS` continua declarando só as 7 views do Bloco 04 (inalterado) e o link é estático.

## 13. Non-Goals (Fora de Escopo)

- Reimplementar qualquer parte do Context Compiler (`compileContext`, `rankRelevantSources`, `renderContextMarkdown`, `validateContextState`) — sempre importado, nunca copiado.
- Alterar `src/context/**` de qualquer forma.
- Alterar Brain Manifest v1 (`brain-schema.js`, `compiler.js`, `fingerprint.js`) além de nada — Context Packages não é uma entidade do Manifest (Decisão 1).
- `manifest.views`, parâmetro `views` do Compiler, Orchestrator, Writer/CLI, `workspace init`, `.gitignore` — Bloco 08.
- Kernel de freshness compartilhado (`ID-07`) — Bloco 07; este bloco só **usa** `validateContextState` como está.
- Defesa em profundidade do Schema (`isProjectRelativePath`) — P4 do Bloco 05, destino Bloco 07; não absorvido aqui.
- Hardening adicional de path/link além do que `Context-Packages.md` precisa (sem link nenhum para arquivo externo nesta view — Seção 11.4) — RS-03/04 (Obsidian Sync/Publish) permanecem do Bloco 09.
- Histórico de builds de contexto — a view mostra o **estado atual** do último `.ddae/context/`, nunca um log de builds anteriores (Seção 19 do prompt de preparação).
- Token telemetry, Context Budget runtime, Claude-Mem, MemoryProvider, MCP, embeddings, LLM, rede.
- Plugin Obsidian, frontmatter, wikilinks, Dataview.

## 14. Interface Futura com o Bloco 08

O Orchestrator (Bloco 08) precisará, no mínimo:

```text
allViews = [...renderBrainWorkspace(brainManifest), renderContextPackagesView(contextPackageState)]
```

- `renderContextPackagesView` já devolve `{path, content}` no mesmo formato de `renderBrainWorkspace` — nenhuma adaptação extra prevista.
- O path declarado (`DDAE-Brain/Context-Packages.md`) entra na união de `views` que o Bloco 08 passará ao Compiler (`Compiler(snapshot, {engineVersion, views})`) — não implementado aqui, só a interface é mapeada.
- `collectContextPackageState` é chamado pelo Orchestrator (camada que já faz I/O), nunca pelo Renderer do Brain.

**O que não será antecipado:** o parâmetro `views` do Compiler, o Writer, `workspace build/init`, e qualquer decisão sobre ordem de execução dos vários collectors no Bloco 08 — ficam inteiramente para lá.

## 15. Estratégia de Testes (TDD) — Não Implementado Nesta Preparação

Estimativa: 18–22 testes, em `test/workspace-context-packages.test.js` (novo arquivo — testa um módulo novo, ao contrário do Bloco 05 que estendeu o arquivo existente).

Cenários previstos:

1. `.ddae/context/` ausente → `{ exists: false }`; view renderiza estado vazio determinístico.
2. `.ddae/context/manifest.json` presente e válido, git/ddae atuais batendo → `VALID`.
3. `git.head` divergente → `STALE`, `GIT_HEAD_CHANGED`.
4. Sessão divergente (`SESSION_SOURCE_CHANGED`).
5. `relevant_files` não vazio → sempre `STALE`/`SOURCE_FRESHNESS_UNVERIFIED` (nunca falso VALID) — decisão 11.2.
6. `manifest.json` não é JSON válido → estado `corrupt`/`INVALID`, sem exceção não tratada.
7. `schema_version` incompatível → `INVALID`, `SCHEMA_VERSION_MISMATCH`.
8. `validation.json` ausente mas `manifest.json` presente → não bloqueia (o receipt é informativo, não obrigatório).
9. `validation.json` corrompido → degrada, não lança.
10. Renderização determinística: mesmo estado → mesma saída byte a byte.
11. `collectContextPackageState` não muta nada, não escreve nada.
12. `renderContextPackagesView` é pura: sem `fs`/rede/relógio/aleatoriedade (guarda de código-fonte).
13. Nenhum path absoluto/dotfolder na saída.
14. `relevant_files[].content` nunca aparece na saída, mesmo que presente no manifesto de entrada.
15. `goal.text`/`goal.normalized` nunca aparecem na saída.
16. Marcador de arquivo gerado presente; LF; uma newline final (mesmo padrão do Bloco 04/05).
17. Link de volta a `Home.md`; nenhum link para `.ddae/context/`.
18. `Important Files` lista paths + score/char_cost, sem link, sem conteúdo.
19. Nenhuma referência a Claude-Mem/MemoryProvider no código-fonte.
20. Integração: `Home.md` (Renderer do Bloco 04) passa a linkar `Context-Packages.md` e vice-versa — grafo de navegação de 8 views simétrico (estendendo o teste 51 do Bloco 05).
21. Integração de ponta a ponta em projeto temporário: roda um `context build` real (via `compileContext`/escrita manual dos 3 arquivos, sem invocar o CLI) → `collectContextPackageState` → `renderContextPackagesView` → `VALID` e conteúdo correto.
22. Self-host: `collectContextPackageState(REPO_ROOT)` contra o estado real deste repositório (existe ou não `.ddae/context/` localmente — ambos os casos devem funcionar sem exceção).

## 16. Estratégia de Self-Host

O self-host do próprio DDAE pode ou não ter `.ddae/context/` construído localmente no momento da execução (é gitignored). O teste de self-host (Seção 15.22) precisa cobrir **ambos os casos** sem assumir qual está presente — nunca falhar por dependência de estado externo ao teste. Se quiser uma prova positiva de `VALID`/`STALE` real, o próprio teste de integração (15.21) constrói um Context Package sintético em diretório temporário, sem depender de `context build` já ter rodado no ambiente de CI.

## 17. Riscos

- **Vazamento de conteúdo de arquivo:** mitigado por design — o Projector nunca lê/repassa `relevant_files[].content`; teste dedicado (15.14) garante isso mesmo que o manifesto de teste contenha conteúdo de propósito.
- **Vazamento do texto do goal:** mitigado (Decisão 12.1, teste 15.15).
- **Duplicar a lógica de frescor:** mitigado — `validateContextState` é importado, não reescrito (teste 15.19 confirma ausência de reimplementação via guarda de código, análogo ao já usado nos Blocos 03–05).
- **Acoplar `renderer.js` a `.ddae/context/`:** mitigado pela arquitetura de duas cadeias (Seção 9); `renderer.js` só ganha uma linha estática de link, nunca uma leitura nova.
- **Link para dotfolder reabrindo o problema do `DT-03`:** mitigado (Decisão 11.4 — nunca linkado).

## 18. Critérios de Aceite

- [ ] As 3 Decisões Abertas (Seção 12) aprovadas antes do código.
- [ ] `Context-Packages.md` gerado com as seções Status e Important Files, sempre presentes (mesmo vazias).
- [ ] `relevant_files[].content` e `goal.text`/`goal.normalized` nunca aparecem na saída, em nenhum estado.
- [ ] Estado ausente/corrupto/`INVALID`/`STALE`/`VALID` todos determinísticos e sem exceção não tratada.
- [ ] `validateContextState` reutilizado sem reimplementação; `currentSourceHashes` nunca acionado (Decisão 11.2).
- [ ] `src/context/**` inalterado.
- [ ] Brain Manifest v1 (`brain-schema.js`, `compiler.js`, `fingerprint.js`) inalterado.
- [ ] `renderer.js` alterado apenas na lista estática de navegação de `Home.md` (mais o link de volta na nova view), nunca em lógica de dados.
- [ ] Nenhum link para `.ddae/context/`; nenhum path absoluto/dotfolder na saída.
- [ ] Nenhuma referência a Claude-Mem/MemoryProvider/rede/LLM/relógio/aleatoriedade no código novo.
- [ ] Regressão completa verde.

## 19. Definition of Done

Decisões abertas aprovadas; `context-packages.js` implementado em TDD; `Home.md` linkando a nova view e vice-versa; testes da Seção 15 implementados e verdes; nenhuma regressão; feedback e validação do bloco preenchidos; README da Session atualizado; commit único aprovado pelo usuário.

## 20. Dependências

- Bloco 04 (Renderer) — concluído, aprovado (`d8e5604`). Único bloco do qual este depende tecnicamente (`mapa_dependencias.md`, confirmado inalterado pelo Bloco 05).
- Context Compiler (`0.3.0`, `session_02_context_compiler_0_3_0`) — estável, publicado, reaproveitado sem modificação.
- Nenhuma dependência externa nova.

## 21. Pendências Esperadas

- P4 — kernel de freshness compartilhado entre `context/validator.js` e `workspace/validator.js` (`ID-07`) — agora com dois usos reais (`context validate` e este bloco) para guiar a extração no Bloco 07.
- P4 — "Important Files" sem link clicável (Decisão 11.4/12.3) — se o valor de navegação se mostrar insuficiente em uso real, revisar no Bloco 09 com hardening de link próprio para paths fora de `Docs/`.
- P4 — Lacuna de defesa em profundidade do Schema (herdada do Bloco 05) — inalterada, destino Bloco 07.
- P3/P4 herdadas (ordenação de tags, `recent_changes` sem recência, entidades sem `status`) — inalteradas.

## 22. Feedback Obrigatório

_Ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_06_context_compiler_integration --session session_03_obsidian_workspace_project_brain_0_4_0`. Sem feedback preenchido, o bloco não está concluído._

## 23. Commit Semântico Sugerido

```
feat(workspace): add context compiler integration view
```

_Nunca executado automaticamente — exige confirmação explícita do usuário. Se o resultado real for majoritariamente testes com pouco código, `test(...)` pode ser mais apropriado, a decidir no fechamento do bloco._
