# Bloco 08 — Workspace CLI, Orchestrator & Writer

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-29

> **Status (2026-09-29): FASE A — PURE CORE ✅ APPROVED (auditada; Seção 31) · FASE B — WRITER ✅ (Seção 32) · FASE C (CLI) NÃO INICIADA.** As Decisões D1–D11 (Seção 27) foram **FECHADAS** pelo usuário em 2026-09-29 (Seção 27.1). Nome canônico: o plano (`04_planning/plano_execucao.md`) chama o Bloco 08 de "CLI"; o contrato (Seção B.1) o define como o **Orchestrator** e o Bloco 04 registra que não existe Writer dedicado ("CLI/Bloco 08 = único ponto de escrita"). O nome reflete as três responsabilidades reais: **CLI + Orchestrator + Writer**.

## 1. Objetivo

Conectar as peças puras já aprovadas (Discovery → Compiler → Validator → Renderer / Context Packages) em um workspace materializado e utilizável: `ddae-engine workspace init|build|validate|show`, gerando `.ddae/brain/manifest.json` e `DDAE-Brain/*.md` de forma determinística, idempotente e segura — **sem reimplementar nenhuma dessas peças**.

## 2. Contexto

Blocos 01–07 (+ Correção 07b) entregaram módulos puros isolados; nada é escrito em disco e `manifest.views` ainda é `[]` (dívida transitória). O contrato (Seção B.1, Seção F) atribui explicitamente ao Bloco 08: o Orchestrator, o parâmetro `views` do Compiler, a união dos view producers, a escrita e a CLI. Bloco 06 (D3) adiou para cá o link `Home → Context-Packages`; o Bloco 07 deixou `expectedViews` para o Orchestrator fornecer; os P4 de Context Packages freshness (`currentGitContext`/`currentDdaeContext`) e de `validation.json` também caem aqui.

## 3. Problema que Este Bloco Resolve

Hoje o Project Brain só existe em memória e em testes: ninguém consegue construí-lo, validá-lo ou abri-lo (Obsidian ou Markdown). Sem este bloco, o Manifest nunca carrega as views reais no fingerprint e as garantias do Validator (`expectedViews`) nunca são exercidas.

## 4. Estado Herdado (APIs reais, verificadas no código)

| Componente | API real | Papel | I/O |
|---|---|---|---|
| Discovery | `discoverWorkspaceState(projectRoot, {session?, env?})` → snapshot congelado | Descobre | Lê Docs/Git |
| Compiler | `compileBrainManifest(snapshot, {engineVersion, generatedAt?})` → Manifest congelado; **emite `views: []`; não aceita `views`** | Compila | Puro |
| Fingerprint | `buildBrainFingerprintPayload`, `computeBrainFingerprint` (inclui `views`, exclui `generated_at` e `project.name`) | Identidade | Puro |
| Validator | `validateBrainWorkspace(manifest, {currentManifest?, expectedViews?})` → `{status, reasons}` (57 testes; path semantics completa) | Valida | Puro |
| Brain Renderer | `renderBrainWorkspace(manifest)` → 7 `{path, content}`; `BRAIN_RENDERER_VIEW_PATHS`; `BRAIN_DIR` | Apresenta | Puro |
| Context Packages | `collectContextPackageState(projectRoot)` (I/O de leitura) + `renderContextPackagesView(state)` (puro) + `CONTEXT_PACKAGES_VIEW_PATH`; **não recebe Git/DDAE context reais** | Producer #2 | Leitura |
| Writer | **não existe** | — | — |
| CLI | `src/cli.js`: `switch` + `parseArgs`/`requireSubcommand`; `src/commands/context.js` (`build/show/validate`) é o padrão; `bin/ddae-engine.js` captura erros (`ddae-engine: <msg>`, exit 1) | — | — |

## 5. Escopo

1. **Orchestrator puro** (`src/workspace/orchestrator.js`): dado snapshot + Context Package state + `engineVersion`, declara os producers, deriva `expectedViews`, compila com `views`, valida, renderiza, compõe e verifica a composição — sem nenhum I/O.
2. **Compiler**: novo parâmetro opcional `views` (validado, ordenado, deduplicado) que entra no Manifest **antes** do fingerprint. Omitido ⇒ `[]` (compatibilidade com Bloco 03).
3. **Navegação**: `Home → Context-Packages` (Seção 12) mantendo `Context-Packages → Home`.
4. **Writer** (`src/workspace/writer.js`): única fronteira de escrita; recebe `[{path, content}]`, escreve só em `DDAE-Brain/` e `.ddae/brain/`, com defesa própria de path, política de overwrite e escrita idempotente.
5. **CLI** `workspace init|build|validate|show` (`src/commands/workspace.js` + `src/cli.js`), no padrão de `context`.
6. Integração de contexto real para Context Packages (Seção 14), conforme decisão.
7. Testes (Seção 24), self-host, documentação formal.

## 6. Fora de Escopo

- Reimplementar Discovery, Compiler, Validator, Renderer, Context Compiler ou Context Packages — apenas coordená-los. `src/context/**` **não é alterado**.
- Hardening de segurança adicional → **Bloco 09** (aviso de Obsidian Sync/Publish, `.obsidian/`, bidi/Unicode, corpus adversarial do Writer). Aqui só a defesa mínima do Writer (Seção 17).
- Prova de migração de projeto existente → Bloco 10; smoke com consumidor real → Bloco 11.
- Timeline view (Bloco 12); release (Bloco 13).
- Claude-Mem, Memory, Skills/References Registry, Block Types/Categories, full duplex: **fora da 0.4.0**.
- Ler `CONTEXT.md`, conteúdo de arquivos ou Memory para construir o Brain (economia de tokens: Context Packages permanece **metadata-only**).
- Alterar o tooling de Session/Block.

