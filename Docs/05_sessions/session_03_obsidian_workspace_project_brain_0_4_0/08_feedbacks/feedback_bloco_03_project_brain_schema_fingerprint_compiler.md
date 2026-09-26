# Feedback — Bloco 03: project brain schema fingerprint compiler

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-26

## 1. Resumo Executivo

O Bloco 03 entrega a transformação determinística `WorkspaceSnapshot → Brain Manifest v1`: um schema fechado (`src/schemas/brain-schema.js`), um fingerprint reproduzível (`src/workspace/fingerprint.js`) e um Compiler puro (`src/workspace/compiler.js`), tudo em memória. As 5 Decisões Abertas deixadas pela preparação do bloco foram resolvidas e registradas no bloco **antes** de qualquer código (Seção 15 do bloco), e a implementação foi feita em TDD (testes primeiro, confirmados vermelhos por `ERR_MODULE_NOT_FOUND`, depois o código mínimo).

Uma única correção de fronteira foi necessária em `src/workspace/discover.js` (Decisão 2): o Discovery já chamava `collectDdaeContext` internamente mas não expunha o campo `ddae` nem `project.name` exigidos pelo contrato; ambos foram adicionados de forma aditiva (34 linhas), sem conteúdo de arquivo e sem path absoluto. `src/context/**` permanece intocado. Nenhuma funcionalidade do Bloco 04, nenhum conceito de memória persistente e nenhuma escrita em disco foram introduzidos.

Status final: **concluído conforme escopo, aprovado, sem blocker.**

## 2. Objetivo do Bloco

Transformar o snapshot de `discoverWorkspaceState` em um Brain Manifest v1 estruturado, validável e com fingerprint, sem escrever em disco.

## 3. Escopo Implementado

- **Schema** — `BRAIN_SCHEMA_VERSION = 'brain-manifest-v1'`, `validateBrainManifest`/`assertBrainManifest`, campo-set fechado (rejeita qualquer campo fora do contrato, inclusive `memory`), paths relativos com `/`, ordenação canônica exigida, comparadores exportados.
- **Fingerprint** — `buildBrainFingerprintPayload` + `computeBrainFingerprint`, reutilizando `computeContextFingerprint`/`stableStringify` (sem modificar `src/context/**`).
- **Compiler** — `compileBrainManifest(snapshot, { engineVersion, generatedAt? })`, puro, retorna manifesto congelado e validado.
- **Discovery (correção de fronteira)** — `ddae` (resumo estrutural) e `project.name`.

Decisões (detalhe em `05_blocks/bloco_03_…md`, Seção 15): D1 `git = {available, head}`; D2 Discovery expõe `ddae`, Compiler não coleta; D3 `views: []`; D4 `engine_version` no fingerprint, passado como parâmetro; D5 seis entidades derivadas do snapshot, sem Memory.

## 4. Arquivos Criados

- `src/schemas/brain-schema.js`
- `src/workspace/fingerprint.js`
- `src/workspace/compiler.js`
- `test/workspace-brain-schema.test.js`, `test/workspace-brain-fingerprint.test.js`, `test/workspace-brain-compiler.test.js`, `test/workspace-discover-ddae.test.js`, `test/brain-fixtures.js`
- Este feedback e `09_validation/validacao_bloco_03_project_brain_schema_fingerprint_compiler.md`

## 5. Arquivos Alterados

