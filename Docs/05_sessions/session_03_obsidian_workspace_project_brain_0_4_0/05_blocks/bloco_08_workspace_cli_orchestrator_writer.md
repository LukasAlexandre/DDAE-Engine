# Bloco 08 — Workspace CLI, Orchestrator & Writer

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-29

> **Status: PREPARADO — NÃO INICIADO.** Nenhum código de runtime foi escrito. As **Decisões Abertas (Seção 27) exigem aprovação humana antes de qualquer código.** Nome canônico: o plano (`04_planning/plano_execucao.md`) chama o Bloco 08 de "CLI"; o contrato (Seção B.1) o define como o **Orchestrator** e o Bloco 04 registra que não existe Writer dedicado ("CLI/Bloco 08 = único ponto de escrita"). O nome reflete as três responsabilidades reais: **CLI + Orchestrator + Writer**.

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

## 28. Pendências Esperadas

Herdadas: P3 freshness (D3), P4 `currentManifest` inválido lança, P4 Context Packages sem `currentSourceHashes`, P4 `validation.json` (D9). Novas possíveis: `workspace clean`/remoção de views antigas (D7), P4 "Important Files" sem link.

## 29. Feedback Obrigatório

Ao final da execução: `ddae-engine feedback create --block bloco_08_workspace_cli_orchestrator_writer --session session_03_obsidian_workspace_project_brain_0_4_0`, com pendências P1–P4 e validação formal.

## 30. Commit Semântico Sugerido

Preparação (esta execução): `docs(workspace): prepare project brain orchestration`. Implementação (futura, por fase, com autorização): `feat(workspace): compile brain views before fingerprint`, `feat(workspace): add brain workspace writer`, `feat(workspace): add workspace cli`.
