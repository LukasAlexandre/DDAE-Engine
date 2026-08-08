# Bloco 08 — Migração final DDAT para DDAE e publicação npm

## Objetivo

Migrar a identidade pública do projeto de DDAT para DDAE, consolidando o nome final **DDAE — Document-Driven AI Engineering**, preparando o pacote npm `ddae@0.1.0` e validando o CLI `ddae`.

## Histórico de naming

### DDAD

Nome inicial do projeto.

- Nome: DDAD
- Significado: Document-Driven AI Development
- Situação: bloqueado para publicação npm por similaridade de nome.

### DDAT

Nome intermediário definido no Bloco 07.

- Nome: DDAT
- Significado: Document-Driven AI Tools
- Situação: preparado e validado localmente. A primeira tentativa de publicação real (Bloco 07) foi bloqueada pelo npm por exigência de autenticação de uso único (`EOTP`). Em uma tentativa posterior, fora do escopo registrado em commit, a publicação de `ddat` foi bloqueada pelo npm por similaridade de nome com pacote(s) existente(s).

### DDAE

Nome final definido para publicação.

- Nome: DDAE
- Significado: Document-Driven AI Engineering
- Pacote npm: ddae
- CLI: ddae
- Versão inicial: 0.1.0
- Situação: identidade adotada e migração concluída no código e na documentação. A tentativa real de publicação (`npm publish --auth-type=web`) foi bloqueada pelo npm com `403 Forbidden — Package name too similar to existing package dva`. Ver `publicacao_resultado.md`.

## Decisão

Adotar oficialmente DDAE como identidade final do projeto antes da primeira publicação pública no npm. A migração de código e documentação foi concluída; a publicação real ficou bloqueada por similaridade de nome com o pacote existente `dva` e fica como pendência para um bloco futuro decidir entre um novo nome ou reconsiderar o pacote escopado.

## Escopo

- Migrar `package.json` de `ddat` para `ddae`.
- Migrar o comando CLI de `ddat` para `ddae`.
- Renomear `bin/ddat.js` para `bin/ddae.js`.
- Atualizar README principal.
- Atualizar templates oficiais.
- Atualizar documentação de publicação.
- Atualizar feedbacks e documentação operacional.
- Criar documento formal de migração DDAT → DDAE.
- Validar CLI local.
- Validar empacotamento npm.
- Tentar publicação npm somente após validação.
- Validar uso real com `npx ddae`, se publicado.

## Fora do escopo

- Criar novas funcionalidades.
- Alterar arquitetura interna do CLI.
- Criar CI/CD.
- Criar versão diferente de 0.1.0.
- Publicar pacote escopado.
- Reescrever commits anteriores.

## Critérios de aceite

- `package.json` deve conter `"name": "ddae"`.
- `package.json` deve conter `"bin": { "ddae": "bin/ddae.js" }`.
- `bin/ddae.js` deve existir e manter shebang.
- `bin/ddat.js` não deve existir mais, salvo se houver motivo documentado.
- `node bin/ddae.js --help` deve funcionar.
- `node bin/ddae.js init/validate/audit` deve funcionar.
- Templates gerados devem usar DDAE como identidade atual.
- `npm pack --dry-run` deve gerar pacote `ddae@0.1.0`.
- `npm publish --dry-run` deve passar sem warning crítico.
- Publicação real deve ser executada somente se todos os critérios forem atendidos.
- Feedback final deve registrar se `npm publish` foi executado ou bloqueado.

> Atualização posterior (Bloco 09): o nome DDAE também foi bloqueado para publicação npm por similaridade (pacote `dva`). A identidade final do projeto foi consolidada como DDAE Engine — Document-Driven AI Engineering Engine, pacote npm `ddae-engine`.
