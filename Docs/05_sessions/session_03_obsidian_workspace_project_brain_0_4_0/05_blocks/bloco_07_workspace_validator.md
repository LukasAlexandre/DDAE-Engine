# Bloco 07 — workspace validator

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-27

> **Status: CONCLUÍDO / APROVADO** (2026-09-27). As 3 Decisões Abertas (Seção 16) foram fechadas antes do código (ver Seção 16.1); implementado em TDD (`src/workspace/validator.js`, 43 testes). `src/context/**`, `compiler.js`, `fingerprint.js`, `discover.js`, `renderer.js`, `context-packages.js`, `brain-schema.js` permanecem intocados — inclusive sem nenhum import de `src/context/**`. Ver `08_feedbacks/feedback_bloco_07_workspace_validator.md` e `09_validation/validacao_bloco_07_workspace_validator.md`.

## 1. Objetivo

Implementar `validateBrainWorkspace(manifest, options?)`: uma função pura que classifica um Brain Manifest v1 como `VALID`/`STALE`/`INVALID` conforme o Drift Contract já congelado (contrato, Seção H), reutilizando o schema e o fingerprint do próprio domínio Brain (`brain-schema.js`, `workspace/fingerprint.js`) — **sem importar nada de `src/context/**`** e sem tornar `manifest.views = []` (dívida transitória do Bloco 03) uma falha.

## 2. Contexto

Sétimo bloco da `0.4.0`. Depende apenas do Bloco 03 (`mapa_dependencias.md`: "Valida o mesmo Manifest que o Bloco 03 define") — confirmado inalterado pelos Blocos 04–06. O contrato já define o modelo completo (Seção H, congelada desde o Bloco 01, citada integralmente na Seção 5 abaixo) e uma pendência nomeada (`ID-07`/RS-07) pedindo avaliação real de extração de um kernel compartilhado com `src/context/validator.js`, "agora com dois usos reais lado a lado" — o Bloco 06 é o segundo uso real que faltava.

## 3. Problema que Este Bloco Resolve

Hoje, nada classifica um Brain Manifest já compilado como confiável ou desatualizado. `assertBrainManifest`/`validateBrainManifest` (Bloco 03) só checam **forma estrutural** — um Manifest pode ser estruturalmente válido e ainda assim ter sido adulterado (fingerprint não bate), estar desatualizado (o projeto mudou desde a compilação) ou carregar um `source_path` que, embora passe no Schema, poderia resolver para fora da raiz do projeto se algum consumidor futuro não tiver a mesma disciplina do Renderer (Blocos 04/05). O contrato (Seção H) já promete resolver os três casos; este bloco implementa essa promessa.

## 4. Panorama de Validação Atual (Landscape)

Investigado diretamente no código, para não confundir quatro sistemas distintos:

| # | Sistema | Arquivo | Input | Output | Pureza/I/O | Callers |
|---|---|---|---|---|---|---|
| A | Context Compiler Validator | `src/context/validator.js` (`validateContextState`) | Context Manifest v1 + `contextMarkdown`? + `currentGitContext`?/`currentDdaeContext`?/`currentSourceHashes`? | `{status: VALID\|STALE\|INVALID, reasons[]}` | Pura — todo "estado atual" é passado pelo caller, nunca coletado internamente | `src/commands/context.js` (`context build`, `context validate`) |
| B | Brain Manifest Schema | `src/schemas/brain-schema.js` (`validateBrainManifest`/`assertBrainManifest`) | um objeto | `{valid, errors[]}` / lança | Pura, sem noção de tempo — só forma estrutural, nunca frescor | `compileBrainManifest` (Bloco 03), testes |
| C | Workspace/Project Brain Validator | **não existe hoje** | — | — | — | — |
| D | `ddae-engine validate`/`audit` | `src/commands/validate.js`/`audit.js`, `src/utils/quality-gates.js`, `src/utils/markdown-checks.js` | `Docs/` do projeto (via `collectDdaeContext` e leitura direta) | relatório humano no stdout, `exitCode` | I/O (lê `Docs/`), mas escopo é a estrutura de sessões/blocos/quality gates do próprio DDAE — nada a ver com Context Packages ou Brain Manifest | CLI do DDAE, `npm run smoke` |

