# Bloco 05 — Versionamento e publicação controlada inicial do DDAD CLI

## Objetivo

Preparar o DDAD CLI para sua primeira publicação controlada como pacote npm, validando versionamento, pacote publicado, autenticação, documentação de release e fluxo de instalação via `npx`.

## Escopo

- Revisar versão atual do `package.json`.
- Definir versão inicial publicável.
- Validar metadados npm.
- Validar autenticação npm.
- Executar `npm pack --dry-run`.
- Executar teste de instalação local via pacote `.tgz`.
- Preparar documentação de publicação.
- Opcionalmente executar `npm publish`, somente se houver autorização explícita.
- Criar feedback final do bloco.

## Fora do escopo

- Criar pipeline CI/CD.
- Automatizar release.
- Criar changelog complexo.
- Iniciar Bloco 06.
- Alterar arquitetura interna do CLI.

## Critérios de aceite

- O pacote deve estar validado para publicação.
- A versão deve estar definida corretamente.
- O pacote deve instalar e executar localmente via `npx`.
- A documentação de publicação deve estar atualizada.
- O feedback do bloco deve registrar se houve ou não publicação npm.

## Status

Parcialmente concluído.

## Resultado

O pacote foi validado de ponta a ponta para publicação (versionamento, metadados, empacotamento e instalação local via tarball), mas a publicação real no npm **não foi executada** neste bloco: `npm whoami` retornou `ENEEDAUTH` (nenhuma conta npm autenticada nesta máquina), o que bloqueia a publicação por regra explícita do bloco. A versão `0.1.0` já era a versão vigente do `package.json` e foi mantida como versão inicial publicável. O nome de pacote `ddad` foi verificado via `npm view ddad name version`, que retornou `404 Not Found` — indicando que o nome está disponível no registro público. Foi adicionado o campo `author` ao `package.json` (ausente até então) e criada a documentação de publicação (`publicacao_npm.md`). O `README.md` principal foi atualizado com uma seção de instalação que reflete o estado real: pacote ainda não publicado.

## Bloco Executado

Bloco 05 — Versionamento e publicação controlada inicial do DDAD CLI.

## Próximo Bloco

Bloco 06 não iniciado. Pendência controlada: publicação npm depende de autenticação (`npm adduser` / `npm login`) antes de qualquer nova tentativa.
