# Resultado da publicacao npm - DDAT CLI

## Status

Publicacao bloqueada.

## Pacote

- Nome: `ddat`
- Versao: `0.1.0`
- Comando CLI: `ddat`

## Validacoes pre-publicacao

- `npm whoami`: OK, usuario `lukasalexandre`.
- `node bin/ddat.js --help`: OK.
- `node bin/ddat.js init --dir ./tmp_ddat_validation`: OK, 259 arquivos criados.
- `node bin/ddat.js validate --dir ./tmp_ddat_validation`: OK, `Status: OK`, `Errors: 0`.
- `node bin/ddat.js audit --dir ./tmp_ddat_validation`: OK, `Status: OK`, `Errors: 0`, 7 warnings esperados de quality gates pendentes.
- `npm pack --dry-run`: OK, pacote `ddat@0.1.0`, tarball previsto `ddat-0.1.0.tgz`, 91 arquivos, sem warning critico.
- `npm publish --dry-run`: OK, `+ ddat@0.1.0`, sem warning de autocorrecao apos normalizar `bin` para `bin/ddat.js`.
- `npm view ddat name version`: `404 Not Found` antes da tentativa de publicacao real.

## Publicacao

Comando executado:

```bash
npm publish --auth-type=web
```

## Motivo do bloqueio

O npm retornou:

```txt
npm error code EOTP
npm error This operation requires a one-time password.
```

O registry exigiu autenticacao de uso unico/web para concluir a publicacao. Sem o OTP/autenticacao web, o pacote `ddat@0.1.0` nao foi publicado.

`npm view ddat name version` continuou retornando `404 Not Found` apos a tentativa bloqueada, confirmando que o pacote nao foi criado no registry.

## Validacoes pos-publicacao

Nao executadas, pois a publicacao real foi bloqueada antes da criacao do pacote no registry.

## Proxima acao

Resolver a autenticacao `EOTP` da conta npm e repetir somente a etapa de publicacao:

```bash
npm publish --auth-type=web
```

> Atualização posterior: o nome DDAT também foi bloqueado para publicação npm por similaridade. A identidade final foi migrada no Bloco 08 para DDAE — Document-Driven AI Engineering.

> Atualização posterior (Bloco 09): o nome DDAE também foi bloqueado para publicação npm por similaridade (pacote `dva`). A identidade final do projeto foi consolidada como DDAE Engine — Document-Driven AI Engineering Engine, pacote npm `ddae-engine`.