**C não existe** — é exatamente o que este bloco cria. Não deve ser confundido com D (que audita a metodologia DDAE em si, não o Project Brain) nem generalizado a partir de A (cujo domínio — Sources com `content_hash`, Sensitive Data Guard, `relevant_files` — não existe no Brain Manifest).

## 5. O Contrato Já Define o Modelo (Seção H, citada integralmente)

```text
VALID    — inputs canônicos inalterados desde o último build + artefatos gerados íntegros (fingerprint bate)
STALE     — estado canônico (Docs/, DDAE state, Git) mudou desde o último build
INVALID    — schema malformado, schema_version incompatível, fingerprint não bate, payload adulterado,
             invariante de segurança de path quebrado (link gerado fora da raiz do projeto)

Prioridade: INVALID > STALE > VALID (nunca STALE quando já é INVALID)
```

> "Modelo reaproveitado de `src/context/validator.js` (mesmo enum, mesma prioridade, razões próprias do domínio Brain). **Não** refatora o Context Validator neste bloco — kernel compartilhado é avaliação explícita do Bloco 07, com os dois usos reais já existindo para guiar a extração corretamente, não especulação prematura."

Este bloco implementa exatamente isso — nada mais, nada menos. Note que a definição de `VALID` exige **duas** condições simultâneas: nenhuma mudança desde o build (freshness) **e** artefato íntegro (fingerprint bate) — refletido no design da Seção 7.

## 6. Escopo Real Após os Blocos 04–06 (comparação com o plano original)

| Item do plano original (`plano_execucao.md`, 2026-08-16) | Estado real |
|---|---|
| "`validator.js` — VALID/STALE/INVALID" | **Ainda necessário** — núcleo deste bloco. |
| "avaliação real (não especulativa) de extrair kernel compartilhado com `context/validator.js` (ID-07), agora com dois usos reais" | **Ainda necessário** — Bloco 06 é o segundo uso real; avaliada nesta preparação (Seção 12, Decisão Aberta 1). |
| RS-01 (path traversal em link gerado), atribuído originalmente ao Bloco 09 | **Reatribuído pelo contrato congelado** (Seção H, posterior à `analise_riscos.md` original): a checagem de invariante de path é uma condição `INVALID` do Drift Contract, portanto pertence a este bloco como validação semântica do Manifest — não ao Bloco 09 (Security Hardening de superfícies externas: Obsidian Sync/Publish, `.gitignore`). `analise_riscos.md` não é reescrito; esta reatribuição é registrada aqui como a autoridade mais recente (o contrato) superando o rascunho de risco mais antigo. Ver Seção 9. |
| — | **Novo, não previsto no plano original:** compatibilidade explícita com o estado transicional `manifest.views = []` (Bloco 03) — sem isso, todo Manifest atual seria erroneamente `INVALID`. |

Nenhum item foi descartado; nenhum trabalho artificial foi adicionado.

## 7. Arquitetura Proposta

```text
compileBrainManifest(snapshot, {engineVersion})  ──►  Brain Manifest v1 (dado)
                                                            │
                                                            ▼
                                          validateBrainWorkspace(manifest, {
                                            currentManifest?,   ← outro Brain Manifest v1, recompilado a partir
                                                                   do estado atual (freshness) — opcional
                                            expectedViews?,     ← array de paths — só quando o Orchestrator
                                                                   (Bloco 08) já compôs o conjunto final de views
                                          })
                                                            │
                                                            ▼
                                          { status: VALID|STALE|INVALID, reasons: [...] }
```

`validateBrainWorkspace` **não chama** `discoverWorkspaceState`/`compileBrainManifest` internamente — quem quiser comparar contra o estado atual precisa recompilar um segundo Manifest e passá-lo como `currentManifest` (mesmo princípio de "todo estado atual é passado pelo caller" já usado por `validateContextState`). Isso mantém a função inteiramente pura, sem filesystem, sem Git, sem `Docs/`.

`src/context/**` **não é importado em nenhum ponto** deste módulo — mais estrito que o próprio `src/context/validator.js`, que precisa de `context/fingerprint.js`/`context/renderer.js`/`schemas/context-schema.js`. O domínio Brain já tem tudo que precisa em `src/schemas/brain-schema.js` e `src/workspace/fingerprint.js`.

