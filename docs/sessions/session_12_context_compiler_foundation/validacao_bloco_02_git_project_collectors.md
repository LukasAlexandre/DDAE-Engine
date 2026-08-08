# Validação — Bloco 02: Git + Project Collectors

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
7b8143b204f45f3873154fe34b764c024a2a2a66

git rev-parse origin/main
7b8143b204f45f3873154fe34b764c024a2a2a66

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0
```

Estado idêntico ao commit de fechamento do Checkpoint 01.1, working tree limpo — exatamente o esperado antes de iniciar o primeiro bloco de runtime.

## APIs implementadas

- `src/context/git-context.js` — `export function collectGitContext(projectRoot, options = {})`
- `src/context/project-context.js` — `export function collectProjectContext(projectRoot)`

Ambas são funções puras em relação ao processo (sem estado global), síncronas, e utilizáveis diretamente por testes e pelo futuro compiler (Bloco 06) sem depender de nenhuma interface de CLI — nenhum comando novo foi exposto neste bloco.

## Shape final dos dois outputs

`collectGitContext`:

```json
{
  "available": true,
  "repository": true,
  "branch": "main",
  "detached": false,
  "head": "<40-char-sha>|null",
  "origin_head": "<40-char-sha>|null",
  "working_tree": "clean|dirty|null",
  "modified_files": [],
  "untracked_files": [],
  "recent_commits": [{ "sha": "<40-char-sha>" }],
  "tags": [],
  "warnings": []
}
```

`collectProjectContext`:

```json
{
  "markers": [],
  "ecosystems": { "node": false, "python": false, "rust": false, "go": false, "docker": false },
  "directories": []
}
```

Ambos idênticos ao shape conceitual do prompt do Bloco 02, sem campos adicionados por conveniência.

## Comandos Git utilizados

Todos via `execFileSync('git', [...])` — nunca concatenação de string em shell — seguindo o mesmo padrão de `scripts/ci/verify-clean-tree.mjs`:

| Comando | Uso |
|---|---|
| `git rev-parse --is-inside-work-tree` | Diferenciar `available`/`repository` |
| `git symbolic-ref --short -q HEAD` | Nome da branch; falha = detached HEAD |
| `git rev-parse HEAD` | SHA completo de HEAD; falha = repositório sem commits |
| `git rev-parse refs/remotes/origin/<branch>` | `origin_head`, sem fetch/rede |
| `git status --porcelain=v1 -z` | Estado da working tree, machine-readable |
| `git log --max-count=10 --format=%H` | `recent_commits`, somente SHA |
| `git tag --list` | Tags locais |

Nenhum `git remote -v`, `git log` com `--format` incluindo mensagem/autor, `git fetch`, `git pull`, `git add`, `git commit`, `git checkout` (fora dos testes, que operam em repositórios temporários próprios), `git reset`, `git clean`, `git config` (fora dos testes) ou qualquer operação de escrita foi executado pelo collector. `git-context.js` é 100% read-only.

## Degraded mode

Dois estados degradados distintos, conforme contrato:

- **Git não instalado** (`error.code === 'ENOENT'` ao tentar `execFileSync('git', ...)`): `available: false`, `repository: false`, `warnings: [{ code: "GIT_UNAVAILABLE" }]`.
- **Git instalado, diretório não é repositório** (`git rev-parse --is-inside-work-tree` falha com exit code não-zero, mas não é `ENOENT`): `available: true`, `repository: false`, `warnings: [{ code: "NOT_A_GIT_REPOSITORY" }]`.

Nenhum dos dois casos lança exceção — ambos retornam um objeto degradado estruturado, deixando a decisão de como reagir para a camada que consumir o collector (futuro compiler, Bloco 06). Testado com um teste dedicado por caso.

## Comportamento detached HEAD

`git symbolic-ref --short -q HEAD` falha (exit não-zero) quando HEAD é detached; nesse caso `detached: true`, `branch: null`, e `head` continua sendo o SHA completo do commit atual (via `git rev-parse HEAD`, que funciona normalmente em modo detached). Nunca é retornado o literal `"HEAD"` como se fosse nome de branch. Testado criando dois commits e fazendo checkout do primeiro por SHA.

## Comportamento: repositório sem commits

`git init` sem nenhum commit ainda: `git rev-parse --is-inside-work-tree` e `git symbolic-ref --short -q HEAD` funcionam normalmente (HEAD é uma ref simbólica válida para uma branch "unborn"), então `branch` é resolvido corretamente (`"main"`, fixado via `git init -b main` nos testes para não depender do `init.defaultBranch` da máquina). `git rev-parse HEAD` falha (não existe nenhum commit ainda) → `head: null`, e `recent_commits` nunca é calculado nesse caso (o `git log` só é executado quando `head` não é `null`) → `recent_commits: []`. O collector permanece válido, sem lançar exceção.

## `origin_head`

Resolvido via `git rev-parse refs/remotes/origin/<branch>` — nunca `git fetch`, nunca acesso à rede, nunca leitura de `git remote -v`. Sem remote configurado, o comando falha e `origin_head` é `null` (não é um erro fatal). Testado também o caso positivo: `git update-ref refs/remotes/origin/main <sha>` simula localmente uma ref de tracking remoto sem qualquer operação de rede, confirmando que o collector resolve `origin_head` corretamente quando a ref existe.

## Status parsing

`git status --porcelain=v1 -z` foi escolhido especificamente pela robustez a espaços, Unicode e caracteres de quoting. O parser consome os registros NUL-separados manualmente: entradas `??` (untracked) vão para `untracked_files`; qualquer outro código de status vai para `modified_files`; entradas de rename/copy (`R`/`C`) consomem um campo extra de "path original" para manter o parser alinhado, mas esse path original não é armazenado — só o path atual interessa a este collector. Testado com arquivo tracked modificado, arquivo untracked, e um nome de arquivo contendo espaço.

**Achado real durante os testes**: quando um diretório inteiro é untracked, o comportamento *padrão* do `git status` (`--untracked-files=normal`, que é o modo usado aqui) reporta o diretório colapsado como uma única entrada com barra final (`nested/`), em vez de expandir recursivamente cada arquivo dentro dele. Isso não é um bug do collector — é o comportamento documentado do próprio Git nesse modo — mas invalidou uma expectativa inicial do teste correspondente, que foi corrigida para refletir o comportamento real (não alterado para `--untracked-files=all`, que traria de volta uma forma de expansão recursiva que o contrato deste bloco não pede).

## Normalização de paths

Toda saída de `git-context.js` passa por `toPortablePath()`, que converte `\` em `/`. Como `execFileSync` roda com `cwd: root`, o Git já reporta paths relativos a `root` diretamente — nenhum `path.relative` adicional foi necessário. Testado explicitamente: nenhum path absoluto (nem o diretório temporário do teste, nem um padrão `X:\`) aparece na serialização JSON do resultado.

## Ordenação

`modified_files`, `untracked_files` e `tags` são ordenados com `.sort()` (ASC lexicográfico) antes de retornar — nunca dependendo da ordem que o Git ou o filesystem retornam nativamente. `recent_commits` mantém a ordem natural do `git log` (mais recente primeiro), que é a ordem semanticamente esperada, não uma lista sem ordem — coerente com "HEAD deve naturalmente ser o primeiro" do contrato.

## Recent commits — decisão de não coletar mensagens/autores/remotes

Coletados exclusivamente SHAs completos, limitados a 10 (`--max-count=10 --format=%H`). Nenhuma mensagem de commit, corpo, autor, e-mail de autor/committer, ou URL de remote foi coletada — decisão explícita do contrato, já que o Sensitive Data Guard completo pertence ao Bloco 09, e texto livre de commit/URLs de remote pode carregar informação sensível ou de infraestrutura antes desse guard existir.

## Markers detectados

10 markers de ecossistema (`package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `Dockerfile`, `docker-compose.yml`, `docker-compose.yaml`, `compose.yml`, `compose.yaml`), verificados por existência apenas — nenhum conteúdo é lido. `ecosystems` deriva de `markers` (`node`, `python`, `rust`, `go`, `docker`, este último cobrindo qualquer um dos 5 markers Docker).

