# Checkpoint 12.2 — Stable Host Promotion (0.2.0 → 0.3.0)

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-16

## Natureza

Checkpoint pós-fechamento, infraestrutura de self-hosting apenas — resolve a pendência **P2 / MR-01** carregada no fechamento formal da Session 02 (`08_feedbacks/feedback_bloco_12_controlled_0_3_0_release.md`, `Docs/04_governance/matriz_riscos.md`): o Stable Host deste checkout continuava pinado em `ddae-engine@0.2.0` (`scripts/ci/verify-stable-host.mjs`) apesar de `0.3.0` já estar publicado, taggeado e released. Este checkpoint **não altera a release pública `v0.3.0`** — não move a tag, não recria o GitHub Release, não executa `npm publish`, não versiona `0.3.1`. É trabalho de repositório/self-hosting posterior à release, seguindo o modelo de promoção já definido em `Docs/00_ddae_engine/self_hosting.md` Seção 7.

## Baseline confirmado antes da promoção

```text
git status --short --branch  → ## main...origin/main (limpo)
git rev-parse HEAD             → f93b846af86763ae1562c0972328fc11b03a41a5
npm pkg get version            → 0.3.0
git rev-list -n 1 v0.3.0       → 0ca3f904be7b292115412dcba27539ac277ad8be
npm view ddae-engine@0.3.0 gitHead → 0ca3f904be7b292115412dcba27539ac277ad8be
```

Todos os valores conferem exatamente com o estado registrado no fechamento anterior (`f93b846`).

## Auditoria da pendência (antes de qualquer alteração)

- **Onde `0.2.0` estava pinado**: `scripts/ci/verify-stable-host.mjs`, constante `STABLE_HOST_VERSION`, deliberadamente independente de `package.json.version` (ver comentário no próprio arquivo).
- **Contrato do Stable Host**: `Docs/00_ddae_engine/self_hosting.md` — "Stable Host governa o Candidate"; toda ação de governança (`validate`/`audit`, criação de sessão) usa uma versão publicada e comprovada, nunca o checkout em desenvolvimento.
- **O que significa promover**: reinstalar o novo Stable Host a partir do registro público e reexecutar `validate`/`audit` contra o repositório, provando que ele governa o checkout sem erro — exigência explícita da Seção 7 do contrato ("nunca é automática ou implícita").
- **Testes que validam a promoção**: nenhum teste unitário dedicado; a prova é o próprio `scripts/ci/verify-stable-host.mjs`, executado tanto localmente quanto no job `Self-host: prove published stable host governs this checkout` do CI (`.github/workflows/ci.yml`, roda nos 5 ambientes da matriz — Ubuntu ×3, Windows, macOS, não é Linux-only).
- **Outros arquivos que precisavam acompanhar a mudança**: `Docs/00_ddae_engine/self_hosting.md` (Seção 1 — versão do pacote/comando de instalação; Seção 7 — diagrama do modelo de promoção; Seção 8 — status do roadmap) e `Docs/01_product/visao_produto.md` (Seção 3 — Objetivo 3; Seção 4 — status do roadmap oficial), ambos com referências textuais a `0.2.0`/"In development" que ficariam desatualizadas. Confirmado via `grep -rl "Stable Host" Docs/` (excluindo `Docs/05_sessions/`): exatamente esses dois arquivos, mais `Docs/04_governance/matriz_riscos.md` (MR-01, fechado abaixo).
- **Impacto no artefato npm distribuído**: nenhum. `scripts/` e `Docs/` não constam em `package.json.files` (`bin`, `src`, `README.md`, `LICENSE`, `CHANGELOG.md`) — confirmado por leitura direta do campo antes de qualquer edição.

## Classificação de versionamento (antes da implementação)

```text
repository/self-host infrastructure change
!=
new npm distribution release
```

Confirmado empiricamente, não apenas por leitura do `files`: `npm pack --dry-run --json` antes e depois da promoção retornou o mesmo `shasum` (`e41ede33157278f700247d3b4f074a141fc2d9b6`), a mesma `integrity` e o mesmo `entryCount` (106) — idênticos ao artefato publicado como `ddae-engine@0.3.0`. `0.3.1` **não é necessário**.

## Implementação (mínima, sem refactor não relacionado)

```diff
- const STABLE_HOST_VERSION = '0.2.0';
+ const STABLE_HOST_VERSION = '0.3.0';
```

(`scripts/ci/verify-stable-host.mjs`, única mudança de código/infra necessária — o restante do script já era version-agnostic.)

Documentação atualizada para refletir a promoção: `Docs/00_ddae_engine/self_hosting.md` (Seção 1, 7, 8), `Docs/01_product/visao_produto.md` (Seção 3, 4). Nenhuma reescrita de histórico — a Seção 7 do contrato de self-hosting registra explicitamente a sequência real (`0.2.0 Stable Host → 0.3.0 Candidate → publicado → 0.3.0 Stable Host`), incluindo a publicação como evento já ocorrido, não hipotético.

## Prova formal da promoção (`node scripts/ci/verify-stable-host.mjs`)

