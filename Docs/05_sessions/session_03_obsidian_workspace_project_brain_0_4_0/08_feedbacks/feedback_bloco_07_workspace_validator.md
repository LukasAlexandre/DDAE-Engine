# Feedback — Bloco 07: workspace validator

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-27

## 1. Resumo Executivo

O Bloco 07 implementa `validateBrainWorkspace(manifest, {currentManifest?, expectedViews?})` (`src/workspace/validator.js`), classificando um Brain Manifest v1 como `VALID`/`STALE`/`INVALID` exatamente conforme o Drift Contract já congelado (contrato, Seção H) — **sem importar nada de `src/context/**`**, mais estrito que o próprio Context Validator, já que o domínio Brain tem seu schema e fingerprint próprios. As 3 Decisões Abertas da preparação foram fechadas antes do código: **D1** — não extrair kernel compartilhado com `context/validator.js` (`ID-07`/RS-07 fechados como "evaluated, no extraction"); **D2** — `currentManifest` implementado já neste bloco, opcional, puro, e validado estruturalmente antes de qualquer comparação (lança se inválido, nunca deriva frescor de dado não confiável); **D3** — `PATH_ESCAPES_ROOT` fecha a validação semântica de path (RS-01), reatribuída do Bloco 09 para este bloco por autoridade do contrato, sem alterar o Brain Schema.

43 testes novos, todos passando, incluindo prova de que `manifest.views = []` nunca é falha sem `expectedViews` (compatibilidade transicional com o Bloco 03), que `INVALID` sempre precede `STALE` (a checagem de frescor nem roda quando a integridade falha), e que `DOCS_CONTENT_CHANGED` reutiliza a extração canônica já existente de `buildBrainFingerprintPayload` em vez de inventar uma heurística textual sobre `summary`.

Status final: **concluído conforme escopo, aprovado, sem blocker.**

## 2. Objetivo do Bloco

Implementar um Workspace Validator puro que diferencie integridade de frescor, valide semanticamente o Brain Manifest (fechando o P4 de defesa em profundidade de path) e permaneça pronto para ser consumido pelo Orchestrator do Bloco 08, sem alterar o Context Compiler nem antecipar security hardening.

## 3. Escopo Implementado

Exatamente o previsto após D1–D3 (bloco, Seções 8, 16): `validateBrainWorkspace` em um único módulo novo; integridade sempre avaliada (schema, fingerprint, path containment, views quando `expectedViews` é fornecido); frescor só com `currentManifest` (engine, git, sessão, entidades); `INVALID > STALE > VALID`. Nenhuma abstração extra criada.

## 4. Arquivos Criados

- `src/workspace/validator.js`
- `test/workspace-validator.test.js` (43 testes)
- Este feedback e `09_validation/validacao_bloco_07_workspace_validator.md`

## 5. Arquivos Alterados

- `Docs/05_sessions/session_03_.../05_blocks/bloco_07_...md` — decisões D1–D3 fechadas, resultado da implementação e critérios marcados.
- `Docs/05_sessions/session_03_.../README.md` — status do Bloco 07.

Nenhum arquivo em `src/context/**`, `src/workspace/compiler.js`, `fingerprint.js`, `discover.js`, `renderer.js`, `context-packages.js`, `src/schemas/brain-schema.js`.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
node --test test/workspace-validator.test.js   (RED confirmado por ERR_MODULE_NOT_FOUND; depois GREEN 43/43,
                                                  com uma correção de expectativa de teste no meio — ver Seção 11)
npm test
npm run package:check
npm run smoke
node bin/ddae-engine.js validate
node bin/ddae-engine.js audit
git diff --check
git diff --stat -- src/context/ src/workspace/compiler.js src/workspace/fingerprint.js src/workspace/discover.js src/workspace/renderer.js src/workspace/context-packages.js src/schemas/brain-schema.js
```

## 8. Testes Realizados

43 testes em `test/workspace-validator.test.js`, todos passando: API/constantes exportadas; manifesto válido sem opções → `VALID`, nunca `STALE` por omissão; `schema_version` incompatível e campo desconhecido (`memory`) → `INVALID`/`MANIFEST_SCHEMA_INVALID` genérico, sem eco de conteúdo; entrada não-objeto lança; `fingerprint.value` adulterado (diretamente ou via alteração de um campo fingerprintado) → `INVALID`/`FINGERPRINT_MISMATCH`, distinto de frescor mesmo com `currentManifest` idêntico; `source_path`/`sources[].path` com `..`, `.`, segmento vazio ou valor tipo-esquema (`http://`, `javascript:`, `file://`) → `INVALID`/`PATH_ESCAPES_ROOT`, path seguro nunca dispara, múltiplas ocorrências reportadas individualmente (inclusive a duplicação legítima entre `entities.*` e `sources[]`), `source_path` nulo (entradas de Git) nunca é checado; `currentManifest` omitido nunca produz `STALE`; `currentManifest` idêntico → `VALID`; `engine_version`/`git.head` (só quando ambos disponíveis)/`current_session`/cada entidade divergente → `STALE` com o código correto, múltiplos motivos coexistindo; `INVALID` sempre precede `STALE` (frescor nem avaliado); `currentManifest` estruturalmente inválido lança, nunca produz frescor arbitrário; `expectedViews` omitido preserva `manifest.views = []`; fornecido e igual/diferente → sem/com `VIEWS_MISMATCH`; `expectedViews` malformado lança; determinismo byte a byte; nenhuma mutação de `manifest`/`currentManifest`/`expectedViews`; aceita manifesto profundamente congelado; guarda de pureza (sem fs/rede/relógio/aleatoriedade/coletores, **sem nenhum import de `src/context/**`**); `reasons` nunca carrega `summary`/texto livre nem path absoluto; self-host (Manifest real do DDAE → `VALID`); integração com dois snapshots sintéticos (nova sessão) → `STALE` com `SESSION_SOURCE_CHANGED` e `DOCS_CONTENT_CHANGED`.

