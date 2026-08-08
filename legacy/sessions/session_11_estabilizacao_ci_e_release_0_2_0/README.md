# Session 11 — Estabilização de CI e Release 0.2.0

## Contexto

A Session 10 corrigiu o modelo de sessões da DDAE Engine e foi integrada a `main` (commit `3de0da5`), mas a versão `0.2.0` resultante ainda não foi publicada no npm — o registro público continua em `0.1.0`. Durante o push da Session 10, o GitHub informou que o repositório foi movido para `github.com/LukasAlexandre/DDAE-Engine`; o push só funcionou por redirect automático, porque o remote local e os metadados do pacote (`package.json`) ainda apontam para o nome antigo, `github.com/LukasAlexandre/DDAD`.

Esta sessão existe para regularizar essa identidade, construir a primeira fundação de CI do projeto, proteger o processo de publicação e validar a distribuição real de `0.2.0` — **antes** de publicar qualquer coisa e antes de iniciar a Session 12 (Obsidian/Vault).

## Objetivo

Preparar a publicação segura e verificável de `ddae-engine@0.2.0`, sem publicar nada até que identidade, CI, proteção de release e smoke tests estejam todos aprovados.

## Escopo

1. Regularizar a identidade oficial do repositório e do pacote (`repository`, `homepage`, `bugs`, remote Git local).
2. Estabelecer CI multiplataforma (GitHub Actions).
3. Proteger o processo de empacotamento e publicação (`prepublishOnly` → `release:check`).
4. Validar a distribuição real de `0.2.0` via smoke test do tarball instalado.
5. Publicar `0.2.0` com tag e release — somente com autorização humana separada e específica para esse passo.

## Fora de Escopo

- Integração Obsidian/Vault (Session 12).
- Context Compiler, MCP, dashboards.
- Publicação automatizada sem supervisão humana.
- Criação retroativa da tag `v0.1.0` (exigiria auditoria de reprodutibilidade do artefato publicado, não realizada nesta sessão).
- Reescrita de qualquer documento histórico (`docs/sessions/session_00`–`09`, `feedback/` anteriores).

## Estado Inicial Confirmado

```text
Branch: main
HEAD: 3de0da5
origin/main: 3de0da5 (idêntico)
Working tree: limpo
Testes: 29/29 aprovados
Versão local: 0.2.0
Versão publicada no npm: 0.1.0
Tag v0.2.0: inexistente
CI: inexistente
Remote atual: https://github.com/LukasAlexandre/DDAD.git
Remote correto: https://github.com/LukasAlexandre/DDAE-Engine.git
```

## Blocos

| Bloco | Objetivo | Status |
|---|---|---|
| 01 — Regularização da identidade oficial | Corrigir `repository`/`homepage`/`bugs` e o remote local; preservar histórico | Concluído / Aprovado |
| 02 — Fundação de CI multiplataforma | GitHub Actions: Ubuntu (Node 22/24/26), Windows (Node 24), macOS (Node 24) | Concluído / Aprovado — 5/5 jobs verdes (run `31158674593`) |
| 03 — Proteção de empacotamento e publicação | `package:check`, `release:check` (`test`+`package:check`), `prepublishOnly`; hardening de CI | Concluído / Aprovado — commit `22f6599`, 5/5 jobs verdes (run `31164734911`) |
| 04 — Smoke tests da distribuição 0.2.0 | Instalar o tarball real isoladamente e validar o binário instalado | Concluído / Aprovado — commit `308083e`, 5/5 jobs verdes incluindo o smoke real (run `31204194590`) |
| 05 — Tag, release e publicação controlada | Somente com nova autorização humana | Concluído / Aprovado — `v0.2.0` publicada no npm e no GitHub |

## Decisões Aprovadas (revisão do usuário sobre o planejamento inicial)