### 7.1 Módulo previsto

`src/workspace/validator.js` (novo, único arquivo de produção), exportando `validateBrainWorkspace` e a constante `WORKSPACE_VALID_STATUSES` (própria, não importada de `context/validator.js` — ver Decisão Aberta 1).

## 8. Modelo de Validação — Detalhado

### 8.1 Integridade (sempre avaliada, não precisa de `currentManifest`)

1. **Schema:** `validateBrainManifest(manifest)`. Se inválido → `INVALID`/`MANIFEST_SCHEMA_INVALID` — **um único código genérico, sem os `errors[]` textuais do Schema**, mesmo princípio de segurança já aplicado no Bloco 06 (Seção 12.3 do bloco 06): o array de erros do Schema pode ecoar valores arbitrários de um Manifest malformado em texto legível; um código estável e sem conteúdo evita esse vazamento.
2. **Fingerprint:** recomputar `computeBrainFingerprint(buildBrainFingerprintPayload(manifest))` (reuso de `src/workspace/fingerprint.js`, zero lógica nova) e comparar com `manifest.fingerprint.value`. Divergência → `INVALID`/`FINGERPRINT_MISMATCH` (payload adulterado — exatamente a segunda condição de INVALID do contrato).
3. **Path containment (novo — fecha o P4 herdado):** cada `source_path` não-nulo em `manifest.entities.*[]` e cada `path` em `manifest.sources[]` é verificado por segmento (`/`-split): nenhum segmento pode ser `''`, `'.'`, `'..'`, e o primeiro segmento não pode conter `:` antes de qualquer `/` (rejeita valores tipo-esquema, ex. `http://…`, `javascript:…`, que o Schema atual não rejeita isoladamente). Qualquer violação → `INVALID`/`PATH_ESCAPES_ROOT` com `{path}` (o path já é dado não-sensível, mesma classe de informação já exibida livremente em `Decisions.md`/`Risks.md`). **Implementação própria, pequena (~10 linhas), não importa `docsDestination` privado do Renderer nem `sensitive-files.js`** (que é I/O-bound, camada errada para um validador puro) — mesma prática de pequena duplicação deliberada já usada em `discover.js`/`renderer.js` (Blocos 02/04), agora funcionando como uma segunda implementação independente da mesma invariante, o que é defesa em profundidade real, não redundância.
4. **Views coerentes com o esperado (só quando `expectedViews` é passado):** `manifest.views` deve corresponder exatamente (mesmo conjunto, contrato exige ordenação canônica já garantida pelo Schema) a `expectedViews`. Divergência → `INVALID`/`VIEWS_MISMATCH`. **Quando `expectedViews` é omitido, esta checagem não roda** — preserva compatibilidade com o estado transicional `manifest.views = []` (Seção 10).

### 8.2 Frescor (só avaliado quando `currentManifest` é passado)

Comparação campo a campo entre `manifest` (o que está sendo avaliado) e `currentManifest` (uma recompilação fresca do mesmo projeto, responsabilidade do caller):

| Campo comparado | Reason code | Reaproveita nome de |
|---|---|---|
| `engine_version` | `ENGINE_VERSION_CHANGED` | — (novo, específico do Brain) |
| `git.head` (só quando ambos `available`) | `GIT_HEAD_CHANGED` | `context/validator.js` (mesmo conceito) |
| `current_session.id`/`selection_reason` | `SESSION_SOURCE_CHANGED` | `context/validator.js` (mesmo conceito) |
| cada chave de `entities` cujo conteúdo difere | `DOCS_CONTENT_CHANGED` (um por entidade, com `{entity}`) | `analise_tecnica.md` (nome já proposto) |

Nenhuma dessas checagens roda sem `currentManifest` — sua ausência nunca produz um falso `VALID` nem um falso `STALE`; simplesmente não há frescor a avaliar (mesmo princípio de "ausência de dado nunca é falso positivo" já usado pelo Bloco 06).

### 8.3 Precedência final

`INVALID` (Seção 8.1, qualquer item) > `STALE` (Seção 8.2, qualquer item) > `VALID` — idêntica à do Context Validator, nunca reportando `STALE` quando já há motivo de `INVALID`.

