# Session 12 — Context Compiler Foundation

Esta sessão inicia a primeira grande evolução pós-`0.2.0` do DDAE Engine: a camada que transforma o estado distribuído de um projeto DDAE (Git, documentação, sessões, decisões, bugs, validações, código) em um pacote de contexto compacto, determinístico, auditável e agnóstico de agente — consumível por Claude Code, Codex ou qualquer outra IA.

A `0.2.0` consolidou a fundação de engenharia do produto: sessões, módulos, validação, auditoria, empacotamento, CI e release verificável. A Session 12 constrói a camada seguinte, que efetivamente melhora o trabalho de um agente de IA sobre um projeto DDAE, em vez de apenas organizar documentação para leitura humana.

## Objetivo

> Transformar o estado distribuído de um projeto DDAE em um contexto operacional compacto, determinístico, auditável e agnóstico de agente, pronto para ser consumido por Claude Code, Codex ou outra IA.

O objetivo da Session 12 como um todo (múltiplos blocos) é entregar a fundação completa do **DDAE Context Compiler**: modelo de dados, coletores (Git, projeto, estado DDAE), motor de relevância determinístico, modelo de autoridade por domínio, renderer e a interface `context build/show/validate`. O **Bloco 01**, especificamente, entrega apenas o contrato — nenhuma linha de código de runtime.

## Motivação

Hoje, um agente de IA que trabalha em um projeto DDAE precisa reconstruir manualmente, a cada sessão de trabalho, o entendimento do estado do projeto: ler `Docs/`, inferir a sessão atual, adivinhar quais decisões ainda são válidas, e decidir sozinho quais arquivos são relevantes para o objetivo em questão. Esse processo é caro, não determinístico entre agentes diferentes, e sujeito a erro — por exemplo, tratar um roadmap antigo como se fosse a decisão vigente.

O Context Compiler resolve isso computando, de forma determinística e offline (sem chamar nenhuma LLM), um pacote de contexto a partir do estado real do projeto. O mesmo HEAD do Git, o mesmo objetivo e a mesma configuração sempre produzem o mesmo contexto — o que torna o resultado auditável e reproduzível, e permite que múltiplos agentes (Claude Code, Codex, outros) partam exatamente do mesmo entendimento do projeto.

## Baseline pós-0.2.0

Estado confirmado imediatamente antes do início desta sessão:

| Item | Valor |
|---|---|
| HEAD | `ea1f4064661339fe75a11bad81279137add1777d` |
| origin/main | `ea1f4064661339fe75a11bad81279137add1777d` |
| Working tree | limpo |
| Tag `v0.2.0` (peeled) | `2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9` |
| NPM `dist-tags.latest` | `0.2.0` |
| `package.json.version` | `0.2.0` |

A tag `v0.2.0` é tratada como imutável durante toda a Session 12: nenhum bloco desta sessão publica, retagueia ou altera a release `0.2.0` já pública.

## Arquitetura conceitual

```text
                        PROJECT
                           │
       ┌───────────────────┼────────────────────┐
       │                   │                    │
       ▼                   ▼                    ▼
      Git                DDAE                  Code
  branch/HEAD        sessions/docs         filesystem
  diff/commits       decisions/bugs        package/config
  clean state        validation/tests      architecture
       │                   │                    │
       └───────────────────┼────────────────────┘
                           │
                           ▼
                DDAE CONTEXT COMPILER
                           │
               ┌───────────┴───────────┐
               │                       │
               ▼                       ▼
          manifest.json            CONTEXT.md
               │                       │
               └───────────┬───────────┘
                           ▼
                    CONTEXT PACKAGE
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
     Claude Code         Codex          Other Agent
```

Princípio central: o Context Compiler **não é uma IA**. Ele não chama nenhum provedor de LLM para decidir o que é relevante. A entrada é Git + filesystem + documentação DDAE + configuração + objetivo declarado; a saída é um pacote de contexto determinístico. A IA entra depois, consumindo o pacote já compilado.

