# Plano — Session 11: Estabilização de CI e Release 0.2.0

Este plano incorpora as correções aprovadas pelo usuário sobre o planejamento inicial (somente-leitura) desta sessão. Onde a proposta inicial mudou, isso está marcado explicitamente.

## 1. Objetivo Geral

Preparar a publicação segura e verificável de `ddae-engine@0.2.0`: identidade regularizada, CI multiplataforma, proteção de empacotamento/publicação e validação real da distribuição — antes de qualquer publicação.

## 2. Fora de Escopo (toda a sessão)

- Obsidian/Vault, Context Compiler, MCP, dashboards (Session 12).
- Publicação automatizada sem supervisão humana.
- Tag `v0.1.0` retroativa.
- Reescrita de documentos históricos.

---

## Bloco 01 — Regularização da identidade oficial

**Objetivo:** corrigir `repository.url`, `homepage`, `bugs.url` em `package.json` e o `git remote origin` local, sem tocar em histórico.

**Escopo:**
- `package.json`: `repository.url` → `git+https://github.com/LukasAlexandre/DDAE-Engine.git`; `homepage` → `https://github.com/LukasAlexandre/DDAE-Engine`; `bugs.url` → `https://github.com/LukasAlexandre/DDAE-Engine/issues`.
- `git remote set-url origin https://github.com/LukasAlexandre/DDAE-Engine.git`.
- `CHANGELOG.md`: registrar a correção de metadados na entrada `0.2.0`, sem declarar CI/smoke/tag/publicação como concluídos.
- Auditoria final de referências (`git grep` por `DDAD`/`DDAT`) para confirmar que só os 4 pontos operacionais mudaram.

**Fora de escopo:** `name`, `version`, `description`, `bin`, `files`, `scripts`, `engines`, `keywords`, `author`, `license`, dependências; qualquer arquivo em `docs/sessions/session_00`–`09` ou `feedback/` anterior; CI; scripts de release; smoke tests; tag; publicação.

**Arquivos previstos:** `package.json`, `CHANGELOG.md`, `docs/sessions/session_11_estabilizacao_ci_e_release_0_2_0/**` (registro da própria sessão).

**Dependências:** nenhuma.

**Implementação esperada:** `git remote -v` mostrando `DDAE-Engine.git`; `package.json` sem nenhuma ocorrência de `DDAD`; `docs/sessions/**` e `feedback/**` históricos inalterados (confirmado por diff vazio nesses caminhos).

**Riscos:** nenhum — `git remote set-url` é config local, reversível a qualquer momento; edição de 3 campos JSON é de baixo risco, validada por `npm pack --dry-run` continuando aprovado.

**Critérios de aceite:** ver lista de 13 itens no relatório final desta etapa.

**Testes:** `npm test` (regressão — não deve haver impacto, já que nenhuma lógica de CLI muda); `npm pack --dry-run`; `git diff --check`.

**Evidência:** `git diff package.json`, `git remote -v` antes/depois, `git ls-remote origin`.

**Rollback:** `git remote set-url origin https://github.com/LukasAlexandre/DDAD.git` (reversível); `git checkout -- package.json` antes do commit (também reversível, sem commit ainda realizado).

**Definição de pronto:** todos os critérios de aceite verificados; nenhum commit realizado sem autorização explícita adicional para essa ação específica.

---

## Bloco 02 — Fundação de CI multiplataforma

**Objetivo:** criar o primeiro workflow de CI do projeto.

**Correção aplicada ao plano inicial (rodada 1):** "Node 18 + LTS atual + 24.x", Ubuntu+Windows obrigatórios/macOS opcional.

**Correção aplicada ao plano inicial (rodada 2, revisão do usuário sobre a rodada 1):** ~~`engines.node: ">=24"`, matriz de 4 jobs (Ubuntu/24, Ubuntu/26, Windows/24, macOS/24)~~ — **superada** pela decisão final abaixo, porque excluir Node 22 (ainda LTS mantido) sem ganho técnico comprovado era desnecessariamente restritivo.

