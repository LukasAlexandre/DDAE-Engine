# ADR — Knowledge, Memory and Context Architecture

> Projeto: DDAE Engine · Atualizado em: 2026-09-26 · Registro correspondente: `DT-02` em `decisoes_tecnicas.md`

> Origem: `session_03_obsidian_workspace_project_brain_0_4_0`. Esta ADR **só formaliza vocabulário, autoridade e direção futura**. Não altera nenhum código, contrato congelado, escopo da `0.4.0` nem a `0.3.0` publicada.

## 1. Status

Vigente. Escopo: decisão conceitual. Nenhuma implementação decorre dela nesta release.

## 2. Contexto

O DDAE já separa, na prática, três coisas que ainda não tinham nome único:

- o **estado canônico** do projeto (`Docs/`, Git, código) — autoritativo;
- o **histórico** do desenvolvimento (sessões, investigações, decisões superadas, observações de agentes);
- o **contexto** entregue a um agente para uma tarefa (`src/context/**`, Context Compiler `0.3.0`).

Com o Project Brain (`0.4.0`) e a possibilidade de memória persistente externa (ex.: Claude-Mem), é preciso fixar essas fronteiras antes que qualquer código dependa delas. O Contrato do Workspace já exclui a entidade "Memory" do Brain (`contrato_workspace_project_brain.md`, Seção C); esta ADR **não reabre** essa exclusão — ela explica por que ela é coerente (Seção 8).

## 3. Definições

### 3.1 Knowledge

**Knowledge é o estado canônico e atual do projeto:** arquitetura vigente, decisões vigentes, contratos, configuração, estado de release, planejamento ativo, constraints, documentação oficial e código/Git quando aplicável.

Propriedades: autoritativo, determinístico, versionável, auditável. **Nunca pode ser silenciosamente sobrescrito por memória histórica.**

### 3.2 Memory

**Memory é o histórico episódico do desenvolvimento:** o que aconteceu em sessões anteriores, investigações, hipóteses, decisões depois substituídas, bugs encontrados, contexto temporário, observações produzidas por agentes.

Propriedades: histórica, potencialmente incompleta, potencialmente *stale*, **não autoritativa**, útil para recuperar contexto. Nunca substitui diretamente o estado canônico.

### 3.3 Context

**Context é o subconjunto relevante de Knowledge + Memory necessário para executar a tarefa atual.**

```text
Knowledge
    +
Memory
    +
Current Task
    ↓
Context Compiler
    ↓
Compiled Context
    ↓
Agent
```

O Context Compiler continua sendo o único responsável por selecionar e limitar o que entra no contexto. Hoje ele consome apenas Knowledge (Git, projeto, `Docs/`); a entrada de Memory é uma extensão futura (Seção 6), não um comportamento atual.

## 4. Hierarquia de autoridade

Em caso de conflito sobre a **mesma afirmação**, prevalece a fonte de menor número:

```text
1. Instrução explícita atual do usuário
2. Estado canônico atual do DDAE (Docs/ vigente)
3. Código/repositório atual (Git)
4. Decisões arquiteturais vigentes
5. Planejamento atual
6. Persistent Memory
7. Histórico de sessões
```

Regra central:

> **Memória histórica nunca pode sobrescrever silenciosamente o estado atual do projeto.**

Exemplo:

```text
Memory:            "PostgreSQL foi escolhido anteriormente."
Knowledge atual:   "MySQL é o banco vigente."
Resultado:         o Context Compiler prioriza MySQL; a memória, se incluída, entra rotulada como histórica.
```

**Compatibilidade com o Context Compiler existente.** O modelo implementado em `src/context/authority.js` resolve conflitos por *domínio da afirmação* (`repository_state`, `architecture_intent`, `active_bug_state`, …), e trata `history` e `future_intent` como **nunca autoritativos sobre o presente**; ele deliberadamente **não** usa ranking numérico entre domínios. A lista acima é um guia de precedência para afirmações concorrentes, não um substituto desse modelo: Persistent Memory e Histórico de sessões mapeiam para o domínio `history`, cuja regra já existe. Nenhuma mudança em `authority.js` é necessária ou proposta.

## 5. Persistent Memory Provider (conceito futuro)

O DDAE deverá, no futuro, tratar memória persistente por uma abstração de provider:

