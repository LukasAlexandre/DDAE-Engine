# Bloco 04 — project brain workspace renderer

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-26

> **Status: PREPARADO — NÃO INICIADO.** Este documento especifica o bloco para revisão. Nenhum código do Renderer foi escrito. **Atualizado pelo Amendment 1 do contrato (`DT-03`, 2026-09-26):** root das views = `DDAE-Brain/` (não mais `.ddae/brain/`), links Markdown relativos, marcador de arquivo gerado no contrato, ownership de `manifest.views` congelado. As três decisões pendentes anteriores estão resolvidas (Seção 20).

## 1. Objetivo

Implementar `renderBrainWorkspace(manifest)`: uma função pura que transforma um Brain Manifest v1 em um **mapa de arquivos Markdown em memória** (`Home.md` + as views de índice definidas no contrato), sem escrever em disco.

## 2. Contexto

Quarto bloco da `0.4.0`. Segue `04_planning/plano_execucao.md` (ordem 4: "`renderer.js` — Manifest → `Home.md` + views de índice, função pura") e `04_planning/mapa_dependencias.md` (depende do Bloco 03). Requisito `RF-01`; decisões `DT-01` e `DT-02`. Padrão de referência: `src/context/renderer.js` (função pura, valida o manifesto, uma string por chamada, LF, uma única quebra de linha final, sem timestamp).

Confirmado no planejamento existente (Seção 15): **nenhum bloco tem um "Writer/Materializer" dedicado**. A escrita em disco é responsabilidade exclusiva do CLI (`src/commands/workspace.js`, Bloco 08 — `analise_tecnica.md`: "único ponto que escreve em disco"). Portanto o Bloco 04 produz arquivos em memória, sem divergência em relação à arquitetura prevista.

## 3. Problema que Este Bloco Resolve

O Manifest v1 é a fonte estrutural, mas não é navegável por humanos. Sem o Renderer, o Project Brain não tem nenhuma projeção legível, e o Validator (Bloco 07) não terá uma renderização determinística contra a qual comparar (contrato, Seção D: `Home.md` deve corresponder byte a byte à renderização determinística do Manifest atual).

## 4. Inputs

Um Brain Manifest v1 válido (`assertBrainManifest`) — o que o `compileBrainManifest` (Bloco 03) devolve. Nada mais: sem filesystem, sem Git, sem opções que alterem o conteúdo.

## 5. Outputs

Um array congelado de `{ path, content }`, ordenado por `path` (code point), com:

- `path`: caminho **relativo à raiz do projeto**, com `/`, sob `BRAIN_DIR = 'DDAE-Brain'` (ex.: `DDAE-Brain/Home.md`) — mesma convenção do restante do Manifest, inclusive `manifest.views`;
- `content`: string UTF-8, newlines LF, exatamente um `\n` final.

O formato `[{path, content}]` foi escolhido (não um objeto `{ "Home.md": ... }`) porque preserva ordem explícita e evita ambiguidade de chave/`path`. Consumidores futuros (CLI, Validator) só iteram.

## 6. Responsabilidades

```text
Discovery   = coleta
Compiler    = normalização/compilação estrutural
Schema      = contrato
Fingerprint = identidade
Renderer    = transformação estrutural → representação humana   ← este bloco
CLI (Bloco 08) = filesystem (único ponto de escrita)
```

O Renderer **só** lê o Manifest recebido.

## 7. Non-goals

- Ler Git ou `Docs/`, chamar Discovery/collectors, recalcular estado, alterar o Manifest, reordenar semanticamente entidades.
- Escrever em disco, criar `DDAE-Brain/`, `.ddae/brain/`, `manifest.json`, `validation.json`, `.gitignore` (nenhuma alteração ao `.gitignore` do repositório neste bloco: a entrada `DDAE-Brain/` é responsabilidade de `workspace init`, Bloco 08).
- Rede, LLM, embeddings, relógio, aleatoriedade, Claude-Mem/MemoryProvider.
- Plugin/API/dependência do Obsidian; formato proprietário.
- Frontmatter, hardening de links contra containment/existência (Bloco 05); view "Context Packages" (Bloco 06); Validator (Bloco 07); CLI, Writer e o parâmetro `views` do Compiler (Bloco 08).
- Qualquer alteração ao schema, ao Compiler, ao Fingerprint ou ao contrato.

