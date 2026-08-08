# Bloco 09 — Migração final para DDAE Engine e publicação npm

## Objetivo

Migrar a identidade pública do projeto para **DDAE Engine — Document-Driven AI Engineering Engine**, consolidando o pacote npm `ddae-engine@0.1.0` e o uso via `npx ddae-engine`.

## Histórico de naming

### DDAD

- Nome: DDAD
- Significado: Document-Driven AI Development
- Situação: nome bloqueado no npm por similaridade.

### DDAT

- Nome: DDAT
- Significado: Document-Driven AI Tools
- Situação: nome bloqueado no npm (EOTP no Bloco 07; similaridade de nome em tentativa posterior fora de commit).

### DDAE

- Nome: DDAE
- Significado: Document-Driven AI Engineering
- Situação: nome bloqueado no npm por similaridade com o pacote `dva` (Bloco 08).

### DDAE Engine

- Nome final: DDAE Engine
- Significado: Document-Driven AI Engineering Engine
- Pacote npm: ddae-engine
- CLI: ddae-engine
- Uso: npx ddae-engine
- Situação: publicado com sucesso no npm. Ver `publicacao_resultado.md`.

## Decisão

Adotar oficialmente **DDAE Engine** como nome público final do projeto.

## Escopo

- Migrar `package.json` para `ddae-engine`.
- Migrar o comando CLI para `ddae-engine`.
- Renomear entrada binária para `bin/ddae-engine.js`.
- Atualizar README principal.
- Atualizar templates oficiais.
- Atualizar documentação operacional.
- Atualizar feedbacks.
- Atualizar exemplos de uso.
- Validar CLI local.
- Validar empacotamento npm.
- Executar publicação npm somente após validação.
- Validar uso real via `npx ddae-engine`, se publicado.

## Fora do escopo

- Criar novas funcionalidades.
- Alterar arquitetura interna do CLI.
- Criar CI/CD.
- Criar versão diferente de `0.1.0`.
- Usar pacote escopado.
- Reescrever histórico Git.

## Critérios de aceite

- `package.json` deve conter `"name": "ddae-engine"`.
- `package.json` deve conter `"bin": { "ddae-engine": "bin/ddae-engine.js" }`.
- `bin/ddae-engine.js` deve existir e manter shebang.
- `node bin/ddae-engine.js --help` deve funcionar.
- `node bin/ddae-engine.js init/validate/audit` deve funcionar.
- Templates gerados devem usar DDAE Engine como identidade atual.
- `npm pack --dry-run` deve gerar pacote `ddae-engine@0.1.0`.
- `npm publish --dry-run` deve passar sem warning crítico.
- `npm publish --auth-type=web` deve ser executado somente se todos os critérios forem atendidos.
- Se publicado, `npx ddae-engine --help` deve funcionar.
- Se publicado, `npx ddae-engine init/validate/audit` deve funcionar.
