# Glossário DDAE Engine

> Projeto: ddae-self-host-scaffold · Atualizado em: 2026-08-08

## 1. Termos da Metodologia

| Termo | Significado |
|---|---|
| **DDAE Engine** | Document-Driven AI Engineering Engine — metodologia onde documentos versionados são a fonte da verdade, e o código implementa o que eles descrevem. |
| **Sessão** | Trabalho real do projeto (ex.: autenticação, dashboard). Pasta em `Docs/05_sessions/session_NN_<nome>/`, criada sob demanda com `ddae-engine session create` — nunca pré-criada pelo `init`. A primeira sessão de um projeto é sempre `session_01`. |
| **Módulo** | Categoria interna que organiza o conteúdo de uma sessão (ex.: `05_blocks`, `09_validation`). Sempre as mesmas 13 pastas, geradas automaticamente dentro de cada sessão. Não é uma sessão e nunca é contado na numeração de sessões. |
| **Bloco** | Unidade de execução com escopo fechado, critérios de aceite e fechamento documentado. Arquivo em `05_blocks/bloco_NN_<nome>.md`. |
| **Prompt** | Instrução executável gerada a partir de um bloco, pronta para ser usada por um agente de IA. Arquivo em `06_prompts/prompt_<bloco>.md`. |
| **Feedback** | Registro do que foi de fato implementado em um bloco: arquivos alterados, decisões, problemas, pendências. Arquivo em `08_feedbacks/feedback_<bloco>.md`. |
| **Validação** | Decisão formal sobre o status de um bloco (aprovado, aprovado com ressalvas, reprovado, bloqueado) e se ela libera o próximo. |
| **Quality Gate** | Checklist de aprovação para uma área específica (arquitetura, segurança, testes, performance, design, deploy, auditoria final), em `Docs/06_quality_gates/`. |
| **Auditoria** | Verificação estrutural ampla (`ddae-engine audit`) que aponta blocos sem prompt/feedback, sessões incompletas, nomes fora do padrão, etc. |
| **Pendência (P1–P4)** | Item de trabalho não resolvido, classificado por prioridade. Ver `Docs/00_ddae_engine/metodologia.md`, seção 12. |
| **Contrato** | Documento em `Docs/03_contracts/` que define a interface entre duas partes do sistema (frontend/backend, app/banco, etc.) de forma explícita e versionada. |
| **Decisão técnica** | Escolha cara de reverter, registrada em `Docs/04_governance/registro_decisoes.md` com motivo e alternativas consideradas. |

## 2. Placeholders Reconhecidos pelo CLI

Os comandos `ddae-engine init`, `session create`, `block create`, `prompt create` e `feedback create` renderizam estes placeholders nos templates que geram:

| Placeholder | Preenchido com | Onde aparece |
|---|---|---|
| `ddae-self-host-scaffold` | Nome da pasta do projeto alvo (`--dir`). | Todos os documentos de `Docs/` e quality gates. |
| `2026-08-08` | Data corrente em `YYYY-MM-DD`, no momento da geração. | Todos os documentos de `Docs/` e quality gates. |
| `{{SESSION_NUMBER}}` | Número de 2 dígitos da sessão (ex.: `01`, `11`). | Templates de sessão, bloco, prompt, feedback. |
| `{{SESSION_TITLE}}` | Título legível da sessão. | Templates de sessão. |
| `{{SESSION_SLUG}}` | Identificador `snake_case` da sessão (sem o prefixo `session_NN_`). | Templates de sessão, bloco, prompt, feedback. |
| `{{BLOCK_NUMBER}}` | Número de 2 dígitos do bloco dentro da sessão. | Templates de bloco, prompt, feedback. |
| `{{BLOCK_TITLE}}` | Título legível do bloco (como informado em `block create`). | Templates de bloco, prompt, feedback. |
| `{{BLOCK_SLUG}}` | Identificador `snake_case` do bloco (sem o prefixo `bloco_NN_`). | Templates de bloco, prompt, feedback. |

**`{{NEXT_BLOCK}}` é um placeholder reservado, não renderizado automaticamente.** Não existe forma confiável de o CLI prever qual será o próximo bloco no momento em que o atual é criado — isso é uma decisão de planejamento humano/agente. Use o nome literal do próximo bloco (quando já souber qual é) ao preencher manualmente seções como "Próximo Bloco" em `04_planning/plano_execucao.md` ou no README da sessão; não deixe o token `{{NEXT_BLOCK}}` sem substituição em um documento final.

## 3. Convenção de Idioma

O conteúdo dos documentos gerados pela DDAE Engine é escrito em português técnico. Nomes de comandos, flags e identificadores do CLI (`init`, `--dir`, `--force`, `session create`, etc.) permanecem em inglês — são parte da interface do programa, não do conteúdo documental.
