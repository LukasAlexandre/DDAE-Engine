# Ideias e Melhorias

> Projeto: DDAE · Atualizado em: 2026-08-16

## 1. Ideias Propostas

| ID | Ideia | Origem | Prioridade sugerida |
|---|---|---|---|
| ID-01 | File watcher para rebuild incremental automático do Brain | Prompt do usuário (Seção 17, "não implementar watcher sem justificativa") | P4 |
| ID-02 | Rebuild incremental (hash por arquivo, só recomputa o que mudou) | Análise de performance (RS-05) | P4 |
| ID-03 | Plugin oficial do Obsidian para o DDAE | Prompt do usuário (Seção 9) | P4 |
| ID-04 | MCP Server integrado ao Workspace | Roadmap geral (`visao_produto.md`, fora de escopo desde a Session 02) | P4 |
| ID-05 | Grafo de dependências real (não apenas `mapa_dependencias.md` textual) | Análise funcional (entidade "Dependencies") | P3 |
| ID-06 | `workspace open` (abrir o Obsidian via CLI) | Análise funcional (Seção 5, CLI rejeitado) | P4 |
| ID-07 | Kernel de freshness compartilhado entre Context Validator e Workspace Validator | Análise técnica (RS-07) | P3 |
| ID-08 | Timeline cronológica dedicada (Git + criação de sessão/bloco) | Análise funcional (entidade "Timeline") | P3 |

## 2. Detalhamento

### ID-01 — File watcher
- **Descrição:** Observar `Docs/` e rodar `workspace build` automaticamente a cada mudança.
- **Por que não está no escopo desta sessão:** Instrução explícita do usuário para não implementar watcher sem justificativa concreta; nenhuma evidência de que o modelo pull (`workspace build` sob demanda + `validate` para detectar staleness) seja insuficiente na prática.
- **Onde poderia ser endereçada:** Bloco futuro, condicionado a feedback real de uso após o MVP existir.

### ID-02 — Rebuild incremental
- **Descrição:** Recomputar apenas as views cujo conteúdo-fonte mudou, em vez de regenerar tudo.
- **Por que não está no escopo desta sessão:** Nenhuma evidência de lentidão real (RS-05) — DDAE hoje tem dezenas de arquivos `Docs/`, não milhares. Otimizar sem medição é otimização prematura.
- **Onde poderia ser endereçada:** Bloco futuro, gatilhado por medição real, não por suposição.

### ID-03 — Plugin oficial do Obsidian
- **Descrição:** Plugin community (`ddae-engine` para Obsidian) para UX mais rica (comandos, status bar).
- **Por que não está no escopo desta sessão:** Contradiz diretamente a restrição "prefer vanilla Obsidian" do MVP; exigiria manter uma segunda superfície de distribuição (plugin store) fora do npm.
- **Onde poderia ser endereçada:** Sessão dedicada, só depois do MVP baseado em Markdown puro provar valor.

### ID-04 — MCP Server
- **Descrição:** Expor o estado do DDAE (incluindo o Brain) via Model Context Protocol.
- **Por que não está no escopo desta sessão:** Já reservado para além da `0.4.0` desde `visao_produto.md`; escopo explicitamente fechado pela Session 02 ("Context Compiler não inclui MCP nem Obsidian").
- **Onde poderia ser endereçada:** Versão futura, própria sessão.

### ID-05 — Grafo de dependências real
- **Descrição:** Analisar `package.json`/imports para construir um grafo de dependências navegável.
- **Por que não está no escopo desta sessão:** Baixo valor imediato para um projeto com zero dependências de runtime (o próprio DDAE) — mais relevante para projetos consumidores complexos, sem prova de necessidade ainda.
- **Onde poderia ser endereçada:** Bloco futuro, se um consumidor real pedir.

### ID-06 — `workspace open`
- **Descrição:** Comando que tenta abrir o app Obsidian automaticamente.
- **Por que não está no escopo desta sessão:** OS-specific, frágil (caminho de instalação do Obsidian varia), baixo valor sobre simplesmente abrir a pasta manualmente.
- **Onde poderia ser endereçada:** Só se usuários pedirem repetidamente — não antecipado.

### ID-07 — Kernel de freshness compartilhado
- **Descrição:** Extrair o padrão VALID/STALE/INVALID + ordenação de prioridade em um módulo compartilhado entre `context/validator.js` e `workspace/validator.js`.
- **Por que não está no escopo desta sessão:** Refatorar o Context Compiler (já publicado, estável) sem um segundo uso real lado a lado ainda é prematuro — mas registrado explicitamente para o Bloco 07, não esquecido.
- **Onde poderia ser endereçada:** Bloco 07 (Workspace Validator), com os dois usos reais já existindo para guiar a extração correta.

### ID-08 — Timeline dedicada
- **Descrição:** View cronológica combinando commits + criação de sessões/blocos.
- **Por que não está no escopo desta sessão:** Menor prioridade que Current State/Decisions/Risks/Bugs — view "bonus", não essencial ao MVP.
- **Onde poderia ser endereçada:** Bloco tardio do roadmap desta mesma sessão (ver `04_planning/plano_execucao.md`), se tempo permitir, ou sessão de polish futura.

## 3. Perguntas Orientadoras

- **Alguma ideia resolve um problema real já observado?** Sim — ID-07 nasce de um risco técnico concreto (RS-07), não de especulação; as demais são adiadas por falta de evidência de necessidade, não por serem ruins.
- **Alguma deveria virar requisito formal?** Nenhuma nesta lista — todas são explicitamente pós-MVP.

## 4. Decisões Pendentes

Nenhuma — todas as ideias têm destino definido (P3/P4, sessão/bloco futuro condicional).