## 7. Dependências

Blocos 04, 05, 06, 07 (+ Correção 07b) — todos aprovados; nenhuma dependência externa. Confirmado em `mapa_dependencias.md` ("08 — CLI ← 04, 05, 06, 07"). Desbloqueia 09 e 10.

## 8. Pipeline Proposto (a confirmar contra o código no início da execução)

```text
Producers declaram paths (constantes, sem I/O)
  BRAIN_RENDERER_VIEW_PATHS (7) + CONTEXT_PACKAGES_VIEW_PATH (1)
        │  duplicate check (case-insensitive)  →  expectedViews (8, derivado — nunca hardcoded)
        ▼
[I/O] discoverWorkspaceState(dir)  ──►  snapshot
[I/O] collectContextPackageState(dir, contexts?)  ──►  Safe State (metadata-only)
        ▼
compileBrainManifest(snapshot, { engineVersion, views: expectedViews })   ← views ANTES do fingerprint
        ▼
validateBrainWorkspace(manifest, { expectedViews })                      ← pré-escrita; INVALID ⇒ aborta, nada escrito
        ▼
renderBrainWorkspace(manifest) + renderContextPackagesView(state)         ← puros
        ▼
compose: paths renderizados == manifest.views (nos dois sentidos), sem duplicatas, tudo sob DDAE-Brain/
        ▼
[I/O] Writer: DDAE-Brain/*.md + .ddae/brain/manifest.json (por último) + .ddae/brain/.gitignore
```

Ordem confirmada contra contrato B.1: `views` participa do fingerprint e nunca é mutado após a compilação. O Validator roda **antes** de render/escrita; `currentManifest` não é passado no `build` (o Manifest acabou de ser compilado — STALE é impossível ali).

## 9. Responsabilidade do Orchestrator (puro) vs. Fronteira de I/O

| Camada | Faz | Não faz |
|---|---|---|
| `orchestrator.js` (puro) | declara producers, deriva `expectedViews`, compila, valida, renderiza, compõe, verifica invariantes; devolve `{manifest, files, validation}` ou erro tipado | filesystem, Git, rede, relógio, aleatoriedade, `console` |
| `writer.js` (I/O) | valida paths de saída, aplica política de overwrite, escreve idempotentemente | descobre, compila, renderiza, interpreta Markdown |
| `commands/workspace.js` (I/O + UX) | chama Discovery/Context state, chama Orchestrator, chama Writer, imprime, define exit code | lógica de negócio |

Evitar: `WorkspaceManager`/`WorkspaceService`/`BrainEngine`. Funções simples (nomes não congelados: `buildBrainWorkspace`, `writeBrainWorkspace`).

## 10. `manifest.views` — Ciclo de Vida

Hoje `[]` (Compiler). No Bloco 08: os producers declaram → Orchestrator forma o conjunto (8 hoje, derivado) → `compileBrainManifest(snapshot, {engineVersion, views})` → ordenado por code point, deduplicado, incluído no payload do fingerprint. Nunca `compile → fingerprint → mutate views`. Teste obrigatório: alterar `views` muda o fingerprint; o Manifest final valida com `expectedViews`.

## 11. Composição de Views

- **Brain views**: `renderBrainWorkspace` (7). **Context Packages**: `renderContextPackagesView` (1, sempre gerado — "No Context Package is currently available" quando ausente).
- **Duplicidade**: dois producers declarando o mesmo path (inclusive colisão case-insensitive, relevante no Windows/macOS) ⇒ erro **antes** de compilar e antes de escrever.
- **Declared == generated**: o conjunto de paths realmente renderizados deve ser idêntico a `manifest.views` (faltando ⇒ erro; sobrando ⇒ erro). Invariante do Orchestrator (não do Validator).
- Todos os paths devem estar sob `BRAIN_DIR/` e terminar em `.md`.

## 12. Navegação `Home ⇄ Context-Packages`

`Context-Packages → Home` já existe. Para `Home → Context-Packages`, sem acoplar producers:

- **Recomendada (D2):** o Renderer deriva links extras **a partir de `manifest.views`** (paths sob `DDAE-Brain/` que ele mesmo não produz), com rótulo derivado do nome do arquivo. O Renderer continua puro e com o Manifest como única entrada; com `views: []` a saída é byte-idêntica à atual (testes existentes preservados); só linka o que está declarado (regra D.1 do contrato).
- Alternativas: (B) parâmetro `navigation` fornecido pelo Orchestrator; (C) post-processamento do Home pelo Orchestrator (rejeitada: reescreve saída de outro producer).

## 13. Workspace Validator

- `build`: `validateBrainWorkspace(manifest, {expectedViews})` antes de renderizar. Só `VALID` segue; `INVALID` aborta sem escrever; `STALE` não ocorre.
- `validate` (comando): recompila o estado atual (`currentManifest`, mesmas `views`) e chama `validateBrainWorkspace(storedManifest, {currentManifest, expectedViews})`. `STALE` **informa e falha com exit 1** (contrato F), nunca escreve.
- API do Validator reutilizada como está; nenhuma validação duplicada. Um Manifest armazenado ilegível (JSON inválido) é `INVALID` no nível do comando (mesmo padrão de `context validate`).

## 14. Freshness (P3) e Context Packages (P4)

**P3 — freshness de `ddae.sessions`/`counts`/`sources`.** Com o Orchestrator o `currentManifest` passa a ser uma recompilação completa com as mesmas `views`. Logo, "o estado canônico mudou" pode ser definido sem heurística nova: **fingerprints diferentes ⇒ STALE**, mantendo os reasons granulares atuais como diagnóstico e adicionando um reason de fallback quando o fingerprint difere mas nenhum reason específico se aplica (ex.: `CANONICAL_STATE_CHANGED`). Isso resolve o P3 sem diff genérico de JSON e sem falsos STALE (o fingerprint já exclui `generated_at` e `project.name`). **Exige tocar o Validator (aprovado)** ⇒ **Decisão D3.**

