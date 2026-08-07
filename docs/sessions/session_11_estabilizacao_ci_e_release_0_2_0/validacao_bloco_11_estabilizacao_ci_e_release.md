# Validação — Session 11: Estabilização de CI e Release 0.2.0

Documento vivo, atualizado ao final de cada bloco.

## 1. Status por Bloco

- [x] Bloco 01 — Regularização da identidade oficial — Aprovado, commitado (`cad98a8`) e enviado a `origin/main`
- [x] Bloco 02 — Fundação de CI multiplataforma — Aprovado, commitado (`1f873e7`), enviado a `origin/main`, e validado remotamente: 5/5 jobs verdes (run `31158674593`)
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

## 8. Blocos 03–05

A preencher conforme cada bloco for executado e liberado pelo usuário.