1. Remote/URLs oficiais: `https://github.com/LukasAlexandre/DDAE-Engine.git` (e variantes `.git`/`/issues`).
2. ~~Suporte Node oficial: `>=24`~~ — **superado no Bloco 02** por `>=22`: Node 22 continua LTS mantido (não faz sentido excluí-lo sem ganho técnico comprovado), Node 24 é a referência principal, Node 26 (Current) é validado em CI para antecipar regressões antes de virar LTS. Node 18/20 saem por estarem EOL.
3. ~~Matriz de CI: Ubuntu/Node 24, Ubuntu/Node 26, Windows/Node 24, macOS/Node 24 (4 jobs)~~ — **superada no Bloco 02** por 5 jobs: Ubuntu/Node 22, Ubuntu/Node 24, Ubuntu/Node 26, Windows/Node 24, macOS/Node 24.
4. Nenhum `package-lock.json` será criado artificialmente enquanto o projeto não tiver dependências reais.
5. ~~`prepublishOnly` chamará `release:check` (que agrega `npm test` + `package:check` + `smoke`)~~ — **corrigido no Bloco 03**: `release:check` = `npm test` + `package:check` apenas. `smoke` (instalação do tarball) é adicionado ao `release:check` somente no Bloco 04, para não misturar a validação "roda a partir do checkout" (Bloco 03) com "o pacote instalado funciona de forma independente" (Bloco 04).
6. A tag `v0.1.0` retroativa **não será criada** nesta sessão.
7. A publicação continua manual — sem automação de `npm publish`.
8. O Bloco 05 exige autorização humana separada da autorização geral desta sessão.

## Bloco 02 — Detalhes

**Matriz de CI implementada:**

| Job | SO | Node |
|---|---|---|
| 1 | ubuntu-latest | 22 |
| 2 | ubuntu-latest | 24 |
| 3 | ubuntu-latest | 26 |
| 4 | windows-latest | 24 |
| 5 | macos-latest | 24 |

**Justificativa da política Node `>=22`:** Node 22 e 24 são linhas LTS mantidas (24 como referência principal), Node 26 é a linha Current — validada em CI para antecipar regressões antes de se tornar LTS. Node 18/20 foram removidos da política oficial por estarem end-of-life e não receberem mais correções, inclusive de segurança.

**O que este bloco valida:** o CLI executado diretamente do checkout (`node bin/ddae-engine.js`), a suíte de testes (`npm test`), e o empacotamento (`npm pack --dry-run`) — nas 5 combinações de SO/Node acima.

**O que este bloco explicitamente NÃO valida (fora de escopo, pertence a blocos futuros):** instalação real via tarball, resolução do binário após `npm install`, independência do checkout local (Bloco 04); `package:check`/`release:check`/`prepublishOnly` (Bloco 03); qualquer publicação.

**Comandos executados localmente nesta implementação** (ambiente real: Windows, Node v24.15.0, npm 11.12.1): `npm test` (29/29), `node bin/ddae-engine.js --version`/`--help`, `npm pack --dry-run`, validação de sintaxe do workflow YAML.

**O que depende de execução remota, ainda não realizada:** Node 22 e Node 26 nunca foram testados neste projeto até este bloco (ambiente local é Node 24); os jobs Windows e macOS do workflow em si (o CLI já roda em Windows localmente, mas nunca dentro de um runner GitHub Actions); a validação de que o workflow de fato executa e passa no GitHub — só ocorre após commit + push.

**Segurança:** workflow com `permissions: contents: read` (sem escrita), sem secrets, sem `NODE_AUTH_TOKEN`, sem `registry-url`, sem passo de publicação, gatilho `pull_request` (não `pull_request_target`), `package-manager-cache: false` (cache desabilitado explicitamente).

## Bloco 03 — Detalhes

**Cadeia de proteção implementada:**

```text
npm publish
    ↓
prepublishOnly
    ↓
npm run release:check
    ├── npm test
    └── npm run package:check
```

**`package:check` (`scripts/release/verify-package.mjs`):** roda `npm pack --dry-run --json` (a lista real de arquivos que seriam publicados, não uma suposição baseada em `package.json.files`) e valida: metadados essenciais (`name`, `version` — travada em `0.2.0` para este ciclo de release via `EXPECTED_VERSION`, `engines.node`, `bin.ddae-engine` apontando para arquivo existente), identidade de repositório (`repository`/`homepage`/`bugs` apontando para `DDAE-Engine`), presença de arquivos obrigatórios (`package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`, `bin/ddae-engine.js`, mais uma amostra representativa de `src/cli.js`/`src/commands/`/`src/utils/`/`src/templates/`), e ausência de arquivos proibidos (`test/`, `.github/`, `docs/sessions/`, `feedback/`, `scripts/ci/`, `scripts/release/`, `node_modules/`, `.git/`, `*.tgz`, `.env`, padrões de segredo). Zero dependências novas.

