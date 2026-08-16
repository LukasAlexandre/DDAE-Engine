# Análise Funcional

> Projeto: DDAE · Atualizado em: 2026-08-16

## 1. Project Brain — Definição Técnica

**Project Brain** é o manifesto gerado (`.ddae/brain/manifest.json`, fingerprinted, versionado por schema) e o conjunto de views Markdown (`.ddae/brain/*.md`) derivados dele — um rollup determinístico e read-only do estado atual do projeto DDAE, análogo em espírito ao Context Manifest do Compiler, mas escopado ao **projeto inteiro**, não a um `--goal` específico. Não é um produto de marketing nem um segundo sistema de armazenamento — é uma função pura de `Docs/` + Git + (opcionalmente) `.ddae/context/`.

### 1.1 Mapeamento de Entidades

| Entidade | Já existe no DDAE? | Tratamento no Brain |
|---|---|---|
| Project Overview | Sim — `Docs/01_product/visao_produto.md`, `README.md` | **Linkado**, não duplicado. Home.md aponta para ele. |
| Current State | Não — não existe hoje como artefato único | **Gerado.** Sintetiza: sessão canônica atual, versão Candidate vs. Stable Host, última release, pendências P1/P2 abertas (via `audit`). Valor real: hoje essa reconstrução exige leitura manual de vários arquivos — o que esta própria conversa fez à mão repetidas vezes. |
| Goals | Sim — `visao_produto.md` Seção 3/4 | **Linkado.** |
| Active Session | Sim — já computado por `collectDdaeContext` (`current_session`) | **Derivado**, sem nova coleta. |
| Decisions | Sim — `Docs/04_governance/registro_decisoes.md` + decisões por sessão | **Índice gerado** (lista cronológica com um-linha + link), conteúdo nunca copiado. |
| Architecture | Sim — `Docs/02_architecture/*` | **Linkado.** |
| Dependencies | Parcial — `package.json`, `mapa_dependencias.md` por sessão | **Linkado**, sem grafo de dependências dedicado no MVP — ver `03_ideas/ideias_e_melhorias.md`. |
| Risks | Sim — `Docs/04_governance/matriz_riscos.md` | **Índice gerado** sobre a matriz existente. |
| Open Bugs | Sim, disperso — `07_bugs/bugs_identificados.md` por sessão | **Índice agregado** — hoje não existe um único lugar com todos os bugs abertos de todas as sessões; `collectDdaeContext` já varre sessões, então isso é extensão natural da coleta existente, não nova infraestrutura. |
| Recent Changes | Sim — já coletado por `git-context.js` | **Derivado**, últimos N commits com link para os arquivos `Docs/` tocados quando aplicável. |
| Current Tasks / Next Actions | Sim, dentro do bloco ativo (`Tarefas`/`Critérios de Aceite`) | **Derivado** — Brain lista os itens de checklist não marcados do(s) bloco(s) do momento. |
| Important Files | Parcial — hoje é o que o Relevance Engine já seleciona | **Derivado do Context Compiler quando disponível** (`.ddae/context/manifest.json`); sem Context Package construído, a view mostra "não disponível, rode `context build`" — não reimplementa um segundo motor de relevância. |
| Context Packages | Sim — `.ddae/context/` | **Exibido** (status VALID/STALE/INVALID via `context validate` existente), nunca recomputado pelo Brain. |
| Release State | Parcial — espalhado entre `package.json`, tags, `CHANGELOG.md`, `verify-stable-host.mjs` | **Gerado** — agrega versão publicada, tag, Stable Host, topo do changelog. Alto valor: esta é exatamente a reconstrução manual e trabalhosa feita ao longo de toda a auditoria da `0.3.0` nesta conversa. |
| Memory | **Não existe no DDAE, e não deve.** | **Explicitamente fora de escopo.** `Docs/` já é a memória durável do projeto; um sistema de "memória" separado duplicaria a própria razão de existir do DDAE. Qualquer sistema de memória de agente (ex.: memória do próprio Claude) é uma camada externa e não deve ser modelado dentro do Brain. |
| Timeline | Parcial — Git log + ordem de criação de sessão/bloco | **Gerado**, prioridade mais baixa — sequenciado depois das views essenciais (Current State, Decisions, Risks, Bugs) no roadmap. |

## 2. Fluxos de Usuário Envolvidos

- **Humano abrindo o projeto pela primeira vez**: abre o repositório como Vault no Obsidian → `Home.md` (se `.ddae/brain/` já foi construído) ou `README.md` (se não) → navega por wikilink até sessão ativa/riscos/decisões sem precisar saber a estrutura de pastas de cor.
- **Agente de IA retomando trabalho**: continua lendo `AGENTS.md`/`CLAUDE.md` primeiro (regra já estabelecida, inalterada) — ganha um ponteiro opcional adicional para `.ddae/brain/Home.md` como camada de orientação mais rica quando presente, nunca como substituto do fluxo já obrigatório.
- **Desenvolvedor verificando se o Brain está atualizado**: `ddae-engine workspace validate` — mesma UX de `context validate` (exit 0/1, VALID/STALE/INVALID).

