# Validação — Session 11: Estabilização de CI e Release 0.2.0

Documento vivo, atualizado ao final de cada bloco.

## 1. Status por Bloco

- [x] Bloco 01 — Regularização da identidade oficial — Aprovado, commitado (`cad98a8`) e enviado a `origin/main`
- [x] Bloco 02 — Fundação de CI multiplataforma — Aprovado, commitado (`1f873e7`), enviado a `origin/main`, e validado remotamente: 5/5 jobs verdes (run `31158674593`)
- [x] Bloco 03 — Proteção de empacotamento e publicação — Aprovado, commitado (`22f6599`), enviado a `origin/main`, e validado remotamente: 5/5 jobs verdes, incluindo `package:check` (run `31164734911`)
- [~] Bloco 04 — Smoke tests da distribuição 0.2.0 — Implementado e validado localmente (incluindo dentro de `npm publish --dry-run`); commit/push e validação CI remota pendentes
- [ ] Bloco 05 — Tag, release e publicação controlada — Não iniciado

---

## 2. Bloco 01 — Critérios de Aceite

- [x] Session 11 formalmente documentada (`README.md`, `plano_bloco_11.md`, este arquivo).
- [x] Remote local aponta para `DDAE-Engine.git`.
- [x] `repository.url` corrigido.
- [x] `homepage` corrigida.
- [x] `bugs.url` corrigida.
- [x] Histórico `DDAD`/`DDAT` preservado (`docs/sessions/session_00`–`09`, `feedback/` anteriores inalterados).
- [x] Nenhuma referência operacional continua apontando para `DDAD`.
- [x] `CHANGELOG.md` atualizado.
- [x] Testes aprovados.
- [x] `npm pack` aprovado.
- [x] Working tree contém somente o escopo deste bloco.
- [x] Nenhum commit ou push realizado (até este ponto do bloco).
- [x] Nenhuma tag criada.
- [x] Nenhuma publicação realizada.

## 3. Bloco 01 — Evidências

Commit `cad98a8` (`chore(repository): regularize DDAE Engine identity`), push confirmado para `origin/main` (`3de0da5..cad98a8`), `HEAD == origin/main`, working tree limpo, `git remote -v`/`git ls-remote origin` confirmando a URL correta sem necessidade de redirect.

## 4. Bloco 01 — Decisão

O Bloco 01 está aprovado, commitado e integrado a `main`.

---

## 5. Bloco 02 — Critérios de Aceite

- [x] `engines.node` = `">=22"` (política corrigida de `>=24` para `>=22` durante este bloco, por decisão do usuário).
- [x] Workflow `.github/workflows/ci.yml` criado, sintaticamente válido, com exatamente 5 combinações (Ubuntu/22, Ubuntu/24, Ubuntu/26, Windows/24, macOS/24).
- [x] `permissions: contents: read` no nível do workflow — sem escrita.
- [x] Nenhum secret, `NODE_AUTH_TOKEN`, `registry-url` ou passo de publicação no workflow.
- [x] Gatilho `pull_request` (não `pull_request_target`).
- [x] `package-manager-cache: false` (input real, confirmado na fonte de `actions/setup-node`).
- [x] `fail-fast: false`, `timeout-minutes: 10` por job, `concurrency` com `cancel-in-progress`.
- [x] `README.md` e `CHANGELOG.md` atualizados com a nova política Node.
- [x] Workflow executa e passa nos 5 jobs no GitHub — confirmado (run `31158674593`, conclusion `success`).
- [x] Verificação de árvore limpa (`scripts/ci/verify-clean-tree.mjs`) validada dentro de runners reais — passou em todos os 5 jobs (Ubuntu 22/24/26, Windows 24, macOS 24).

## 6. Bloco 02 — Evidências

**Local:** `npm test`: 29/29. `node bin/ddae-engine.js --version`: `0.2.0`. `npm pack --dry-run`: aprovado, 93 arquivos. YAML validado via `npx js-yaml`. `actions/checkout@v7`/`actions/setup-node@v7` confirmados existentes via `gh api`. Input `package-manager-cache` confirmado real via `gh api repos/actions/setup-node/contents/action.yml`.

