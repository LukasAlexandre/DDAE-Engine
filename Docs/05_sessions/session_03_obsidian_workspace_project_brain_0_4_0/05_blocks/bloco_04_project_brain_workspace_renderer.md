# Bloco 04 — project brain workspace renderer

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-26

> **Status: PREPARADO — NÃO INICIADO.** Este documento especifica o bloco para revisão. Nenhum código do Renderer foi escrito. Três decisões dependem de aprovação do usuário antes ou durante a implementação (Seção 20).

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

- `path`: caminho **relativo à raiz do projeto**, com `/` (mesma convenção do restante do Manifest — inclusive `manifest.views` — e a mesma base usada nos wikilinks para o Vault = raiz do repositório, DT-01);
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
- Escrever em disco, criar `.ddae/brain/`, `manifest.json`, `validation.json`, `.gitignore`.
- Rede, LLM, embeddings, relógio, aleatoriedade, Claude-Mem/MemoryProvider.
- Plugin/API/dependência do Obsidian; formato proprietário.
- Frontmatter, hardening de wikilinks contra containment/existência (Bloco 05); view "Context Packages" (Bloco 06); Validator (Bloco 07); CLI (Bloco 08).
- Qualquer alteração ao schema, ao Compiler, ao Fingerprint ou ao contrato.

## 8. Arquitetura

```text
Discovery ─► Compiler ─► Manifest v1 ─► Renderer ─► [{path, content}] ─► [CLI/Bloco 08 escreve]
```

Um único módulo `src/workspace/renderer.js` (função pura + helpers internos de Markdown). Exporta `renderBrainWorkspace`, `BRAIN_DIR` e `BRAIN_VIEW_PATHS`. A localização física das views é uma **constante única** (`BRAIN_DIR`), de modo que a Decisão Pendente 1 (Seção 20) não exija reescrever o Renderer.

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

`BRAIN_VIEW_PATHS` = os 7 caminhos gerados (`.ddae/brain/Home.md`, …), ordenados. **Não criadas** por não constarem no contrato: `Architecture.md`, `Current-Session.md`, `Roadmap.md` (só aparecem em `analise_funcional.md`, "nomes ilustrativos"). As tarefas do bloco ativo (`entities.current_tasks`) aparecem em `Home.md`, seção "Current Tasks". `Home.md` não linka `Context-Packages.md` (evita link quebrado até o Bloco 06).

Ordem de navegação em `Home.md`: Sessions, Decisions, Risks, Bugs, Releases, Recent Activity.

### D — Obsidian, frontmatter, cabeçalho de arquivo gerado, `generated_at`: RESOLVIDA

- **Obsidian:** só Markdown normal. Wikilinks de caminho completo relativo à raiz do Vault com alias (`[[Docs/…/arquivo|alias]]`), conforme `analise_arquitetural.md`, Seção 9, e contrato G/I. Nenhum plugin, API ou dependência.
- **Frontmatter:** o contrato **não** o prevê (a menção em `analise_arquitetural.md` §9 é opcional e o plano o atribui ao Bloco 05, "frontmatter para Graph View"). **Bloco 04 não emite frontmatter.**
- **Cabeçalho de arquivo gerado:** o contrato não define texto. Proposta mínima, nova (não altera contrato nem snapshots existentes), primeira linha após o título de cada arquivo, em bloco de citação: `> Generated by DDAE — do not edit. Derived from Docs/ and Git; Docs/ is authoritative.` Serve para deixar claro que a view é projeção derivada e recomputável.
- **`generated_at`:** o Renderer **nunca o exibe** e nunca gera timestamp. Motivos: `analise_tecnica.md` rejeita "Gerado em" nas views; e o contrato (Seção D) exige que `Home.md` seja byte a byte a renderização determinística do Manifest — exibir um campo opcional/volátil quebraria a comparação do Validator.
- **Links só para caminhos conhecidos:** wikilink apenas para (a) as views do próprio `BRAIN_VIEW_PATHS` e (b) `manifest.sources[].path` terminado em `.md`. Nada é inferido (por exemplo, o `README.md` de uma sessão **não** é linkado, pois não consta no Manifest). Demais caminhos aparecem como código inline.
- **Referências canônicas** ("Project Overview", "Goals", "Architecture") **não** entram: não estão no Manifest v1 (Decisão 5 do Bloco 03) e Home não infere o que o Manifest não contém. Pendência P4.