## 8. Arquitetura

```text
Discovery ─► Compiler ─► Manifest v1 ─► Renderer ─► [{path, content}] ─► [CLI/Bloco 08 escreve]
```

Um único módulo `src/workspace/renderer.js` (função pura + helpers internos de Markdown). Exporta `renderBrainWorkspace`, `BRAIN_DIR` (`'DDAE-Brain'`) e `BRAIN_RENDERER_VIEW_PATHS` (as 7 views do Renderer, ordenadas). O Renderer é um **view producer** (contrato B.1): declara seus paths; **não** altera `manifest.views`. Cadeia alvo (implementada no Bloco 08): view producers → Orchestrator → `Compiler(snapshot, { engineVersion, views })` → Manifest + fingerprint → Renderers → CLI/Writer.

## 9. Decisões Resolvidas

Investigação feita contra o contrato congelado (Seções A–J), `analise_funcional.md`, `analise_arquitetural.md`, `analise_tecnica.md`, `plano_execucao.md`, `mapa_dependencias.md` e o código do Bloco 03.

### A — `status` das entidades: RESOLVIDA (não adicionar)

- O contrato exige que cada entidade seja "um array de referências (id, source path, one-line summary)" (Seção B). **Não exige status individual em nenhuma view** (Seção D define as views só como "índices por entidade").
- O Renderer cumpre o contrato com os campos atuais: cada item mostra `id`, `summary` e link/caminho da fonte.
- `status` é desejo de apresentação, não informação estrutural exigida. **Manifest v1 permanece inalterado.** Se o uso real mostrar necessidade, entra por amendment formal e nova versão de schema (registrado como pendência P4 — Seção 19).
- Observação relacionada: `analise_funcional.md` (não congelada) descreve `Sessions.md` "com status", mas o Manifest só tem `status` da sessão **atual** (`ddae.current_session.status`). O Renderer mostra o status apenas dela e marca-a como atual; as demais aparecem sem status. Sem novo campo.

### B — `recent_changes`: RESOLVIDA (Renderer preserva a ordem do Manifest)

- O contrato define a entidade só como "DERIVED (de `git-context.js`)" (Seção C) e manda ordenar todos os arrays do Manifest alfabeticamente por id (Seção B). **Não define recência, ordem cronológica, ordem reversa, quantidade máxima nem timestamp/assunto.** A ordem por SHA é, portanto, a ordem canônica contratual.
- O Renderer **preserva a ordem recebida**, sem sort próprio e sem acesso a Git. O texto da view declara honestamente: "ordered by commit SHA (deterministic); commit dates and subjects are not part of Manifest v1".
- A expectativa de "últimos N commits" de `analise_funcional.md` (não congelada) **não é cumprível** com o Manifest v1 e **não é um problema do Renderer**: pertence ao contrato/Discovery/Compiler (Delta A do Bloco 02 já deferiu `subject`). Registrada como pendência P4 com destino em amendment futuro — não resolvida aqui.

### C — Views: RESOLVIDA (somente as do contrato, Seção D)

Contrato Seção D lista: `Home.md`, `Sessions.md`, `Decisions.md`, `Risks.md`, `Bugs.md`, `Releases.md`, `Context-Packages.md`, `Recent-Activity.md`.

| Arquivo (relativo a `BRAIN_DIR`) | Bloco 04 | Fonte no Manifest |
|---|---|---|
| `Home.md` | Sim | tudo abaixo |
| `Sessions.md` | Sim | `ddae.sessions`, `ddae.current_session`, `current_session` |
| `Decisions.md` | Sim | `entities.decisions` |
| `Risks.md` | Sim | `entities.risks` |
| `Bugs.md` | Sim | `entities.open_bugs` |
| `Releases.md` | Sim | `entities.release_state` |
| `Recent-Activity.md` | Sim | `entities.recent_changes`, `git` |
| `Context-Packages.md` | **Não** — Bloco 06 (`mapa_dependencias.md`: "adiciona uma nova view ao conjunto já renderizado") | — |