**Decisão de escopo — sem `smoke` ainda:** `release:check` nesta etapa é só `npm test` + `package:check`. A instalação real do tarball (`scripts/smoke-distribution.mjs`, `test/pack-smoke.test.js`) pertence ao Bloco 04 — não implementada aqui, por decisão explícita de não misturar os dois blocos.

**Decisão de escopo — sem `release:tag-check` ainda:** a verificação `package.json.version` ↔ tag Git não foi implementada neste bloco, porque nenhuma tag existe até o Bloco 05. Fica planejada como gate separado (`release:tag-check`), a ativar só quando a tag `v0.2.0` existir de fato — evita complexidade prematura sobre algo que não pode ser testado honestamente agora.

**Hardening de CI aplicado:**
- `actions/checkout` fixada por SHA: `3d3c42e5aac5ba805825da76410c181273ba90b1` (equivalente a `v7.0.1`).
- `actions/setup-node` fixada por SHA: `820762786026740c76f36085b0efc47a31fe5020` (equivalente a `v7.0.0`).
- SHAs resolvidos via `gh api repos/actions/{checkout,setup-node}/git/refs/tags/<versão>` e cruzados contra a versão específica mais recente de cada `v7.x` — não inventados.
- `persist-credentials: false` adicionado ao `actions/checkout`.
- `permissions: contents: read` preservado; `package-manager-cache: false` preservado; nenhum secret, `NODE_AUTH_TOKEN`, `registry-url` ou passo de publicação adicionado.
- CI passa a rodar `npm run package:check` em todos os jobs (mesma validação de pacote que o `prepublishOnly` usará), sem rodar `release:check`/`npm publish --dry-run` completos em todo job — mantém a CI rápida.

**Rollback documentado (ainda não exercitado):** caso uma publicação futura se prove problemática, o mecanismo correto é `npm deprecate ddae-engine@<versão> "<mensagem>"` — o registro npm não permite "despublicar" após ~72h. Nenhuma publicação real ocorreu nesta sessão; este parágrafo é preparação para o Bloco 05.

**`npm publish` real continua proibido neste bloco** — apenas `npm publish --dry-run` foi executado, confirmando que `prepublishOnly` → `release:check` → `npm test` + `package:check` disparam corretamente antes de qualquer tentativa de publicação.

## Bloco 04 — Detalhes

**Jornada provada:** repositório → `npm pack` **real** (não dry-run) → `.tgz` em diretório temporário fora do checkout → `npm install --prefix <tmp> --ignore-scripts --no-audit --no-fund --no-save --offline <tarball>` em diretório isolado → resolução do `ddae-engine` instalado sob `<tmp>/install/node_modules/ddae-engine` → execução do binário **instalado** (nunca `bin/ddae-engine.js` do checkout) → `--version`/`--help` → `init` em consumer vazio → confirmação de zero sessões → `session_01`/`session_02` → 13 módulos canônicos → `block create`/`prompt create`/`feedback create` → `validate`/`audit` → detecção de layout legado em um segundo consumer isolado → limpeza total.

**`scripts/release/smoke-distribution.mjs`:** zero dependências externas; exporta `runDistributionSmoke()` (função pura testável, usada tanto pelo runner CLI quanto por `test/pack-smoke.test.js`); usa `os.tmpdir()`/`fs.mkdtempSync` (nunca um caminho fixo); verifica por `fs.realpathSync` que tarball, pacote instalado e diretórios de consumo estão fora de `PROJECT_ROOT` antes de prosseguir; limpa tudo em `finally`, com sucesso ou falha.

**Invocação portável do npm (Etapa 4):** usa `process.env.npm_execpath` (variável que o próprio npm define em qualquer processo que ele mesmo dispara — `npm run smoke`, `npm test`, `npm publish`) + `execFileSync(process.execPath, [npmExecPath, ...args])`. Isso invoca o `node` diretamente sobre o arquivo JS real do npm, sem shell e sem o shim `npm.cmd` do Windows — mais robusto que a solução do Bloco 03 (que funciona, mas exige `execSync` com string literal, inadequado aqui porque os argumentos de `smoke` incluem caminhos temporários dinâmicos, que no Windows podem conter espaços). Se `npm_execpath` não estiver disponível (script chamado fora de qualquer `npm run`/`npm test`), o script falha com uma mensagem clara em vez de tentar um fallback frágil.