- `src/workspace/discover.js` — aditivo: `discoverDdaeSummary`, campo `ddae`, `project.name`.
- `Docs/05_sessions/session_03_…/05_blocks/bloco_03_…md` — decisões resolvidas, resultado.
- `Docs/05_sessions/session_03_…/README.md` — status dos Blocos 03/04.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
node --test test/workspace-brain-*.test.js test/workspace-discover*.test.js   (vermelho antes da implementação; verde depois)
npm test
npm run package:check
npm run smoke
node bin/ddae-engine.js validate
node bin/ddae-engine.js audit
git diff --check
git status --short src/context scripts bin package.json
```

## 8. Testes Realizados

53 testes específicos novos/relacionados passando (schema, fingerprint, compiler, Discovery `ddae`), cobrindo: schema válido/inválido, campos obrigatórios, campo-set fechado (memory/branch/extra rejeitados), `git` exato, paths absolutos/backslash, ordenação canônica, fingerprint estável/sensível/independente de ordem, `engine_version` no fingerprint, exclusão de `generated_at`/`project.name`/`git.branch`, determinismo (`deepEqual`), snapshot não mutado, entrada congelada, `engineVersion` obrigatório, snapshot inválido rejeitado, snapshot degradado, ausência de path absoluto, ausência de I/O/relógio/aleatoriedade/coletores/Claude-Mem no código-fonte, integração Discovery→Compiler em projeto temporário (zero escrita, sem `.ddae/`) e no próprio self-host.

## 9. Validações Executadas

- `npm test` — 520 total, 517 pass, 0 fail, 3 skip (466 → 520).
- `npm run package:check` — OK, 110 arquivos (era 107; +3 módulos de produção esperados).
- `npm run smoke` — OK.
- `ddae-engine validate` — Status OK, 0 erros, 0 warnings.
- `ddae-engine audit` — Status OK, 0 erros; warnings são os 7 quality gates globais pendentes.
- `git diff --check` — limpo.

## 10. Decisões Técnicas

- **Schema em `src/schemas/`** (não `src/workspace/`), seguindo o padrão existente `src/schemas/context-schema.js`.
- **`engineVersion` como parâmetro:** o Compiler não pode ler `package.json`; o chamador (CLI, Bloco 08) fornece.
- **`project.name` fora do fingerprint:** é o nome da pasta local; incluí-lo tornaria o fingerprint dependente da máquina.
- **`source_path: null` para entradas originadas em Git** (`recent_changes`, tag de `release_state`).
- **`recent_changes` ordenado por SHA** (o contrato exige ordem alfabética; recência não é exigida pelo Schema v1).
- **Guard de código por teste:** testes lêem o código-fonte (sem comentários) e falham se o Compiler referenciar fs/rede/relógio/coletores.

## 11. Problemas Encontrados

Três, todos em testes/tooling, nenhum em produção: (1) mensagens de erro do schema para campo ausente vinham prefixadas por `manifest.` — corrigido para nomear o campo; (2) o guard de "sem I/O" reprovou um comentário e uma string de erro que citavam `discoverWorkspaceState` — o guard passou a ignorar comentários e a mensagem foi reescrita; (3) um script auxiliar corrompeu escapes de regex num teste — corrigido à mão.

## 12. Correções Aplicadas Durante o Bloco

As três acima. Nenhuma alteração ao contrato congelado ou a `src/context/**`.

## 13. Pendências

### P1 — Crítica
Nenhuma.

### P2 — Importante
Nenhuma.

### P3 — Melhoria Recomendada
- Ordenação lexicográfica de tags (herdada do Bloco 02) afeta `release_state` além de `v0.9.x`.
- Kernel de freshness compartilhado com `context/validator.js` (ID-07) — avaliação do Bloco 07.

### P4 — Opcional
- Entidades de risco/bug sem `status`: o contrato prevê só `{id, source_path, summary}`; se o Renderer (Bloco 04) precisar, exige mudança formal de contrato.
- `recent_changes` só com SHA e ordenado alfabeticamente; recência/assunto ficam para o Renderer.

## 14. Riscos Restantes

Nenhum novo. Risco de o Renderer (Bloco 04) precisar de campos que o schema v1 fechado não tem — mitigado por o schema ser versionado (nova versão, não afrouxamento).

## 15. Evidências

```text
npm test:              520 total, 517 pass, 0 fail, 3 skip
package:check:          OK, 110 files
smoke:                    OK
validate / audit:          Errors 0

Self-host proof (compileBrainManifest(discoverWorkspaceState(cwd)), engine 0.3.0):
  valid:            true
  sessions:            3
  current_session:      session_03_obsidian_workspace_project_brain_0_4_0 (latest_canonical)
  entities:              risks 1, decisions 0, open_bugs 0, recent_changes 10, release_state 2, current_tasks 16
  views:                  0
  deterministic:           true (duas compilações deepEqual)

src/context/** touched:        NO
scripts/, bin/, package.json:   NO
Filesystem writes / network / LLM / Claude-Mem in runtime:  NO
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Bloco 04 — Workspace Renderer (`Manifest → Home.md` + views), a ser criado formalmente, após revisão, no início de sua própria execução.

## 18. Commit Semântico Sugerido

```
feat(workspace): add project brain manifest compiler
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
