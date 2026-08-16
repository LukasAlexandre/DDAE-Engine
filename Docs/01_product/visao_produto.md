# Visão de Produto

> Projeto: DDAE Engine · Atualizado em: 2026-08-16

> Preencha este documento antes de criar o primeiro bloco de implementação. Ele é a referência que justifica todo requisito funcional.

## 1. Problema

Um agente de IA que trabalha em um projeto de software precisa, a cada sessão de trabalho, reconstruir manualmente o entendimento do estado do projeto: ler documentação dispersa, inferir decisões vigentes, adivinhar o que é histórico e o que é atual. Esse processo é caro, não determinístico entre agentes diferentes, e sujeito a erro (por exemplo, tratar um roadmap antigo como se fosse a decisão vigente). Isso importa agora porque o desenvolvimento assistido por IA deixou de ser exceção — mas a infraestrutura de contexto e governança para esse tipo de trabalho ainda não existe como disciplina de engenharia.

## 2. Visão

O DDAE Engine estrutura o desenvolvimento de software (feito por humanos e por agentes de IA) em sessões e blocos auditáveis, com validação, auditoria e — a partir da `0.3.0` — um compilador de contexto determinístico que transforma o estado real de um projeto (Git, documentação, decisões) em um pacote consumível por qualquer agente de IA, sem depender de prompts gigantes ou interpretações divergentes entre Claude Code, Codex ou outros agentes.

## 3. Objetivos

- [x] Objetivo 1: Scaffold determinístico e auditável de documentação de projeto (`Docs/`), com sessões e módulos internos claramente distintos (entregue na `0.2.0`).
- [x] Objetivo 2: Validação e auditoria automatizadas da estrutura do projeto (`validate`/`audit`), com detecção não-destrutiva de layouts legados (entregue na `0.2.0`).
- [x] Objetivo 3: Compilar o estado de Git, projeto e DDAE em um pacote de contexto determinístico e reproduzível, consumível por qualquer agente de IA sem chamar nenhuma LLM no próprio compiler (entregue na `0.3.0`).
- [ ] Objetivo 4: Integração oficial DDAE ↔ Obsidian como workspace de "Project Brain" — Vault estruturado, alinhado ao estado real do projeto (`0.4.0`, planejado).

## 4. Roadmap Oficial

| Versão | Nome | Escopo principal | Status |
|---|---|---|---|
| `0.2.0` | Engineering Foundation | Sessões e módulos corrigidos, CI multiplataforma, empacotamento e publicação protegidos, distribuição validada de ponta a ponta | **Released** |
| `0.3.0` | Context Compiler | Git + Project collectors, DDAE state collector, Source/Authority model, Relevance Engine v1, Context Manifest, fingerprint, Markdown renderer, `context build/show/validate`, Sensitive Data Guard, validação com consumidor real e com o próprio DDAE (self-hosting) | **Released** |
| `0.4.0` | Obsidian Workspace / Project Brain | Integração oficial DDAE ↔ Obsidian; workspace "Project Brain"; Vault estruturado gerado/alinhado pelo DDAE; visões de estado atual/dashboard; sessões, decisões, bugs, roadmap e base de conhecimento; consumo dos outputs/contratos do Context Compiler onde aplicável | **Planned** |

Este roadmap é a fonte de direção de produto vigente, registrada pelo próprio DDAE Engine (via `ddae-engine session create`, Stable Host `0.2.0`) em `session_01_ddae_self_hosting_bootstrap` (`Docs/05_sessions/`). Documentação histórica anterior (`docs/sessions/`, incluindo referências a uma futura "Session 15 — Obsidian Knowledge Workspace" com numeração diferente) descreve planejamento de uma fase anterior do projeto, antes deste roadmap versionado existir — esse histórico não é reescrito; este documento substitui apenas a **intenção futura**, não a história já registrada.

## 5. Critérios de Aceite da Visão

- [x] O problema está descrito em termos de quem sente a dor (o agente de IA e quem depende dele), não apenas da solução.
- [x] A visão é específica o suficiente para rejeitar uma alternativa óbvia: um "prompt gigante" reconstruído manualmente a cada sessão não é o mesmo que um contexto compilado deterministicamente.
- [x] Os objetivos são verificáveis (entregue/não entregue), não aspiracionais.

## 6. Riscos

Risco de o roadmap divergir da execução real se blocos futuros não atualizarem esta tabela — mitigado pelo próprio hábito de sessão → bloco → validação já em uso desde a Session 10/11/12/13. Risco de confundir este roadmap versionado com o planejamento histórico anterior (`docs/sessions/`) — mitigado pela nota explícita na Seção 4.

## 7. Decisões Pendentes

Nome definitivo da versão que sucede `0.4.0` (Context Engine v2, integrando DDAE + Git + Código + Obsidian + histórico de agentes) — mencionado em discussões anteriores, mas ainda não comprometido como meta de versão numerada.