**Bug real encontrado e corrigido durante a implementação:** rodar `npm publish --dry-run` (que dispara `prepublishOnly` → `release:check` → `smoke`) fazia o `smoke` falhar com "tarball não encontrado" — porque o `npm publish --dry-run` pai define `npm_config_dry_run=true` no ambiente, e essa variável é herdada pelo `npm pack` aninhado disparado por `runNpm()`, fazendo-o *também* rodar em modo dry-run silenciosamente (retorna JSON de sucesso, mas nunca escreve o arquivo). Corrigido filtrando todas as variáveis `npm_config_*` herdadas antes de invocar comandos npm aninhados (`cleanNpmEnv()`). Confirmado via `npm publish --dry-run` real após a correção: `[DDAE smoke] OK`.

**Resolução do binário instalado:** o script confirma que o shim de PATH (`node_modules/.bin/ddae-engine[.cmd/.ps1]`) foi criado pela instalação (prova de que o link do `bin` funcionou), mas **executa o CLI invocando `node <caminho-resolvido>/bin/ddae-engine.js` diretamente**, não através do shim — decisão deliberada: rodar shims `.cmd`/`.ps1` de forma portável exigiria shell no Windows, exatamente a fragilidade already corrigida no Bloco 03. Isso ainda prova a independência do checkout: o arquivo executado é o que `npm install` copiou do tarball real para dentro de `node_modules/ddae-engine/`, verificado por `realpath` como estando fora de `PROJECT_ROOT`.

**Topologia de testes (Etapa 16 — evitar duplicação em `release:check`):** `npm test` (`node --test`) descobre `test/pack-smoke.test.js`, mas o teste pesado (instalação real) fica `skip`ado por padrão — só roda com `DDAE_RUN_SMOKE_TEST=1 npm test`, opt-in do desenvolvedor, nunca embutido em nenhum script do `package.json` (evita sintaxe de variável de ambiente específica de shell/SO no `package.json`). O smoke real roda exatamente **uma vez** por `release:check`, através do step explícito `npm run smoke` — não duas.

**`release:check` expandido:** `npm test && npm run package:check && npm run smoke`. `prepublishOnly` continua `npm run release:check`, agora protegendo também o smoke.

**CI:** `npm run smoke` adicionado como step em todos os 5 jobs da matriz — a primeira vez que a instalação isolada do pacote real é validada em Ubuntu, Windows e macOS de verdade, não só localmente.

## Bloco 05 — Detalhes

O Bloco 05 foi dividido em subetapas, cada uma com seu próprio gate de aprovação:

| Subetapa | Objetivo | Resultado |
|---|---|---|
| 05A — Release Candidate Preflight | Auditoria read-only do commit `215cf05` como candidato | Aprovado tecnicamente; 2 achados documentais levaram à 05A.1 |
| 05A.1 — Finalização do Release Candidate | Corrigir data e declaração de zero-dependency no `CHANGELOG.md` | Aprovado — novo RC `2f4c19e`, CI 5/5 (run `31206798424`) |
| 05B.0 — NPM Authentication Gate | Restaurar sessão npm expirada (`401`) e confirmar maintainer/2FA | Aprovado — `npm login` completado pelo usuário em terminal próprio (esta ferramenta não consegue completar o fluxo interativo/browser do npm — limitação de ambiente, não do npm); `npm whoami` = `lukasalexandre`; 2FA `auth-and-writes` |
| 05B — Freeze + Tag | Criar e enviar a tag anotada `v0.2.0` | Aprovado — tag criada apontando exatamente para `2f4c19e`, confirmada local e remotamente (peeled ref) |
| 05C — NPM Publish | Publicação real de `ddae-engine@0.2.0` | Aprovado — `npm publish` executado pelo usuário em seu terminal (mesma limitação de ambiente do 05B.0: 2FA `auth-and-writes` exige OTP interativo que esta ferramenta não pode fornecer) |
| 05D — Public Registry Verification | Provar independentemente que o registry entrega o artefato correto | Aprovado — shasum público idêntico ao RC auditado; instalação isolada, CLI e consumer funcionais; segunda prova via `npm exec` |
| 05E — GitHub Release + Closure | Publicar o GitHub Release e fechar a Session 11 | Aprovado — release `v0.2.0` publicado (não draft, não prerelease), tag preservada, documentação de fechamento registrada |