`BRAIN_RENDERER_VIEW_PATHS` = os 7 caminhos gerados (`DDAE-Brain/Home.md`, `DDAE-Brain/Sessions.md`, `DDAE-Brain/Decisions.md`, `DDAE-Brain/Risks.md`, `DDAE-Brain/Bugs.md`, `DDAE-Brain/Recent-Activity.md`, `DDAE-Brain/Releases.md`), ordenados por code point. O Bloco 06 declara o path de `Context-Packages.md`; o Bloco 08 (Orchestrator) forma o conjunto final. **Não criadas** por não constarem no contrato: `Architecture.md`, `Current-Session.md`, `Roadmap.md` (só aparecem em `analise_funcional.md`, "nomes ilustrativos"). As tarefas do bloco ativo (`entities.current_tasks`) aparecem em `Home.md`, seção "Current Tasks". `Home.md` não linka `Context-Packages.md` (evita link quebrado até o Bloco 06).

Ordem de navegação em `Home.md`: Sessions, Decisions, Risks, Bugs, Releases, Recent Activity.

### D — Obsidian, frontmatter, cabeçalho de arquivo gerado, `generated_at`: RESOLVIDA

- **Obsidian:** só Markdown normal. `DDAE-Brain/` é uma pasta comum, visível e indexada pelo Obsidian vanilla (o Obsidian ignora dotfolders — `DT-03`). Sem plugin, API, plugin custom, symlink, junction, workaround de filesystem ou MCP do Obsidian. **Links:** links Markdown relativos (contrato D.1), ex.: `[Sessions](./Sessions.md)` entre views e `[decisoes_tecnicas.md](../Docs/02_architecture/decisoes_tecnicas.md)` para `Docs/`; wikilinks não são usados.
- **Frontmatter:** o contrato **não** o prevê (a menção em `analise_arquitetural.md` §9 é opcional e o plano o atribui ao Bloco 05, "frontmatter para Graph View"). **Bloco 04 não emite frontmatter.**
- **Marcador de arquivo gerado (contrato D.1):** logo após o H1, separado por uma linha em branco, exatamente `_Generated by DDAE. Derived from Docs/ and Git. Do not edit directly._` — texto estático, sem timestamp, sem versão, sem dado volátil, em inglês (idioma do conteúdo gerado).
- **`generated_at`:** o Renderer **nunca o exibe** e nunca gera timestamp. Motivos: `analise_tecnica.md` rejeita "Gerado em" nas views; e o contrato (Seção D) exige que `Home.md` seja byte a byte a renderização determinística do Manifest — exibir um campo opcional/volátil quebraria a comparação do Validator.
- **Links só para caminhos conhecidos:** link Markdown apenas para (a) as views de `BRAIN_RENDERER_VIEW_PATHS` (destino relativo `./Nome.md`) e (b) `manifest.sources[].path` terminado em `.md` (destino `../` + caminho, percent-encoded por segmento). Nada é inferido (por exemplo, o `README.md` de uma sessão **não** é linkado, pois não consta no Manifest). Demais caminhos aparecem como código inline.
- **Referências canônicas** ("Project Overview", "Goals", "Architecture") **não** entram: não estão no Manifest v1 (Decisão 5 do Bloco 03) e Home não infere o que o Manifest não contém. Pendência P4.

## 10. Estratégia de Rendering

Documento = `# Título` + linha em branco + marcador de arquivo gerado (contrato D.1) + seções `##` em ordem fixa, nunca omitidas mesmo vazias. Listas em bullets (não tabelas, pois `|` em conteúdo quebra tabelas). Nada de HTML, nada de frontmatter.

`Home.md` (ordem fixa): Navigation · Project · Git · Current Session · Current Tasks · Release State · Provenance (`schema_version`, `engine_version`, `fingerprint` — todos do Manifest). Não replica as listas completas das views.

Cada item de entidade: um bullet com link Markdown relativo para a fonte (label = nome do arquivo), seguido de `id` e `summary` em inline code; quando a fonte não é `.md`, não é linkável ou `source_path` é nulo, o caminho (se houver) aparece em inline code, sem link.

## 11. Paths