## Directories detectados

10 nomes de diretório convencionais (`Docs`, `docs`, `src`, `Backend`, `backend`, `Frontend`, `frontend`, `Tests`, `tests`, `test`), verificados por existência apenas, sem leitura de conteúdo.

## Política de symlink

`lstat` (nunca `stat`/`readdir`) é usado para checar tanto markers quanto diretórios — um symlink nunca é seguido, porque `lstat` reporta o tipo do próprio link, não do alvo. Um marker ou diretório que seja na verdade um symlink nunca entra em `markers`/`directories`. Testado criando um symlink `src` apontando para um diretório temporário fora do projeto: `collectProjectContext` corretamente não reporta `src` como diretório.

## Achado real: filesystem case-insensitive (Windows/macOS padrão)

A primeira versão do `project-context.js` falhou nos testes locais (Windows): como `Docs` e `docs` (e `Backend`/`backend`, `Frontend`/`frontend`, `Tests`/`tests`) são nomes case-distintos na lista de diretórios convencionais, mas o filesystem padrão do Windows (e do macOS, HFS+/APFS padrão) é case-insensitive, um `lstat` em `docs` "acerta" mesmo quando só `Docs` existe fisicamente no disco — produzindo falsos positivos de detecção dupla.

**Correção aplicada**: `hasExactCaseMatch()` usa `fs.realpathSync.native()` para obter o nome com a capitalização real gravada em disco e compara com o nome candidato exato, rejeitando o falso positivo — sem precisar de `readdirSync` (nenhuma leitura de listagem de diretório foi introduzida; a garantia de "zero recursive scan" permanece intacta). Este achado e sua correção só foram possíveis porque os testes rodam de fato em Windows, não apenas em CI Linux — reforça o valor de testar localmente antes de depender só da CI remota.

