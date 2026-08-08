# Migração de identidade — DDAT para DDAE

## Status

Concluída para identidade, código e documentação. Bloqueada na publicação npm por similaridade de nome com o pacote `dva`.

## Nome anterior imediato

DDAT — Document-Driven AI Tools

## Nome final

DDAE — Document-Driven AI Engineering

## Histórico

O projeto nasceu como DDAD — Document-Driven AI Development.

Durante o processo de publicação npm, o nome `ddad` foi bloqueado por similaridade com pacotes existentes. Como alternativa, o projeto foi migrado para DDAT — Document-Driven AI Tools no Bloco 07.

No Bloco 07, a primeira tentativa de publicação real de `ddat@0.1.0` (`npm publish --auth-type=web`) foi bloqueada pelo npm por exigência de autenticação de uso único (`EOTP`), antes de qualquer avaliação de nome — ver `docs/sessions/session_07_migracao_identidade_publicacao_ddat/publicacao_resultado.md`. Em uma tentativa posterior, fora do escopo registrado em commit neste repositório, a publicação de `ddat` foi bloqueada pelo npm por similaridade de nome com pacote(s) existente(s). `npm view ddat name version` continua retornando `404 Not Found`, confirmando que o pacote nunca chegou a ser criado no registry.

Para evitar pacote escopado e manter uma identidade curta, forte e publicável, foi definida a identidade final DDAE.

## Decisão oficial

- Nome do projeto: DDAE
- Significado: Document-Driven AI Engineering
- Pacote npm: ddae
- Comando CLI: ddae
- Versão inicial: 0.1.0

## Motivo da mudança

DDAE representa melhor a proposta do projeto como um padrão de engenharia para desenvolvimento com IA orientado por documentação, blocos, auditoria, quality gates, prompts e feedbacks.

## Relação com DDAT

DDAT foi uma identidade intermediária. A partir deste bloco, toda referência operacional atual deve usar DDAE.

Referências históricas a DDAT devem ser preservadas apenas quando estiverem explicando a transição.

## Uso esperado

```bash
npx ddae init --dir ./meu-projeto
npx ddae validate --dir ./meu-projeto
npx ddae audit --dir ./meu-projeto
```

## Impactos

- Atualização de `package.json`.
- Atualização do binário CLI.
- Atualização de README.
- Atualização de templates.
- Atualização de documentação.
- Atualização de exemplos de uso.
- Atualização da documentação de publicação npm.

## Resultado da publicação

A migração de código e documentação para DDAE foi concluída e validada localmente (CLI, `npm pack --dry-run`, `npm publish --dry-run`). A tentativa real de publicação (`npm publish --auth-type=web`) foi bloqueada pelo npm com `403 Forbidden — Package name too similar to existing package dva`. O pacote `ddae@0.1.0` não foi publicado — ver `publicacao_resultado.md`.

> Atualização posterior: após o bloqueio de `ddae`, a identidade final do projeto foi consolidada no Bloco 09 como **DDAE Engine — Document-Driven AI Engineering Engine**, com pacote npm `ddae-engine`.