## 10. Estratégia de Rendering

Documento = `# Título` + citação de arquivo gerado + seções `##` em ordem fixa, nunca omitidas mesmo vazias. Listas em bullets (não tabelas, pois `|` em conteúdo quebra tabelas). Nada de HTML.

`Home.md` (ordem fixa): Navigation · Project · Git · Current Session · Current Tasks · Release State · Provenance (`schema_version`, `engine_version`, `fingerprint` — todos do Manifest). Não replica as listas completas das views.

Cada item de entidade: `- [[<source>|<label>]] — \`id\`: \`summary\`` (ou código inline no lugar do link quando a fonte não é `.md`/não é linkável, ou `source_path` nulo).

## 11. Paths

Somente relativos ao root do projeto, `/`, sem `..`, sem absoluto, sem `\`. O Schema já rejeita absolutos/`\` no Manifest; o Renderer não constrói caminho novo a partir de dado do Manifest além de anexar `.md`-strip para wikilink. `BRAIN_DIR = '.ddae/brain'`.

## 12. Views — resumo por arquivo

Cada view tem: título, citação de arquivo gerado, seção de conteúdo (lista ou estado vazio), link "← Home". `Sessions.md` lista `ddae.sessions` (nome em código inline + caminho em código inline; a sessão atual marcada com "(current)" e status/contagens); `Recent-Activity.md` traz a nota de ordenação da Decisão B; `Releases.md` traz `package_version`/`latest_tag` do Manifest.

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
- **Alvos de wikilink:** só linkar caminhos sem `[ ] | # ^ \` e sem controle; caso contrário, código inline. O alias vem de texto fixo/nome de arquivo já validado.
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
5. conjunto de arquivos == `BRAIN_VIEW_PATHS` exatos (7), sem `Context-Packages.md`, sem `Architecture/Current-Session/Roadmap`;
6. todo wikilink aponta para uma view gerada ou para `manifest.sources[].path` `.md`; nenhum outro alvo;
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
22. `recent_changes` preservado na ordem do Manifest com a nota de ordenação.

**Integração:** Discovery → Compiler → Renderer sobre fixture temporária: sem escrita em disco (`.ddae/` inexistente), saída duas vezes idêntica, todos os links válidos, nenhum path absoluto; e sobre o self-host do DDAE.

## 18. Riscos

- **Renderer inventar informação** (referências canônicas, README de sessão): mitigado por links só para caminhos do Manifest e teste de valores sentinela.
- **Markdown injetado por `summary`:** mitigado por inline code + colapso de whitespace (Seção 14).
- **Wikilink ambíguo/quebrado:** caminho completo com alias; hardening no Bloco 05.
- **Acoplamento à localização `.ddae/brain/`:** ver Decisão Pendente 1; mitigado pela constante `BRAIN_DIR`.
- **Contradição contratual em `views`:** ver Decisão Pendente 2.

## 19. Pendências

- P4 — `status` por entidade (riscos/bugs) e status de sessões não atuais: exigem amendment de contrato/schema.
- P4 — `recent_changes` sem recência/assunto: exige amendment + extensão do Discovery (Delta A do Bloco 02).
- P4 — referências canônicas (Overview/Goals/Architecture/Roadmap) como entidades do Manifest.
- P3 — ordenação lexicográfica de tags (herdada).

## 20. Decisões Pendentes (exigem o usuário)