## 9. Path Validation Layers (defesa em profundidade formalizada)

```text
Schema (brain-schema.js)        — estrutural: sem absoluto, sem backslash, sem string vazia
Workspace Validator (este bloco) — semântico: nenhum segmento .. / . / vazio, nenhum prefixo tipo-esquema
Renderer (Bloco 04/05)            — apresentação segura: nunca gera link para o que não está em manifest.sources,
                                     nunca decodifica/normaliza, fallback para código inline quando inseguro
Bloco 09 (Security Hardening)      — superfícies externas: Obsidian Sync/Publish, .gitignore de .obsidian/,
                                     nunca sobreposição com as três camadas acima
```

Cada camada tem um dono único e uma pergunta diferente: Schema pergunta "a string tem o formato certo?"; este Validator pergunta "essa referência poderia escapar da raiz do projeto?"; o Renderer pergunta "é seguro eu gerar um link clicável para isto agora?"; o Bloco 09 pergunta "o Vault inteiro está exposto por algo fora do controle do DDAE?". Nenhuma camada duplica o trabalho de outra.

## 10. `manifest.views` — Compatibilidade Transicional

Dois modos, nunca confundidos:

- **PRE-ORCHESTRATION (hoje, `expectedViews` omitido):** o Compiler ainda emite `views: []` (dívida transitória do Bloco 03). O Validator simplesmente não avalia coerência de views. Um Manifest atual, compilado por qualquer bloco já aprovado, continua podendo ser `VALID`.
- **FINAL COMPOSED WORKSPACE (futuro, Bloco 08, `expectedViews` fornecido):** o Orchestrator já uniu os 8 paths dos dois producers (`BRAIN_RENDERER_VIEW_PATHS` + `CONTEXT_PACKAGES_VIEW_PATH`) e os passou ao Compiler; agora `manifest.views` deve corresponder exatamente, e o Validator passa a checar isso.

Este bloco não implementa a união em si (Bloco 08) — só o parâmetro opcional que a consome quando existir.

## 11. Relação com Context Packages (Bloco 06)

**Fora de escopo, por definição contratual.** `mapa_dependencias.md`: "Valida o mesmo Manifest que o Bloco 03 define" — Context Packages não é uma entidade do Brain Manifest v1 (decisão do Bloco 06) e tem seu próprio ciclo de vida (`collectContextPackageState`, com seus próprios estados `missing`/`VALID`/`STALE`/`INVALID`/`CORRUPT`). A P4 herdada do Bloco 06 (`validateContextState` chamado sem `currentGitContext`/`currentDdaeContext` reais) **não é resolvida aqui** — o responsável futuro é o Bloco 08, único ponto que naturalmente terá o snapshot atual (do Discovery) disponível para passar ao Collector de Context Packages, sem duplicar coleta.

## 12. `.ddae/brain/` — Artefato de Validação (não escrito nesta execução)

O contrato (Seção D) já prevê `.ddae/brain/manifest.json` (o próprio Manifest canônico) mas **não** define um `validation.json` próprio do Brain — ao contrário do Context Compiler, que tem um receipt persistido. Investigado: nada no contrato exige que este bloco produza um artefato físico. `validateBrainWorkspace` devolve um valor em memória; **decidir se/quando persistir esse resultado em `.ddae/brain/validation.json` é responsabilidade do Bloco 08** (mesmo raciocínio do Bloco 06 §12.1: escrita em disco é sempre do Orchestrator/CLI/Writer, nunca de uma camada pura). Nenhum arquivo é criado nesta execução, nem `.ddae/brain/`, nem `DDAE-Brain/`.

## 13. Non-Goals (Fora de Escopo)

- Reimplementar ou alterar `src/context/**` de qualquer forma — inclusive não importar nada de lá.
- Alterar `brain-schema.js`, `compiler.js`, `fingerprint.js`, `discover.js`, `renderer.js`, `context-packages.js`.
- Extrair de fato um kernel compartilhado com `context/validator.js` — avaliado nesta preparação (Decisão Aberta 1), não implementado sem aprovação.
- Validar Context Packages state (Bloco 06, ciclo de vida próprio).
- União de view producers, parâmetro `views` do Compiler, Writer, `workspace build/init`, `.gitignore`, CLI — Bloco 08.
- Persistir `.ddae/brain/validation.json` — decisão e implementação do Bloco 08.
- Hardening adicional de superfícies externas (Obsidian Sync/Publish, `.obsidian/`) — Bloco 09.
- `recent_changes` sem recência, entidades sem `status`, ordenação de tags — P3/P4 herdadas, inalteradas.
- Claude-Mem, MemoryProvider, MCP, embeddings, LLM, rede.
- "Limpar" os 7 quality gates globais pendentes (`ddae-engine audit`) — sem relação com este bloco.