```text
DDAE
  ↓
Persistent Memory Provider
  ├── claude-mem
  ├── none            (padrão — comportamento atual)
  └── future providers
```

`none` é e permanece o comportamento padrão: o DDAE funciona integralmente sem provider algum.

**Nesta release NÃO existe:** interface, adapter, dependência npm, alteração de runtime ou comando de CLI para isso. Esta seção registra apenas a direção.

## 6. Papel do Claude-Mem

Claude-Mem é classificado como **provider recomendado / reference provider inicial** de uma futura camada de persistent memory.

```text
Claude-Mem       = episodic / persistent memory provider
DDAE             = estado canônico do projeto + governança + orquestração de contexto
Context Compiler = seleciona o contexto relevante
Project Brain    = visão humana navegável do estado atual
```

Claude-Mem **não é**: fonte da verdade; dependência obrigatória do core; substituto do Context Compiler; substituto do Project Brain; requisito da `0.4.0`.

### Context Budget — Persistent Memory não é injetada indiscriminadamente

O DDAE deverá controlar relevância, frescor, autoridade, orçamento de tokens e quantidade de memória recuperada:

```text
provider encontra memória relevante
        ↓
DDAE avalia (autoridade, frescor, conflito com Knowledge)
        ↓
Context Compiler seleciona
        ↓
somente a parte necessária entra no contexto
```

O recall do provider é uma *candidatura* de conteúdo, nunca uma inclusão automática. Princípio registrado; **não implementado**.

## 7. Escopo da `0.4.0`

A `0.4.0` continua sendo exclusivamente **Project Brain / Obsidian Workspace** (`visao_produto.md`, Seção 4; Session 03).

**Fora da `0.4.0`:** integração com Claude-Mem; implementação de `MemoryProvider`; `ddae doctor`; instalação automática de ferramentas; agent profiles; framework de Visual QA; security profiles; bootstrap de toolchain.

## 8. Relação com o Project Brain

O Brain é uma visão do **Knowledge** (Docs/ + Git), derivada e recomputável, nunca fonte. A entidade "Memory" permanece **excluída** do Brain: `Docs/` já é a memória durável e versionada do projeto, e memória de agente (episódica, externa) é uma camada distinta, futura e opcional. Esta ADR dá nome a essa camada sem trazê-la para dentro do Brain nem da `0.4.0`.

## 9. Future Agentic Environment

Ideias registradas. **Status: Planned / Future — nenhum compromisso de versão, nenhum item da `0.4.0`.**

| Item | Status |
|---|---|
| Persistent Memory Providers (abstração) | Planned / Future |
| Adapter Claude-Mem | Planned / Future |
| `ddae doctor` / environment health checks | Planned / Future |
| Context Budget (limites de memória recuperada) | Planned / Future |
| Token telemetry | Planned / Future |
| Project Profiles | Planned / Future |
| Security Gates (evolução) | Planned / Future |
| UI/UX Gates / Visual QA | Planned / Future |
| Agent compatibility | Planned / Future |
| Toolchain standards | Planned / Future |

O nome e o número de versão que abrigarão esses itens não foram definidos (ver `visao_produto.md`, "Decisões Pendentes").

## 10. Alternativas consideradas

- **Modelar Memory dentro do Brain / do DDAE core** — descartada: duplicaria `Docs/`, criaria segunda fonte de verdade com risco de drift silencioso (o modo de falha que DT-01 proíbe).
- **Tornar Claude-Mem dependência do core** — descartada: viola zero-dependency, offline e determinismo do pacote; acopla o DDAE a um produto de terceiros.
- **Injetar memória recuperada diretamente no contexto** — descartada: sem avaliação de autoridade/frescor/orçamento, memória stale poderia contradizer Knowledge.
- **Antecipar a interface de provider agora** — descartada: abstração sem segundo uso real é especulação; entra quando houver um consumidor concreto.

## 11. Consequências

- Vocabulário único (Knowledge / Memory / Context) para docs, blocos e futuras decisões.
- Blocos 03–13 da Session 03 seguem inalterados no escopo; o Brain continua sem qualquer conceito de memória persistente.
- Qualquer integração futura de memória deve passar por nova decisão registrada em `decisoes_tecnicas.md` e respeitar a hierarquia da Seção 4.
- Nenhum arquivo de código, teste, contrato congelado ou versão publicada é afetado.
