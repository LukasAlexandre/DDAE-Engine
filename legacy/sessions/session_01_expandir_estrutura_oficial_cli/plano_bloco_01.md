# Plano — Bloco 01: Expandir Estrutura Oficial DDAD e Comandos Principais do CLI

## 1. Objetivo

Evoluir o `ddad init` da estrutura simples do Bloco 00 (`ddad/docs/`) para a estrutura oficial completa da metodologia DDAD (`Docs/00_ddad` a `Docs/99_archive`), e adicionar os comandos de ciclo de vida de sessão/bloco/prompt/feedback, mais os comandos de verificação `validate` e `audit`.

## 2. Escopo

- Estrutura oficial `Docs/` com 11 pastas principais e 10 sessões base.
- Estrutura interna padrão de sessão (13 subpastas + README).
- Comandos: `session create`, `block create`, `prompt create`, `feedback create`, `validate`, `audit`.
- Templates oficiais: bloco, prompt, feedback, validação, sessão, 7 quality gates.
- Atualização do README principal e dos arquivos de regras de agente (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`).
- Documentação de fechamento do bloco (feedback + validação + README de sessão).

## 3. Fora de Escopo

- Comando gerador para o template de validação (`validacao_template.md`) — não solicitado pela spec deste bloco, registrado como pendência P2 para bloco futuro.
- Testes automatizados do CLI (unit/integration) — registrado como pendência P2.
- Publicação real no npm — registrado como pendência P3.
- Modo interativo de criação (prompts no terminal) — registrado como pendência P4.

## 4. Abordagem Técnica

1. Gerar os templates estáticos (`docs_root`, `session`, `quality_gates`, `block`, `prompt`, `feedback`, `validation`) como arquivos `.md` em `src/templates/`.
2. Criar utilitários compartilhados: `slugify`/`pad2`/`renderTemplate` (`src/utils/text.js`), detecção de naming (`src/utils/naming.js`), e a lista de sessões base + scaffold de sessão (`src/utils/session.js`).
3. Estender `fs-helpers.js` com `writeText` (escrita não destrutiva de um único arquivo) e `nextSequence` (próximo número de sessão/bloco).
4. Reescrever `init` para copiar `docs_root` + `quality_gates` para `Docs/` e gerar as 10 sessões base via `scaffoldSession`.
5. Implementar `session create`, `block create`, `prompt create`, `feedback create` reaproveitando os mesmos utilitários (numeração automática, slugify, validação de existência de sessão/bloco).
6. Implementar `validate` (regras de bloqueio: estrutura ausente, naming com espaço/acento) e `audit` (regras de observação: README/estrutura de sessão, blocos sem prompt/feedback, prompts/feedbacks órfãos, quality gates ausentes).
7. Atualizar `src/cli.js` com o roteamento dos novos comandos e o texto de ajuda.
8. Atualizar os templates de regras de agente e o README principal.
9. Remover a estrutura obsoleta `src/templates/docs/`.
10. Executar a bateria de validações da spec (seção 10) e registrar resultados.
11. Gerar a documentação de fechamento (feedback + validação + README de sessão).

## 5. Riscos Identificados

- **Volume de arquivos gerado por `init`** (259 arquivos): mitigado simplificando o relatório de saída para contagem em vez de listagem item a item.
- **Duplicação de templates de sessão** (10 sessões × 21 arquivos): mitigado com um único template genérico renderizado em runtime.
- **Falsos positivos no `validate`/`audit`** para nomes convencionais como `README.md`: identificado durante a própria bateria de testes deste bloco e corrigido (ver feedback, seção 11).

## 6. Critérios de Aceite

Ver seção 11 da spec do Bloco 01 — todos os itens foram verificados na bateria de validações e estão registrados em `validacao_bloco_01_expandir_estrutura_oficial_cli.md`.