## 14. Estratégia de Testes (TDD) — Não Implementado Nesta Preparação

Estimativa: 24–30 testes, em `test/workspace-validator.test.js` (novo arquivo), reaproveitando `test/brain-fixtures.js` (`makeSnapshot`) e `compileBrainManifest` para gerar Manifests reais e válidos (mesmo padrão dos Blocos 03/06 — nunca Manifest "montado à mão" fora dos casos que testam justamente uma violação).

Cenários previstos:

1. Manifest válido, sem `currentManifest`/`expectedViews` → `VALID`.
2. Manifest com `schema_version` incompatível → `INVALID`/`MANIFEST_SCHEMA_INVALID`, sem vazar detalhe.
3. Manifest com campo estranho (ex. `memory`) → mesmo código genérico, sem eco do campo.
4. `fingerprint.value` adulterado após a compilação → `INVALID`/`FINGERPRINT_MISMATCH`.
5. `source_path`/`path` com segmento `..` → `INVALID`/`PATH_ESCAPES_ROOT`, com `{path}`.
6. `source_path` com segmento `.` ou vazio → idem.
7. `source_path` tipo-esquema (`http://…`, `javascript:…`) — manifesto construído com essa violação (simulando lacuna futura do Compiler) → `INVALID`/`PATH_ESCAPES_ROOT`.
8. Múltiplas violações de path → todas reportadas, não só a primeira.
9. `manifest.views = []` sem `expectedViews` → nunca `INVALID` por isso (compatibilidade transicional).
10. `expectedViews` fornecido e igual a `manifest.views` → sem `VIEWS_MISMATCH`.
11. `expectedViews` fornecido e diferente → `INVALID`/`VIEWS_MISMATCH`.
12. Sem `currentManifest` → nenhuma checagem de frescor roda; resultado permanece `VALID` (se íntegro).
13. `currentManifest` com `engine_version` diferente → `STALE`/`ENGINE_VERSION_CHANGED`.
14. `currentManifest` com `git.head` diferente (ambos `available`) → `STALE`/`GIT_HEAD_CHANGED`.
15. `currentManifest` com `git.available` diferente (um disponível, outro não) → sem falso `GIT_HEAD_CHANGED` (mesma regra do Context Validator: só compara quando ambos concordam que Git está disponível).
16. `currentManifest` com `current_session` diferente → `STALE`/`SESSION_SOURCE_CHANGED`.
17. `currentManifest` com uma entidade (`decisions`, por exemplo) diferente → `STALE`/`DOCS_CONTENT_CHANGED`, com `{entity: 'decisions'}`.
18. Múltiplas entidades diferentes → um `DOCS_CONTENT_CHANGED` por entidade.
19. `currentManifest` idêntico → `VALID`, `reasons: []`.
20. `INVALID` sempre tem prioridade sobre `STALE`, mesmo quando ambos os conjuntos de motivos existiriam.
21. Determinismo: mesmo input → mesmo resultado, byte a byte (JSON estável).
22. Manifest de entrada não é mutado; `currentManifest` também não.
23. Aceita manifestos profundamente congelados (`Object.freeze` recursivo) sem lançar.
24. Guarda de pureza: sem `fs`/rede/relógio/aleatoriedade/`node:path`; **zero import de `src/context/**` e zero import de `src/workspace/renderer.js`/`discover.js`**.
25. `reasons` nunca carrega conteúdo de `summary`/texto livre — só códigos e paths/nomes de entidade já públicos.
26. Integração: `compileBrainManifest` de dois snapshots diferentes (ex. sessão nova criada) → `currentManifest` diferente → `STALE` com motivo correto.
27. Self-host: `validateBrainWorkspace` contra o Manifest real do próprio DDAE (`compileBrainManifest(discoverWorkspaceState(REPO_ROOT), {engineVersion})`) → sempre `VALID` (íntegro por construção, sem `currentManifest`/`expectedViews`).