**Release Candidate final:** `2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9`

**Artefato publicado:**
```text
ddae-engine@0.2.0
files: 93
shasum: fa42487f9909b1a6ed440789d8295cfdf76147e0
integrity: sha512-0k4WB3XKFIRVZdV4L+iIFWL20XLMVya5mU+F2XekyLTUL4UebVNYSCXsYmp3DfX0mkADifdgtxPJzqbuWY5rCA==
dependencies: {}
devDependencies: {}
```

**Verificação pública (05D), independente da publicação:**
- `npm view ddae-engine version` → `0.2.0`; `dist-tags.latest` → `0.2.0`.
- `dist.shasum`/`dist.integrity` do registry idênticos, bit a bit, aos capturados na auditoria do RC (05A.1) — nenhuma divergência entre o que foi auditado e o que foi publicado.
- Instalação real via `npm install ddae-engine@0.2.0` (sem `--offline`, sem tarball local) em diretório isolado fora do checkout: pacote, binário e `node_modules` confirmados fora de `PROJECT_ROOT` via `realpath`.
- CLI instalado (`--version`, `--help`) e jornada completa (`init` → zero sessões → `session_01_registry_smoke` → 13 módulos → `validate`/`audit`) executados exclusivamente contra o binário baixado do registry.
- Segunda prova independente via `npm exec --package=ddae-engine@0.2.0 -- ddae-engine --version` → `0.2.0`, de fora do projeto.

**GitHub Release:**
```text
tagName: v0.2.0
name: DDAE Engine v0.2.0
isDraft: false
isPrerelease: false
url: https://github.com/LukasAlexandre/DDAE-Engine/releases/tag/v0.2.0
```
Release notes escritas manualmente (sem `--generate-notes`), revisadas antes da criação contra um checklist (título, versão, Node >=22, `session_01`, comportamento legado não-destrutivo, zero dependencies, shasum, repositório, ausência de referências `DDAD`/`DDAT` operacionais, ausência de informação sensível).

**Nota sobre imutabilidade:** a tag `v0.2.0` aponta e continuará apontando para `2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9`. O commit de fechamento documental desta sessão (que registra esta própria seção) acontece **depois** da release e deliberadamente não faz parte do artefato `v0.2.0` — a identidade da versão publicada não é, e não deve ser, reescrita.

**Limitação de ambiente identificada (não é um problema do DDAE-Engine):** esta ferramenta de execução não conseguiu completar `npm login` nem `npm publish` diretamente (ambos exigem um terminal interativo real para o fluxo de aprovação via navegador/2FA, que este shell não-interativo não fornece). Essas duas ações específicas foram executadas pelo usuário diretamente em seu próprio terminal; todo o restante do Bloco 05 (auditoria, tag, verificação de registry, release) foi executado e comprovado por aqui.

## Riscos

- ~~Ausência de teste real em Node 24/26~~ — **resolvido no Bloco 02**: CI remota confirmou 5/5 jobs verdes em Ubuntu (22/24/26), Windows (24) e macOS (24).
- Custo de runners macOS no GitHub Actions (aceito conscientemente pela natureza fortemente dependente de filesystem/paths do projeto).
- Repetição do histórico de bloqueio de nome no `npm publish` (risco residual baixo — o nome `ddae-engine` já está registrado na mesma conta).
- `EXPECTED_VERSION` em `verify-package.mjs` é travada manualmente em `"0.2.0"` — precisa ser atualizada a cada nova release; se esquecida, `package:check` passará a falhar com uma mensagem clara (não silenciosamente), o que é o comportamento pretendido.

## Critérios Globais da Sessão

