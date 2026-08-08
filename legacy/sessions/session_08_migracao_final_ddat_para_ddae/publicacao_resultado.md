# Resultado da publicação npm — DDAE CLI

## Status

Publicação bloqueada.

## Pacote preparado

- Nome: `ddae`
- Versão: `0.1.0`
- CLI: `ddae`
- Significado: Document-Driven AI Engineering

## Validações pré-publicação

- `npm whoami`: OK, usuário `lukasalexandre`.
- `node bin/ddae.js --help`: OK.
- `node bin/ddae.js init --dir ./tmp_ddae_validation`: OK, 259 arquivos criados.
- `node bin/ddae.js validate --dir ./tmp_ddae_validation`: OK, `Status: OK`, `Errors: 0`.
- `node bin/ddae.js audit --dir ./tmp_ddae_validation`: OK, `Status: OK`, `Errors: 0`, 7 warnings esperados de quality gates pendentes.
- Pasta gerada continha `Docs/00_ddae/` e não `Docs/00_ddat/`.
- `npm view ddae name version`: `404 Not Found` (antes e depois da tentativa de publicação).
- `npm search ddae`: nenhum pacote chamado `ddae` encontrado diretamente.
- `npm pack --dry-run`: OK, pacote `ddae@0.1.0`, tarball previsto `ddae-0.1.0.tgz`, 91 arquivos, sem warning crítico.
- `npm publish --dry-run`: OK, `+ ddae@0.1.0`, sem warning de autocorreção, `bin` mantido como `bin/ddae.js`.

## Publicação

Comando executado:

```bash
npm publish --auth-type=web
```

A primeira execução (via ferramenta automatizada) retornou `EOTP`, exigindo autenticação de uso único/web. A execução repetida diretamente pelo usuário, no terminal local, completou a autenticação web com sucesso e avançou para a tentativa real de publicação no registry.

## Motivo do bloqueio

Após a autenticação web ser concluída, o npm retornou:

```txt
npm error code E403
npm error 403 403 Forbidden - PUT https://registry.npmjs.org/ddae - Package name too similar to existing package dva; try renaming your package to '@lukasalexandre/ddae' and publishing with 'npm publish --access=public' instead
```

O registry rejeitou o nome `ddae` por similaridade com o pacote existente `dva`. O npm sugeriu publicar como pacote escopado (`@lukasalexandre/ddae`), opção que está fora do escopo deste bloco — pacote escopado foi explicitamente descartado nas regras do Bloco 08.

`npm view ddae name version` continuou retornando `404 Not Found` após a tentativa bloqueada, confirmando que o pacote não foi criado no registry.

## Validações pós-publicação

Não executadas, pois a publicação real foi rejeitada antes da criação do pacote no registry.

## Próxima ação

Decidir, em um bloco futuro, entre:

- escolher um novo nome de pacote não escopado, suficientemente distinto de pacotes existentes (incluindo `dva`); ou
- reconsiderar a restrição contra pacote escopado (`@lukasalexandre/ddae`).

Nenhuma dessas decisões foi tomada nesta sessão — fica registrada como pendência para decisão do usuário.
