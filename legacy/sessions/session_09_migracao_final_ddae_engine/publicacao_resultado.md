# Resultado da publicação npm — DDAE Engine

## Status

Publicado com sucesso.

## Pacote

- Nome: `ddae-engine`
- Versão: `0.1.0`
- CLI: `ddae-engine`
- Significado: Document-Driven AI Engineering Engine

## Uso

```bash
npx ddae-engine init --dir ./meu-projeto
npx ddae-engine validate --dir ./meu-projeto
npx ddae-engine audit --dir ./meu-projeto
```

## Validações pré-publicação

- `npm whoami`: inicialmente `401 Unauthorized` (sessão web expirada desde o Bloco 08).
- `node bin/ddae-engine.js --help`: OK.
- `node bin/ddae-engine.js init --dir ./tmp_ddae_engine_validation`: OK, 259 arquivos criados, pasta gerada contém `Docs/00_ddae_engine/` (sem `00_ddae`).
- `node bin/ddae-engine.js validate --dir ./tmp_ddae_engine_validation`: OK, `Status: OK`, `Errors: 0`.
- `node bin/ddae-engine.js audit --dir ./tmp_ddae_engine_validation`: OK, `Status: OK`, `Errors: 0`, 7 warnings esperados de quality gates pendentes.
- `npm view ddae-engine name version`: `404 Not Found` antes da publicação.
- `npm search ddae-engine`: nenhum pacote `ddae-engine` direto encontrado.
- `npm pack --dry-run`: OK, pacote `ddae-engine@0.1.0`, tarball previsto `ddae-engine-0.1.0.tgz`, 91 arquivos, sem warning crítico.
- `npm publish --dry-run`: OK, `+ ddae-engine@0.1.0`, sem autocorreção de `bin`.

## Publicação

Comando executado:

```bash
npm publish --auth-type=web
```

A primeira tentativa (via ferramenta automatizada) falhou com `404 Not Found` no `PUT` do registry, consistente com a sessão `npm whoami` expirada (`401`). O usuário então executou `npm login`, reautenticando via navegador, e repetiu `npm publish --auth-type=web` diretamente em seu terminal local. Essa execução exigiu uma segunda confirmação de autenticação (`Authenticate your account at: https://www.npmjs.com/auth/cli/...`) e, após aprovação no navegador, concluiu com:

```txt
+ ddae-engine@0.1.0
```

## Validações pós-publicação

- `npm view ddae-engine name version`: `name = 'ddae-engine'`, `version = '0.1.0'`. OK.
- `npm view ddae-engine bin`: `{ 'ddae-engine': 'bin/ddae-engine.js' }`. OK.
- `npx ddae-engine --help`: OK (primeira tentativa com `npx --yes ddae-engine@0.1.0` falhou por resolução do shim no Windows; `npx ddae-engine --help` sem pin de versão funcionou normalmente).
- `npx ddae-engine init --dir ./tmp_ddae_engine_npm_real_validation`: OK, 259 arquivos criados.
- `npx ddae-engine validate --dir ./tmp_ddae_engine_npm_real_validation`: OK, `Status: OK`, `Errors: 0`.
- `npx ddae-engine audit --dir ./tmp_ddae_engine_npm_real_validation`: OK, `Status: OK`, `Errors: 0`, 7 warnings esperados de quality gates pendentes.

## Observações

Primeira publicação oficial do DDAE Engine — Document-Driven AI Engineering Engine, após três tentativas anteriores bloqueadas (`ddad`, `ddat`, `ddae`) por similaridade de nome no npm.