1. **[Importante] Visibilidade de `.ddae/brain/` no Obsidian.** O Obsidian **não indexa nem exibe pastas/arquivos cujo caminho começa com ponto** (verificado em fontes públicas: fórum oficial do Obsidian e o plugin "Hidden Folders Access"). Como DT-01/contrato A/D colocam as views em `.ddae/brain/` e o Vault na raiz do repositório, no Obsidian *vanilla* essas views ficariam invisíveis e seus wikilinks não resolveriam. Isso conflita com o contrato G ("nenhum plugin community é exigido"). O **Renderer não é afetado** (é agnóstico via `BRAIN_DIR`), mas a decisão é necessária **antes do Bloco 05 e no máximo antes do Bloco 08**. Opções: (a) manter `.ddae/brain/` e exigir o plugin community (viola contrato G); (b) trocar para diretório visível e gitignored (por exemplo `Brain/`), via amendment de DT-01/contrato A/D; (c) validar o comportamento real com um spike no Obsidian antes de decidir. Recomendação: (c) e depois (b) se confirmado.
2. **[Importante] Quem preenche `manifest.views`.** O Bloco 03 emite `views: []` porque nada foi renderizado. O contrato define `views` como "arquivos gerados nesta build", e o fingerprint inclui `views`. Recomendação: o Bloco 04 só exporta `BRAIN_VIEW_PATHS` e testa que a saída bate; o Compiler ganha um parâmetro opcional `views` **no Bloco 08** (o CLI orquestra: compila, renderiza, recompila com `views`). Alternativa: alterar o Compiler já no Bloco 04. Decisão precisa ser aprovada.
3. **[Confirmação] Cabeçalho de arquivo gerado** (texto da Decisão D) e uso de wikilinks de caminho completo (que aparecem como texto puro no GitHub). Recomendação: aprovar como especificado.

## 21. Critérios de Aceite

- [ ] `renderBrainWorkspace` retorna exatamente os 7 arquivos de `BRAIN_VIEW_PATHS`, ordenados, com `Home.md`.
- [ ] Mesma entrada → saída byte a byte idêntica; LF; um `\n` final.
- [ ] Manifest não mutado; entrada inválida rejeitada.
- [ ] Todos os paths relativos; todo wikilink aponta para caminho conhecido do Manifest ou view gerada.
- [ ] Estados vazios explícitos para todos os casos da Seção 13.
- [ ] Conteúdo arbitrário nunca altera a estrutura do documento (Seção 14).
- [ ] Nenhum campo inventado; `generated_at` e `status` nunca exibidos.
- [ ] Zero fs/rede/relógio/aleatoriedade/Claude-Mem no código.
- [ ] Nenhuma alteração em `src/context/**`, schema, Compiler, Fingerprint, Discovery, contrato.
- [ ] Nenhum arquivo escrito em disco; `.ddae/brain/` não criado.
- [ ] Regressão completa verde.

## 22. Validações Obrigatórias

- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `git diff --check`

## 23. Segurança

Sem novo ponto de leitura de filesystem; sem escrita. Links restritos a caminhos do Manifest sem caracteres de sintaxe de link; conteúdo sempre inerte (inline code). Nenhum caminho absoluto. Sensitive Data Guard já foi aplicada na descoberta (nada sensível chega ao Manifest).

## 24. Performance / Design System

Performance: não aplicável (dados em memória). Design System: não aplicável; princípio de apresentação = clareza sobre decoração — headings consistentes, hierarquia previsível, listas escaneáveis, sem duplicação, estados vazios explícitos, sem HTML; funciona no Obsidian, em visualizadores Markdown e como texto puro.

## 25. Definition of Done

Renderer implementado em TDD; critérios da Seção 21 atendidos; decisões pendentes 1–3 resolvidas e registradas; feedback e validação do bloco preenchidos; README da Session atualizado; commit único aprovado pelo usuário.

## 26. Feedback Obrigatório

_Ao final do bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_04_project_brain_workspace_renderer --session session_03_obsidian_workspace_project_brain_0_4_0`. Sem feedback preenchido, o bloco não está concluído._

## 27. Commit Semântico Sugerido

```
feat(workspace): add project brain workspace renderer
```

_Nunca executado automaticamente — exige confirmação explícita do usuário._
