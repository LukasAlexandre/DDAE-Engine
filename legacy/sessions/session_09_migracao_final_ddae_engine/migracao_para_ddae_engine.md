# Migração de identidade — DDAE para DDAE Engine

## Status

Concluída. Pacote `ddae-engine@0.1.0` publicado com sucesso no npm.

## Nome anterior imediato

DDAE — Document-Driven AI Engineering

## Nome final

DDAE Engine — Document-Driven AI Engineering Engine

## Histórico

O projeto nasceu como DDAD — Document-Driven AI Development.

Durante a tentativa de publicação npm, o nome `ddad` foi bloqueado por similaridade. Depois, o projeto passou por DDAT — Document-Driven AI Tools (Bloco 07) e DDAE — Document-Driven AI Engineering (Bloco 08). Ambos também foram bloqueados por similaridade como nomes de pacote sem escopo: `ddat` em uma tentativa posterior ao Bloco 07, e `ddae` com o erro real `403 Forbidden — Package name too similar to existing package dva` no Bloco 08.

Para evitar publicação escopada e manter uma identidade forte, foi definida a identidade final DDAE Engine.

## Decisão oficial

- Nome do projeto: DDAE Engine
- Significado: Document-Driven AI Engineering Engine
- Pacote npm: ddae-engine
- Comando CLI: ddae-engine
- Versão inicial: 0.1.0

## Motivo da mudança

DDAE Engine comunica melhor a proposta do projeto como motor de engenharia orientada por documentação e IA, e o nome mais longo reduz a chance de novo bloqueio por similaridade.

## Uso esperado

```bash
npx ddae-engine init --dir ./meu-projeto
npx ddae-engine validate --dir ./meu-projeto
npx ddae-engine audit --dir ./meu-projeto
```

## Impactos

- Atualização de `package.json`.
- Atualização do binário CLI.
- Atualização de README.
- Atualização de templates.
- Atualização de documentação.
- Atualização de exemplos de uso.
- Atualização da documentação de publicação npm.
