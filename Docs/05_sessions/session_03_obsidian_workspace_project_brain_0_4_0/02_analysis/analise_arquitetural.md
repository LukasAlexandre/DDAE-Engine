# Análise Arquitetural

> Projeto: DDAE · Atualizado em: 2026-08-16

## 1. Impactos na Arquitetura

Introduz uma nova família de comandos (`workspace`) e um novo diretório de saída gerada (`.ddae/brain/`), seguindo exatamente o precedente já estabelecido pelo Context Compiler (`0.3.0`): `Docs/` continua sendo a única fonte de verdade versionada; tudo que o DDAE gera para consumo (humano via Obsidian, ou agente via arquivo) é efêmero, gitignored, e recomputável a qualquer momento sem perda de estado. Nenhum componente existente (`context/**`, `session`/`block`/`prompt`/`feedback`/`validate`/`audit`) muda de comportamento.

## 2. Componentes Novos ou Alterados

| Componente | Tipo de mudança | Justificativa |
|---|---|---|
| `src/workspace/discover.js` | Novo | Descobre e classifica documentos DDAE relevantes ao Brain (sessões, decisões, riscos, bugs, release state) — reaproveita `collectDdaeContext`/`collectGitContext` já existentes em vez de reimplementar a varredura. |
| `src/workspace/brain-schema.js` | Novo | Schema versionado do manifesto do Brain (`schema_version`, fingerprint, entidades), espelhando `src/schemas/context-schema.js`. |
| `src/workspace/fingerprint.js` | Novo | Fingerprint determinístico do Brain — reaproveita o algoritmo de `src/context/fingerprint.js` (mesma função `sha256Hex`/payload canônico), não uma reimplementação paralela. |
| `src/workspace/compiler.js` | Novo | Orquestrador — chama `discover.js`, valida contra `brain-schema.js`, computa o fingerprint, devolve o Brain Manifest. Equivalente direto a `src/context/compiler.js`; sem ele, `discover`/`schema`/`fingerprint` ficariam sem um ponto único de composição, replicando o mesmo papel que `compiler.js` já cumpre para o Context Compiler. |
| `src/workspace/renderer.js` | Novo | Função pura Manifest → múltiplos arquivos Markdown (Home, índices) — mesmo padrão de `src/context/renderer.js` (função pura, sem I/O). |
| `src/workspace/validator.js` | Novo | Kernel VALID/STALE/INVALID para o Brain — ver Seção 8 (reaproveitamento do modelo, não do código literal, do Context Validator). |
| `src/commands/workspace.js` | Novo | CLI (`workspace init/build/validate/show`), integrado a `src/cli.js`, mesmo padrão de `src/commands/context.js`. |
| `src/context/sensitive-files.js` | Reaproveitado, não alterado | Containment de path/symlink fail-closed reaproveitado pelo Brain ao gerar wikilinks — nenhuma mudança na Guard existente, apenas um novo consumidor. |
| `.ddae/brain/` | Novo diretório em runtime (não em `src/`) | Saída gerada, efêmera, self-`.gitignore`d — nunca parte do pacote npm. |

## 3. Impacto em Contratos Existentes

Nenhum. `context build/show/validate` continuam com o mesmo comportamento e schema. O único ponto de contato é read-only: o Brain, quando presente, lê `.ddae/context/manifest.json` (se já construído) para popular a view "Context Packages" — nunca escreve nele, nunca depende dele para existir (`workspace build` funciona mesmo que `context build` nunca tenha sido rodado).

## 4. Modelo de Fonte de Verdade

```text
Docs/                      → CANONICAL. Autoritativo para todo estado de engenharia.
                              Humano + DDAE-autorado, versionado, git-tracked.

.ddae/context/              → EFÊMERO. Cache de máquina, gitignored, escopo por goal.
                              (já existe, 0.3.0 — precedente direto)

.ddae/brain/                → EFÊMERO. Cache de máquina, gitignored, escopo por projeto
                              inteiro (não por goal). NOVO nesta sessão.

node_modules/ddae-engine/   → EFÊMERO. Binário do Stable Host, gitignored.
                              (já existe — mesmo princípio)

.obsidian/                  → EFÊMERO/local. Estado do próprio app Obsidian,
                              gitignored por padrão pelo `workspace init`.
```

Regra central: **`Docs/` e Git são sempre autoritativos; `.ddae/brain/` é sempre uma view, nunca uma fonte.** Isso elimina estruturalmente o cenário "DDAE state != Obsidian state sem detecção": ou o Brain foi recomputado a partir do estado atual (portanto está em sincronia por construção), ou está desatualizado e isso é reportado como `STALE`/`INVALID` por `workspace validate` — nunca existe um terceiro estado onde diverge silenciosamente.

