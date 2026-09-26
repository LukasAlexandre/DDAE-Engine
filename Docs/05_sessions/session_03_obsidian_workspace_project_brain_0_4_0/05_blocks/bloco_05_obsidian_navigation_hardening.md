# Bloco 05 — obsidian navigation hardening

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-26

> **Status: CONCLUÍDO / APROVADO** (2026-09-26). 16 testes adversariais novos adicionados a `test/workspace-renderer.test.js` (38 → 54, todos verdes); **zero alteração de produção** — o gerador de link do Bloco 04 já classificava corretamente todo caso investigado (traversal literal e codificado, double-encoding, injeção de esquema, Unicode look-alike/bidi, controles, `%` malformado, ausência em `manifest.sources`). Frontmatter decidido: **não usado no v1** (contrato, Seção D.1, atualizado). Lacuna do Schema (Seção 9.3) permanece registrada como P4, não corrigida. Ver `08_feedbacks/feedback_bloco_05_obsidian_navigation_hardening.md` e `09_validation/validacao_bloco_05_obsidian_navigation_hardening.md`.

## 22. Resultado da Implementação

- **RED confirmado antes do GREEN:** os 16 testes novos (39–54) foram escritos e executados contra a implementação existente do Bloco 04 sem nenhuma alteração em `renderer.js`; todos passaram de imediato (GREEN imediato, Seção 21 do prompt de preparação — aceitável para hardening/regressão). Nenhum gap real de produção foi encontrado; portanto **nenhuma linha de `src/workspace/renderer.js` foi alterada**.
- **Cenários cobertos** (Seção 13, todos os 10 previstos, mais reforço de propriedade sobre um corpus de 51 entradas adversariais — teste 49): traversal literal (`../`, `Docs/../..`, segmento vazio/`.`); traversal codificado (`%2e%2e` etc., nunca decodificado); double-encoding (`%252e%252e`, `%25`); injeção de esquema (`http:`, `javascript:`, `file:`, `data:`, `mailto:`, letra de drive) — sempre `:` codificado e destino sempre `../`-prefixado, nunca URL externa; Unicode look-alike de `.`/`/`/`\`/`:` (leader dots, ellipsis, fullwidth, division slash) e RTL override — preservados como texto, nunca interpretados como separador; `%`/escapes malformados — nunca lança exceção; caracteres de controle e surrogate solto — nunca linkados, nunca vazam crus na saída; ausência em `manifest.sources`/extensão não-`.md` — nunca linkado; simetria de navegação Home ⇄ 6 views validada também sob dados adversariais (BFS confirma as 7 views alcançáveis, nenhum link para fora do conjunto); determinismo byte a byte sob todo o corpus; guarda de pureza (sem `decodeURI`/`.normalize()`/acoplamento a Obsidian).
- **Limitação documentada, não corrigida (teste 54):** caracteres de controle bidirecional (RTL override) dentro de um nome de arquivo aparecem verbatim no rótulo do link (dentro de um code span, portanto nunca interpretados como estrutura Markdown) e são percent-encoded corretamente no destino. Neutralizá-los por razão de *visual spoofing* é uma decisão de segurança de apresentação, registrada como P4 para o Bloco 09, não corrigida aqui (o valor já é dado inerte, nunca executável).
- **Frontmatter (Seção 10): decidido — NÃO usado no Project Brain v1.** Registrado no contrato (`Docs/03_contracts/contrato_workspace_project_brain.md`, Seção D.1) diretamente, sem nova DT: a decisão é trivialmente reversível (adicionar frontmatter depois não quebra nada existente), então não atende ao critério de "decisão cara de reverter" que justificaria uma entrada em `decisoes_tecnicas.md` (`metodologia.md`, critério de DT). `DDAE-Brain/*.md` permanece Markdown puro.
- **Lacuna do Schema (Seção 9.3): registrada, não corrigida.** P4 mantida — `isProjectRelativePath` não rejeita `..`/esquemas isoladamente; o Renderer já revalida e neutraliza (teste 47 confirma que o Schema rejeita esses `source_path` antes mesmo de chegar ao Renderer, e o teste 42/49 confirma que o Renderer também nunca produziria link perigoso se recebesse um). Destino: avaliação do Bloco 07.
- **Regressão:** `npm test` 574 total, 571 pass, 0 fail, 3 skip (era 558/555/0/3). `package:check` OK, 111 arquivos (sem mudança — nenhum arquivo de produção novo). `smoke` OK. `validate`/`audit` 0 erros.

## 1. Objetivo

Endurecer, com evidência e testes, a segurança e a robustez da navegação (Home ⇄ 7 views ⇄ `Docs/`) já produzida pelo Renderer (Bloco 04) — sem introduzir mecanismo Obsidian-específico obrigatório, sem tocar no Manifest v1, e sem duplicar proteção já existente em camada anterior.

## 2. Contexto

O escopo original deste bloco (`04_planning/plano_execucao.md`, linha 5, datado de 2026-08-16) foi escrito **antes** do Amendment 1 do contrato (`DT-03`, 2026-09-26) e antes da implementação real do Renderer (Bloco 04, commit `d8e5604`): "Wikilinks path-safe (reaproveitando `sensitive-files.js`), frontmatter para Graph View, eliminação de links ambíguos por nome-base." Essa descrição pressupõe que wikilinks seriam o mecanismo principal de navegação. O Amendment 1 rejeitou essa premissa (`decisoes_tecnicas.md`, DT-03: "wikilinks deixam de ser o mecanismo principal"; contrato, Seção D.1: "Wikilinks não são o mecanismo principal"). O Bloco 04 já implementou e testou links Markdown relativos com percent-encoding e fallback seguro. Este bloco parte do **código real** (`src/workspace/renderer.js`, `test/workspace-renderer.test.js`), não do plano de agosto, para determinar o que efetivamente falta endurecer (Seção 9 abaixo).

## 3. Problema que Este Bloco Resolve

Dois problemas concretos, distintos do plano original:

1. **Cobertura de teste adversarial insuficiente para o gerador de links do Renderer.** `docsDestination` (`src/workspace/renderer.js`) já rejeita segmentos `.`/`..`/vazios e caracteres de controle em `source_path` antes de construir um link — mas não há teste de regressão que injete um `source_path` adversarial simulando containment-escape (ex.: `Docs/../../../etc/passwd.md`, `../secrets.md`, segmentos de traversal codificados como `%2e%2e`). `analise_riscos.md` (RS-01) descreve exatamente esse gatilho ("bug de implementação no Bloco 04 ao construir caminhos relativos") mas atribuiu a responsabilidade de mitigação ao Bloco 09, escrito antes de o Renderer existir e antes de se saber que a geração de link seria uma função pura sem I/O. Como a lógica de containment já vive inteiramente dentro do Renderer (não em `sensitive-files.js`, que é sobre filesystem/symlink, não aplicável a uma função pura), a cobertura de teste desse comportamento pertence naturalmente a este bloco — **decisão a confirmar, Seção 10**.
2. **Uma decisão de contrato deixada explicitamente aberta.** Contrato, Seção D.1: "Frontmatter: não previsto neste contrato (o Bloco 05 pode propô-lo por amendment)." Isso nunca foi decidido — nem aceito, nem rejeitado.

Tudo o mais que o nome "Navigation Hardening" poderia sugerir (symlink no disco, Obsidian Sync/Publish, `.gitignore` de `.obsidian/`) já tem responsável definido em outro bloco (Seção 5) ou já foi resolvido (Seção 9).

## 4. Estado Herdado (o que o Bloco 04 já entrega)

Auditado diretamente contra `src/workspace/renderer.js` e `test/workspace-renderer.test.js` (38 testes, todos verdes):

- Links Markdown relativos apenas (`./X.md` entre views, `../` + segmentos para `Docs/`); nenhum wikilink em nenhuma saída (testado).
- Todo link de `Docs/` só é gerado se `source_path` (a) está em `manifest.sources[].path` (correspondência exata, não por nome-base), (b) termina em `.md`, (c) não contém caractere de controle/separador de linha Unicode, (d) não tem segmento `''`/`.`/`..`. Fora essas condições, cai para código inline sem link — nunca gera um link potencialmente inseguro (testado, teste 17).
- Percent-encoding por segmento (`encodeURIComponent` + escape adicional de `!'()*`, que o Markdown trata como delimitador de link) — espaço, parênteses, `#`, `?`, crase, Unicode não-ASCII já cobertos (testado, teste 17, 29-31).
- Home linka as 6 views navegáveis; cada view linka de volta para Home (`[← Home](./Home.md)`); Home nunca linka para si mesma (testado, teste 16).
- `manifest.views` nunca é lido, comparado ou alterado pelo Renderer (testado, teste 33-34).
- Nenhum path absoluto, nenhum `.ddae/brain/`, nenhum dotfolder em qualquer saída (testado, testes 8-10).
- Zero I/O: o Renderer não lê disco, não segue symlink, não acessa Git — logo, RS-02 (symlink seguido durante varredura) não pode ocorrer neste módulo; já era e continua responsabilidade exclusiva do Discovery (Bloco 02, já mitigado).

## 5. Responsabilidades (o que é deste bloco)

- Testes adversariais para o gerador de link do Renderer (path traversal literal e disfarçado, double-encoding, confirmação de que o comportamento já existente é suficiente ou não).
- Decisão explícita (com aprovação do usuário) sobre frontmatter para Graph View (Seção 10).
- Auditoria formal e documentada da simetria de navegação Home ⇄ views (já majoritariamente coberta por teste; este bloco formaliza como requisito de contrato de navegação, não apenas efeito colateral de teste).
- Registrar, sem corrigir, uma lacuna de defesa em profundidade encontrada no Schema (Seção 9.3) — decisão de not-invented-here vs. amendment fica para o usuário/Bloco 07.

## 6. Non-Goals (Fora de Escopo)

- **Wikilinks path-safe** — obsoleto. Wikilinks não são mais o mecanismo principal (`DT-03`); não há wikilink em nenhuma saída do Renderer.
- **Eliminação de links ambíguos por nome-base** — obsoleto. Esse risco é específico da resolução de wikilink do Obsidian (resolução por nome-base quando ambíguo); links Markdown relativos resolvem por caminho real, não por nome — a classe de bug não existe no mecanismo atual.
- **RS-02 (symlink seguido durante descoberta)** — já mitigado no Bloco 02 (Discovery); não é responsabilidade do Renderer, que não tem I/O.
- **RS-03 (Obsidian Sync/Publish expondo o Vault) e RS-04 (`.obsidian/workspace.json` commitado)** — permanecem do Bloco 09 (Security Hardening); são avisos operacionais/gitignore, não lógica de geração de link.
- **Validação de existência física de link (broken link contra o disco real)** — pertence ao Bloco 07 (Validator) e/ou Bloco 08 (CLI/Writer), nunca a este bloco: o Renderer é puro e não pode (nem deve) verificar o filesystem. Este bloco cobre apenas **path/link validation pura** (Seção 9.2); existência física é uma camada diferente, deliberadamente não misturada.
- **Context-Packages.md** — Bloco 06.
- **`manifest.views` / parâmetro `views` do Compiler / Orchestrator** — Bloco 08; dívida transitória preservada (Seção 11).
- **`recent_changes` sem recência/assunto** (P4 herdada) — não é escopo de navegação, não entra aqui.
- **`status` por entidade (riscos/bugs/sessões não atuais)** — fora do Manifest v1, não é criado por conveniência de navegação (contrato, Seção B; Bloco 03, Decisão A).
- Qualquer alteração a `src/context/**`, `src/schemas/brain-schema.js`, `src/workspace/compiler.js`, `src/workspace/fingerprint.js`, `src/workspace/discover.js` ou ao contrato — permitido apenas registrar a lacuna (Seção 9.3), nunca corrigir nesta execução.
- Nenhum plugin Obsidian, Dataview, Bases, Canvas, URI `obsidian://`, `app://`, aliases proprietários — nunca requisito (contrato, Seção G).
- Nenhuma implementação de código nesta preparação — este documento é planejamento, não execução.

## 7. Arquitetura Proposta

```text
Discovery ─► Compiler ─► Manifest v1 ─► Renderer ─► [{path, content}] ─► [CLI/Bloco 08 escreve]
                                            ▲
                                            └── Bloco 05 endurece a lógica de link JÁ AQUI DENTRO
                                                (mesmo módulo, sem I/O, sem novo arquivo de produção
                                                previsto salvo achado real durante a execução)
```

Decisão: **(A) endurecer `renderer.js` via testes, não criar módulo novo.** A lógica de path/link (`docsDestination`, `sourceRef`, `encodeSegment`, `HAS_CONTROL`) já é coesa, privada (não exportada) e usada só pelo Renderer — não há segundo consumidor que justifique extrair `src/workspace/links.js`/`paths.js`/`navigation/`. Criar uma pasta nova em cascata sem necessidade real contradiz a prática já estabelecida (Blocos 01-04, um módulo por responsabilidade, sem abstração especulativa). Se a execução do bloco encontrar um caso real que exija código de produção novo (não apenas teste), ele deve permanecer dentro de `renderer.js`, salvo justificativa registrada no momento.

Portanto o Bloco 05 é **predominantemente testes** (opção D da Seção 21 do prompt de preparação), com hardening pontual em `renderer.js` apenas se a TDD revelar uma lacuna real (não hipotética) — a determinar no início da própria execução do bloco, não aqui.

## 8. Decisões Já Congeladas (não reabrir)

- `Docs/` = fonte canônica; `.ddae/` = estado interno/máquina; `DDAE-Brain/` = workspace humano gerado, descartável, recomputável (DT-01, DT-03).
- Obsidian = consumidor opcional; nenhum plugin community, symlink ou junction obrigatório (contrato, Seção G).
- Links Markdown relativos são o mecanismo principal; wikilinks não são (DT-03; contrato, Seção D.1).
- As 7 views do Bloco 04 (`Home`, `Sessions`, `Decisions`, `Risks`, `Bugs`, `Releases`, `Recent-Activity`) — `Context-Packages.md` fica fora, é do Bloco 06.
- `manifest.views` nunca é alterado pelo Renderer; `views: []` no Compiler é dívida transitória deliberada até o Bloco 08.
- `recent_changes` preserva a ordem recebida (SHA), não é recência cronológica — não é reaberto aqui.
- Nenhum campo novo de entidade (`status`, `severity`, `owner`, `priority`) — Manifest v1 fechado.

## 9. Auditoria dos Links Atuais (o que existe, não o que corrigir)

### 9.1 Mapa de links por view

| Origem | Destino | Mecanismo | Encoding |
|---|---|---|---|
| `Home.md` | `Sessions.md`, `Decisions.md`, `Risks.md`, `Bugs.md`, `Releases.md`, `Recent-Activity.md` | `[Label](./Nome.md)` | Nenhum (nomes de arquivo fixos, sem caractere especial) |
| `Sessions.md`, `Decisions.md`, `Risks.md`, `Bugs.md`, `Releases.md`, `Recent-Activity.md` | `Home.md` | `[← Home](./Home.md)` | Nenhum |
| Qualquer view (via `entityItem`/`sourceRef`) | `manifest.sources[].path` (`.md` apenas) | `[nome-do-arquivo](../segmento/percent-encoded.md)` | `encodeURIComponent` por segmento + escape adicional de `!'()*` |
| Qualquer view | `source_path` não linkável (não-`.md`, controle, fora de `sources`, `null`) | Código inline, sem link | N/A — dado inerte, nunca interpretado |

### 9.2 Riscos investigados (pure path/link validation — sem I/O)

| Risco | Estado atual | Evidência |
|---|---|---|
| Espaço, `(`, `)`, `#`, `?`, crase, Unicode não-ASCII no nome | Coberto | Teste 17, 29-31 |
| `..`/`.`/segmento vazio em `source_path` **literal** | Coberto — `docsDestination` rejeita antes de construir o link | Código (`renderer.js`, checagem de segmentos); **sem teste de regressão dedicado** — lacuna de cobertura, não de lógica |
| Traversal disfarçado (`source_path` contendo `%2e%2e` como texto literal, não decodificado) | Provavelmente já inerte por construção: `encodeSegment` re-codifica `%` para `%25` em qualquer segmento, então o destino nunca contém uma sequência `../` literal após a codificação — **não verificado por teste** | Análise de código; precisa de teste explícito no Bloco 05 |
| `source_path` absoluto ou com backslash | Impossível de alcançar o Renderer: rejeitado already pelo Schema (`isProjectRelativePath`) antes do Manifest ser válido | `brain-schema.js` — mas ver 9.3 |
| Path traversal via letra de drive Windows (`C:\...`) | Rejeitado pelo Schema | `isProjectRelativePath` |
| Double-encoding (a mesma string sendo codificada duas vezes por engano) | Não observado — `encodeSegment` roda uma única vez por segmento, sobre o valor bruto do Manifest | Sem teste de regressão dedicado |
| Injeção de protocolo (`javascript:`, `file:`) via nome de arquivo malicioso | Neutralizado por construção: `:` é escapado por `encodeURIComponent`; o destino é sempre prefixado por `../` (nunca uma URL absoluta) | Sem teste de regressão dedicado |
| Link para URL externa inesperada | Impossível: só se gera link para `manifest.sources[].path` conhecido, nunca para valor arbitrário externo | Código (`docsDestination` exige presença em `knownSources`) |
| Markdown/HTML injection via `summary`/`id` | Coberto — sempre em inline code com fence dinâmica | Testes 29-32 |
| Unicode confusable / RTL override em nome de arquivo | Não testado explicitamente | Candidato a teste no Bloco 05 (baixo risco: o conteúdo fica em código inline ou em label percent-encoded, nunca interpretado como link clicável enganoso além do que o próprio SO/editor já mostraria para o arquivo real) |

### 9.3 Lacuna de defesa em profundidade encontrada no Schema (registrar, não corrigir)

`isProjectRelativePath` (`src/schemas/brain-schema.js`) rejeita apenas: string vazia, início por `/`, padrão de drive Windows (`C:\` ou `C:/`), e presença de `\`. **Não rejeita** segmentos `..` nem prefixos de esquema (`http://`, `javascript:`) — um `source_path` como `"http://evil.example/a.md"` ou `"Docs/../../etc/a.md"` passaria essa validação do Schema isoladamente. Isso nunca é alcançável a partir de uma execução real de `discoverWorkspaceState` (que só lista arquivos reais do próprio `Docs/`), mas é uma lacuna real de defesa em profundidade caso um bug futuro no Compiler ou Discovery produza um `source_path` malformado. **Mitigação já existente, independente do Schema:** o Renderer (`docsDestination`) já revalida — segmento por segmento — antes de gerar qualquer link, então essa lacuna do Schema não é hoje explorável através do Renderer. **Decisão:** registrar como pendência P4 (Seção 15), não abrir amendment de schema nesta execução — o Bloco 07 (Validator) é o lugar correto para avaliar se merece um requisito formal de schema.

## 10. Decisão Aberta — Requer Aprovação do Usuário Antes da Implementação

**Frontmatter para Graph View** (contrato, Seção D.1: "não previsto... o Bloco 05 pode propô-lo por amendment").

- **A favor:** poderia anotar `DDAE-Brain/*.md` com `type: brain-view`/`generated: true` para permitir queries do Graph View no Obsidian (ideia original em `analise_arquitetural.md`, Seção 9, escrita para `.ddae/brain/`, nunca atualizada para `DDAE-Brain/`).
- **Contra:** (1) é estritamente Obsidian-específico — GitHub e VS Code renderizam um bloco YAML `---...---` no topo do arquivo como texto literal visível, não como metadado oculto (a menos que o visualizador trate o arquivo como Jekyll front matter, o que não é o caso de um repositório genérico) — isso pesa contra o princípio de portabilidade (Seção 13); (2) o contrato já exige que o marcador de arquivo gerado seja a segunda linha não vazia após o H1 (D.1) — frontmatter, se adicionado, teria que vir **antes** do H1 (é a convenção universal), o que não quebra esse requisito, mas precisa ser formalizado; (3) hoje a navegação/Graph View já funciona com links Markdown relativos (o Obsidian resolve e conecta links Markdown padrão no grafo, não exclusivamente wikilinks) — o ganho incremental de frontmatter é baixo e opcional por definição.
- **Esta preparação não decide.** Proposta: **não implementar frontmatter neste bloco** (mantém `DDAE-Brain/*.md` como Markdown puro, máxima portabilidade, zero acoplamento a uma feature opcional do Obsidian), registrando a decisão formalmente em `decisoes_tecnicas.md` (nova entrada, não DT-03/DT-04 se o usuário concordar) — mas **esta é uma recomendação, não uma decisão tomada**. Se o usuário quiser frontmatter, este bloco precisa de escopo e critério de aceite adicionais antes de iniciar código.

## 11. Manifest / `manifest.views` — Dívida Transitória (preservada, não resolvida aqui)

```text
Compiler atual:            manifest.views = []
Renderer:                    BRAIN_RENDERER_VIEW_PATHS = 7 paths (declarados, não comparados)
Bloco 08 (Orchestrator):       View producers → Orchestrator → Compiler(..., views) → fingerprint → Renderer → Writer
```

Não é bug do Bloco 04 nem responsabilidade do Bloco 05. Nenhuma alteração ao Compiler, Fingerprint ou Schema nesta preparação ou na execução deste bloco.

## 12. Portabilidade

O resultado deve continuar navegável, sem qualquer alteração de comportamento, em: Windows, Linux, macOS; Obsidian (vanilla), GitHub (visualização de Markdown), VS Code, editor de texto puro. Nenhuma solução proprietária do Obsidian (plugin, Dataview, Bases, Canvas, URI `obsidian://`) é aceitável como requisito — apenas como Future/Optional explicitamente rotulado. Onde houver conflito entre um comportamento proprietário do Obsidian e Markdown padrão, prevalece a solução portátil (ver Seção 10, frontmatter).

## 13. Plano de Testes (TDD) — Não Implementado Nesta Preparação

Estende `test/workspace-renderer.test.js` (mesmo arquivo, não um arquivo novo — os cenários abaixo testam o mesmo `renderBrainWorkspace`/`docsDestination` já existente). Quantidade estimada: 8–12 testes novos.

Cenários previstos:

1. `source_path` com segmento `..` literal (`Docs/../secrets.md`) → nunca gera link; cai para código inline.
2. `source_path` com `../` no início (`../outside.md`) → idem.
3. `source_path` contendo `%2e%2e%2f` como texto literal → o destino final nunca contém uma sequência decodificável de volta para `../` sem uma segunda decodificação (double-decode); documentar o comportamento exato observado.
4. `source_path` com múltiplos `%` adjacentes/mal formados → não quebra a codificação, nunca lança exceção.
5. `source_path` tipo esquema (`http://x/a.md`, `javascript:a.md`) presente em `manifest.sources` (Manifest construído à mão para o teste, simulando uma lacuna futura do Compiler) → nunca produz uma âncora de link com esquema reconhecível (`:` sempre aparece codificado).
6. Nome de arquivo com caractere Unicode confusable/RTL override → renderiza como link ou código inline, nunca interpretado, sem exceção.
7. Simetria de navegação: para cada uma das 6 views não-Home, existe exatamente um link de volta (`[← Home]`); Home linka as 6, nunca a si mesma — formalizar como teste de contrato de navegação (pode já estar coberto pelo teste 16 existente; confirmar e, se necessário, reforçar).
8. Determinismo mantido sob as entradas adversariais acima (mesma entrada → mesma saída byte a byte).
9. Nenhuma exceção não tratada para qualquer entrada adversarial de `source_path` (sempre cai para um dos dois caminhos válidos: link seguro ou código inline).
10. Guard de pureza (código-fonte) continua sem novo import de I/O, mesmo após qualquer hardening pontual.

Não cobre (fora de escopo, Seção 6): existência física do arquivo linkado no disco (Bloco 07/08); comportamento do Obsidian em si (não testável neste repositório).

## 14. Arquivos Previstos

- `test/workspace-renderer.test.js` — **alterado** (adição dos cenários da Seção 13); nenhum arquivo de teste novo, pois testa a mesma unidade já coberta.
- `src/workspace/renderer.js` — **alteração condicional**, somente se a TDD revelar uma lacuna real de produção (não apenas de teste); a determinar no início da execução do bloco, não aqui.
- `Docs/02_architecture/decisoes_tecnicas.md` — **alteração condicional**, apenas se o usuário decidir a Seção 10 (frontmatter) explicitamente, para qualquer direção da decisão.
- Nenhum diretório novo (`navigation/`, `links/`, `paths/`, `utils/`, `helpers/`) — ver Seção 7.
- `08_feedbacks/feedback_bloco_05_obsidian_navigation_hardening.md`, `09_validation/validacao_bloco_05_obsidian_navigation_hardening.md` — ao final da execução, não nesta preparação.

**Não tocar:** `src/context/**`, `src/schemas/brain-schema.js` (salvo registrar a lacuna da Seção 9.3, nunca corrigi-la aqui), `src/workspace/compiler.js`, `src/workspace/fingerprint.js`, `src/workspace/discover.js`, `scripts/`, `bin/`, `package.json`, `Docs/03_contracts/**` (salvo decisão explícita do usuário sobre frontmatter).

## 15. Critérios de Aceite

- [x] Todos os cenários adversariais da Seção 13 cobertos por teste, com resultado real documentado (não hipotético).
- [x] Nenhuma alteração de comportamento observável nas 38 saídas já existentes do Bloco 04 (regressão idêntica, salvo se um gap real exigir correção pontual, registrada e justificada).
- [x] Decisão sobre frontmatter (Seção 10) registrada explicitamente — implementada com escopo formal, ou explicitamente rejeitada/adiada — nunca implementada silenciosamente.
- [x] Lacuna do Schema (Seção 9.3) registrada como pendência (P4), não corrigida nesta execução salvo decisão em contrário do usuário.
- [x] Nenhum módulo novo criado sem necessidade real comprovada durante a execução.
- [x] Nenhuma alteração a `manifest.views`, Compiler, Fingerprint, Discovery ou Schema (salvo Seção 9.3/10 explicitamente aprovadas).
- [x] Regressão completa verde.

## 16. Definition of Done

Testes adversariais implementados e verdes; decisão de frontmatter registrada (qualquer direção); lacuna do Schema registrada como pendência; nenhuma regressão; feedback e validação do bloco preenchidos; README da Session atualizado; commit único aprovado pelo usuário.

## 17. Dependências

- Bloco 04 (Renderer) — concluído, aprovado (`d8e5604`). Único bloco do qual este depende (`04_planning/mapa_dependencias.md`).
- Nenhuma dependência externa nova.

## 18. Riscos

- **Escopo residual pequeno:** é esperado e aceitável — o Bloco 04 e o Amendment 1 já anteciparam a maior parte do hardening de navegação originalmente previsto para este bloco (Seção 2). Não criar trabalho artificial para preencher um tamanho de bloco pré-concebido.
- **Decisão de frontmatter mal conduzida:** mitigado por não decidir aqui — a Seção 10 explicita o trade-off e aguarda o usuário.
- **Confundir path/link validation pura com existência física:** mitigado explicitamente pela Seção 6 (Non-Goals) e Seção 13 (o que não é testado).

## 19. Pendências Esperadas

- P4 — Lacuna de defesa em profundidade no Schema (`isProjectRelativePath` não rejeita `..`/esquemas) — Seção 9.3; destino: avaliação do Bloco 07 (Validator) ou amendment formal, não corrigida aqui.
- P4 — Frontmatter para Graph View, se o usuário decidir adiar em vez de rejeitar definitivamente (Seção 10).
- P3/P4 herdadas dos Blocos 02/03/04 (ordenação de tags, `recent_changes` sem recência, entidades sem `status`) — inalteradas, não é escopo deste bloco.

## 20. Feedback Obrigatório

_Ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_05_obsidian_navigation_hardening --session session_03_obsidian_workspace_project_brain_0_4_0`. Sem feedback preenchido, o bloco não está concluído._

## 21. Commit Semântico Sugerido

```
test(workspace): harden project brain renderer link generation
```

_Nunca executado automaticamente — exige confirmação explícita do usuário. A mensagem final depende do que a execução do bloco realmente produzir (se apenas testes, `test(...)`; se também houver correção pontual de produção, `fix(...)` ou `feat(...)`, a determinar no fechamento do bloco)._
