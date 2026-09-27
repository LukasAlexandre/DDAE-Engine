# Feedback — Bloco 06: context compiler integration

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-26

## 1. Resumo Executivo

O Bloco 06 adiciona uma projeção humana, metadata-only, do estado do Context Compiler (`.ddae/context/`) ao Project Brain: `renderContextPackagesView`/`collectContextPackageState` (`src/workspace/context-packages.js`), um segundo *view producer* independente do Renderer do Bloco 04, seguindo exatamente o modelo de duas cadeias já previsto no contrato (B.1). As 3 Decisões Abertas da preparação foram resolvidas antes do código (D1 metadata-only aprovado, D2 Collector+Projector puro aprovado, D3 integração `Home.md`⇄`Context-Packages.md` adiada para o Bloco 08). **`src/context/**`, `src/workspace/renderer.js`, `src/workspace/compiler.js`, `src/schemas/brain-schema.js` permanecem inteiramente intocados.** 24 testes novos, todos passando, incluindo testes negativos com sentinelas (`SUPER_SECRET_CONTENT_123`, `PRIVATE_GOAL_TEXT_456`) que provam que conteúdo de arquivo e o texto livre do `goal` nunca alcançam o estado seguro nem a view renderizada.

Um refinamento de segurança surgiu durante a implementação, não previsto na preparação: o Collector valida o Context Manifest contra o schema (`validateContextManifest`) **antes** de chamar `validateContextState`, classificando qualquer manifesto malformado (inclusive `schema_version` incompatível) como `CORRUPT`/`MANIFEST_SCHEMA_INVALID` — um único código genérico, sem conteúdo — em vez de reutilizar o motivo `MANIFEST_INVALID` do próprio `validateContextState`, cujo array `errors` pode ecoar valores arbitrários do manifesto malformado em texto legível. Registrado no bloco (Seção 8.4) como parte do modelo de estados, não como desvio de escopo.

Status final: **concluído conforme escopo, aprovado, sem blocker.**

## 2. Objetivo do Bloco

Expor o estado do Context Compiler (VALID/STALE/INVALID/ausente/corrompido) em `DDAE-Brain/Context-Packages.md`, reutilizando `validateContextState` sem reimplementar lógica de frescor, sem duplicar o Context Compiler, e sem vazar conteúdo de arquivo ou texto livre do usuário para dentro do Brain.

## 3. Escopo Implementado

Exatamente o previsto após D1–D3 (bloco, Seções 8, 9, 12.1–12.3): `collectContextPackageState` (I/O) e `renderContextPackagesView` (pura) em um único módulo novo; seções "Status" e "Important Files" sempre presentes; `Context-Packages.md` linka de volta a `Home.md`; `Home.md` **não** foi tocado (D3). Nenhuma abstração extra criada.

## 4. Arquivos Criados

- `src/workspace/context-packages.js`
- `test/workspace-context-packages.test.js` (24 testes)
- Este feedback e `09_validation/validacao_bloco_06_context_compiler_integration.md`

## 5. Arquivos Alterados

