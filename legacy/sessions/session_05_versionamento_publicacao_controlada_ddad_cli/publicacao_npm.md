# Publicação npm — DDAD CLI

## Estado

Publicação controlada inicial — **não executada** neste bloco por ausência de autenticação npm.

## Pré-requisitos

- Node.js instalado.
- npm instalado.
- Conta npm autenticada (`npm whoami` deve retornar um usuário válido).
- Working tree limpo.
- `npm pack --dry-run` aprovado.
- Teste local via pacote `.tgz` aprovado.

## Validação antes da publicação

```bash
git status
npm whoami
npm pack --dry-run
```

## Teste local

```bash
npm pack
mkdir ../ddad-package-test
cd ../ddad-package-test
npm init -y
npm install ../DDAD/ddad-0.1.0.tgz
npx ddad --help
npx ddad init --dir ./sample_ddad_project
npx ddad validate --dir ./sample_ddad_project
npx ddad audit --dir ./sample_ddad_project
```

## Publicação

Executar somente após validação explícita e autenticação confirmada:

```bash
npm publish
```

O pacote `ddad` não é escopado, portanto `--access public` não é necessário.

## Pós-publicação

```bash
npm view ddad version
npx ddad --help
```

## Observação

A publicação npm deve ser tratada como ação sensível. Não publicar sem confirmação manual.

## Registro desta execução (Bloco 05)

- `npm whoami` → `ENEEDAUTH` (nenhuma conta autenticada nesta máquina). **Publicação bloqueada por essa regra.**
- `npm view ddad name version` → `404 Not Found`. O nome `ddad` aparenta estar disponível no registro público do npm, mas isso só pode ser confirmado com certeza no momento da publicação.
- `npm pack --dry-run` → aprovado (91 arquivos, ~57.5 kB).
- Teste local via `.tgz` → aprovado (`init`, `validate`, `audit` funcionando via `npx ddad` em instalação simulada).
- `npm publish` → **não executado**. Para publicar em uma sessão futura:
  1. Autenticar com `npm login` (ou `npm adduser`) na máquina que fará a publicação.
  2. Repetir `npm whoami` para confirmar a sessão.
  3. Repetir `npm view ddad name version` para confirmar que o nome continua disponível.
  4. Repetir `npm pack --dry-run` e o teste local via `.tgz`.
  5. Obter confirmação explícita do responsável pelo projeto.
  6. Executar `npm publish`.