## Prova de zero recursive read

Teste dedicado cria `.env` com um valor sentinela (`SUPER_SECRET_SHOULD_NEVER_BE_READ=sentinel-value`), um arquivo aninhado em `nested/deeper/unknown-file.txt`, e um `package.json` com um valor sentinela no campo `name`. `JSON.stringify(collectProjectContext(dir))` é verificado para **não** conter nenhum dos dois valores sentinela, nem o nome `.env`, nem `unknown-file.txt`, e `directories` não inclui `nested`. Isso é uma consequência estrutural do collector nunca chamar `readFileSync`/`readdirSync` — não uma checagem best-effort.

## Prova de não leitura de `.env`

Coberta pelo mesmo teste acima — `project-context.js` não possui nenhuma chamada a `fs.readFileSync` em todo o arquivo; a garantia é por construção, não por filtro.

## Zero dependencies

Apenas `node:child_process`, `node:fs`, `node:path` foram usados. Nenhum pacote foi instalado; `package.json` (`dependencies`/`devDependencies`) permanece vazio; nenhum `package-lock.json` foi criado.

## Package protection

`scripts/release/verify-package.mjs`: `REQUIRED_SRC_PREFIXES` passou a incluir `'src/context/'`. `test/package-check.test.js`: `VALID_FILES` (dado sintético) passou a incluir `'src/context/git-context.js'`, para que o teste `checkMetadata and checkRequiredFiles pass against synthetic valid input` continuasse correto após a mudança do gate. `src/schemas/` **não** foi adicionado — ainda não existe.

## `npm pack` contents

```text
npm pack --dry-run --json
git-context.js in pack: true
project-context.js in pack: true
total files: 95
```

Confirmado via inspeção programática da saída real de `npm pack --dry-run --json` (a mesma fonte de verdade usada por `verify-package.mjs`), não apenas por inferência do `package.json.files`.

## Testes adicionados

- `test/context-git.test.js` — 16 testes.
- `test/context-project.test.js` — 13 testes.
- Total: 29 testes novos.

## Total final de testes

```text
npm test
ℹ tests 67
ℹ pass 65
ℹ fail 0
ℹ cancelled 0
ℹ skipped 2
```

(38 do baseline + 29 novos = 67. Os 2 skips são: o smoke pesado opt-in, já existente desde o Bloco 04 da Session 11, e o teste de symlink nesta máquina local, por falta de privilégio — ver seção CI abaixo para a prova de que esse mesmo teste roda de fato, sem skip, nos 5 ambientes de CI.)

## Resultados locais