## 3. Project Brain vs. `AGENTS.md`/`CLAUDE.md`/`CONTEXT.md` — Por Que Não é Redundante

| Artefato | Escopo | Quando é gerado | Pergunta que responde |
|---|---|---|---|
| `AGENTS.md`/`CLAUDE.md` | Estático, regras de workflow | Uma vez, no `init`, humano-editável depois | "Como devo trabalhar neste projeto?" |
| `.ddae/context/CONTEXT.md` | Escopado a um `--goal` específico | A cada `context build`, efêmero | "O que preciso saber para *esta* tarefa?" |
| `.ddae/brain/Home.md` | Projeto inteiro, sem goal | A cada `workspace build`, efêmero | "Onde este projeto está agora, de forma geral?" |

Três perguntas diferentes — nenhuma sobreposição a resolver por fusão. `Home.md` referencia os outros dois (link para `AGENTS.md`, instrução de como rodar `context build --goal` para trabalho pontual) em vez de duplicar conteúdo.

## 4. UX de Navegação no Obsidian

Views geradas em `.ddae/brain/` (nomes de arquivo ilustrativos, refinados no Bloco 03 — Schema):

```text
Home.md            → ponto de entrada: sessão ativa, release state, pendências, links para todas as views abaixo
Architecture.md     → link para Docs/02_architecture/
Sessions.md          → índice de todas as sessões com status
Current-Session.md    → detalhe da sessão canônica atual (tarefas do bloco ativo)
Decisions.md           → índice de decisões técnicas/produto
Risks.md                 → índice da matriz de riscos
Bugs.md                   → índice agregado de bugs abertos entre sessões
Roadmap.md                 → link para visao_produto.md
Releases.md                  → release state (versão, tag, Stable Host, changelog)
Context-Packages.md            → status dos Context Packages já construídos, se houver
Recent-Activity.md               → últimos commits/mudanças
```

Nenhuma view é criada "para preencher o Vault" — cada uma corresponde a uma entidade da Seção 1.1 com valor operacional real e não-redundante.

## 5. Contrato de CLI (Proposto, Não Implementado)

| Comando | Input | Output | Escreve em | Read-only? | Idempotente? | Determinístico? | Exit codes |
|---|---|---|---|---|---|---|---|
| `workspace init` | — | Confirmação textual | `.gitignore` (append se ausente), `.ddae/brain/.gitignore` | Não (setup único) | Sim — seguro rerodar | N/A (setup, não geração) | 0 sucesso |
| `workspace build` | Estado atual de `Docs/`+Git+(`--dir`) | Confirmação + resumo do que foi gerado | `.ddae/brain/manifest.json`, `.ddae/brain/*.md` | Não | Sim — mesmo estado de entrada produz mesma saída | Sim — função pura do estado do projeto, sem timestamp de parede no conteúdo | 0 sucesso |
| `workspace validate` | `.ddae/brain/` já construído | Relatório `VALID`/`STALE`/`INVALID` + razões | Nada | **Sim, estritamente** | Sim | Sim | 0 = VALID, 1 = STALE/INVALID (mesmo padrão de `context validate`) |
| `workspace show` | `.ddae/brain/Home.md` já construído | Conteúdo impresso no stdout | Nada | **Sim, estritamente** | Sim | Sim | 0 sucesso, 1 se não construído ainda |

**Comandos avaliados e rejeitados** (superfície mantida mínima, de propósito):

- `workspace sync` — nome sugere merge bidirecional; o modelo é estritamente unidirecional (`Docs/` → Brain). Rejeitado para não induzir a crença de que editar `.ddae/brain/` propagaria de volta.
- `workspace open` — abrir o app Obsidian via CLI é OS-specific e frágil; o usuário já sabe abrir uma pasta no Obsidian sozinho. Fora do MVP.
- `brain build`/`brain show` como verbo separado de `workspace` — criaria dois substantivos para o mesmo conceito. `workspace build` já produz "o Brain" — não há necessidade de um segundo namespace.

## 6. Perguntas Orientadoras

- **Esta funcionalidade já tem requisito formal?** Ainda não — `Docs/01_product/requisitos_funcionais.md` precisa ganhar o(s) requisito(s) correspondente(s) antes da implementação real começar (registrado como decisão pendente do Bloco 01).
- **Existe comportamento ambíguo pendente de decisão de produto?** Não identificado nesta análise — as quatro perguntas centrais (onde o Vault vive, onde a saída gerada vive, o que é o Brain tecnicamente, superfície de CLI) foram todas resolvidas com decisão explícita, não deixadas em aberto.

## 7. Decisões Pendentes

- Nome de arquivo final de cada view (`Home.md` vs. `00-Home.md` com prefixo numérico para ordenação no Obsidian file explorer) — decisão de detalhe, para o Bloco 03 (Schema)/Bloco 04 (Renderer), não bloqueia a arquitetura.