**Decisão final implementada:**
- **Suporte Node oficial do projeto:** `engines.node: ">=22"` em `package.json` (era `">=18"`) — mudança de compatibilidade, registrada no `CHANGELOG.md` da versão `0.2.0` e no `README.md` (nova seção "Requirements").
- **Matriz de CI (5 jobs):** Ubuntu/Node 22, Ubuntu/Node 24, Ubuntu/Node 26, Windows/Node 24, macOS/Node 24.
- **Passos do workflow, por job:** checkout (`actions/checkout@v7`) → setup-node (`actions/setup-node@v7`, `package-manager-cache: false`) → imprimir `node --version`/`npm --version` → `npm test` → `node bin/ddae-engine.js --version` → `node bin/ddae-engine.js --help` → `npm pack --dry-run` → `node scripts/ci/verify-clean-tree.mjs` (verificação multiplataforma de que nada ficou sujo no checkout).
- **Sem smoke test de `init`/`session create`/etc. neste bloco:** decisão explícita — esse fluxo de sessão real pertence ao Bloco 04 (distribuição via tarball instalado), não ao Bloco 02, para manter a delimitação entre "o CLI funciona a partir do checkout" (Bloco 02) e "o pacote instalado funciona de forma independente" (Bloco 04).
- **Sem `package-lock.json`:** decisão mantida — a CI roda `npm test`/`npm pack --dry-run` diretamente, sem `npm ci`.
- **Segurança do workflow:** `permissions: contents: read` (workflow inteiro, sem escrita); sem secrets; sem `NODE_AUTH_TOKEN`; sem `registry-url`; gatilho `pull_request` (não `pull_request_target`); sem passo de publicação; `concurrency` com `cancel-in-progress` por ref; `fail-fast: false`; `timeout-minutes: 10` por job.

**Escopo:**
- `.github/workflows/ci.yml`.
- `scripts/ci/verify-clean-tree.mjs` (novo, zero dependências — usa `execFileSync('git', ['status', '--porcelain'])`).
- `package.json.engines` → `>=22`.
- `README.md` → seção "Requirements".
- `CHANGELOG.md` → entrada `0.2.0` atualizada (política Node + CI adicionada, sem declarar aprovação remota).

**Fora de escopo:** publicação automática; tags; releases; provenance; `package:check`/`release:check`/`prepublishOnly` (Bloco 03); smoke test do tarball instalado (Bloco 04).

**Arquivos previstos:** `.github/workflows/ci.yml` (novo), `scripts/ci/verify-clean-tree.mjs` (novo), `package.json` (`engines`), `README.md`, `CHANGELOG.md`, documentação da Session 11.

**Dependências:** Bloco 01 concluído (testar já com a identidade correta).

**Riscos:** primeira vez que o projeto roda em Node 22/26 formalmente, e primeira vez que roda dentro de um runner GitHub Actions (Windows/macOS incluídos) — mitigado pelo próprio propósito do bloco, mas **a validação real só ocorre após commit + push**; tudo o que foi verificado até aqui é local (Node 24 no Windows).

**Critérios de aceite:**
- [x] `engines.node` = `">=22"`.
- [x] Workflow sintaticamente válido (validado localmente) e com exatamente 5 combinações na matriz.
- [x] Nenhum secret, `NODE_AUTH_TOKEN`, `registry-url` ou passo de publicação no workflow.
- [x] `permissions: contents: read` no nível do workflow.
- [ ] Workflow executa e passa nos 5 jobs no GitHub — **pendente de execução remota**.
- [ ] Falha de teste bloqueia o workflow — **pendente de verificação remota** (não testado propositalmente nesta rodada).
- [ ] Nenhum artefato residual após a execução em qualquer job — **pendente de verificação remota** (script criado e testado localmente, mas não dentro de um runner real).

**Testes:** o próprio workflow, quando executado no GitHub; localmente, `scripts/ci/verify-clean-tree.mjs` foi exercitado manualmente (detectou corretamente um working tree sujo durante o desenvolvimento deste bloco).

**Evidência:** log/link de execução do GitHub Actions — a obter após commit + push.

**Rollback:** remover `.github/workflows/ci.yml` e `scripts/ci/verify-clean-tree.mjs`; reverter `engines.node` para `>=18` se necessário — sem efeito colateral em publicação (nada publicado ainda).

**Definição de pronto:** workflow verde nos 5 jobs no GitHub, contra o commit já com a identidade regularizada. **Não atingida nesta rodada** — falta commit, push e a primeira execução remota.

---

## Bloco 03 — Proteção de empacotamento e publicação

**Objetivo:** impedir publicação com testes falhando, pacote incompleto ou versão inconsistente.

**Correção aplicada ao plano inicial (rodada 1):** `prepublishOnly: "npm test"` — substituído porque `prepublishOnly` só roda em `npm publish`, não valida o empacotamento por si só.

**Correção aplicada ao plano inicial (rodada 2, revisão do usuário sobre a rodada 1):** ~~`release:check = npm test && npm run package:check && npm run smoke`, com `scripts/smoke-distribution.mjs` criado já neste bloco~~ — **superada**: `smoke` pertence ao Bloco 04 (instalação real do tarball), não a este. Misturar os dois quebraria a delimitação entre "roda a partir do checkout" (Bloco 03) e "o pacote instalado funciona de forma independente" (Bloco 04).

