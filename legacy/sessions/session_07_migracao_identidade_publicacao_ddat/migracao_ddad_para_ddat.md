# Migracao de identidade - DDAD para DDAT

## Status

Concluida para identidade e bloqueada na publicacao npm por autenticacao `EOTP`.

## Nome anterior

DDAD - Document-Driven AI Development

## Nome novo

DDAT - Document-Driven AI Tools

## Motivo

A publicacao do pacote `ddad` foi bloqueada pelo npm por similaridade com pacotes existentes. Para preservar a proposta conceitual e viabilizar uma publicacao publica limpa, foi definida a nova identidade DDAT.

## Decisao oficial

- Nome do projeto: DDAT
- Significado: Document-Driven AI Tools
- Pacote npm: `ddat`
- Comando CLI: `ddat`
- Versao inicial: `0.1.0`

## Uso esperado

```bash
npx ddat init --dir ./meu-projeto
npx ddat validate --dir ./meu-projeto
npx ddat audit --dir ./meu-projeto
```

## Impactos da migracao

- `package.json`
- entrada binaria do CLI
- README principal
- templates oficiais
- documentacao de publicacao
- exemplos de uso
- feedback do bloco

## Resultado da publicacao

A tentativa de publicacao real de `ddat@0.1.0` foi executada com `npm publish --auth-type=web`, mas o npm retornou `EOTP`, exigindo autenticacao de uso unico/web antes de aceitar a publicacao. O pacote nao foi publicado nesta execucao.

## Observacao historica

Os documentos dos blocos anteriores foram preservados como registro historico. Referencias antigas a DDAD foram mantidas quando descrevem fatos ocorridos antes da migracao, e referencias operacionais atuais foram tratadas como DDAT.

> Atualização posterior: o nome DDAT também foi bloqueado para publicação npm por similaridade. A identidade final foi migrada no Bloco 08 para DDAE — Document-Driven AI Engineering.

> Atualização posterior (Bloco 09): o nome DDAE também foi bloqueado para publicação npm por similaridade (pacote `dva`). A identidade final do projeto foi consolidada como DDAE Engine — Document-Driven AI Engineering Engine, pacote npm `ddae-engine`.
