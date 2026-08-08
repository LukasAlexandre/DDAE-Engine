# Bloco 07 - Migracao de identidade e publicacao oficial DDAT

## Objetivo

Migrar o projeto de DDAD para DDAT, consolidando a nova identidade como **Document-Driven AI Tools**, atualizando pacote npm, comando CLI, documentacao, templates e exemplos de uso, e realizando a publicacao oficial do pacote `ddat@0.1.0`.

## Nome anterior

DDAD - Document-Driven AI Development

## Nome novo

DDAT - Document-Driven AI Tools

## Decisao

A publicacao como `ddad` foi bloqueada pelo npm por similaridade com pacotes existentes. Apos consulta, o nome `ddat` estava disponivel e foi escolhido como nova identidade publica do projeto.

## Escopo

- Migrar nome do pacote npm para `ddat`.
- Migrar comando CLI para `ddat`.
- Renomear entrada binaria para `bin/ddat.js`.
- Atualizar README principal.
- Atualizar documentacao de publicacao.
- Atualizar templates publicos.
- Atualizar referencias operacionais de `ddad` para `ddat`.
- Validar CLI local.
- Validar pacote com `npm pack --dry-run`.
- Publicar `ddat@0.1.0` no npm.
- Validar uso real com `npx ddat`.
- Criar feedback final do bloco.

## Fora do escopo

- Criar novas funcionalidades.
- Alterar arquitetura interna.
- Criar CI/CD.
- Criar nova versao alem de `0.1.0`.
- Reescrever historico Git.

## Criterios de aceite

- `package.json` deve conter `"name": "ddat"`.
- O campo `bin` deve apontar para `bin/ddat.js`.
- `node bin/ddat.js --help` deve funcionar.
- `node bin/ddat.js init/validate/audit` deve funcionar.
- `npm pack --dry-run` deve passar sem warning critico.
- `npm publish` deve publicar `ddat@0.1.0`, se nao houver bloqueio externo.
- `npx ddat --help` deve funcionar apos publicacao.
- O fluxo `npx ddat init/validate/audit` deve funcionar.
- Feedback final deve registrar o resultado da publicacao.

## Estado inicial observado

- Branch atual: `main`.
- Working tree inicial: limpo.
- Usuario npm autenticado: `lukasalexandre`.
- `package.json` ja estava migrado para `ddat@0.1.0`.
- `bin` ja apontava para `./bin/ddat.js`.

## Resultado

- Migracao de identidade: concluida.
- Validacao local: concluida.
- Empacotamento: aprovado.
- Publicacao npm: bloqueada por `EOTP`, exigindo autenticacao de uso unico/web no npm.

## Observacao sobre `bin`

O npm 11.12.1 autocorrigiu `"./bin/ddat.js"` para `"bin/ddat.js"`. A forma normalizada foi mantida porque elimina o warning de publish que removia o binario do pacote durante a normalizacao do npm.

> Atualização posterior: o nome DDAT também foi bloqueado para publicação npm por similaridade. A identidade final foi migrada no Bloco 08 para DDAE — Document-Driven AI Engineering.

> Atualização posterior (Bloco 09): o nome DDAE também foi bloqueado para publicação npm por similaridade (pacote `dva`). A identidade final do projeto foi consolidada como DDAE Engine — Document-Driven AI Engineering Engine, pacote npm `ddae-engine`.