```text
npm test        → 67 tests, 65 pass, 0 fail, 2 skip
npm run package:check → OK, 95 files
npm run smoke    → [DDAE smoke] OK
node bin/ddae-engine.js --version → 0.2.0
node bin/ddae-engine.js --help    → sem menção a "context"
```

## CI técnica

- Run: `31276247468`
- HeadSha: `7860bf6a95ac31b762ae95d71212c17b65001752`
- Resultado: `success`
- 5/5: Ubuntu 22 ✓, Ubuntu 24 ✓, Ubuntu 26 ✓, Windows 24 ✓, macOS 24 ✓ — todos incluindo `npm test`, `package:check`, `npm run smoke` (distribution smoke) e `verify-clean-tree`.

## Smoke 5/5

Confirmado dentro de cada um dos 5 jobs da CI (`Distribution smoke (real tarball + isolated install)`), todos `success`.

## Symlink test — cobertura real em CI

O teste `collectProjectContext never follows a symlink shadowing a conventional directory name` foi **skipado apenas na máquina local** (Windows sem Developer Mode/privilégio administrativo para criar symlink — `EPERM`, registrado explicitamente via `t.skip()`, nunca um falso "passou"). Nos 5 jobs de CI do GitHub Actions, incluindo `windows-latest`, o teste **executou e passou** de fato (confirmado inspecionando o log bruto da run: `✔ collectProjectContext never follows a symlink shadowing a conventional directory name` em todas as 5 plataformas) — a proteção de symlink está genuinamente coberta, não apenas skipada silenciosamente em todo lugar.

## Arquivos técnicos

```text
scripts/release/verify-package.mjs |   1 +
src/context/git-context.js         | 159 ++++
src/context/project-context.js     | 108 ++ (110 após a correção de case)
test/context-git.test.js           | 304 ++++
test/context-project.test.js       | 225 ++
test/package-check.test.js         |   1 +
6 files changed, 798 insertions(+)
```

## Commit técnico

```text
7860bf6a95ac31b762ae95d71212c17b65001752
feat(context): add git and project collectors
```

## Riscos

- **Detecção de "não é repositório" via qualquer erro não-`ENOENT`.** Simplificação deliberada para este bloco: qualquer falha de `git rev-parse --is-inside-work-tree` que não seja "binário ausente" é tratada como "não é repositório". Isso cobre o caso real (diretório fora de qualquer repositório Git) mas não distingue outras falhas exóticas de Git (permissões, repositório corrompido) — aceitável, pois o objetivo do modo degradado é nunca quebrar `context build`, não diagnosticar toda falha possível do Git.
- **Dependência de `git init -b main` (Git ≥ 2.28) nos testes.** Usado para fixar o nome da branch inicial de forma determinística entre máquinas com `init.defaultBranch` diferentes. Não afeta o collector em si (que lê o nome de branch real, seja ele qual for), apenas a reprodutibilidade dos testes.
- **Teste de symlink localmente skipado por privilégio insuficiente.** Mitigado: a CI prova cobertura real nas 5 plataformas (ver seção acima); o skip local é honesto (`t.skip()` com motivo registrado), nunca um falso positivo.

## Pendências para o Bloco 03

- Implementar `src/context/ddae-context.js`: sessão atual (via `listSessionDirs`/`parseSessionFolderName`/`nextSessionNumber` de `src/utils/session.js`, sem duplicar essa lógica), decisões, bugs, validações.
- `collectProjectContext` já registra `Docs/`/`docs/` como diretório convencional presente, mas não interpreta nenhum conteúdo DDAE — essa interpretação é exclusivamente do Bloco 03, conforme o contrato.

## Confirmação de zero implementação além do escopo

- `src/schemas/` — não existe.
- `src/commands/context.js` — não existe.
- `src/cli.js` — não alterado.
- `package.json` — não alterado (`version` permanece `0.2.0`).
- `EXPECTED_VERSION` — não alterado (permanece `'0.2.0'`).
- Nenhuma sessão DDAE foi lida (`Docs/05_sessions` nunca é acessado por estes dois collectors).
- Nenhum manifest, fingerprint, relevance ou renderer foi implementado.
- Nenhuma escrita em `.ddae/` ocorreu.
