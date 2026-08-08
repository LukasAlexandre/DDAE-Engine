# Levantamento Inicial

> Projeto: DDAE · Atualizado em: 2026-08-08

> Preencha isto antes de planejar blocos. O objetivo é capturar o que se sabe (e o que não se sabe) antes de comprometer um plano de execução.

## 1. Contexto

O bootstrap de self-hosting (`legacy/sessions/session_13_ddae_self_hosting_bootstrap/`) foi concluído e fechado. O Context Compiler (`0.3.0`) precisa retomar de onde o predecessor legacy (`legacy/sessions/session_12_context_compiler_foundation/`) parou. Antes disso, um achado técnico durante a revisão do fechamento levantou dúvida sobre a portabilidade real da estrutura `Docs/` criada — originou esta sessão e seu primeiro bloco.

## 2. Necessidades Levantadas

- Confirmar, com evidência técnica (não suposição), qual casing exato está armazenado na árvore Git para o control plane canônico.
- Garantir que a estrutura funcione em qualquer sistema operacional, não apenas no Windows onde todo o bootstrap foi executado.
- Preservar 100% do conteúdo (canônico e legacy) durante qualquer correção estrutural necessária.

## 3. Perguntas Abertas

- `Docs/` e `docs/` conseguem coexistir como paths distintos no Git de forma prática, ou isso é uma fragilidade estrutural mesmo depois de corrigido? — Respondida durante o Bloco 01: não é praticável em filesystem case-insensitive; a solução adotada evita a coexistência por completo (`legacy/` como nome distinto, não variante de case).

## 4. Fontes Consultadas

`git ls-tree HEAD`, `src/commands/init.js`, `src/commands/session.js`, `src/commands/validate.js`, `src/commands/audit.js`, `src/commands/block.js` (para confirmar o path hardcoded `'Docs'` usado pelo CLI).

## 5. Primeiras Hipóteses de Escopo

Corrigir apenas a estrutura de diretórios (Bloco 01), sem tocar em `src/`, antes de retomar a implementação do Context Compiler propriamente dito (Bloco 02 em diante).

## 6. Decisões Pendentes

Nenhuma remanescente após o Bloco 01 — ver Seção 10 do feedback do bloco (`08_feedbacks/feedback_bloco_01_...md`).