## 15. Estratégia de Self-Host

O self-host deve provar que um Manifest real e recém-compilado do próprio DDAE passa a validação como `VALID` (prova de que a integridade e o containment de path não têm falso positivo contra dados reais). Para provar `STALE` com evidência real (não hipotética), o teste de integração (Seção 14.26) usa dois snapshots sintéticos do mesmo projeto temporário, sem depender do estado mutável do repositório de desenvolvimento.

## 16. Decisões — Fechadas em 2026-09-27

**D1 — Kernel de validação compartilhado (`ID-07`/RS-07): NÃO extraído.** Confirmado: os dois validadores compartilham só o enum (`VALID`/`STALE`/`INVALID`), a prioridade `INVALID > STALE`, e o padrão de resultado congelado com `reasons[]`. As checagens de fato são estruturalmente diferentes (Context Validator compara contra snapshots brutos; este Validator compara contra outro Manifest já composto). Registrado como **evaluated / no extraction** — `ID-07`/RS-07 fechados com esta avaliação; nenhum módulo `validation-kernel.js`/`shared-validator.js` foi criado; `src/context/validator.js` não foi alterado. Reabrir só com um terceiro consumidor real.

**D2 — `currentManifest`: IMPLEMENTADO neste bloco.** `validateBrainWorkspace(manifest, { currentManifest, expectedViews })`, opcional e puro — o Validator nunca coleta, nunca lê `package.json`. `currentManifest`, quando fornecido, é validado estruturalmente antes de qualquer comparação (`assertOptions`); se estruturalmente inválido, a função **lança** (é um bug do caller, não um estado operacional a degradar) — nunca produz freshness a partir de dado não confiável. Ausência de `currentManifest` nunca produz `STALE`.

**D3 — Semântica de path (`RS-01`): fechada neste bloco, sem alterar o Brain Schema.** `PATH_ESCAPES_ROOT` rejeita segmentos `..`/`.`/vazios e valores tipo-esquema (qualquer `:` antes da primeira `/`) em `manifest.sources[].path` e em todo `source_path` não-nulo de `manifest.entities.*[]` — puramente lexical, sem `realpath`/`resolve`/`stat`. Um único código (`PATH_ESCAPES_ROOT`) cobre todos os casos, coerente com a redação única do contrato (Seção H: "invariante de segurança de path quebrado"); nenhum código novo foi inventado sem necessidade. Renderer inalterado; Bloco 09 continua dono do hardening de superfícies externas (Obsidian Sync/Publish, `.gitignore`).

## 17. Critérios de Aceite

- [x] As 3 Decisões fechadas antes do código (Seção 16).
- [x] `validateBrainWorkspace(manifest)` sem opções → `VALID`/`INVALID` determinístico, nunca `STALE` (sem `currentManifest`, nada a comparar).
- [x] `INVALID` cobre: schema malformado (código genérico, sem eco de conteúdo), `fingerprint` adulterado, `source_path`/`path` escapando a raiz (`..`/`.`/vazio/tipo-esquema), `views` divergente de `expectedViews` (só quando fornecido).
- [x] `STALE` cobre, só quando `currentManifest` é fornecido: `engine_version`, `git.head` (quando ambos disponíveis), `current_session`, cada entidade divergente — nunca por omissão de dado.
- [x] `manifest.views = []` sem `expectedViews` nunca é motivo de `INVALID`.
- [x] `INVALID` sempre tem prioridade sobre `STALE`.
- [x] Zero import de `src/context/**`; zero alteração a `brain-schema.js`, `compiler.js`, `fingerprint.js`, `discover.js`, `renderer.js`, `context-packages.js`.
- [x] Nenhuma escrita em disco; `.ddae/brain/validation.json` não criado.
- [x] `reasons` nunca carrega texto livre/summary — só códigos e paths/nomes já públicos.
- [x] Determinístico, puro (guarda de código-fonte), sem mutação de input.
- [x] Regressão completa verde.

## 17.1 Resultado da Implementação