## 5. Modelos de Integração Avaliados

| Modelo | Descrição | Veredito |
|---|---|---|
| **A — Vault gerado separado** | DDAE copia/gera todo o conteúdo em uma árvore paralela dedicada ao Obsidian. | **Rejeitado.** Duplica 100% do conteúdo de `Docs/`, garante risco de drift (exatamente o modo de falha proibido), dobra armazenamento, contradiz "DDAE = fonte de verdade" ao criar uma segunda cópia navegável. |
| **B — `Docs/` como Vault direto** | Apontar o Obsidian para `Docs/` como raiz do Vault. | Parcialmente adotado (ver Modelo escolhido, Seção 6) — zero duplicação, wikilinks/backlinks/graph funcionam nativamente sobre o conteúdo canônico sem nenhum passo de geração. Insuficiente sozinho: não produz as views agregadas (Home, Current State) que não existem hoje como arquivo. |
| **C — Workspace separado `.ddae/workspace/`** | Estrutura própria, paralela a `Docs/`, espelhando conteúdo. | **Rejeitado** pelo mesmo motivo do Modelo A — é a mesma duplicação, só realocada. |
| **D — Symlink/junction controlado** | Link simbólico entre `Docs/` e uma pasta "vault". | **Rejeitado.** Frágil entre plataformas: junctions/symlinks no Windows frequentemente exigem privilégio elevado ou Developer Mode; Git trata symlinks de forma inconsistente entre SOs. Este projeto já eliminou deliberadamente fragilidade cross-platform equivalente (Bloco 01 da Session 02, "Cross-Platform Self-Host Docs Casing") — reintroduzi-la aqui contradiria essa decisão anterior. O CI cobre `windows-latest`/`macos-latest`/`ubuntu-latest` como cidadãos de primeira classe; um design symlink-based não é. |
| **E — Camada de índice/navegação gerada sobre `Docs/`** | Não move nem duplica conteúdo canônico; gera apenas arquivos de navegação (índices, Home) que apontam para ele via wikilink. | Adotado, com uma subdecisão crítica: **onde** esses arquivos gerados residem (ver Seção 6). |
| **F — Híbrido** | — | O modelo escolhido já é um híbrido de B + E (ver Seção 6) — não é uma opção separada, é a composição das duas que sobreviveram à análise. |

## 6. Modelo Escolhido

```text
Vault root = raiz do repositório
    │
    ├── Docs/                 ← navegado diretamente pelo Obsidian, SEM geração,
    │                            SEM cópia — é o mesmo arquivo, a mesma autoridade
    │
    └── .ddae/brain/           ← views geradas (Home, índices), também visíveis
                                  ao Obsidian por estarem dentro do vault root,
                                  mas claramente separadas do conteúdo canônico
```

Apontar o Vault para a **raiz do repositório** (não para `Docs/` isoladamente) resolve o Modelo B sozinho não resolver: o Obsidian enxerga tanto `Docs/` (canônico) quanto `.ddae/brain/` (gerado) no mesmo Vault, permitindo que Home.md linke diretamente para arquivos reais de `Docs/` via wikilink relativo, sem duplicar uma linha sequer de conteúdo.

`.ddae/brain/` segue exatamente o padrão já usado por `.ddae/context/`: efêmero, self-`.gitignore`d (o próprio `workspace build`/`init` escreve `.ddae/brain/.gitignore`, igual ao mecanismo já usado pelo Context Compiler — o consumidor do DDAE nunca precisa lembrar de ignorá-lo manualmente), sempre recomputável, nunca a fonte de verdade.

## 7. Machine-Generated vs. Human-Authored — Política de Ownership

```text
Docs/                    HUMAN + DDAE AUTHORED   — editável livremente, é o registro real
.ddae/context/            MACHINE GENERATED        — nunca editar à mão (já era a regra, 0.3.0)
.ddae/brain/               MACHINE GENERATED        — nunca editar à mão (nova, mesma regra)
node_modules/ddae-engine/  CACHE                     — efêmero, reinstalável
.obsidian/                 EPHEMERAL/LOCAL           — preferência de máquina, nunca projeto
```

O risco citado no prompt original — "usuário edita um artefato gerado e o DDAE sobrescreve silenciosamente" — é resolvido estruturalmente, não por convenção frágil: arquivos gerados vivem exclusivamente em diretórios gitignored e já documentados como "não editar" (mesma classe que `.ddae/context/CONTEXT.md` hoje, que ninguém edita à mão). Reforço concreto: `workspace build` deve imprimir um aviso explícito ("regenerando `.ddae/brain/` — não edite estes arquivos à mão, eles são recriados a cada build"), igual em espírito ao aviso já implícito no próprio nome de `.ddae/`.

