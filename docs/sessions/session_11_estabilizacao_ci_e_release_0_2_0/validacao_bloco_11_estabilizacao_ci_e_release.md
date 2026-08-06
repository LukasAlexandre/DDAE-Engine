# Validação — Session 11: Estabilização de CI e Release 0.2.0

Documento vivo, atualizado ao final de cada bloco.

## 1. Status por Bloco

- [x] Bloco 01 — Regularização da identidade oficial — Aprovado, commitado (`cad98a8`) e enviado a `origin/main`
- [~] Bloco 02 — Fundação de CI multiplataforma — Implementado localmente, aguardando commit/push e validação remota
- [ ] Bloco 03 — Proteção de empacotamento e publicação — Não iniciado
- [ ] Bloco 04 — Smoke tests da distribuição 0.2.0 — Não iniciado
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
- [x] `README.md` e `CHANGELOG.md` atualizados com a nova política Node — sem declarar CI aprovada.
- [ ] Workflow executa e passa nos 5 jobs no GitHub — **pendente de execução remota**.
- [ ] Verificação de árvore limpa (`scripts/ci/verify-clean-tree.mjs`) validada dentro de um runner real — **pendente**; localmente o script foi exercitado e detectou corretamente um estado sujo durante o desenvolvimento.

## 6. Bloco 02 — Evidências

`npm test` local: 29/29. `node bin/ddae-engine.js --version`: `0.2.0`. `npm pack --dry-run`: aprovado, 93 arquivos. YAML validado via `npx js-yaml` (estrutura JSON resultante conferida linha a linha). `actions/checkout@v7` e `actions/setup-node@v7` confirmados existentes via `gh api repos/actions/{checkout,setup-node}/tags`. Input `package-manager-cache` confirmado real via `gh api repos/actions/setup-node/contents/action.yml`.

## 7. Bloco 02 — Decisão

Implementação local aprovada. **Validação remota pendente** — o bloco só pode ser considerado totalmente aprovado após commit, push e a primeira execução verde dos 5 jobs no GitHub Actions.

---

## 8. Blocos 03–05

A preencher conforme cada bloco for executado e liberado pelo usuário.