- **Criado:** `src/workspace/validator.js` (`validateBrainWorkspace`, `WORKSPACE_VALID_STATUSES`); `test/workspace-validator.test.js` (43 testes).
- **Alterado:** nada em `src/`. Só documentação da Session 03 (este bloco, feedback, validação, README).
- **Evidência:** `npm test` 641 total / 638 pass / 0 fail / 3 skip (era 598/595/0/3); `package:check` OK (113 arquivos, +1 de produção); `smoke` OK; `validate`/`audit` 0 erros. Self-host: o Manifest real do próprio DDAE valida como `VALID` (teste 27).
- **`DOCS_CONTENT_CHANGED`:** implementado reutilizando a extração canônica já existente em `buildBrainFingerprintPayload(...).entities` (comparação estrutural exata, nunca heurística textual sobre `summary`) — consistente com D2/Seção 20 do prompt de fechamento ("preferir fingerprint/entity identity já presente, não inventar heurística").
- **Entrega:** ver `08_feedbacks/feedback_bloco_07_workspace_validator.md` e `09_validation/validacao_bloco_07_workspace_validator.md`.

## 18. Validações Obrigatórias

- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `git diff --check`

## 19. Segurança

`reasons` nunca inclui `summary`/texto livre do Manifest — só códigos estáveis e, quando aplicável, o `path`/`entity` que já é dado público em outras views do Brain (nunca conteúdo de arquivo). `PATH_ESCAPES_ROOT` fecha uma lacuna real de defesa em profundidade sem duplicar a Sensitive Data Guard (que é I/O-bound, camada errada aqui). Nenhum novo ponto de leitura de filesystem.

## 20. Performance

Não aplicável — operação sobre dois objetos já em memória, mesmo volume que o Compiler já processa.

## 21. Design System / UX

Não aplicável — nenhuma saída visual; o resultado é consumido por código (futura CLI do Bloco 08), não por humanos diretamente.

## 22. Riscos

- **Confundir integridade com frescor:** mitigado pela separação clara das Seções 8.1/8.2 e por `VALID` exigir as duas condições, exatamente como o contrato define.
- **Tornar Manifests atuais falsamente `INVALID` por `views = []`:** mitigado pela Seção 10 (checagem condicional a `expectedViews`).
- **Duplicar/divergir do Context Validator (RS-07):** mitigado pela Decisão Aberta 1 e por reasons codes explicitamente nomeados iguais onde o conceito é idêntico (`GIT_HEAD_CHANGED`, `SESSION_SOURCE_CHANGED`).
- **`PATH_ESCAPES_ROOT` nunca disparar na prática (todo Manifest real já vem seguro pelo Schema/Discovery):** aceitável — defesa em profundidade existe para o caso em que uma camada anterior falha, não para disparar hoje; testado com Manifest construído deliberadamente (Seção 14.7).

## 23. Pendências Esperadas

- P4 — kernel de validação compartilhado (`ID-07`/RS-07): avaliado e **fechado como "não extrair agora"** nesta preparação (Decisão Aberta 1) — reabrir só com um terceiro consumidor real.
- P4 — `.ddae/brain/validation.json` (se/quando existir) — decisão e implementação do Bloco 08.
- P4 — Context Packages sem `currentGitContext`/`currentDdaeContext` reais (herdada do Bloco 06) — permanece do Bloco 08, não deste bloco.
- P3/P4 herdadas (ordenação de tags, `recent_changes` sem recência, entidades sem `status`) — inalteradas.

## 24. Dependências

- Bloco 03 (Schema, Fingerprint & Compiler) — concluído, aprovado. Único bloco do qual este depende tecnicamente (`mapa_dependencias.md`).
- `src/schemas/brain-schema.js`, `src/workspace/fingerprint.js` — reaproveitados, não alterados.
- Nenhuma dependência externa nova.

## 25. Feedback Obrigatório

_Ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_07_workspace_validator --session session_03_obsidian_workspace_project_brain_0_4_0`. Sem feedback preenchido, o bloco não está concluído._

## 26. Commit Semântico Sugerido

```
feat(workspace): add brain workspace validator
```

_Nunca executado automaticamente — exige confirmação explícita do usuário. Se o resultado real for majoritariamente testes com pouco código, `test(...)` pode ser mais apropriado, a decidir no fechamento do bloco._