- `Docs/03_contracts/contrato_workspace_project_brain.md` — nenhuma alteração (confirmado: Context Packages não é uma entidade de Manifest, não exigiu emenda de contrato).
- `Docs/05_sessions/session_03_.../05_blocks/bloco_06_...md` — decisões D1–D3 registradas, escopo revisado pós-D3, modelo de Safe State e precedência de estados detalhados, resultado da implementação e critérios marcados.
- `Docs/05_sessions/session_03_.../README.md` — status do Bloco 06.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
node --test test/workspace-context-packages.test.js   (RED confirmado por ERR_MODULE_NOT_FOUND; depois GREEN 24/24)
npm test
npm run package:check
npm run smoke
node bin/ddae-engine.js validate
node bin/ddae-engine.js audit
git diff --check
git diff --stat -- src/context/ src/workspace/renderer.js test/workspace-renderer.test.js src/workspace/compiler.js src/schemas/brain-schema.js
```

## 8. Testes Realizados

24 testes em `test/workspace-context-packages.test.js`, todos passando: API/path exportados corretamente; estado `missing` determinístico sem `.ddae/context/`; view de estado ausente sempre válida; `VALID` alcançável só quando não há `relevant_files` a reverificar (decisão D2: sem re-hash de conteúdo, `SOURCE_FRESHNESS_UNVERIFIED` sempre que há arquivos relevantes — nunca um falso `VALID`); `STALE`/`SOURCE_FRESHNESS_UNVERIFIED` confirmado; `schema_version` incompatível (e qualquer violação de schema) classificado como `CORRUPT`/`MANIFEST_SCHEMA_INVALID`, sem vazar o valor tamperado; `manifest.json` corrompido (JSON inválido) → `CORRUPT`/`MANIFEST_JSON_INVALID`, sem exceção; `validation.json` corrompido nunca bloqueia um manifesto válido; `.ddae/context/` parcial (sem `manifest.json`) tratado como `missing`; metadata de `relevant_files` (`path`/`score`/`char_cost` apenas, nunca `content`) na ordem do manifesto; **sentinelas de segurança** (`SUPER_SECRET_CONTENT_123`, `PRIVATE_GOAL_TEXT_456`, `normalized_private_goal_789`) confirmadas ausentes tanto no estado seguro quanto na view renderizada; conteúdo de `CONTEXT.md` no disco nunca lido; nenhum path absoluto/drive/dotfolder na saída; nenhum link para `.ddae/context/` em nenhuma forma; determinismo byte a byte; estado profundamente congelado aceito sem mutação; marcador de arquivo gerado, LF, uma newline final, sem frontmatter; link de volta a `Home.md` presente; guarda de pureza do Projector (sem fs/rede/relógio/aleatoriedade/coletores/Claude-Mem); zero escrita em disco em qualquer estado; `projectRoot` inválido lança (erro de programador, não estado operacional); self-host funciona com ou sem `.ddae/context/` local.

## 9. Validações Executadas

- `npm test` — 598 total, 595 pass, 0 fail, 3 skip (574 → 598, +24 novos, todos passando).
- `npm run package:check` — OK, 112 arquivos (era 111 — +1 arquivo de produção novo, esperado).
- `npm run smoke` — OK.
- `ddae-engine validate` — Status OK, 0 erros, 0 warnings.
- `ddae-engine audit` — Status OK, 0 erros; o único warning novo é "Bloco 06 sem feedback", fechado por este arquivo.
- `git diff --check` — limpo.
- `git diff --stat` confirmado vazio para `src/context/`, `src/workspace/renderer.js`, `test/workspace-renderer.test.js`, `src/workspace/compiler.js`, `src/schemas/brain-schema.js`.

## 10. Decisões Técnicas

- **D1 (metadata-only), D2 (Collector+Projector puro), D3 (integração Home adiada)** — aprovadas na preparação, aplicadas sem desvio.
- **`MANIFEST_SCHEMA_INVALID` genérico em vez de reutilizar `MANIFEST_INVALID`/`errors`:** descoberto durante a implementação (Seção "Resumo Executivo" acima) — mais conservador quanto a vazamento de dado arbitrário do manifesto malformado; documentado no bloco (Seção 8.4) como parte do modelo, não como desvio silencioso.
- **`validateContextState` chamado sem `currentGitContext`/`currentDdaeContext`:** evita recolher Git/`Docs/` uma segunda vez dentro deste Collector (o Discovery do Brain já faz isso para outro propósito); resultado seguro por construção — checagens de staleness de Git/sessão são simplesmente puladas (nunca um falso `STALE` por dado ausente), enquanto `SOURCE_FRESHNESS_UNVERIFIED` continua garantindo que a presença de `relevant_files` nunca produz um falso `VALID`. Registrado como P4 (Seção 13) para uma futura revisão que talvez injete esse contexto já coletado, sem duplicar a coleta.
- **Único arquivo de produção** (`context-packages.js`), sem separar Collector/Projector em módulos distintos — sem segundo consumidor real que justifique a divisão, mesmo raciocínio já aplicado em `discover.js`/`renderer.js`.

## 11. Problemas Encontrados

Dois erros nos testes iniciais (não em produção), corrigidos antes de fechar o bloco: (1) o teste 4 ("valid") assumia que um manifesto com `relevant_files` não vazio produziria `VALID` quando git/ddae "coincidissem" — na verdade, pela decisão D2 (sem re-hash), qualquer `relevant_files` não vazio sempre produz `STALE`/`SOURCE_FRESHNESS_UNVERIFIED`; corrigido para usar um manifesto sem candidatos, onde `VALID` é genuinamente alcançável; (2) o teste 6 assumia que um `schema_version` incompatível seria classificado via `SCHEMA_VERSION_MISMATCH` do `validateContextState`, mas o Collector intercepta qualquer falha de schema antes disso (ver Decisão Técnica acima) — corrigido para refletir o comportamento real e mais seguro.

## 12. Correções Aplicadas Durante o Bloco

As duas acima, ambas em `test/workspace-context-packages.test.js`. Nenhuma correção em `src/workspace/context-packages.js` após a primeira implementação — os dois "REDs" encontrados eram expectativas de teste desalinhadas com o design já aprovado (D2), não bugs do código de produção.

## 13. Pendências

### P1 — Crítica
Nenhuma.

### P2 — Importante
Nenhuma.

### P3 — Melhoria Recomendada
Herdadas, inalteradas (ordenação de tags, `recent_changes` sem recência, entidades sem `status`, kernel de freshness compartilhado `ID-07`).

### P4 — Opcional
- `validateContextState` é chamado sem `currentGitContext`/`currentDdaeContext` neste bloco (Seção 10) — uma revisão futura pode injetar o snapshot que o Discovery do Brain já coleta, evitando a checagem de Git/sessão ficar sempre "pulada"; não bloqueante, pois o resultado atual nunca é inseguro (nunca um falso VALID/menos-stale-que-o-real).
- "Important Files" sem link clicável (D2/12.1, herdada da preparação) — se o valor de navegação em uso real se mostrar insuficiente, revisar no Bloco 09.
- Lacuna de defesa em profundidade do Schema (herdada do Bloco 05) — inalterada, destino Bloco 07.
- Assimetria transitória `Context-Packages.md → Home.md` sem o inverso (D3) — resolvida no Bloco 08 por design, não uma pendência a corrigir isoladamente.

## 14. Riscos Restantes

Nenhum novo. `manifest.views` continua `[]` (dívida transitória do Bloco 03, inalterada); a união dos dois producers (Renderer + Context Packages) e o link de `Home.md` seguem para o Bloco 08 exatamente como planejado.

## 15. Evidências

```text
npm test:              598 total, 595 pass, 0 fail, 3 skip
package:check:          OK, 112 files (+1 de produção, esperado)
smoke:                    OK
validate / audit:          Errors 0

Testes novos (24): API/path, missing/valid/stale/invalid/corrupt (manifest e
validation), metadata de relevant_files sem content, sentinelas de segurança
ausentes no estado e na view, CONTEXT.md nunca lido, sem path absoluto/link
para .ddae/context, determinismo, imutabilidade, marcador/LF/newline final,
backlink a Home, guarda de pureza do Projector, zero escrita, self-host.

src/context/**, renderer.js, workspace/compiler.js, brain-schema.js touched: NO
Context Compiler duplicado: NO
Claude-Mem/LLM/rede: NO
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Conforme `04_planning/mapa_dependencias.md`, o Bloco 07 (Workspace Validator) depende do Bloco 03 (já aprovado) — pode ser o próximo, a confirmar/criar formalmente em execução futura. Este bloco não o cria.

## 18. Commit Semântico Sugerido

```
feat(workspace): add context packages projection
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