Saída e `manifest.views`: relativos ao root do projeto, com `/`, sob `DDAE-Brain/` — nunca `.ddae/brain/` nem qualquer dotfolder. Destinos de link: relativos ao arquivo (`./X.md`, `../Docs/...`), com `/`, sem absoluto, sem `\`, sem dependência de Windows. O Schema já rejeita absolutos/backslash no Manifest. `BRAIN_DIR = 'DDAE-Brain'`.

## 12. Views — resumo por arquivo

Cada view tem: título, marcador de arquivo gerado, seção de conteúdo (lista ou estado vazio) e um link `[← Home](./Home.md)` (exceto o próprio `Home.md`). `Sessions.md` lista `ddae.sessions` (nome e caminho em código inline; a sessão atual marcada com "(current)" e status/contagens); `Recent-Activity.md` traz a nota de ordenação da Decisão B; `Releases.md` traz `package_version`/`latest_tag` do Manifest.

## 13. Empty States

Frases explícitas, sempre no lugar da lista, nunca omissão:

| Caso | Texto |
|---|---|
| sem decisions | `No decisions recorded.` |
| sem risks | `No risks recorded.` |
| sem bugs abertos | `No open bugs recorded.` |
| sem tarefas | `No open tasks in the current session's latest block.` |
| sem recent changes | `No recent changes available (Git unavailable or no commits).` |
| sem sessão atual | `No canonical session found.` |
| Git indisponível | `Git: not available.` (com `HEAD: n/a`) |
| `ddae.available = false` | `DDAE control plane (Docs/) not found.` |
| sem release info | `No release information available.` |

## 14. Markdown Safety

Conteúdo vindo de `Docs/` (summaries, ids, nomes) é **dado, nunca estrutura**:

- **Inline code com fence dinâmico** (mesma técnica de `src/context/renderer.js`) para `id`, `summary`, nomes e caminhos não linkáveis: nada é interpretado como Markdown/HTML/wikilink; headings, `[`, `]`, `(`, `)`, `|`, `<`, `>`, `*`, `_`, `#`, frontmatter `---` e HTML ficam inertes. Sem escaping agressivo que destrua o conteúdo.
- **Multilinha:** newlines/tabs/CR e separadores Unicode de linha (U+2028/2029) e caracteres de controle são colapsados em um único espaço; espaços nas pontas removidos. Nunca truncar.
- **Backticks no conteúdo:** fence com N+1 crases, com padding quando começa/termina com crase ou é vazio.
- **Destinos de link:** só linkar caminhos presentes no Manifest; segmentos percent-encoded (espaço, `(`, `)`, `<`, `>`, `[`, `]`, `#`, `?`, `%`, não-ASCII e controle); o label vem do nome do arquivo e é escapado como texto inerte (ou usa inline code); se o caminho não puder ser representado com segurança, cai para código inline sem link.
- **Frontmatter:** conteúdo nunca aparece na primeira linha (todo arquivo começa com `# `), então `---` nunca abre frontmatter.
- Escape só onde necessário e documentado; hardening completo de links = Bloco 05.

## 15. Determinismo

Função pura; ordem = a do Manifest (já canônica) e arquivos ordenados por `path`; LF; um `\n` final; sem `Date`, `Math.random`, `fs`, rede, `process`; sem mutação do input; entrada inválida é **rejeitada** (`assertBrainManifest`), nunca "corrigida". Mesma entrada → saída byte a byte idêntica.

## 16. Arquivos Previstos

- `src/workspace/renderer.js` (novo, único módulo de produção).
- `test/workspace-renderer.test.js` (novo).
- Reuso de `test/brain-fixtures.js` (`makeSnapshot`) e do Compiler nos testes.

**Não tocar:** `src/context/**`, `src/schemas/brain-schema.js`, `src/workspace/compiler.js`, `src/workspace/fingerprint.js`, `src/workspace/discover.js`, `scripts/`, `bin/`, `package.json`, `Docs/03_contracts/**`.

## 17. Plano TDD

Testes primeiro (vermelho por módulo inexistente), depois o mínimo de código.

