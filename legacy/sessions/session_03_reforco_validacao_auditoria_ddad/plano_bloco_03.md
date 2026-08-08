# Plano — Bloco 03: Reforço de validação/auditoria DDAD

## 1. Objetivo

Reforçar os comandos de validação e auditoria do DDAD para garantir que os quality gates obrigatórios sejam identificados, validados e auditados de forma padronizada.

## 2. Escopo

- `ddad validate` passa a verificar quality gates obrigatórios.
- `ddad audit` passa a detectar pendências P1/P2 e status dos gates.
- Criação/refinamento dos utilitários internos:
  - `src/utils/markdown-checks.js`
  - `src/utils/quality-gates.js`
- Templates oficiais de quality gates passam a conter:
  - responsável;
  - data;
  - observações.

## 3. Fora de Escopo

- Iniciar o Bloco 04.
- Criar comandos novos de CLI.
- Alterar a arquitetura geral do projeto.
- Resolver pendências históricas não relacionadas a validação/auditoria de gates.
- Adicionar dependências de runtime.

## 4. Abordagem Técnica

1. Inventariar o estado atual com `git status`, `git diff` e `git log --oneline -8`.
2. Reaproveitar a implementação parcial já existente para `markdown-checks.js`, `quality-gates.js`, `validate` e `audit`.
3. Centralizar as regras de quality gates em `src/utils/quality-gates.js`.
4. Centralizar helpers genéricos de Markdown em `src/utils/markdown-checks.js`.
5. Fazer `ddad validate` falhar com erro claro quando gate obrigatório estiver ausente ou sem responsável/data/observações.
6. Fazer `ddad audit` relatar status dos gates e pendências P1/P2 sem transformar todo aviso em erro.
7. Atualizar os templates oficiais de quality gates com campos explícitos de responsável, data e observações.
8. Validar o CLI em diretório temporário gerado por `ddad init`.

## 5. Critérios de Aceite

- A documentação do Bloco 03 não aparece mais como "a definir".
- O comando `ddad validate` valida a presença e consistência mínima dos quality gates obrigatórios.
- O comando `ddad audit` lista pendências P1/P2 e status dos gates.
- Os templates oficiais de quality gates contêm campos de responsável, data e observações.
- O projeto permanece sem erros nos checks disponíveis.
- Existe feedback final do bloco em Markdown.