## Escopo desta Session

- Modelo de dados do Manifest v1 (contrato canônico).
- Coletores de Git, projeto e estado DDAE.
- Motor de relevância v1, puramente heurístico (sem embeddings, sem banco vetorial).
- Modelo de autoridade por domínio (não uma escala universal ingênua).
- Renderer Markdown determinístico.
- Interface `ddae-engine context build/show/validate`.
- Guarda de dados sensíveis.
- Smoke real demonstrando um agente recebendo um pacote de contexto suficiente para iniciar uma feature sem reconstruir manualmente o contexto inteiro.
- Preparação de release `0.3.0` (bump de versão ocorre apenas no bloco de release, não antes).

## Fora de escopo

Explicitamente fora desta sessão — ficam para sessões futuras:

- `ddae work prepare` / Work Packets.
- `ddae handoff`.
- Servidor MCP.
- Workspace/Vault Obsidian.
- Embeddings, banco vetorial, Relevance Engine v2 semântico.
- Chamadas a qualquer LLM/API remota dentro do compiler.
- Adapters específicos por agente (Claude-only, Codex-only).
- Execução automática de código, commit automático, deploy automático.

Evolução prevista após esta sessão: Session 13 (Work Packets + Handoff), Session 14 (DDAE MCP Server), Session 15 (Obsidian Knowledge Workspace), Context Engine v2 (integração futura de todas as fontes).

## Blocos

| Bloco | Objetivo | Status |
|---|---|---|
| 01 — Context Model & Architecture | Fechar o contrato: Manifest v1, determinismo, Source Model, Authority Model, budget, fingerprint, Git degradado, `.ddae`/ignore, segurança, staleness, CLI contract | Concluído |
| 02 — Git + Project Collectors | Coletores determinísticos de estado Git e de projeto (stack, filesystem) | Concluído |
| 03 — DDAE State Collector | Coletor de sessão atual, decisões, bugs, validação | Pendente |
| 04 — Authority & Source Model | Implementação do modelo de autoridade por domínio e provenance | Pendente |
| 05 — Relevance Engine v1 | Motor de relevância heurístico e determinístico | Pendente |
| 06 — Context Manifest + Compiler | Orquestração dos coletores em `manifest.json` | Pendente |
| 07 — Markdown Renderer | `CONTEXT.md` derivado do manifesto | Pendente |
| 08 — `context build/show/validate` CLI | Interface de linha de comando | Pendente |
| 09 — Sensitive Data Guard | Exclusão de segredos e conteúdo sensível | Pendente |
| 10 — Real Consumer Smoke | Jornada real de agente contra um projeto fixture | Pendente |
| 11 — Documentation + Release Readiness | Documentação de produto e preparação de release | Pendente |
| 12 — Release `0.3.0` | Bump de versão, publicação controlada | Pendente |

Ver `plano_bloco_12.md` para o detalhamento de cada bloco, `contrato_context_manifest_v1.md` para o contrato técnico do Manifest v1, e `validacao_bloco_01_context_model_architecture.md` para os critérios de aceite verificados do Bloco 01.

## Status atual

Bloco 01 concluído: contrato arquitetural fechado. Bloco 02 concluído: `src/context/git-context.js` e `src/context/project-context.js` implementados como os primeiros collectors reais — determinísticos, read-only, zero-dependency, com modo degradado quando Git não está disponível. `src/schemas/` ainda não existe no repositório. `package.json.version` e `EXPECTED_VERSION` permanecem em `0.2.0` deliberadamente — o bump para `0.3.0` só ocorre no Bloco 12.

## Próximos passos

Bloco 03 — DDAE State Collector: implementar `src/context/ddae-context.js` (sessão atual, decisões, bugs, validações), reaproveitando `src/utils/session.js` sem duplicar sua lógica.