1. mesmo Manifest → mesma saída (deepEqual e byte a byte);
2. Manifest não é mutado (também aceito congelado);
3. paths de saída relativos com `/`, sem absoluto/`\`/`..`;
4. `Home.md` presente;
5. conjunto de arquivos == `BRAIN_RENDERER_VIEW_PATHS` exatos (7), sem `Context-Packages.md`, sem `Architecture/Current-Session/Roadmap`;
6. todo link Markdown aponta para uma view gerada ou para `manifest.sources[].path` `.md` (destino relativo correto, resolvido a partir de `DDAE-Brain/`); nenhum outro alvo; nenhum wikilink;
7. estados vazios (cada caso da Seção 13);
8. Git indisponível;
9. `current_session` ausente;
10. nenhuma entidade (Manifest mínimo);
11. escaping: summaries com `|`, `[`, `]`, `(`, `)`, crases, `#`, HTML, `---`, `[[wikilink]]`, `![img]`;
12. multilinha/tabs/controle/U+2028 colapsados; strings especiais (emoji, acentos);
13. sem `fs`/`child_process` (guard de código-fonte sem comentários);
14. sem rede;
15. sem `Date`/`Math.random`/`performance`;
16. sem `claude-mem`/`memoryprovider`;
17. sem campo inventado: cada valor exibido existe no Manifest (teste com valores sentinela);
18. ordem determinística, LF, um `\n` final, sem CRLF;
19. `generated_at` no Manifest nunca aparece na saída e não altera a saída;
20. `status` de bug/risco fictício não vaza (Manifest v1 não o tem);
21. entrada inválida lançada; `Context-Packages` não linkado em `Home.md`;
22. `recent_changes` preservado na ordem do Manifest com a nota de ordenação;
23. **root correto:** todos os paths de saída começam com `DDAE-Brain/` e `BRAIN_DIR === 'DDAE-Brain'`;
24. **nenhum output em dotfolder:** nenhum segmento de path de saída começa com `.` (em particular, nunca `.ddae/brain/`);
25. **links Markdown relativos:** entre views `./X.md`, para `Docs/` `../Docs/...`, sem `[[ ]]`, sem URL absoluta/`file:`;
26. **marcador presente:** a segunda linha não vazia após o H1 de **todo** arquivo é exatamente o marcador do contrato D.1, byte a byte, uma única vez;
27. **exatamente uma newline final** e nenhuma linha em branco extra no fim;
28. **paths portáveis:** sem `\`, sem `:` de drive, sem `..` nos paths de saída; links relativos com `/`;
29. **views declaradas de forma canônica:** `BRAIN_RENDERER_VIEW_PATHS` ordenado por code point, sem duplicatas, igual ao conjunto de paths retornado, e compatível com o schema (`views` aceito por `validateBrainManifest` quando fornecido ao Manifest);
30. o Renderer **não** altera `manifest.views` (Manifest de entrada com `views: []` ou preenchido permanece idêntico, e a saída não depende do valor de `views`).

**Integração:** Discovery → Compiler → Renderer sobre fixture temporária: sem escrita em disco (`.ddae/` inexistente), saída duas vezes idêntica, todos os links válidos, nenhum path absoluto; e sobre o self-host do DDAE.

## 18. Riscos

- **Renderer inventar informação** (referências canônicas, README de sessão): mitigado por links só para caminhos do Manifest e teste de valores sentinela.
- **Markdown injetado por `summary`:** mitigado por inline code + colapso de whitespace (Seção 14).
- **Link ambíguo/quebrado:** links relativos apenas para caminhos do Manifest, com destino percent-encoded; hardening adicional no Bloco 05.
- **Localização das views:** resolvida pelo Amendment 1 (`DT-03`) — `DDAE-Brain/`; risco residual mínimo pela constante única `BRAIN_DIR`.
- **Ownership de `views`:** resolvido (contrato B.1) — o Renderer não altera o Manifest; o parâmetro `views` do Compiler é responsabilidade do Bloco 08. Risco residual: `views: []` no Manifest até o Bloco 08, sem impacto no Renderer.

## 19. Pendências

- P4 — `status` por entidade (riscos/bugs) e status de sessões não atuais: exigem amendment de contrato/schema.
- P4 — `recent_changes` sem recência/assunto: exige amendment + extensão do Discovery (Delta A do Bloco 02).
- P4 — referências canônicas (Overview/Goals/Architecture/Roadmap) como entidades do Manifest.
- P3 — ordenação lexicográfica de tags (herdada).

## 20. Decisões Pendentes (exigem o usuário)

Nenhuma. As três decisões que estavam pendentes foram **resolvidas pelo Amendment 1 do contrato (`DT-03`, 2026-09-26)**:

1. **Visibilidade no Obsidian** → views humanas em `DDAE-Brain/` (root oficial); `.ddae/` fica como estado interno/machine-readable; sem plugin, symlink, junction ou workaround.
2. **Ownership de `manifest.views`** → o Renderer nunca o altera; `views` participa do fingerprint e é definido antes dele; view producers declaram paths, o Orchestrator (Bloco 08) forma o conjunto e passa `views` ao Compiler. O Renderer expõe `BRAIN_RENDERER_VIEW_PATHS`; o Bloco 06 declara `Context-Packages.md`.
3. **Marcador de arquivo gerado e links** → marcador `_Generated by DDAE. Derived from Docs/ and Git. Do not edit directly._` logo após o H1; links Markdown relativos (wikilinks deixam de ser o padrão).

Pendências herdadas (não bloqueiam o Bloco 04): Compiler recebe `views` (Bloco 08); `workspace init` acrescenta `DDAE-Brain/` ao `.gitignore` (Bloco 08); Discovery/testes devem tratar `DDAE-Brain/` como nunca-fonte (Blocos 08/09).

## 21. Critérios de Aceite

- [ ] `renderBrainWorkspace` retorna exatamente os 7 arquivos de `BRAIN_RENDERER_VIEW_PATHS` (todos sob `DDAE-Brain/`), ordenados, com `Home.md`.
- [ ] Mesma entrada → saída byte a byte idêntica; LF; um `\n` final.
- [ ] Manifest não mutado; entrada inválida rejeitada.
- [ ] Todos os paths relativos e portáveis, nenhum em dotfolder; todo link é Markdown relativo e aponta para caminho conhecido do Manifest ou view gerada; nenhum wikilink.
- [ ] Todo arquivo tem o marcador de arquivo gerado logo após o H1 e termina com exatamente uma newline.
- [ ] O Renderer não altera `manifest.views`.
- [ ] Estados vazios explícitos para todos os casos da Seção 13.
- [ ] Conteúdo arbitrário nunca altera a estrutura do documento (Seção 14).
- [ ] Nenhum campo inventado; `generated_at` e `status` nunca exibidos.
- [ ] Zero fs/rede/relógio/aleatoriedade/Claude-Mem no código.
- [ ] Nenhuma alteração em `src/context/**`, schema, Compiler, Fingerprint, Discovery, contrato.
- [ ] Nenhum arquivo escrito em disco; `DDAE-Brain/` e `.ddae/brain/` não criados; `.gitignore` do repositório inalterado.
- [ ] Regressão completa verde.

## 22. Validações Obrigatórias

- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `git diff --check`

## 23. Segurança

Sem novo ponto de leitura de filesystem; sem escrita. Links restritos a caminhos do Manifest, com destino percent-encoded; conteúdo sempre inerte (inline code). Nenhum caminho absoluto. Sensitive Data Guard já foi aplicada na descoberta (nada sensível chega ao Manifest).

## 24. Performance / Design System

Performance: não aplicável (dados em memória). Design System: não aplicável; princípio de apresentação = clareza sobre decoração — headings consistentes, hierarquia previsível, listas escaneáveis, sem duplicação, estados vazios explícitos, sem HTML; funciona no Obsidian, em visualizadores Markdown e como texto puro.

## 25. Definition of Done

Renderer implementado em TDD; critérios da Seção 21 atendidos; feedback e validação do bloco preenchidos; README da Session atualizado; commit único aprovado pelo usuário. (Decisões pendentes: nenhuma — resolvidas por `DT-03`.)

## 26. Feedback Obrigatório

_Ao final do bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_04_project_brain_workspace_renderer --session session_03_obsidian_workspace_project_brain_0_4_0`. Sem feedback preenchido, o bloco não está concluído._

## 27. Commit Semântico Sugerido

```
feat(workspace): add project brain workspace renderer
```

_Nunca executado automaticamente — exige confirmação explícita do usuário._