## 8. Arquivos Específicos do Obsidian

| Item | Tratamento |
|---|---|
| `.obsidian/` (pasta raiz de config) | `workspace init` adiciona ao `.gitignore` (se ainda não coberta) — é preferência de máquina, não estado de projeto, mesmo raciocínio já aplicado a `node_modules/ddae-engine/`. |
| `plugins/`, `themes/`, `hotkeys`, `appearance.json`, `graph.json`, `workspace.json` | DDAE nunca gera, nunca lê, nunca requer. Ficam inteiramente sob controle do usuário/máquina. |
| Templates Obsidian (`Templates/` do usuário) | Fora de escopo — DDAE não gerencia templates de terceiros. |
| Plugins obrigatórios para o MVP | **Nenhum.** Todo o valor (wikilinks, backlinks, tags, frontmatter, Graph View) é núcleo do Obsidian vanilla — sem exigir Dataview, Templater ou qualquer plugin community. Isso preserva "Obsidian instalado = melhoria opcional" sem adicionar uma segunda dependência opcional dentro da própria integração. |

Uma equipe pode, por decisão própria e fora do controle do DDAE, optar depois por commitar uma config `.obsidian/` compartilhada (tema/plugins padronizados do time) — isso não é impedido, só não é o padrão que `workspace init` assume.

## 9. Links, Graph e Frontmatter

- Wikilinks gerados por `.ddae/brain/*.md` **sempre usam caminho completo relativo ao vault root com alias de exibição** (`[[Docs/05_sessions/session_02_.../README|Session 02]]`), nunca o nome de arquivo isolado (`[[README]]`). Motivo concreto: o Obsidian resolve links por nome-base quando ambíguo, e este projeto já tem múltiplos `README.md`/`fechamento_sessao.md` (um por sessão) — um link ambíguo apontaria para o arquivo errado silenciosamente. Caminho completo elimina essa classe de bug por construção.
- Tags/frontmatter: DDAE pode anotar os arquivos que **ele mesmo gera** (`.ddae/brain/*.md`) com frontmatter (`type: brain-view`, `generated: true`) para permitir queries do Graph View — nunca injeta frontmatter em arquivos de `Docs/` (isso seria mutar conteúdo canônico como efeito colateral de uma feature de navegação, um limite que não deve ser cruzado).
- O DDAE continua funcionando 100% sem o usuário nunca abrir o Obsidian — Graph View/backlinks são só uma forma a mais de navegar arquivos que já existem e já são úteis lidos diretamente.

## 10. Integração com o Context Compiler

```text
Project Brain
      │
      │  lê (read-only), quando presente
      ▼
.ddae/context/manifest.json  (se `context build` já rodou)
```

Sentido único: o Brain **consome** o Context Compiler quando disponível (para popular a view "Context Packages" com o status VALID/STALE/INVALID já calculado pelo `context validate` existente — sem reimplementar essa lógica), mas o Context Compiler **nunca depende do Brain** — `context build/show/validate` continuam funcionando de forma idêntica se o Workspace nunca foi inicializado. Nenhuma dependência circular. As propriedades centrais do Compiler (determinístico, puro, offline, sem LLM, sem rede) permanecem inteiramente do lado do Compiler — o Brain não adiciona nenhuma dessas exigências a ele, nem herda exigências diferentes das suas próprias (o Brain também é determinístico e offline, mas isso é uma decisão própria, não emprestada).

## 11. Perguntas Orientadoras

- **Esta mudança é reversível com baixo custo?** Sim, por construção: `.ddae/brain/` e `.obsidian/` são inteiramente efêmeros/gitignored — "desinstalar" a feature é apagar dois diretórios locais, sem estado a recuperar, sem migração a reverter.
- **Contradiz alguma decisão arquitetural anterior?** Não — estende exatamente o mesmo princípio de duas camadas (canônico vs. efêmero-gerado) já estabelecido pelo Context Compiler e pelo Stable Host, em vez de inventar um terceiro modelo.

## 12. Decisões Pendentes

Nenhuma nesta análise — decisões registradas como definitivas para o escopo desta sessão. Refinamentos possíveis (ex.: extração de um kernel de freshness compartilhado entre `context/validator.js` e `workspace/validator.js`) ficam explicitamente propostos como trabalho de implementação futura (Bloco 07 — ver `04_planning/plano_execucao.md`), não como pergunta em aberto.