**Decisão final implementada:**

```json
{
  "scripts": {
    "test": "node --test",
    "package:check": "node scripts/release/verify-package.mjs",
    "release:check": "npm test && npm run package:check",
    "prepublishOnly": "npm run release:check"
  }
}
```

```text
npm publish
    ↓
prepublishOnly
    ↓
npm run release:check
    ├── npm test
    └── npm run package:check
```

Não foi usado `prepack` para disparar `npm pack` a partir de um lifecycle script, para evitar recursão entre scripts do próprio ciclo de vida do npm.

**`scripts/release/verify-package.mjs`** (não `scripts/verify-package.mjs` — colocado em subpasta `release/` para simetria com `scripts/ci/` e para já sinalizar que `scripts/` terá mais de uma categoria): zero dependências externas; roda `npm pack --dry-run --json` via `child_process` (usa `execSync` com um comando literal estático — não `execFileSync` com array de args + `shell:true`, que dispara o aviso de depreciação `DEP0190` do Node; `execFileSync` puro sem shell falha no Windows porque `npm` ali é o shim `npm.cmd`, que Node não consegue `spawn` diretamente); parseia a lista real de arquivos do pacote; expõe funções puras (`checkMetadata`, `checkRepositoryIdentity`, `checkRequiredFiles`, `checkForbiddenFiles`) testáveis sem tocar o filesystem ou o repositório real.

**Versão travada nesta release:** `EXPECTED_VERSION = '0.2.0'` no topo do script — precisa ser atualizada manualmente a cada nova release; se esquecida, `package:check` falha com mensagem clara em vez de publicar silenciosamente a versão errada.

**`release:tag-check` — decisão de NÃO implementar agora:** a verificação `package.json.version` ↔ tag Git não foi criada neste bloco. Nenhuma tag existe até o Bloco 05, então qualquer verificação desse tipo hoje seria não-testável honestamente (sempre "sem tag" ⇒ trivialmente falha ou trivialmente ignorada). Fica planejada como gate independente, ativado só no Bloco 05.

**Escopo:**
- `scripts/release/verify-package.mjs` (novo, zero dependências).
- `package.json`: scripts `package:check`, `release:check`, `prepublishOnly` (sem `smoke`, sem `release:tag-check`).
- `.github/workflows/ci.yml`: hardening (SHA pinning de `actions/checkout`/`actions/setup-node`, `persist-credentials: false`) + novo step `npm run package:check` em todos os jobs.
- `test/package-check.test.js` (novo).
- Documentação de rollback via `npm deprecate` (não é possível despublicar após ~72h no registro npm) — preparação para o Bloco 05, não exercitada aqui.

**Fora de escopo:** `smoke`/`scripts/smoke-distribution.mjs`/`test/pack-smoke.test.js` (Bloco 04); `release:tag-check` (Bloco 05); publicação real; criação de tag; `npm publish --provenance`.

**Arquivos previstos:** `package.json`, `scripts/release/verify-package.mjs`, `.github/workflows/ci.yml`, `test/package-check.test.js`, `CHANGELOG.md`, documentação da Session 11.

**Dependências:** Bloco 02 concluído (CI já valida com a matriz completa; hardening desta etapa se aplica sobre um workflow já comprovadamente funcional).

**Riscos:** excesso de automação tornando a publicação frágil — mitigado mantendo tudo em Node puro, sem framework de release, consistente com a filosofia zero-dependência do projeto. Risco específico encontrado e corrigido durante a implementação: `execFileSync('npm', [...])` falha no Windows (ENOENT/EINVAL) por causa do shim `npm.cmd` — resolvido com `execSync` de um comando literal.

**Critérios de aceite:**
- [x] `npm run package:check` passa contra o pacote real.
- [x] `npm run release:check` executa `test` + `package:check` em sequência.
- [x] `npm publish --dry-run` dispara `prepublishOnly` → `release:check` → `npm test` + `package:check` (confirmado no log real, sem publicação).
- [x] Falha de cada regra (`checkMetadata`, `checkRepositoryIdentity`, `checkRequiredFiles`, `checkForbiddenFiles`) comprovada via teste automatizado com dado sintético, sem editar arquivos reais do repositório.
- [x] CI roda `npm run package:check` em todos os jobs.
- [x] `actions/checkout`/`actions/setup-node` fixadas por SHA verificado via `gh api`; `persist-credentials: false` aplicado.
- [x] Rollback via `npm deprecate` documentado (não exercitado — nada foi publicado).
- [ ] Validação remota da CI com o hardening aplicado — **pendente**, só ocorre após commit + push (fora desta rodada de implementação local).