**P4 — Context Packages freshness.** `discoverWorkspaceState` chama `collectGitContext`/`collectDdaeContext` internamente e devolve só resumos; o Orchestrator (camada de I/O) pode chamar os coletores existentes uma vez e passá-los a um parâmetro **opcional** novo de `collectContextPackageState(projectRoot, {currentGitContext, currentDdaeContext})`, que os repassa a `validateContextState` sem alterar `src/context/**`. `currentSourceHashes` (releitura via Sensitive Data Guard) **não** é fornecido: `SOURCE_FRESHNESS_UNVERIFIED` continua sendo o resultado conservador honesto (P4 residual). ⇒ **Decisão D4.**

## 15. Writer — Contrato Mínimo

- **API conceitual:** `writeBrainWorkspace(projectRoot, files)` com `files = [{path, content}]` (paths relativos ao projeto, `/`), incluindo `.ddae/brain/manifest.json` e `.ddae/brain/.gitignore` (`*\n`).
- **Entrada aceita:** só paths sob `DDAE-Brain/` (`.md`) e `.ddae/brain/` (`manifest.json`, `.gitignore`); allow-list exata, nunca "qualquer path".
- **Path safety mínima (Writer tem defesa própria; é trust boundary mais forte):** lexical (sem absoluto, drive, `\`, `..`, `.`, segmento vazio, scheme-like, controle/NUL) **e** filesystem (raiz real via `realpath`; destino e diretórios existentes via `lstat`: symlink que escapa ⇒ recusa fail-closed; diretório onde devia haver arquivo, ou o contrário ⇒ recusa) — mesmo padrão de `assertSafeOutputDir` em `commands/context.js`. Falha em qualquer path ⇒ **nada é escrito** (validação de todos antes da primeira escrita).
- **Determinismo:** UTF-8, LF, sem BOM, sem timestamp; `stableStringify` no `manifest.json` (+ `\n`).
- **Idempotência:** conteúdo idêntico ⇒ não reescreve (mtime intocado); resultado reporta `written`/`unchanged`. Sem `generated_at` (D11).
- **Não faz:** interpretar Markdown, descobrir conteúdo, alterar `.gitignore` da raiz (isso é do `init`), apagar arquivos (D7).

## 16. Layout de Filesystem

```text
<projeto>/
  DDAE-Brain/                 humano, gerado, descartável, gitignored (via init)
    Home.md Sessions.md Decisions.md Risks.md Bugs.md Releases.md Recent-Activity.md Context-Packages.md
  .ddae/
    .gitignore                 (criado por context build; não tocado aqui)
    brain/                     máquina, gerado
      manifest.json            Manifest v1 canônico (mesmo `stableStringify`)
      .gitignore               `*` (self-ignore, conteúdo fixo)
      validation.json          NÃO criado no Bloco 08 (D9)
```

`manifest.json` é escrito **por último** (marca de "build completo"). `DDAE-Brain/` nunca é o lugar de estado de máquina; `.ddae/brain/` nunca recebe views humanas (DT-03).

## 17. Overwrite, Cleanup, Atomicidade

- **Overwrite (D6):** arquivo existente em path declarado que **contém o marcador** (`_Generated by DDAE…` logo após o H1) ⇒ sobrescreve (regeneração é o modelo; edição manual é *drift*, não proteção). Arquivo existente **sem** marcador ⇒ **recusa** (nada é escrito) a menos que `--force`. `manifest.json`/`.gitignore` de `.ddae/brain/` são estado de máquina (sobrescrita livre).
- **Cleanup (D7):** v1 **não apaga nada**. Arquivos em `DDAE-Brain/` fora do conjunto declarado são apenas reportados ("N unmanaged files"). Evolução possível (não agora): remover só o que estava em `views` do manifest anterior **e** tem marcador.
- **Atomicidade (D8):** tudo é construído e validado em memória antes da primeira escrita (falhas lógicas ⇒ zero efeitos). Cada arquivo é escrito via temp + rename no mesmo diretório; ordem: views → `.gitignore` → `manifest.json` por último. Falha no meio deixa um workspace detectável (manifest antigo/ausente ≠ views) que `workspace validate` reporta e `build` corrige ao rodar de novo. Transação com diretório temporário e swap = complexidade excessiva para v1.

## 18. `.gitignore`

- `workspace init` (opt-in): acrescenta `DDAE-Brain/` ao `.gitignore` da raiz (idempotente, nunca duplica, cria o arquivo se ausente) e escreve `.ddae/brain/.gitignore`. Falha de escrita ⇒ erro explícito, exit ≠ 0.
- `workspace build` **nunca** edita o `.gitignore` da raiz; garante `.ddae/brain/.gitignore` e, se `DDAE-Brain/` não estiver ignorado, **avisa** sugerindo `workspace init` (D10).
- `.obsidian/` e aviso de Obsidian Sync/Publish: ver D10 (contrato G/RS-04 vs. plano do Bloco 09).

## 19. CLI

- Comandos (contrato F): `workspace init`, `build`, `validate`, `show`. Rejeitados pelo contrato: `sync`, `open`, `brain build|show`.
- Padrão reutilizado: `case 'workspace'` em `src/cli.js` + `requireSubcommand`/`parseArgs`; funções `workspaceInitCommand/BuildCommand/ValidateCommand/ShowCommand({dir, force})` em `src/commands/workspace.js`; mesmas flags globais (`--dir`, `--force`); nenhuma flag nova prevista. Erros operacionais lançam `Error` (capturado por `bin/`); estado VALID/STALE/INVALID usa `process.exitCode` (0 = VALID; 1 = STALE/INVALID; ausência de build ⇒ erro explícito distinto de INVALID; `show` sem build ⇒ 1).
- `validate` e `show` são **estritamente read-only**. Nenhum comando existente dispara `workspace *` implicitamente (RS-06).
- `HELP` e exemplos atualizados.

## 20. Modelo de Falhas

| Estágio | Falha | Reação | Escreve? |
|---|---|---|---|
| Discovery | `projectRoot` inválido / erro de coleta | erro explícito, exit 1 | Não |
| Compile | snapshot/`views` inválidos | erro, exit 1 | Não |
| Validate (pré-escrita) | `INVALID` | mostra reasons, exit 1 | **Não** |
| Context Package | ausente | view "No Context Package…", segue | Sim |
| Context Package | corrupto | view com status `CORRUPT`, segue | Sim |
| Render | exceção | erro, exit 1 | Não |
| Compose | duplicata / declared≠generated / path fora de `DDAE-Brain/` | erro, exit 1 | Não |
| Writer (pré-checagem) | path inseguro / sem marcador / symlink | erro, exit 1 | **Nada** |
| Writer (meio) | I/O falhou | erro, exit 1; `validate` detecta | Parcial (ver 17) |
| `validate` | manifest ausente | erro explícito (≠ INVALID) | Não |
| `validate` | JSON ilegível | `INVALID`, exit 1 | Não |
| `validate` | view ausente/alterada | `INVALID` (D5) | Não |

## 21. Verificação dos Arquivos de View no `validate` (D5)

O contrato (Seção D) exige que cada view corresponda byte a byte à renderização determinística do Manifest. `validate` re-renderiza a partir do Manifest armazenado e compara com o disco (fora do Validator, que é puro): divergência ⇒ `INVALID` com reason de nível de comando (ex.: `VIEW_MISSING`, `VIEW_CONTENT_MISMATCH`, com `field`/`index` — nunca o conteúdo). **Exceção proposta:** `Context-Packages.md` depende de `.ddae/context/` (fora do fingerprint do Brain), então só se verifica existência + marcador; a frescor dele é domínio do Context Compiler.

## 22. Segurança

Mínimo do Writer (Seção 15) + reuso do containment já provado. Sem novas superfícies de leitura (Context Packages segue metadata-only; nenhum `CONTEXT.md`/Memory lido). Reasons e mensagens sem conteúdo de arquivo nem path bruto arbitrário. **Bloco 09 mantém:** aviso Obsidian Sync/Publish, `.obsidian/`, neutralização bidi/Unicode, corpus adversarial do Writer, varredura de symlink além do necessário.

## 23. Performance / Token Economy

Um Discovery + um `collectContextPackageState` por `build`/`validate`; nenhuma leitura de conteúdo de `Docs/` além do que o Discovery já faz; nenhum LLM, rede ou Claude-Mem. Coleta dupla de Git/DDAE (D4) é custo local pequeno.

## 24. Estratégia de Testes (TDD — não implementada)

| Camada | Cobertura | Estimativa |
|---|---|---|
| Compiler `views` | omitido ⇒ `[]`; ordenado/dedup; muda fingerprint; inválido rejeitado; congelado | ~8 |
| Renderer (navegação) | Home linka views declaradas; `views: []` byte-idêntico; só linka declarado; escapes | ~6 |
| Context Packages (contexts opcionais) | sem contexts ⇒ igual a hoje; com contexts ⇒ sem falso STALE de Git/sessão; nunca conteúdo | ~5 |
| Orchestrator (puro) | exatamente 8 views derivadas; views antes do fingerprint; fingerprint válido; Context Packages incluído; Home⇄Context-Packages; duplicata (incl. case-insensitive); output faltando/extra; Manifest INVALID bloqueia; state ausente/corrupto; determinismo/LF; entradas imutáveis; guarda de pureza | ~26 |
| Writer (fs em tmp) | cria diretórios; escreve; idempotente (unchanged, mtime); sobrescreve com marcador; recusa sem marcador / `--force`; path escape (lexical + symlink); nada escrito se qualquer path falha; UTF-8/LF; Windows paths; manifest por último; falha no meio; não apaga | ~24 |
| CLI/integração | init (idempotente, gitignore), build, rebuild idempotente, validate VALID/STALE/INVALID, view adulterada, show, exit codes, sem build, help | ~24 |
| Self-host | build em memória sobre o repo real + escrita em cópia temporária; `validate` ⇒ VALID | ~3 |
| **Total** | | **~96** |

Sempre em diretório temporário: nenhum teste escreve `DDAE-Brain/` ou `.ddae/brain/` no repositório real.

## 25. Riscos

- **Bloco grande demais** (Orchestrator + Writer + 4 comandos + 3 pequenas alterações em módulos aprovados): mitigado por fases internas (Seção 27, D1) e TDD por camada.
- Alterar módulos aprovados (Compiler/Renderer/Context Packages/Validator): mudanças mínimas, aditivas e retrocompatíveis; testes antigos intactos.
- Overwrite de arquivo manual em `DDAE-Brain/` (D6); escrita parcial (D8); colisão de case no Windows (Seção 11); `.gitignore` do consumidor (D10).
- Contradição contrato G/RS-04 × plano (D10).

## 26. Critérios de Aceite (para a execução futura)

- [ ] Decisões D1–D11 aprovadas e registradas antes do código.
- [ ] `manifest.views` populado antes do fingerprint; 8 views derivadas dos producers (não hardcoded); fingerprint válido; Validator aprova com `expectedViews`.
- [ ] Home ⇄ Context-Packages; `views: []` mantém saída byte-idêntica.
- [ ] Duplicata / declared≠generated / INVALID bloqueiam a escrita sem efeitos.
- [ ] Writer: allow-list, path/symlink fail-closed, overwrite conforme D6, idempotente, manifest por último.
- [ ] `workspace init|build|validate|show` no padrão de `context`; exit codes do contrato; `validate`/`show` read-only.
- [ ] Rebuild sem mudanças ⇒ 0 escritas; sem timestamps.
- [ ] Self-host: build+validate do próprio DDAE ⇒ VALID (em temporário).
- [ ] `src/context/**` intocado; nenhum Bloco 09/10 antecipado; sem Claude-Mem/rede.
- [ ] Suíte 655/652/0/3 + novos, sem regressão; `package:check`, `smoke`, `validate`, `audit`, `git diff --check` limpos.

## 27. Decisões Abertas (exigem aprovação humana)

| ID | Decisão | Recomendação |
|---|---|---|
| D1 | Tamanho do bloco | Manter **um** bloco (contrato o define assim; dividir renumeraria 09–13 e o tooling só numera inteiros — cf. Correção 07b) com fases internas: **A** puro (Compiler `views`, Renderer nav, Orchestrator), **B** Writer, **C** CLI + self-host, com checkpoints de testes por fase |
| D2 | Navegação Home→Context-Packages | Renderer deriva de `manifest.views` (Seção 12) |
| D3 | P3: freshness | Resolver aqui via comparação de fingerprint + reason de fallback no Validator (Seção 14); alternativa: bloco posterior |
| D4 | Context Packages freshness | Passar Git/DDAE contexts reais por parâmetro opcional; `currentSourceHashes` continua não fornecido |
| D5 | Verificação de views no `validate` | Re-render + comparação; Context-Packages só existência + marcador |
| D6 | Overwrite | Recusar arquivo sem marcador salvo `--force` |
| D7 | Cleanup de views antigas | Não apagar em v1; apenas reportar |
| D8 | Atomicidade | Temp+rename por arquivo; manifest por último; sem transação de diretório |
| D9 | `.ddae/brain/validation.json` | **Não criar** (validate é read-only e recomputa; recibo persistido poderia ser confiado indevidamente) |
| D10 | Escopo do `init` vs. Bloco 09 | `init` = `DDAE-Brain/` + `.ddae/brain/.gitignore` (contrato F); `.obsidian/` gitignore + aviso Sync/Publish ficam no Bloco 09 (plano); `build` sem `init` funciona e avisa |
| D11 | `generated_at` | Não gravar (idempotência byte-a-byte) |

### 27.1 Decisões Fechadas (2026-09-29)

| ID | Resultado | Regra final |
|---|---|---|
| D1 | **Aprovada** | Bloco 08 único, três fases internas (A Pure Core, B Writer, C CLI/Integration), cada uma com checkpoint TDD e revisão. Sem renumerar 09–13; sem 08a/08b/08c no tooling. |
| D2 | **Aprovada com compatibilidade transitória** | Renderer puro; `manifest.views = []` ⇒ as 7 views do Bloco 04 permanecem byte-idênticas. `manifest.views` preenchido ⇒ declaração canônica do conjunto navegável; Home linka as views declaradas sob `DDAE-Brain/` (inclusive `Context-Packages.md`) sem importar `context-packages.js`; o Renderer não descobre producers. |
| D3 | **Aprovada** | Fallback `CANONICAL_STATE_CHANGED`: target íntegro + `currentManifest` válido; reasons específicos (`ENGINE_VERSION_CHANGED`, `GIT_HEAD_CHANGED`, `SESSION_SOURCE_CHANGED`, `DOCS_CONTENT_CHANGED`) primeiro; se os fingerprints canônicos diferem **e** nenhum reason específico explica ⇒ `STALE`/`CANONICAL_STATE_CHANGED` (só como fallback). Sem comparação manual de `ddae.sessions`/`counts`/`sources`. Fingerprint interno do target errado continua `INVALID`/`FINGERPRINT_MISMATCH`. Única alteração permitida em `validator.js` na Fase A. |
| D4 | **Aprovada** | Context Packages aceita `currentGitContext`/`currentDdaeContext` opcionais (backward compatible), repassados a `validateContextState`. `src/context/**` intocado; sem collector paralelo; sem `currentSourceHashes` (⇒ `SOURCE_FRESHNESS_UNVERIFIED` segue conservador). |
| D5 | **Ajustada / aprovada** | `workspace validate` (Fase C) recomputa deterministicamente **todas** as views atuais (7 Brain + Context-Packages) — inputs atuais ⇒ Manifest atual ⇒ Context Package State atual ⇒ render de todos os producers ⇒ arquivos esperados ⇒ comparação com o disco. O marcador prova **ownership**, não integridade. **Substitui** a exceção "só existência + marcador" da Seção 21. Implementação: Fase C. |
| D6 | **Aprovada** | Writer (Fase B) só sobrescreve automaticamente arquivo com marcador (ownership); sem marcador ⇒ recusa. `--force` ignora **somente** conflito de ownership, nunca containment de path, segurança de symlink ou segurança de filesystem. |
| D7 | **Aprovada** | Sem deleção automática na v1; Writer detecta/reporta (ex.: `stale_generated`); sem `workspace clean`. |
| D8 | **Aprovada** | Fase B: tudo em memória, todos os paths validados antes da primeira escrita, temp + rename por arquivo, `manifest.json` por último; sem transação de diretório. |
| D9 | **Aprovada** | Sem `.ddae/brain/validation.json` na 0.4.0. |
| D10 | **Aprovada + Amendment 2 do contrato** | `init` (Fase C) = `DDAE-Brain/` no `.gitignore` da raiz + `.ddae/brain/.gitignore` (`*`). Sem `.obsidian/`, Sync/Publish ou avisos específicos do Obsidian ⇒ Bloco 09. Ver Amendment 2 em `Docs/03_contracts/contrato_workspace_project_brain.md`. |
| D11 | **Aprovada** | `generated_at` não é persistido por padrão; mesmo input ⇒ mesmo Manifest, mesmas views, mesmos bytes. |

Observação de coerência: a Seção 18 ("`build` … avisa") e a Seção 21 (exceção de Context-Packages) foram escritas antes do fechamento; prevalecem D5 e D10 acima. O aviso do `build` quando `DDAE-Brain/` não está ignorado é uma mensagem genérica sobre o `.gitignore` do Brain — não é aviso específico do Obsidian.

## 28. Pendências Esperadas

Herdadas: P3 freshness (D3), P4 `currentManifest` inválido lança, P4 Context Packages sem `currentSourceHashes`, P4 `validation.json` (D9). Novas possíveis: `workspace clean`/remoção de views antigas (D7), P4 "Important Files" sem link.

## 29. Feedback Obrigatório

Ao final da execução: `ddae-engine feedback create --block bloco_08_workspace_cli_orchestrator_writer --session session_03_obsidian_workspace_project_brain_0_4_0`, com pendências P1–P4 e validação formal.

## 30. Commit Semântico Sugerido

Preparação (esta execução): `docs(workspace): prepare project brain orchestration`. Implementação (futura, por fase, com autorização): `feat(workspace): compile brain views before fingerprint`, `feat(workspace): add brain workspace writer`, `feat(workspace): add workspace cli`.

## 31. Progresso — Fase A (Pure Core) ✅ APPROVED

> Registrado em 2026-09-29. Evidência intermediária dentro do próprio bloco; **não é o feedback final** do Bloco 08 (esse só existe quando A/B/C estiverem concluídas).

### 31.1 O que a Fase A entregou (somente memória; zero escrita em disco)

| Peça | Mudança | API real |
|---|---|---|
| Compiler | `views` opcional, **antes do fingerprint** | `compileBrainManifest(snapshot, { engineVersion, views?, generatedAt? })`; `views` copiado, ordenado por code point, duplicata ⇒ erro, default `[]` (fingerprint idêntico ao Bloco 03) |
| Renderer | navegação do Home derivada de `manifest.views` (D2) | `views: []` ⇒ as 7 views byte-idênticas (sha256 fixado em teste); preenchido ⇒ legados declarados na ordem original + demais views declaradas (ex.: `Context Packages`); só linka `DDAE-Brain/<Nome>.md` irmão com nome seguro; único import continua `brain-schema.js` |
| Context Packages | contextos atuais opcionais (D4) | `collectContextPackageState(projectRoot, { currentGitContext?, currentDdaeContext? })` repassa a `validateContextState`; sem opções = Bloco 06; `currentSourceHashes` nunca fornecido (`SOURCE_FRESHNESS_UNVERIFIED` segue) |
| Validator | fallback `CANONICAL_STATE_CHANGED` (D3) | só se **nenhum** reason específico se aplica e os fingerprints canônicos (recomputados dos payloads) diferem; `currentManifest` agora também precisa ter fingerprint coerente com o próprio payload (senão lança, como qualquer `currentManifest` inválido) |
| Orchestrator (novo, puro) | `src/workspace/orchestrator.js` | `planBrainWorkspace({ snapshot, contextPackageState, engineVersion }, { producers? })` ⇒ `{ manifest, validation, files }` congelado; `declareBrainViews(producers?)` ⇒ `expectedViews`; `DEFAULT_VIEW_PRODUCERS` (`brain-renderer`, `context-packages`); `BrainOrchestrationError` com `code` |

Invariantes do Orchestrator (todas antes de existir qualquer resultado): `VIEW_PATH_INVALID`, `VIEW_PATH_DUPLICATE`, `VIEW_PATH_CASE_COLLISION` (declaração); `MANIFEST_INVALID` (Validator ≠ VALID, com reasons e sem conteúdo); `OUTPUT_MALFORMED`, `OUTPUT_DUPLICATE` (exato e case-insensitive), `OUTPUT_UNEXPECTED` (produtor renderizou o que não declarou / path fora de `manifest.views`), `OUTPUT_MISSING` (declarado e não renderizado). O total (hoje 8) é sempre derivado das declarações dos producers.

Limites de pureza: o Orchestrator recebe o snapshot e o Context Package state já coletados; **não coleta**. A função que reunirá o I/O (Discovery, contextos Git/DDAE, `collectContextPackageState`) é da Fase C. (`context-packages.js` continua exportando o coletor com `fs` junto do renderer puro, por herança do Bloco 06; o Orchestrator só chama o renderer puro e um teste guarda seus imports.)

### 31.2 TDD

- **RED (antes de implementar):** 37 testes novos nos módulos existentes, 15 falharam (Compiler 5, Renderer 2, Context Packages 3, Validator 5); os demais passavam por compatibilidade retroativa (`views: []` / sem opções). Orchestrator: `ERR_MODULE_NOT_FOUND`.
- **GREEN:** Compiler 33/33, Renderer 62/62, Context Packages 33/33, Validator 68/68, Orchestrator 36/36.
- **Testes adicionados:** 73 (Compiler 9, Renderer 8, Context Packages 9, Validator 11, Orchestrator 36).
- **Única edição em teste antigo:** teste 33 do Renderer ("output does not depend on manifest.views") — sua última asserção contradizia a D2 aprovada; mantidas as asserções de não-mutação e acrescentada a de que as 6 views que não são o Home continuam independentes. Um comentário no teste registra a emenda.
- **Regressão:** `npm test` 728 total / 725 pass / 0 fail / 3 skip (baseline 655/652/0/3); `package:check` e `smoke` OK; `validate` 0 erros/0 warnings; `audit` 0 erros (8 warnings pré-existentes: 7 quality gates + Bloco 08 sem feedback, esperado); `git diff --check` limpo.

### 31.3 O que a Fase A não tocou

Writer, CLI, `workspace *`, `.gitignore`, `.obsidian/`, Bloco 09, `src/context/**`, `brain-schema.js`, `fingerprint.js`, `discover.js`: **inalterados**. Nenhum `DDAE-Brain/` ou `.ddae/brain/` gerado.

### 31.4 Dívidas / observações para as próximas fases

- **Fase B:** Writer conforme D6/D7/D8 (allow-list, ownership por marcador, `--force` só para ownership, sem delete, temp+rename, manifest por último).
- **Fase C:** função de I/O que coleta Discovery + contextos Git/DDAE + Context Package state e chama `planBrainWorkspace`; `workspace validate` recomputa e compara **todas** as 8 views com o disco (D5); `init` conforme D10; o `currentManifest` do `validate` deve ser compilado com as **mesmas** `views` (senão o fallback dispara por diferença de `views`).
- P3 de freshness: **fechado** pela D3. Comportamento novo a conhecer: mudança de disponibilidade do Git entre snapshots agora é STALE (`CANONICAL_STATE_CHANGED`), não silêncio.
- P4 mantidos: `currentManifest` inválido lança; Context Packages sem `currentSourceHashes`.

## 32. Progresso — Fase B (Writer) ✅ · Fase C ⏳ NÃO INICIADA

> Registrado em 2026-09-29. Fase A auditada (`APPROVED`, sem P0–P2) e enviada (`fe80ced` no remoto). Evidência intermediária; **não é o feedback final** do Bloco 08.

### 32.1 API real (`src/workspace/writer.js`)

- `writeBrainWorkspace(projectRoot, { manifest, files }, { force = false })` — **síncrona** (mesmo estilo do projeto: `fs` síncrono como em `commands/context.js`), recebe o plano já pronto (`files` = `[{ path, content }]` do Orchestrator, `manifest` = o Manifest final); não depende de nada do Orchestrator além dessa forma.
- Retorno congelado, ordenado por code point, sem conteúdo, paths relativos com `/`: `{ written, unchanged, stale_generated }` (o manifest aparece em `written`/`unchanged` como `.ddae/brain/manifest.json`).
- `BrainWriterError` (`code` estável + `details` só com `path`/`index`/`system_code`/`written`; nunca conteúdo, mensagem do sistema nem a raiz absoluta). Códigos: `INPUT_INVALID`, `PROJECT_ROOT_INVALID`, `OUTPUT_PATH_INVALID`, `OUTPUT_CONTENT_INVALID`, `OUTPUT_DUPLICATE`, `OUTPUT_CASE_COLLISION` (separado de duplicata exata; o Orchestrator usa `OUTPUT_DUPLICATE` para os dois), `SYMLINK_REFUSED`, `TARGET_TYPE_INVALID`, `OWNERSHIP_CONFLICT`, `WRITE_FAILED`.
- Exporta `MANIFEST_OUTPUT_PATH = '.ddae/brain/manifest.json'`. Imports: `node:fs`, `node:path` e `stableStringify` (o serializador canônico já existente — nenhuma segunda implementação).

### 32.2 Decisões do Writer (registradas antes do código)

| ID | Decisão |
|---|---|
| W1 | **Raízes permitidas:** somente `DDAE-Brain/<Nome>.md` e `.ddae/brain/manifest.json`. `.gitignore` da raiz, `.ddae/brain/.gitignore`, `.obsidian/` e `validation.json` **não** são escritos (init = Fase C; D10; D9). O allow-list de `.ddae/brain/.gitignore` da Seção 15 fica para a Fase C. |
| W2 | **Gramática de view:** prefixo exato `DDAE-Brain/`, um único basename terminando em `.md` minúsculo, sem subpasta; sem NUL/CR/LF/qualquer control ASCII (`U+0000–U+001F`), DEL, `\`, `/`; sem lone surrogate; ≤ 200 bytes UTF-8. Nada de regra estética: espaço e Unicode comum são aceitos (teste C3 impede over-hardening). Bidi/apresentação continua no Bloco 09. |
| W3 | **Basename iniciado por `.`** (`.hidden.md`, `..md`) **rejeitado.** Não é traversal, é política de nomes: views geradas são visíveis (Obsidian ignora dot-files) e `..md` é confuso. O contrato não a congelava; registrada aqui. |
| W4 | **Caracteres inválidos em nomes Windows** (`: * ? " < > |`) rejeitados em qualquer OS (`:` também barra scheme-like e Alternate Data Streams do NTFS). |
| W5 | **Nomes de dispositivo reservados** (`CON PRN AUX NUL COM1–9 LPT1–9`, case-insensitive, com ou sem extensões extras e espaços finais no stem) rejeitados em qualquer OS: outputs portáveis. `CONSOLE.md`, `COM10.md`, `NULL.md` continuam válidos. |
| W6 | **Conteúdo de view deve carregar o marcador canônico** logo após o H1 (`OUTPUT_CONTENT_INVALID` caso contrário). Sem isso o Writer criaria um arquivo que ele próprio não reconheceria como seu na próxima execução (ownership por marcador, D6). Verificado contra o texto real dos Renderers (teste A2/A5/A6 usam planos reais). |
| W7 | **Ownership:** marcador exatamente em `# Título` / linha em branco / marcador (CRLF tolerado). Marcador em outro lugar não é ownership. `force` (booleano estrito) dispensa **apenas** `OWNERSHIP_CONFLICT`. Nunca dispensa path, duplicata, colisão, conteúdo, symlink, tipo de alvo nem raiz. |
| W8 | **`manifest.json` existente com JSON corrompido não bloqueia** (estado de máquina recompilável); só symlink/tipo inválido bloqueiam. Sem marcador Markdown no JSON. |
| W9 | **Symlinks/junctions:** `DDAE-Brain`, `.ddae`, `.ddae/brain` e todo alvo existente são checados com `lstat`; symlink/junction ⇒ `SYMLINK_REFUSED`; arquivo no lugar de diretório (ou o inverso) ⇒ `TARGET_TYPE_INVALID`. A raiz do projeto em si é resolvida com `realpath` (a escolha do usuário; não é criada). Nenhum componente abaixo da raiz pode ser link, então o destino léxico é o destino real. Reverificação de cada diretório imediatamente antes de cada escrita. |
| W10 | **stale_generated:** `*.md` regular, com marcador (lidos só os primeiros 4 KiB), diretamente em `DDAE-Brain/`, fora do plano (comparação case-insensitive) — reportado, **nunca removido**. Arquivo sem marcador (`My-Notes.md`), subpasta, symlink e não-`.md` são ignorados: não são stale e não são tocados. |
| W11 | **Atomicidade (D8):** `open(temp, 'wx')` no mesmo diretório → `write` → `fsync` → `close` → `rename`. O alvo nunca é aberto para escrita. Temp de terceiros (`EEXIST`) nunca é apagado/sobrescrito; só o temp que o Writer criou é removido em erro, e uma falha de limpeza não mascara o erro original. Views em ordem de path; **`manifest.json` por último.** |
| W12 | **Idempotência:** conteúdo byte-idêntico não é reescrito (comparação de Buffer) e vai para `unchanged`. |
| W13 | **Limites conhecidos (documentados, não escondidos):** (a) TOCTOU residual — preflight + `lstat` + reverificação + temp/rename é defesa v1; um atacante concorrente que troque um diretório por link entre a última checagem e a escrita não é totalmente excluído; (b) sem transação global: falha após algumas views deixa essas views novas e o manifest antigo (nunca escreve o manifest novo); `details.written` lista o que foi escrito e um novo build converge; (c) sem rollback. |

### 32.3 Preflight (tudo antes da primeira modificação; falhou ⇒ zero escritas, nenhum diretório criado)

forma da entrada → raiz → gramática/conteúdo/duplicata/colisão de cada view → cadeia de diretórios (`DDAE-Brain`, `.ddae`, `.ddae/brain`) → estado e ownership de cada alvo → alvo do manifest → varredura de stale_generated (leitura). Só então: criação lazy de diretórios + escritas.

### 32.4 TDD

- **RED:** `test/workspace-writer.test.js` escrito antes do código → `ERR_MODULE_NOT_FOUND`.
- **GREEN:** 61 testes, 59 pass, 0 fail, **2 skip explícitos** (S4/S5: symlink de *arquivo* exige privilégio que este usuário Windows não tem; a decisão é coberta por S4b/S5b com `lstat` simulado; symlinks de *diretório* — junctions — rodaram de verdade em S1–S3/S6).
- **Sanidade dos testes (mutação):** desligar a recusa de symlink quebra 4 testes; desligar a checagem de path, 9; manifest antes das views, 31; desligar ownership, 3; reescrever sempre, 5 — restaurado e verde.
- **Cobertura:** A (API/happy/manifest canônico/round-trip com o Validator/self-host), B/C (grammar, controles, Windows, dot, reservados, tamanho, conteúdo), D (duplicata/colisão), S (symlink/tipo), E/F (ownership/force), G (idempotência com mtime no passado e ausência de rename/open de escrita), H (stale_generated/unmanaged/nenhuma deleção), I/J/K (atomicidade, manifest por último, falhas parciais e reparo, limpeza de temp), Z (zero-write), X (contenção fora da raiz, guarda de imports).
- **Regressão:** `npm test` 789 total / 784 pass / 0 fail / 5 skip (baseline 728/725/0/3 + 61 novos, 2 skips novos); `package:check` e `smoke` OK; `validate` 0 erros/0 warnings; `audit` 0 erros (8 warnings pré-existentes); `git diff --check` limpo.

### 32.5 P3 da auditoria da Fase A

"Nomes de view sem restrição de caracteres" — **fechado no Writer**: NUL, CR, LF, ESC, controles, DEL, `\`, caracteres inválidos do Windows, lone surrogates, dot-prefix e nomes reservados são rejeitados antes de qualquer escrita (testes C1–C6). O `declareBrainViews` do Orchestrator não foi alterado (Fase A permanece como auditada); com producers padrão o risco nunca existiu, e producers custom agora esbarram no Writer.

### 32.6 Fora do que a Fase B tocou

Orchestrator, Compiler, Validator, Renderer, Context Packages, `src/context/**`, CLI (`cli.js`, `commands/workspace.js`), `.gitignore`, `.obsidian/`, Bloco 09, rede, Claude-Mem: **inalterados**. Somente `src/workspace/writer.js` e `test/workspace-writer.test.js` (mais esta documentação).

### 32.7 Para a Fase C

O comando deve: coletar (Discovery, contextos Git/DDAE, Context Package state) → `planBrainWorkspace` → `writeBrainWorkspace`; imprimir `written`/`unchanged`/`stale_generated` (avisando sobre stale sem apagar); mapear `BrainOrchestrationError`/`BrainWriterError` para mensagens e exit code 1; `workspace init` cria `.ddae/brain/.gitignore` e a entrada `DDAE-Brain/` (D10); `--force` do CLI mapeia para `force` (só ownership).
