# Plano — Bloco 02: Templates Oficiais DDAD

## 1. Objetivo

Aprimorar todos os templates oficiais do DDAD (`src/templates/**`) para qualidade documental real, cobrindo `Docs/` raiz (8 subpastas), esqueleto de sessão, bloco, prompt, feedback, validação, os 7 quality gates e os 3 templates de regras de agente — sem adicionar comandos novos, dependências novas, ou alterar a arquitetura do CLI estabelecida no Bloco 01.

## 2. Escopo

- `src/templates/docs_root/{00_ddad,01_product,02_architecture,03_contracts,04_governance,07_design_system,08_deploy,09_observability}/**` — reescrita de conteúdo.
- `src/templates/session/**` — reescrita de conteúdo, mantendo as 13 subpastas existentes.
- `src/templates/block/bloco_template.md` — reescrita mantendo a estrutura exata de 17 seções.
- `src/templates/prompt/prompt_template.md` — reescrita mantendo a estrutura exata de 16 seções.
- `src/templates/feedback/feedback_template.md` — reescrita mantendo a estrutura exata de 18 seções.
- `src/templates/validation/validacao_template.md` — reescrita mantendo a estrutura exata de 12 seções.
- `src/templates/quality_gates/*.md` (7 arquivos) — reescrita mantendo a estrutura genérica exata de 9 seções, mais conteúdo específico por gate.
- `src/templates/agents/{CLAUDE.md,AGENTS.md,cursorrules}` — reescrita com instruções operacionais para agentes de IA.
- `README.md` (raiz) — atualização para explicar o conceito de templates oficiais e o ciclo completo da DDAD.
- `docs/sessions/session_02_templates_oficiais_ddad/**` e `feedback/feedback_bloco_02_templates_oficiais_ddad.md` — documentação de fechamento deste bloco.

## 3. Fora de Escopo

- Novos comandos de CLI.
- Publicação real no npm.
- Migração para TypeScript.
- Novas dependências de runtime.
- Modo interativo de criação.
- Presets por tipo de projeto (web/mobile/desktop/API).
- Mudanças arquiteturais maiores no CLI.
- Remoção de comandos existentes.

## 4. Abordagem Técnica

1. Mapear o estado atual de todos os templates (`git status`, inspeção de pastas) antes de qualquer alteração.
2. Padronizar a lista de placeholders (`{{PROJECT_NAME}}`, `{{SESSION_NUMBER}}`, `{{SESSION_TITLE}}`, `{{SESSION_SLUG}}`, `{{BLOCK_NUMBER}}`, `{{BLOCK_TITLE}}`, `{{BLOCK_SLUG}}`, `{{CURRENT_DATE}}`, `{{NEXT_BLOCK}}`) e conferir que estão sendo passados nos pontos de chamada (`src/commands/{init,session,block,prompt,feedback}.js`).
3. Reescrever, pasta por pasta, todos os documentos de `docs_root` com seções, perguntas orientadoras, tabelas e critérios de aceite — sem inventar estrutura fora do que cada documento já representa na metodologia.
4. Reescrever os templates de sessão mantendo as 13 subpastas e o papel de cada arquivo.
5. Reescrever bloco/prompt/feedback/validação preservando a lista exata de cabeçalhos exigida, adicionando texto-guia em itálico sob cada cabeçalho (não como novas seções).
6. Reescrever os 7 quality gates com a estrutura genérica de 9 seções, mais o checklist específico de cada domínio (arquitetura, segurança, testes, performance, design, deploy, auditoria final).
7. Reescrever os 3 templates de agente com instruções operacionais (antes de codificar, durante a implementação, regras de commit, o que não fazer).
8. Atualizar o `README.md` raiz com as seções "Official templates" e "The full loop".
9. Executar a bateria de validações (comandos do CLI contra um diretório temporário) e corrigir qualquer problema encontrado antes de gerar a documentação de fechamento.
10. Gerar a documentação de fechamento deste bloco (feedback + validação + README de sessão).

## 5. Riscos Identificados

- **Quebra da estrutura exata de cabeçalhos exigida** (bloco/prompt/feedback/validação/quality gates): mitigado adicionando todo o conteúdo-guia como texto em itálico sob os cabeçalhos existentes, nunca como cabeçalhos novos.
- **Placeholder renderizado incorretamente dentro de um comando sugerido**: identificado durante a própria bateria de validações deste bloco — `{{SESSION_SLUG}}` sozinho não corresponde ao nome de pasta que `--session` exige. Corrigido em `bloco_template.md` e `prompt_template.md` (ver feedback, seção de Problemas Encontrados).
- **Overlap entre `decisoes_tecnicas.md` (arquitetura) e `registro_decisoes.md` (governança)**: mitigado explicitando no início de `registro_decisoes.md` qual tipo de decisão pertence a cada arquivo.

## 6. Critérios de Aceite

Ver `validacao_bloco_02_templates_oficiais_ddad.md` para o checklist completo verificado na bateria de validações deste bloco.
