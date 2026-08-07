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
| 03 — Proteção de empacotamento e publicação | `package:check`, `smoke`, `release:check`, `prepublishOnly` | Não iniciado |
| 04 — Smoke tests da distribuição 0.2.0 | Instalar o tarball real isoladamente e validar o binário instalado | Não iniciado |
| 05 — Tag, release e publicação controlada | Somente com nova autorização humana | Não iniciado |

## Decisões Aprovadas (revisão do usuário sobre o planejamento inicial)

1. Remote/URLs oficiais: `https://github.com/LukasAlexandre/DDAE-Engine.git` (e variantes `.git`/`/issues`).
2. ~~Suporte Node oficial: `>=24`~~ — **superado no Bloco 02** por `>=22`: Node 22 continua LTS mantido (não faz sentido excluí-lo sem ganho técnico comprovado), Node 24 é a referência principal, Node 26 (Current) é validado em CI para antecipar regressões antes de virar LTS. Node 18/20 saem por estarem EOL.
3. ~~Matriz de CI: Ubuntu/Node 24, Ubuntu/Node 26, Windows/Node 24, macOS/Node 24 (4 jobs)~~ — **superada no Bloco 02** por 5 jobs: Ubuntu/Node 22, Ubuntu/Node 24, Ubuntu/Node 26, Windows/Node 24, macOS/Node 24.
4. Nenhum `package-lock.json` será criado artificialmente enquanto o projeto não tiver dependências reais.
5. `prepublishOnly` chamará `release:check` (que agrega `npm test` + `package:check` + `smoke`), não apenas `npm test`.
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

## Riscos

- Ausência de teste real em Node 24/26 até agora (ambiente de desenvolvimento usado nas Sessions 10 foi Node v24.15.0, mas nunca testado contra Node 26 nem contra `engines` `>=24` formalmente).
- Custo de runners macOS no GitHub Actions (aceito conscientemente pela natureza fortemente dependente de filesystem/paths do projeto).
- Repetição do histórico de bloqueio de nome no `npm publish` (risco residual baixo — o nome `ddae-engine` já está registrado na mesma conta).

## Critérios Globais da Sessão

- Nenhum documento histórico (`docs/sessions/session_00`–`09`, `feedback/` anteriores) alterado.
- Nenhuma referência operacional atual continua apontando para `DDAD` ao final da sessão.
- CI verde antes de qualquer publicação.
- `release:check` aprovado localmente antes de qualquer publicação.
- Publicação real ocorre somente no Bloco 05, com autorização separada.

## Condição para Publicação

`npm publish` de `0.2.0` só pode ocorrer depois que: identidade regularizada (Bloco 01) + CI verde (Bloco 02) + `release:check` aprovado (Bloco 03) + smoke test do tarball instalado aprovado (Bloco 04) + autorização humana explícita para o Bloco 05.

## Status Atual

Em andamento. Bloco 01: concluído/aprovado (`cad98a8`). Bloco 02: concluído/aprovado (`1f873e7`) — CI validada remotamente com 5/5 jobs verdes. Blocos 03–05: não iniciados.

## Nota Operacional — Infraestrutura de CI (Bloco 02)

A primeira execução da CI (disparada pelo `push` do commit `1f873e7`) sofreu instabilidade de infraestrutura do GitHub, não relacionada ao workflow: disparo com ~9 min de atraso, e 3 dos 5 jobs falharam com `"runner not acquired"`. Uma tentativa de re-run dos jobs falhos ficou presa 13+ horas em estado quebrado. Uma execução nova e independente (`workflow_dispatch`, run `31158674593`) confirmou os 5/5 jobs verdes pouco depois, indicando que o problema era transitório do lado do GitHub. Detalhes completos em `validacao_bloco_11_estabilizacao_ci_e_release.md`, seção 6.
