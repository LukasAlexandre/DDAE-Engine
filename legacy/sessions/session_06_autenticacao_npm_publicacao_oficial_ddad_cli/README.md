# Bloco 06 — Autenticação npm e publicação oficial controlada do DDAD CLI

## Objetivo

Executar a primeira publicação oficial controlada do DDAD CLI no npm, validando autenticação, nome do pacote, empacotamento, publicação da versão `0.1.0` e teste real via `npx`.

## Escopo

- Validar autenticação npm.
- Confirmar disponibilidade do nome do pacote.
- Validar pacote com `npm pack --dry-run`.
- Executar testes finais do CLI.
- Publicar o pacote no npm, se todos os critérios forem atendidos.
- Testar instalação/execução real via `npx ddad`.
- Documentar a release.
- Criar feedback final do bloco.

## Fora do escopo

- Criar CI/CD.
- Automatizar releases.
- Alterar arquitetura interna do CLI.
- Criar comandos novos.
- Iniciar Bloco 07.

## Critérios de aceite

- `npm whoami` deve retornar usuário autenticado.
- `npm view ddad name version` deve confirmar disponibilidade ou ausência do pacote antes da publicação.
- `npm pack --dry-run` deve passar.
- `node bin/ddad.js init/validate/audit` deve passar.
- `npm publish` deve ser executado somente se os critérios anteriores forem atendidos.
- Após publicação, `npx ddad --help` deve funcionar.
- O feedback deve registrar claramente se a publicação foi executada ou bloqueada.