**Remoto (commit `1f873e7`, push `cad98a8..1f873e7`):**
- Primeira execução (`push`, run `31125606640`): disparou com ~9 min de atraso (comportamento do GitHub para o commit que introduz o próprio workflow, não um defeito nosso). 2/5 jobs passaram de fato (`windows-latest/24` em 30s, `ubuntu-latest/22` em 13s); 3/5 falharam com `"The job was not acquired by Runner of type hosted even after multiple attempts"` — erro de infraestrutura do GitHub, não relacionado ao código/YAML.
- Tentativa de re-run dos falhos (`gh run rerun --failed`) ficou presa 13+ horas em estado `queued` com zero jobs atribuídos, e a própria API recusou cancelamento (`"Cannot cancel a workflow re-run that has not yet queued"`) — confirma problema de infraestrutura do GitHub. Esse run ficou órfão (não foi possível limpá-lo via API mesmo após a infraestrutura normalizar) — artefato cosmético, sem efeito funcional (branch não é protegida, nenhum check obrigatório configurado).
- Execução nova e independente (`workflow_dispatch`, run `31158674593`): **5/5 jobs com sucesso real**, todos concluídos em 7–32 segundos:
  - `ubuntu-latest / Node 24`: success
  - `ubuntu-latest / Node 26`: success
  - `ubuntu-latest / Node 22`: success
  - `windows-latest / Node 24`: success
  - `macos-latest / Node 24`: success

## 7. Bloco 02 — Decisão

Aprovado. Validação remota completa com evidência real de sucesso nas 5 combinações de SO/Node da matriz — não apenas pela existência do YAML.

---

## 8. Bloco 03 — Critérios de Aceite

- [x] `npm run package:check` passa contra o pacote real (`scripts/release/verify-package.mjs`).
- [x] `npm run release:check` = `npm test && npm run package:check` (sem `smoke` — deferido ao Bloco 04).
- [x] `npm publish --dry-run` dispara `prepublishOnly` → `release:check` → `npm test` (37/37) + `package:check` (OK) — confirmado no log real.
- [x] Nenhuma publicação real ocorreu; `npm view ddae-engine version` continua `0.1.0`.
- [x] Cada regra de `package:check` (metadados, identidade de repositório, arquivos obrigatórios, arquivos proibidos) comprovada com falha via teste automatizado contra dado sintético — nenhum arquivo real do repositório foi editado/restaurado para demonstrar falha.
- [x] `release:tag-check` deliberadamente **não** implementado — decisão documentada, não uma omissão.
- [x] CI (`ci.yml`) roda `npm run package:check` em todos os jobs, sem duplicar `release:check`/`npm publish --dry-run` em cada job.
- [x] `actions/checkout` e `actions/setup-node` fixadas por SHA de commit (não tag móvel), verificados via `gh api repos/actions/{checkout,setup-node}/git/refs/tags/<versão>`.
- [x] `persist-credentials: false` no `actions/checkout`.
- [x] `permissions: contents: read`, `package-manager-cache: false`, sem secrets/`NODE_AUTH_TOKEN`/`registry-url`/passo de publicação — preservados.
- [x] Zero dependências novas; sem `package-lock.json`.
- [x] Validação remota da CI com o hardening aplicado — confirmado (run `31164734911`, conclusion `success`, 5/5 jobs, `headSha` = `22f6599`).

## 9. Bloco 03 — Evidências

**Local:** `npm test`: 37/37 (29 anteriores + 8 novos em `test/package-check.test.js`). `npm run package:check`: `[DDAE package:check] OK`, 93 arquivos inspecionados. `npm run release:check`: aprovado. `npm publish --dry-run`: log confirma `prepublishOnly` → `release:check` → `npm test` → `package:check` → simulação de publicação (`+ ddae-engine@0.2.0`, sem publicação real). `npm view ddae-engine version` pós-dry-run: `0.1.0` (inalterado). Nenhum `.tgz`, `node_modules/` ou `package-lock.json` residual. SHAs de `actions/checkout@v7.0.1` (`3d3c42e5aac5ba805825da76410c181273ba90b1`) e `actions/setup-node@v7.0.0` (`820762786026740c76f36085b0efc47a31fe5020`) resolvidos e cruzados via `gh api` antes de fixar no workflow.

Problema técnico encontrado e corrigido durante a implementação: `execFileSync('npm', [...])` falha no Windows (`ENOENT` sem shim, depois `EINVAL` com `npm.cmd` direto); `execFileSync` com `shell: true` + array de args funciona mas emite `DEP0190` (depreciação do Node); solução final: `execSync` com um comando literal estático (`'npm pack --dry-run --json'`), sem interpolação, sem aviso, portável.

**Remoto (commit `22f6599`, push `ac5c2f1..22f6599`):** run `31164734911` (evento `push`, `headSha` = `22f6599`) — conclusão `success`, **5/5 jobs verdes**, disparado sem atraso desta vez (diferente do Bloco 02, cujo primeiro push levou ~9 min):
- `ubuntu-latest / Node 22`: success — todos os 10 steps aplicativos, incluindo `Verify package contents (package:check)`, com sucesso.
- `ubuntu-latest / Node 24`: success.
- `ubuntu-latest / Node 26`: success.
- `windows-latest / Node 24`: success — confirma que a correção Windows (`execSync` em vez de `execFileSync`+`npm.cmd`) funciona em runner real, não só na máquina de desenvolvimento local.
- `macos-latest / Node 24`: success.

