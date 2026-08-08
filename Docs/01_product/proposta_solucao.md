# Proposta de Solução

> Projeto: DDAE Engine · Atualizado em: 2026-08-08

> Preencha depois de `visao_produto.md`. Esta proposta é a resposta concreta ao problema descrito lá — não uma lista de features desconectadas.

## 1. Solução Proposta

`ddae-engine init` estrutura um projeto em `Docs/`, com sessões numeradas (`Docs/05_sessions/session_NN_slug/`) contendo 13 módulos internos padronizados (intake, análise, ideias, planejamento, blocos, prompts, bugs, feedbacks, validação, testes, segurança, performance, release). `ddae-engine validate`/`audit` verificam a conformidade dessa estrutura, detectando duplicidade, módulos ausentes e layouts legados sem apagar nada automaticamente. A partir da `0.3.0`, `ddae-engine context build --goal "<objetivo>"` compila esse estado — mais Git, mais estrutura de código do projeto — em um pacote de contexto determinístico (`manifest.json` + `CONTEXT.md`) que um agente de IA consome diretamente, sem precisar reconstruir esse entendimento por conta própria a cada sessão de trabalho.

## 2. Diferenciais

Frente à alternativa de "não fazer nada" (cada agente/sessão reconstrói contexto do zero, de forma não determinística): o mesmo HEAD do Git, o mesmo objetivo declarado e a mesma configuração sempre produzem o mesmo contexto compilado — auditável e reproduzível. Frente a soluções baseadas em busca semântica/embeddings: o Context Compiler v1 é deliberadamente determinístico e offline (zero chamadas a LLM dentro do compiler), o que o torna mais barato, mais rápido e mais fácil de depurar quando o resultado está errado — o motivo do erro é sempre rastreável a uma regra, nunca a uma inferência de modelo.

## 3. Perguntas Orientadoras

- Por que compilação determinística e não busca semântica desde já? Porque a Relevance Engine v1 (heurística) já resolve a maior parte do valor prático sem a complexidade e o custo de um pipeline de embeddings — essa camada fica reservada para uma "Relevance Engine v2" futura, deliberadamente fora do escopo da `0.3.0`.
- Que parte é a mais arriscada de construir? O Authority Model por domínio (Bloco 04 do Context Compiler) — decidir corretamente qual fonte é autoritativa sobre um fato (Git, decisão aprovada, roadmap histórico) é mais sutil do que uma escala numérica simples, e um erro aqui produz contexto enganoso para o agente consumidor.
- O que uma ferramenta de documentação genérica faria diferente? Trataria toda documentação como igualmente relevante e igualmente atual — o DDAE distingue explicitamente decisão vigente de histórico superado.

## 4. Critérios de Aceite

- [x] A solução proposta resolve diretamente o problema descrito em `visao_produto.md`: substitui reconstrução manual de contexto por compilação determinística.
- [x] Os diferenciais são verificáveis: determinismo é testável (mesmo input → mesmo output byte-a-byte), auditado por testes automatizados desde o Bloco 05 do Context Compiler.
- [x] Não há funcionalidade descrita aqui sem requisito correspondente planejado em `requisitos_funcionais.md` (a preencher conforme os blocos do Context Compiler avançarem).

## 5. Riscos

Complexidade do Authority Model por domínio (ver Seção 3) — mitigado por um caso de teste nomeado obrigatório desde o desenho do contrato (decisão de sessão cookie HttpOnly vs. roadmap antigo de JWT). Risco de escopo se espalhar para embeddings/MCP/Obsidian antes da hora — mitigado por fora-de-escopo explícito em cada sessão (Context Compiler não inclui MCP nem Obsidian; esses ficam reservados para versões e sessões futuras conforme o roadmap em `visao_produto.md`).

## 6. Decisões Pendentes

Nenhuma decisão pendente nesta camada de proposta além das já registradas como "Decisões Pendentes" em `visao_produto.md` (nome da versão pós-`0.4.0`).