- Nenhum documento histórico (`docs/sessions/session_00`–`09`, `feedback/` anteriores) alterado.
- Nenhuma referência operacional atual continua apontando para `DDAD` ao final da sessão.
- CI verde antes de qualquer publicação.
- `release:check` aprovado localmente antes de qualquer publicação.
- Publicação real ocorre somente no Bloco 05, com autorização separada.

## Condição para Publicação

`npm publish` de `0.2.0` só podia ocorrer depois que: identidade regularizada (Bloco 01) + CI verde (Bloco 02) + `release:check` (`test`+`package:check`) aprovado e travado via `prepublishOnly` (Bloco 03) + `release:check` expandido com `smoke` do tarball instalado aprovado local e remotamente (Bloco 04) + autorização humana explícita para o Bloco 05. Todas as condições foram satisfeitas e a publicação foi concluída.

## Status Atual

**Concluída / Aprovada.** Bloco 01: concluído/aprovado (`cad98a8`). Bloco 02: concluído/aprovado (`1f873e7` + `ac5c2f1`) — CI validada remotamente com 5/5 jobs verdes. Bloco 03: concluído/aprovado (`22f6599` + `a020db0`) — CI validada remotamente com 5/5 jobs verdes, incluindo `package:check` rodando com sucesso em Ubuntu 22/24/26, Windows 24 e macOS 24 (run `31164734911`). Bloco 04: concluído/aprovado (`308083e`) — CI validada remotamente com 5/5 jobs verdes, incluindo o step "Distribution smoke (real tarball + isolated install)" rodando com sucesso em Ubuntu 22/24/26, Windows 24 e macOS 24 (run `31204194590`). Bloco 05: concluído/aprovado — `v0.2.0` taggeada (`2f4c19e`), publicada no npm (`ddae-engine@0.2.0`, verificada de forma independente contra o registry público) e no GitHub (release não-draft, não-prerelease).

`ddae-engine@0.2.0` está publicamente disponível via `npm install ddae-engine` / `npx ddae-engine`. **Session 12 liberada para planejamento futuro — não iniciada nesta sessão.**

## Nota Operacional — Validação Remota do Bloco 03

Run `31164734911` (evento `push`, `headSha` = `22f6599`, commit `chore(release): add package validation and publish gate`): conclusão `success`, 5/5 jobs. Cada job executou o step "Verify package contents (package:check)" com sucesso, comprovando que a correção Windows do `verify-package.mjs` (uso de `execSync` com comando literal, em vez de `execFileSync` com `npm.cmd`) funciona de fato em um runner `windows-latest` real, não apenas na máquina de desenvolvimento local. URL: https://github.com/LukasAlexandre/DDAE-Engine/actions/runs/31164734911.

## Nota Operacional — Validação Remota do Bloco 04

Run `31204194590` (evento `push`, `headSha` = `308083e`, commit `test(release): add isolated distribution smoke validation`): conclusão `success`, 5/5 jobs, todos concluídos em menos de um minuto cada. O step "Distribution smoke (real tarball + isolated install)" — que empacota um tarball real, instala-o isoladamente e roda a jornada completa do CLI contra o binário instalado — passou nos 5 ambientes (`ubuntu-latest`/22, `ubuntu-latest`/24, `ubuntu-latest`/26, `windows-latest`/24, `macos-latest`/24). Isso comprova que a estratégia de invocação portável do npm (`process.env.npm_execpath` + `process.execPath`, sem shell) funciona de fato em runners reais nos três sistemas operacionais, não apenas na máquina de desenvolvimento Windows local. URL: https://github.com/LukasAlexandre/DDAE-Engine/actions/runs/31204194590.

## Nota Operacional — Infraestrutura de CI (Bloco 02)

A primeira execução da CI (disparada pelo `push` do commit `1f873e7`) sofreu instabilidade de infraestrutura do GitHub, não relacionada ao workflow: disparo com ~9 min de atraso, e 3 dos 5 jobs falharam com `"runner not acquired"`. Uma tentativa de re-run dos jobs falhos ficou presa 13+ horas em estado quebrado. Uma execução nova e independente (`workflow_dispatch`, run `31158674593`) confirmou os 5/5 jobs verdes pouco depois, indicando que o problema era transitório do lado do GitHub. Detalhes completos em `validacao_bloco_11_estabilizacao_ci_e_release.md`, seção 6.