**Testes:** `test/package-check.test.js` — 8 testes cobrindo o caso real (`package:check` contra o projeto atual) e cada regra individualmente contra dados sintéticos (funções puras).

**Evidência:** saída real de `npm run package:check`, `npm run release:check`, `npm publish --dry-run` (mostrando o lifecycle completo disparando), `npm test` com 37/37.

**Rollback:** remover `scripts/release/verify-package.mjs` e os 3 scripts novos de `package.json`; reverter os SHAs do workflow para as tags móveis `@v7` se necessário — nada disso afeta publicação, pois nada foi publicado.

**Definição de pronto:** gate funcional e testado localmente; commit e push ainda pendentes de revisão explícita (este bloco não commita, por instrução).

---

## Bloco 04 — Smoke tests da distribuição 0.2.0

**Objetivo:** validar que o pacote **instalado** (não o checkout local) funciona de ponta a ponta.

**Escopo:**
- `npm pack` real (não dry-run) em diretório temporário → instalação isolada do `.tgz` → execução do binário instalado (`--version`, `--help`, `init`, `session create` ×2, `block create`, `prompt create`, `feedback create`, `validate`, `audit`) → limpeza completa dos artefatos.
- `scripts/release/smoke-distribution.mjs` (novo — **não** criado no Bloco 03, por decisão explícita de manter os blocos separados) + script `"smoke"` em `package.json`.
- `release:check` expandido para `npm test && npm run package:check && npm run smoke`.
- Confirmar que `CHANGELOG.md` está presente no pacote extraído e `test/` está ausente.
- Confirmar que nenhuma referência a `DDAD` sobrevive no pacote final (depende do Bloco 01 já estar mesclado).
- `test/pack-smoke.test.js` (novo, `node:test`) automatizando o que hoje é só manual.

**Fora de escopo:** publicação, tag, release.

**Arquivos previstos:** `test/pack-smoke.test.js`, `scripts/release/smoke-distribution.mjs` (ambos novos neste bloco), `package.json` (script `smoke` + `release:check` expandido).

**Dependências:** Blocos 01–03.

**Riscos:** instalação global pode poluir o ambiente do runner/máquina local — mitigado usando `--prefix <diretório temporário>` em vez de `-g` real.

**Critérios de aceite:** os 15 itens da Fase 5 da auditoria inicial, todos verificados (zero sessões, `session_01`/`02`, 13 módulos, `validate`/`audit`, detecção de legado, instalação pelo tarball, diretório isolado, binário resolvido corretamente, independência do checkout local, `CHANGELOG.md` presente, `test/` ausente, nenhuma referência a `DDAD`).

**Testes:** novo teste automatizado cobrindo instalação real do tarball.

**Evidência:** log da instalação + saída dos comandos contra o binário instalado.

**Rollback:** não aplicável — bloco é só validação.

**Definição de pronto:** todos os 15 itens verificados, idealmente incorporados à CI do Bloco 02.

---

## Bloco 05 — Tag, release e publicação controlada

**Executado somente após autorização humana explícita e separada.**

**Objetivo:** publicar `ddae-engine@0.2.0` de forma rastreável.

**Escopo:**
- Commit final de release (se houver pendências de Blocos 02–04 ainda não commitadas).
- Push, aguardar CI verde.
- `git tag -a v0.2.0`, push da tag.
- Criação de GitHub Release.
- `npm publish` (manual, interativo, como em todas as publicações anteriores do projeto).
- `npm view ddae-engine version dist-tags` pós-publicação.
- `npx ddae-engine@0.2.0 --version`/`init` real, via rede.
- Documentação do resultado.

**Fora de escopo:** qualquer nova funcionalidade; início da Session 12; **tag `v0.1.0` retroativa** (permanece fora de escopo desta sessão inteira).

**Dependências:** Blocos 01–04 aprovados; CI verde; autorização humana específica para este bloco.

**Riscos:** repetição de bloqueio de nome (baixo — nome já registrado na mesma conta); falha de autenticação (`EOTP`/sessão expirada), já observada em sessões anteriores — mitigado reautenticando manualmente.

**Critérios de aceite:** publicação confirmada via `npm view`; tag e release visíveis no GitHub; smoke test pós-publicação (via rede) aprovado.

**Testes:** smoke test pós-publicação real.

**Evidência:** output real de `npm view` e `npx`.

**Rollback:** `npm deprecate ddae-engine@0.2.0 "..."` se necessário; remoção de tag só se confirmado que ninguém mais a puxou.

**Definição de pronto:** `0.2.0` publicada, verificada, tag e release criados — só então a Session 12 pode começar.