## 9. Validações Executadas

- `npm test` — 641 total, 638 pass, 0 fail, 3 skip (598 → 641, +43 novos, todos passando).
- `npm run package:check` — OK, 113 arquivos (era 112 — +1 de produção, esperado).
- `npm run smoke` — OK.
- `ddae-engine validate` — Status OK, 0 erros, 0 warnings.
- `ddae-engine audit` — Status OK, 0 erros; o único warning novo é "Bloco 07 sem feedback", fechado por este arquivo.
- `git diff --check` — limpo.
- `git diff --stat` confirmado vazio para `src/context/`, `compiler.js`, `fingerprint.js`, `discover.js`, `renderer.js`, `context-packages.js`, `brain-schema.js`.

## 10. Decisões Técnicas

- **D1/D2/D3** — fechadas na preparação revisada, aplicadas sem desvio (Seção 16 do bloco).
- **Um único código `PATH_ESCAPES_ROOT`** para traversal e valores tipo-esquema, em vez de dois códigos separados — coerente com a redação única do contrato (Seção H) e com a instrução explícita de não inventar código sem necessidade comprovada.
- **`currentManifest` validado estruturalmente antes de qualquer comparação** (`assertOptions`), lançando se inválido — nunca deriva `STALE` de dado não confiável, conforme D2/Seção 16 do fechamento.
- **`DOCS_CONTENT_CHANGED` via `buildBrainFingerprintPayload(...).entities`**, comparação estrutural exata (JSON.stringify de listas já canonicamente ordenadas), não uma heurística de similaridade textual sobre `summary` — reutiliza 100% da extração já existente em `workspace/fingerprint.js`.
- **Ordem de checagem fixa e documentada:** schema → fingerprint → paths → views (integridade, sempre) → engine → git → sessão → entidades (frescor, só com `currentManifest`) — garante `reasons` determinístico entre execuções.

## 11. Problemas Encontrados

Um erro no teste inicial (não em produção): o teste 8d assumia que dois `source_path` adversariais produziriam exatamente 2 razões `PATH_ESCAPES_ROOT`, mas o Compiler (Bloco 03) já agrega esses mesmos paths tanto em `entities.decisions[]` quanto em `sources[]` (deduplicado por `(path, entity)`), então o Validator — corretamente — os reporta em ambos os locais (4 razões). Não é um bug do Validator: é defesa em profundidade correta, verificando cada campo do Manifest que contratualmente representa um path, sem assumir que checar um implica checar o outro. Corrigido o teste para verificar as duas categorias de razão separadamente (`field: 'entities.decisions'` e `field: 'sources'`), em vez de um total ingênuo.

## 12. Correções Aplicadas Durante o Bloco

A correção de teste acima, em `test/workspace-validator.test.js`. Nenhuma correção em `src/workspace/validator.js` após a primeira implementação.

## 13. Pendências

### P1 — Crítica
Nenhuma.

### P2 — Importante
Nenhuma.

### P3 — Melhoria Recomendada
Herdadas, inalteradas (ordenação de tags, `recent_changes` sem recência, entidades sem `status`).

### P4 — Opcional
- **`ID-07`/RS-07 fechado como "evaluated, no extraction"** — reabrir só se um terceiro consumidor real de um kernel de validação compartilhado aparecer.
- **`DOCS_CONTENT_CHANGED` não distingue *por que* uma entidade mudou** (edição real vs. reordenação upstream) — limitação documentada, não uma imprecisão escondida; se granularidade maior for necessária no futuro, é uma extensão localizada em `checkEntityFreshness`.
- **`.ddae/brain/validation.json`** (se/quando existir) — decisão e implementação do Bloco 08.
- **Context Packages sem `currentGitContext`/`currentDdaeContext` reais** (herdada do Bloco 06) — permanece do Bloco 08.

## 14. Riscos Restantes

Nenhum novo. `manifest.views` continua `[]` até o Bloco 08 fechar a composição de producers; o Validator já está pronto para consumir `expectedViews` quando isso existir.

## 15. Evidências

```text
npm test:              641 total, 638 pass, 0 fail, 3 skip
package:check:          OK, 113 files (+1 de produção, esperado)
smoke:                    OK
validate / audit:          Errors 0

Testes novos (43): API, VALID sem opções, schema inválido (genérico, sem
eco), fingerprint adulterado, path containment (traversal/esquema, sources
e entities, múltiplas ocorrências), currentManifest omitido/idêntico/
inválido (lança), frescor por campo (engine/git/sessão/entidades),
precedência INVALID>STALE, expectedViews omitido/igual/diferente/malformado
(lança), determinismo, imutabilidade, guarda de pureza (zero import de
src/context/**), ausência de dado sensível em reasons, self-host,
integração com dois snapshots sintéticos.

src/context/**, compiler.js, fingerprint.js, discover.js, renderer.js,
context-packages.js, brain-schema.js touched: NO
Context Compiler duplicado: NO
Claude-Mem/LLM/rede: NO
Filesystem write: NO
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Conforme `04_planning/mapa_dependencias.md`, o Bloco 08 (CLI) depende dos Blocos 04, 05, 06 e 07 — todos agora aprovados. É o próximo candidato natural, a confirmar/criar formalmente em execução futura. Este bloco não o cria.

## 18. Commit Semântico Sugerido

```
feat(workspace): add project brain validator
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