```text
=== DDAE Self-Host: Stable Host Linux/Cross-Platform Validation Proof ===
package.json SHA-256 (before install): 93df4d8ab350cc683483fe8881e70556470fc5b6b093cfca557262cd607fd544

$ npm install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund ddae-engine@0.3.0
changed 1 package in 4s

$ node node_modules/ddae-engine/bin/ddae-engine.js --version
0.3.0

$ node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
Status: OK
Sessions found: 2
Warnings: 0
Errors: 0

$ node node_modules/ddae-engine/bin/ddae-engine.js audit --dir .
Status: OK
Errors: 0
(Warnings: 8 — 7 quality gates globais pré-existentes + 1 pendência P2 deste próprio checkpoint, ainda não fechada no momento da execução)

package.json SHA-256 (after install):  93df4d8ab350cc683483fe8881e70556470fc5b6b093cfca557262cd607fd544
(idêntico ao "before" — nenhuma mutação)

[DDAE self-host] Stable host validation PASSED
```

Instalação real a partir do registro público (não tarball local, não checkout) — `ddae-engine@0.3.0` como Stable Host governando este próprio checkout, exatamente o mecanismo exigido pelo contrato de self-hosting. Executado localmente (Windows); o mesmo script roda sem diferença de branch/condição nos 5 ambientes do CI (`ubuntu-latest` ×3, `windows-latest`, `macos-latest`) — não há prova pendente específica de Linux para esta etapa.

## Regressão completa pós-promoção

```text
git diff --check       → exit 0, sem problemas
npm test                → 448 total, 445 pass, 0 fail, 3 skipped
npm run package:check   → OK, ddae-engine@0.3.0, 106 files
npm run smoke            → [DDAE smoke] OK (incl. Context compiler: OK)
ddae-engine validate     → Status: OK, Errors: 0
ddae-engine audit        → Status: OK, Errors: 0
```

`npm run release:check` não foi reexecutado isoladamente — é exatamente a composição sequencial de `test` + `package:check` + `smoke`, todos os três já reexecutados individualmente acima com o mesmo resultado; rodar novamente seria repetição, não prova adicional.

## Prova de que o pacote npm 0.3.0 permanece inalterado

```text
npm pack --dry-run --json
  name: ddae-engine
  version: 0.3.0
  entryCount: 106
  shasum: e41ede33157278f700247d3b4f074a141fc2d9b6
  integrity: sha512-IFdbXPIsMz/1NwtRqD1fAMTc+PC0F78viasCk6u/XNQ+52b7MyylHDNmW4j/WpLO4zU7lwIYFT9fLoc1Hrs79w==
```

Idêntico ao publicado (Bloco 13) e ao capturado antes desta promoção (mesma seção acima). `scripts/ci/verify-stable-host.mjs` e os três documentos `Docs/**` editados não fazem parte de `package.json.files` — confirmado antes e depois pela reexecução do `npm pack --dry-run`, não apenas por inspeção estática.

```text
NO NEW npm RELEASE REQUIRED
```

## Resolução formal — P2 / Stable Host promotion

```text
Quando surgiu:        Bloco 12 (escopo original previa a promoção; não executada durante os Human Gates A/B/C)
Por que foi carregada: fechamento da Session 02 priorizou reconciliar a publicação já consumada (Gate A) e
                       executar os Gates B/C sob autorização humana; a promoção do Stable Host ficou fora do
                       tempo dessa execução, registrada como P2 (não bloqueante) em vez de atrasar o fechamento.
Mudança que resolveu:  scripts/ci/verify-stable-host.mjs — STABLE_HOST_VERSION '0.2.0' → '0.3.0'.
Evidência:             node scripts/ci/verify-stable-host.mjs → PASSED (instalação real do registro,
                       validate/audit OK contra este checkout, package.json byte-idêntico antes/depois).
Commit correspondente: registrado no commit deste checkpoint (ver Fase 10).
```

```text
P2 — Stable Host promotion:  RESOLVED
```

## Resolução formal — MR-01 (`Docs/04_governance/matriz_riscos.md`)

Status atualizado de `Aberto` para `Mitigado` (terminologia oficial da matriz — não existe bucket "Resolvido" no template; `Mitigado` é o mais próximo e a linha do risco registra explicitamente que a causa raiz foi eliminada, não apenas contida). Histórico do risco preservado, não apagado.

## Segurança

Nenhum token, senha, OTP ou credencial foi exibido, solicitado ou registrado. `npm install ddae-engine@0.3.0` usou apenas o registro público, sem persistir dependência (`--no-save`, sem `package-lock.json` criado, `dependencies`/`devDependencies` continuam vazios — verificado pelo próprio script). `node_modules/ddae-engine/` é local, efêmero, coberto por `.gitignore`, nunca commitado.

## Decisão do Checkpoint

- [x] Pendência auditada antes de qualquer alteração (onde estava pinado, contrato, escopo da promoção, testes, arquivos relacionados, impacto no artefato).
- [x] Classificação de versionamento confirmada empiricamente antes da implementação — infra, não release.
- [x] Promoção implementada de forma mínima (uma constante), sem refactor não relacionado.
- [x] Prova formal via o mecanismo real do projeto (`verify-stable-host.mjs`), não apenas inspeção de código.
- [x] Regressão completa (`test`/`package:check`/`smoke`/`validate`/`audit`) — sem alteração de resultado.
- [x] Artefato npm publicado provado inalterado (`npm pack --dry-run` idêntico ao publicado).
- [x] P2 fechada com evidência, sem apagar o histórico de por que existiu.
- [x] MR-01 atualizado para `Mitigado`, sem apagar o registro do risco.

**CHECKPOINT 12.2: APROVADO.**

## Pendências remanescentes

Nenhuma pendência P1 ou P2 aberta relacionada à linha `0.3.x`. Session 02 pode ser considerada, a partir deste checkpoint, sem ressalva ativa — ver addendum em `09_validation/fechamento_sessao.md`.