URL: https://github.com/LukasAlexandre/DDAE-Engine/actions/runs/31164734911

## 10. Bloco 03 — Decisão

Aprovado. Implementação, validação local e validação remota completas — 5/5 jobs verdes com `package:check` executando com sucesso nos 3 sistemas operacionais e nas 3 versões de Node da matriz.

---

## 11. Bloco 04 — Critérios de Aceite

- [x] `npm pack` real (não dry-run) gera tarball em diretório temporário, fora do checkout (confirmado via `fs.realpathSync`).
- [x] `npm install --prefix <tmp>` instala exatamente esse tarball, isoladamente, com `--ignore-scripts --no-audit --no-fund --no-save --offline`.
- [x] Binário instalado (`node <tmp>/install/node_modules/ddae-engine/bin/ddae-engine.js`) resolvido e executado — nunca o `bin/ddae-engine.js` do checkout.
- [x] Shim `node_modules/.bin/ddae-engine` confirmado como existente após a instalação.
- [x] `--version` (`0.2.0`) e `--help` contra o binário instalado.
- [x] `init` em consumer vazio → `Docs/05_sessions/README.md` existe, zero sessões.
- [x] `session_01_smoke_primeira`, depois `session_02_smoke_segunda`.
- [x] 13 módulos canônicos confirmados em `session_01`.
- [x] `block create` → `prompt create` → `feedback create` completos.
- [x] `validate`/`audit` finais: `Status: OK`, `Sessions found: 2`.
- [x] Detecção de layout legado (`session_01_project_foundation`) em consumer separado — warning emitido, nada apagado.
- [x] Conteúdo do pacote instalado: obrigatórios presentes (`package.json`, `README.md`, `LICENSE`, `CHANGELOG.md`, `bin/ddae-engine.js`), proibidos ausentes (`test/`, `.github/`, `docs/sessions/`, `feedback/`, `scripts/ci/`, `scripts/release/`, `.git/`), nenhuma URL operacional `DDAD` (buscando o padrão de URL, não a palavra genérica).
- [x] `release:check` executa o smoke exatamente uma vez (não duplicado entre `npm test` e `npm run smoke`).
- [x] `npm publish --dry-run` real aprovado com o smoke incluído na cadeia, após correção do bug `npm_config_dry_run`.
- [x] CI atualizada com `npm run smoke` nos 5 jobs; YAML validado localmente.
- [ ] Validação remota da CI com o smoke — **pendente**, só ocorre após commit + push.

## 12. Bloco 04 — Evidências

**Local:** primeira execução de `npm run smoke` falhou por um bug real meu (assertiva de `--help` esperava o texto errado — "DDAE Engine" em vez de "ddae-engine — Document-Driven..."), corrigido e reexecutado com sucesso: todas as 19 etapas nomeadas `OK` (Tarball, Package install, Installed binary, Package contents, Repository independence, CLI --version, CLI --help, Fresh init, Zero sessions, Session 01, Session 02, 13 modules, Block flow, Prompt flow, Feedback flow, Validate, Audit, Legacy detection, Cleanup).

Segundo bug real encontrado: `npm publish --dry-run` → `prepublishOnly` → `release:check` → `npm run smoke` falhava com "tarball não encontrado", porque `npm_config_dry_run=true` do processo pai vazava para o `npm pack` aninhado via herança padrão de `process.env`, fazendo-o rodar em dry-run silencioso. Diagnosticado despejando `npm_config_*` do ambiente durante a chamada nested (confirmado `npm_config_dry_run: "true"`), corrigido com `cleanNpmEnv()` removendo todas as chaves `npm_config_*` antes de invocar `npm pack`/`npm install` aninhados. Reexecutado `npm publish --dry-run` real após a correção: `[DDAE smoke] OK`, cadeia completa (`prepublishOnly` → `release:check` → `test` 38/38 (1 skip por padrão) → `package:check` OK → `smoke` OK) confirmada no log, sem publicação real.

`npm test` padrão (sem opt-in): 37 aprovados + 1 skip (`test/pack-smoke.test.js`, esperado). Com `DDAE_RUN_SMOKE_TEST=1 npm test`: 38/38.

Verificação final de poluição: nenhum `.tgz`, `node_modules/`, `package-lock.json` ou diretório temporário residual na raiz do projeto após qualquer execução.

## 13. Bloco 04 — Decisão

Implementação e validação local aprovadas, incluindo o caso de uso real (`npm publish --dry-run` disparando a cadeia completa). **Commit, push e validação CI remota pendentes.**

---

## 14. Bloco 05

A preencher conforme for executado e liberado pelo usuário.
