# Contrato — DDAE Context Manifest v1

Este é o documento principal do Bloco 01. Ele fecha o contrato técnico do Context Compiler antes de qualquer collector, motor de relevância ou renderer ser implementado. Toda decisão registrada aqui é vinculante para os Blocos 02–11: um collector que produzir um manifesto fora deste contrato está, por definição, incorreto.

Este contrato é conceitual e arquitetural. Nenhum schema em JavaScript foi criado nesta etapa (`src/schemas/context-schema.js` não existe ainda) — a validação de que o schema real implementa fielmente este documento é responsabilidade do Bloco 06.

## 1. Manifest é canônico

`manifest.json` é a representação estruturada canônica do contexto compilado. `CONTEXT.md` é **derivado** dele — nunca o contrário.

```text
collectors
   ↓
normalization
   ↓
authority resolution
   ↓
relevance
   ↓
budget
   ↓
manifest.json
   ↓
renderer
   ↓
CONTEXT.md
```

Consequência prática: qualquer decisão sobre o que entra no contexto (relevância, autoridade, corte por budget) é tomada **antes** do manifesto ser escrito, nunca durante a renderização do Markdown. O renderer (Bloco 07) é uma função pura de `manifest.json` para texto — sem lógica de seleção própria.

## 2. Determinismo

Contrato:

```text
mesmo estado relevante
+ mesmo objetivo
+ mesma session
+ mesmo budget
+ mesma versão/schema do compiler
=
mesmo conteúdo canônico
+ mesmo fingerprint
```

O payload **canônico** do manifesto não inclui `generated_at` nem qualquer timestamp de execução. Um campo como `"generated_at": "2026-08-08T..."` faria dois builds idênticos (mesmo HEAD, mesmo objetivo, mesma configuração) produzirem manifestos diferentes — o que quebra o próprio propósito do fingerprint.

Se um timestamp operacional for necessário para diagnóstico, ele:

- vive fora do payload canônico (por exemplo, em `validation.json`, ou em um campo top-level explicitamente marcado como não-canônico);
- não entra no cálculo do fingerprint;
- não influencia seleção, relevância ou ordenação;
- nunca pode fazer dois manifestos semanticamente idênticos produzirem fingerprints diferentes.

Decisão para o Manifest v1: **nenhum timestamp no payload canônico.**

## 3. Paths portáveis

Nenhum source canônico referencia caminho absoluto. Todo `path` em `manifest.json` é relativo a `PROJECT_ROOT` (a raiz do projeto consumidor, análoga ao `PROJECT_ROOT` já usado em `scripts/release/verify-package.mjs` para a raiz do próprio DDAE-Engine).

Separadores são sempre normalizados para `/`, inclusive no Windows:

```text
correto:    src/context/compiler.js
incorreto:  src\context\compiler.js
incorreto:  C:\Users\...\src\context\compiler.js
```

Paths absolutos podem existir apenas em diagnóstico efêmero de runtime (logs de console, mensagens de erro), nunca dentro de `manifest.json`.

## 4. Source Model v1

Todo fato relevante no manifesto carrega proveniência (`source`). Estrutura conceitual mínima:

```text
{
  id,
  kind,
  path,
  section,
  authority_class,
  content_hash
}
```

Nem todo campo é obrigatório para todo `kind` — por exemplo, um source `kind: "git"` não tem `path` de arquivo nem `section`, mas tem `content_hash` (o próprio HEAD).

`kind` previstos para o Manifest v1:

| kind | Descrição |
|---|---|
| `git` | Estado do repositório (branch, HEAD, working tree) |
| `session` | Sessão DDAE atual (`Docs/05_sessions/session_NN_*`) |
| `decision` | Decisão registrada em um módulo de sessão |
| `architecture` | Documento de arquitetura (`Docs/02_architecture/`) |
| `bug` | Bug ativo registrado (`07_bugs`) |
| `validation` | Resultado de validação/quality gate |
| `test` | Execução ou arquivo de teste |
| `project_metadata` | `package.json` e equivalentes de outros ecossistemas |
| `source_code` | Arquivo de código-fonte do consumidor |
| `documentation` | Documentação histórica não coberta pelos kinds acima |

`path`, quando baseado em arquivo, é sempre project-relative (Seção 3).

## 5. Authority Model v1 — por domínio, não uma escala universal

Uma escala numérica única e ingênua (`decision=100, architecture=90, code=80, test=70`) foi explicitamente rejeitada: ela produz conclusões erradas sempre que a natureza da afirmação não é comparável nesses termos (por exemplo, o HEAD do Git é sempre mais autoritativo que qualquer documento sobre "qual é o estado atual do repositório", mas isso não faz sentido como comparação genérica contra "decisão arquitetural aprovada").

Autoridade é definida **por categoria de afirmação** (domínio), não por um ranking universal entre `kind`s:

| Domínio | Autoridade |
|---|---|
| Estado do repositório | Git atual (HEAD, branch, working tree) é autoridade |
| Metadados de pacote/runtime | `package.json`/código executável atual são autoridade |
| Intenção arquitetural | Decisão atual aprovada é autoridade |
| Resultado de teste | Execução/evidência atual é autoridade |
| Estado de bug ativo | Registro ativo atual + evidência são autoridade |
| Intenção futura | Roadmap/planejamento — nunca autoridade sobre o presente |
| História | Documentação histórica — contexto, nunca autoridade sobre o presente |

Consequência direta (o caso motivador desta seção): um roadmap antigo dizendo "usar JWT" nunca vence uma decisão atual aprovada dizendo "session cookie HttpOnly sem JWT no browser" — não porque `decision > documentation` numericamente, mas porque o domínio da afirmação é "intenção arquitetural", e nesse domínio a decisão aprovada é, por definição, a autoridade.

### Conflitos

O compiler nunca apaga silenciosamente a fonte perdedora de um conflito. Todo conflito resolvido é registrado explicitamente:

```json
{
  "winner": { "source_id": "...", "value": "..." },
  "conflicting_sources": [
    { "source_id": "...", "value": "...", "reason_superseded": "..." }
  ]
}
```

Isso permite que um agente (ou um humano) pergunte "por que o DDAE descartou X?" e receba uma resposta rastreável, em vez de um contexto que simplesmente nunca menciona X.

## 6. Session selection

Comportamento determinístico:

- Se `--session <id>` for fornecido explicitamente, a seleção explícita vence. `selection_reason: "explicit"`.
- Sem `--session`, usa-se a maior sessão canônica numerada encontrada em `Docs/05_sessions/` (mesmo critério de `SESSION_NAME_PATTERN` já usado por `src/utils/session.js`). `selection_reason: "latest_canonical"`.
- Se não houver nenhuma sessão real no projeto, `session = null` é um estado válido — não um erro. Um projeto recém-inicializado (`ddae-engine init` sem nenhuma `session create` ainda) deve compilar contexto normalmente, apenas sem bloco de sessão.
- Os 13 módulos internos (`01_intake` ... `13_release`) nunca são confundidos com sessões — mesma distinção já estabelecida na Session 10 (`SESSION_NAME_PATTERN`, `listSessionDirs` vs. módulos internos de uma sessão).

## 7. Goal

`context build` **exige** `--goal "<texto>"`. Motivo: o objetivo é entrada fundamental do motor de relevância (Bloco 05) — sem ele, não há base determinística para pontuar relevância de arquivos/decisões.

```bash
ddae-engine context build --goal "Implementar auditoria de usuários"
```

`context show` e `context validate` operam sobre o pacote já compilado e **não** exigem `--goal` — eles leem `manifest.json` existente, não recompilam.

## 8. Budget model

Sem dependência de tokenizer externo — mantém a distribuição zero-dependency. Budget v1 trabalha com aproximação por caracteres.

| Profile | Limite aproximado |
|---|---|
| `minimal` | ~20.000 caracteres |
| `standard` (default) | ~60.000 caracteres |
| `deep` | ~120.000 caracteres |

O profile escolhido é registrado no manifesto (`budget.profile`, `budget.max_chars`). O motor de relevância (Bloco 05) respeita o budget deterministicamente, com tie-break obrigatório e documentado:

```text
1. score DESC
2. path ASC (ordem lexicográfica do path project-relative normalizado)
```

Nenhuma seleção aleatória ou dependente de ordem de filesystem é permitida — a mesma entrada sempre produz o mesmo corte.

## 9. Fingerprint v1

O fingerprint identifica de forma estável um manifesto semanticamente equivalente. Excluídos explicitamente do cálculo: path absoluto, timestamp, `mtime` isolado, ordem de filesystem não normalizada.

Entram no cálculo do fingerprint, no mínimo:

- `context_schema_version`
- versão do contrato do compiler (não a versão do pacote npm — ver Seção 16)
- objetivo normalizado (`goal.normalized`)
- sessão selecionada
- budget (profile)
- Git HEAD, quando disponível
- lista de sources selecionados (ids, ordenados deterministicamente)
- `content_hash` de cada source relevante
- constraints relevantes

Serialização estável definida antes do hash: os campos acima são serializados em uma estrutura com chaves ordenadas alfabeticamente e arrays já normalizados (mesma ordem de tie-break da Seção 8), então hasheados.

Algoritmo: **SHA-256** via `node:crypto` — zero dependência externa, consistente com o restante do projeto.

## 10. Git — obrigatório vs. degradado

A auditoria arquitetural (pré-Bloco 01) confirmou: o Context Compiler é a primeira capacidade em `src/` do DDAE Engine a interagir diretamente com Git. Nenhum comando existente (`init`, `session`, `block`, `prompt`, `feedback`, `validate`, `audit`) depende de Git estar instalado ou do diretório ser um repositório — e isso **não muda** com esta sessão: nenhum desses comandos passa a exigir Git.

Duas opções foram avaliadas:

- **(A) Git obrigatório para o Context Compiler.** Mais simples de implementar, mas quebra `context build` em qualquer diretório que não seja um repositório Git (por exemplo, um projeto ainda não versionado), mesmo que o restante do DDAE funcione normalmente ali.
- **(B) Git opcional, com modo degradado.** Se Git estiver disponível e o diretório for um repositório, coleta-se `branch`/`HEAD`/`working_tree`/estado recente normalmente. Se Git estiver indisponível (binário ausente) ou o diretório não for um repositório, `context build` continua funcionando: `git.available = false` no manifesto, um warning explícito é emitido, e o `content_hash` dos sources passa a ser a base adicional de freshness (usado onde o contrato normalmente usaria o HEAD).

**Decisão: opção (B).** Justificativa: manter o Context Compiler consistente com o resto do DDAE Engine, que nunca faz um comando falhar duro por uma dependência de ambiente evitável, e por não fazer sentido impedir alguém de compilar contexto de projeto/DDAE só porque ainda não inicializou Git.

## 11. `.ddae/` e política de ignore

A auditoria confirmou: `ddae-engine init` hoje **não cria nem gerencia** nenhum `.gitignore` no projeto consumidor — esse arquivo simplesmente não existe no scaffold atual. Qualquer estratégia do Context Compiler para manter `.ddae/` fora do controle de versão precisa ser autocontida, e **não** pode editar silenciosamente `<project>/.gitignore`, porque isso seria uma surpresa não solicitada vinda de um comando cujo objetivo é compilar contexto, não gerenciar configuração de VCS do projeto.

### Experimento realizado

Um repositório Git temporário foi criado fora do checkout do DDAE-Engine (`git init` em diretório de scratchpad), exclusivamente para este teste. Nenhum arquivo do DDAE-Engine foi tocado. Passos e resultados:

| Passo | Ação | Resultado (`git status --porcelain`) |
|---|---|---|
| 1 | Repositório vazio, sem `.ddae/` | vazio (nenhuma alteração) |
| 2 | Criados `.ddae/.gitignore` (conteúdo `*`), `.ddae/context/manifest.json`, `.ddae/context/CONTEXT.md` | vazio — `.ddae/` inteiro corretamente ignorado, incluindo o próprio `.gitignore` |
| 3 | `git status --porcelain --ignored` | `!! .ddae/` — confirma que o diretório é reconhecido como ignorado, não como ausente |
| 4 | `git status --porcelain -- .ddae/.gitignore` | vazio — o arquivo de ignore se autoignora corretamente (`*` cobre tudo dentro de `.ddae/`, inclusive o próprio arquivo) |
| 5 | Criado um `.gitignore` raiz simulando um projeto consumidor pré-existente (`node_modules/`) | `?? .gitignore` aparece normalmente como untracked — nenhuma interferência entre o `.gitignore` raiz do consumidor e `.ddae/.gitignore` |

O diretório temporário foi apagado ao final do experimento; nada foi deixado para trás e o `.gitignore` real do DDAE-Engine não foi alterado.

### Decisão

**Estratégia adotada: `.ddae/.gitignore` autocontido, com conteúdo `*`.**

- Confiável: mantém `git status --porcelain` limpo em um repositório real, sem exigir que o usuário edite nada.
- Não invasivo: `context build` nunca escreve no `.gitignore` raiz do projeto consumidor.
- Autocontido: o próprio arquivo de ignore se cobre — não sobra nenhum artefato untracked residual.
- Não interfere com um `.gitignore` raiz pré-existente do consumidor.

Fallback avaliado, mas **não necessário**: `.git/info/exclude` (exclusão local, não versionada). Como `.ddae/.gitignore` já demonstrou robustez suficiente no experimento, o fallback fica documentado como alternativa apenas se um caso real futuro mostrar que `.ddae/.gitignore` não é suficiente (por exemplo, algum consumidor com regras de `.gitignore` globais conflitantes — não observado neste bloco).

### Comportamento sem Git

Quando o projeto consumidor não é um repositório Git (Seção 10, modo degradado), `context build` ainda escreve `.ddae/.gitignore` normalmente — a política de ignore independe de Git estar ativo; ela só passa a ter efeito prático quando/se o projeto for versionado.

## 12. Segurança / dados sensíveis

O Sensitive Data Guard atua **antes** de qualquer conteúdo ser incorporado ao contexto — nunca como uma limpeza posterior.

Padrões de exclusão de arquivo (deny list inicial):

```text
.env
.env.*
*.pem
*.key
id_rsa
id_ed25519
.npmrc
credentials*
secrets*
*.p12
*.pfx
```

Estruturas ignoradas por padrão (operacionais, nunca fonte de contexto relevante):

```text
.git/
.ddae/
node_modules/
dist/
build/
coverage/
vendor/
```

Heurísticas de conteúdo (aplicadas mesmo a arquivos que passam pelo filtro de nome):

```text
PRIVATE KEY
API_KEY=
TOKEN=
PASSWORD=
SECRET=
```

Quando um source é excluído por esse guard, o manifesto registra apenas o path relativo, nunca o valor:

```json
{ "excluded_sources": [{ "path": "config/.env", "reason": "sensitive_pattern" }] }
```

Proteções adicionais obrigatórias no contrato:

- **Realpath containment**: todo path resolvido deve permanecer dentro de `PROJECT_ROOT` após `fs.realpathSync` — mesma técnica já usada em `scripts/release/smoke-distribution.mjs` para comprovar isolamento do tarball instalado.
- **Proteção contra symlink escapando `PROJECT_ROOT`**: um symlink que resolve para fora da raiz do projeto nunca é seguido.
- **Exclusão de arquivo binário**: nenhum binário é lido como fonte textual de contexto.
- **Tamanho máximo de arquivo-fonte**: um limite explícito (a definir em bytes no Bloco 09) evita que um único arquivo estoure o budget ou trave o compiler.
- **Nenhuma leitura recursiva do próprio `.ddae/context/`**: o compiler nunca lê seu próprio output como input de um novo build, evitando realimentação.

Este é o mesmo espírito do `FORBIDDEN_PATTERNS`/`FORBIDDEN_PREFIXES` já existentes em `scripts/release/verify-package.mjs`, mas é uma lista independente: aquela protege o **pacote npm publicado**; esta protege o **conteúdo do contexto compilado** dentro de um projeto consumidor. São preocupações de escopo diferente e não devem ser fundidas em uma única constante compartilhada.

## 13. Contrato atual do projeto DDAE (Docs/ vs. docs/sessions/)

O Context Compiler é uma capability de projeto DDAE voltada para **consumidores** do CLI. O contrato primário de um consumidor continua sendo `Docs/` (maiúsculo, gerado por `ddae-engine init`). O compiler não deve ganhar nenhum caso especial para `docs/sessions/` (minúsculo) apenas porque o próprio repositório DDAE-Engine usa essa convenção internamente para documentar o desenvolvimento do próprio produto — isso seria confundir o dogfooding interno com o contrato público.

Consequência para testes: os testes do Context Compiler (Blocos 02–10) usam um projeto consumidor temporário ou um fixture (`test/fixtures/context-project/`), nunca o próprio repositório DDAE-Engine como sujeito de teste. Nenhum hack do tipo `package.name === "ddae-engine"` é aceitável dentro de `src/context/`.

## 14. Contrato de CLI

```text
ddae-engine context build \
  --goal "<goal>" \
  [--session <session>] \
  [--budget minimal|standard|deep] \
  [--dir <path>]

ddae-engine context show \
  [--dir <path>]

ddae-engine context validate \
  [--dir <path>]
```

| Comando | Inputs | Outputs | Side effects | Falhas | Exit |
|---|---|---|---|---|---|
| `context build` | `--goal` (obrigatório), `--session`/`--budget`/`--dir` (opcionais) | Relatório no stdout | **Único comando que escreve** `.ddae/context/{manifest.json,CONTEXT.md,validation.json}` e `.ddae/.gitignore` (se ausente) | `--goal` ausente; `Docs/` ausente (mesmo pré-requisito de `validate`/`audit` hoje) | 0 sucesso / 1 falha |
| `context show` | `--dir` (opcional) | Conteúdo de `CONTEXT.md` (ou resumo de `manifest.json`) no stdout | **Nenhum** — somente leitura | `.ddae/context/manifest.json` ausente (nenhum build ainda executado) | 0 sucesso / 1 falha |
| `context validate` | `--dir` (opcional) | Relatório `VALID`/`STALE`/`INVALID` no stdout | Preferencialmente **nenhum** — leitura sobre manifesto/contexto já existentes | Manifesto ausente, corrompido, ou schema divergente | 0 se `VALID`, 1 caso contrário |

Se, no futuro, `context validate` precisar atualizar `validation.json` como parte de sua execução, esse side effect precisa ser adicionado explicitamente a este contrato antes de ser implementado — nunca introduzido silenciosamente.

## 15. Staleness

`context validate` distingue três estados:

- **`VALID`**: manifesto estruturalmente válido e todos os elementos de freshness (fingerprint, HEAD, hashes de source) correspondem ao estado atual do projeto.
- **`STALE`**: manifesto estruturalmente válido, mas alguma entrada de freshness mudou desde a compilação — por exemplo, Git HEAD mudou, o hash de goal diverge, uma sessão-fonte mudou, ou o `content_hash` de algum source relevante mudou.
- **`INVALID`**: o manifesto, o schema ou o contrato de sources está quebrado (JSON malformado, `schema_version` desconhecida, source referenciando um path que não existe mais).

Motivos são estruturados, não apenas texto livre:

```json
{
  "status": "STALE",
  "reasons": [
    { "code": "GIT_HEAD_CHANGED" }
  ]
}
```

Códigos previstos inicialmente: `GIT_HEAD_CHANGED`, `GOAL_HASH_CHANGED`, `SESSION_SOURCE_CHANGED`, `SOURCE_CONTENT_CHANGED`, `SCHEMA_VERSION_MISMATCH`. A lista definitiva de códigos e a lógica de detecção são implementadas no Bloco 06 (compiler) e Bloco 08 (CLI) — este bloco apenas fixa a forma do contrato.

## 16. Versionamento

Alvo de produto desta capability: `DDAE Engine 0.3.0`.

**Neste Bloco 01, nem `package.json.version` nem `EXPECTED_VERSION` (em `scripts/release/verify-package.mjs`) são alterados.** A versão local do repositório permanece `0.2.0` durante todo o desenvolvimento inicial (Blocos 01–11). O bump para `0.3.0` ocorre exclusivamente no Bloco 12 (preparação formal da release).

Justificativa adicional, além da coerência semântica (nova capability estrutural, não correção pontual — mudança `MINOR`, não `PATCH`, seguindo a mesma política já registrada no `CHANGELOG.md`): manter `package.json.version` em `0.2.0` durante o desenvolvimento é também uma proteção operacional — um `npm publish` acidental durante os Blocos 02–11 não conseguiria sobrescrever a versão pública já existente no registro (o registro npm rejeita repunir uma versão já publicada).

Da mesma forma, `REQUIRED_SRC_PREFIXES` em `scripts/release/verify-package.mjs` **não** é alterado neste bloco. `src/context/` e `src/schemas/` ainda não existem — exigir sua presença no gate de empacotamento antes de terem conteúdo de produção faria `package:check` reprovar por um motivo artificial. Esses prefixos entram na lista assim que os diretórios existirem com conteúdo real (a partir do Bloco 02), não antes.

O `context_schema_version` (Seção 9) e a "versão do contrato do compiler" citada no fingerprint são deliberadamente independentes da versão do pacote npm — um mesmo `ddae-engine@0.3.0` pode, em tese, evoluir o schema do manifesto em uma versão futura sem que isso implique necessariamente um novo major de produto.

## 17. Estrutura de código alvo (não criada neste bloco)

Registrada aqui como arquitetura-alvo para os Blocos 02–09. Nenhum destes arquivos ou diretórios é criado no Bloco 01.

```text
src/
├── commands/
│   └── context.js
│
├── context/
│   ├── compiler.js
│   ├── manifest.js
│   ├── git-context.js
│   ├── ddae-context.js
│   ├── project-context.js
│   ├── relevance.js
│   ├── authority.js
│   ├── renderer.js
│   ├── validator.js
│   ├── fingerprint.js
│   └── sensitive-files.js
│
└── schemas/
    └── context-schema.js
```

`src/context/` é paralelo a `src/utils/` em espírito (lógica pura, sem I/O de comando), mas separado dele porque é específico do Context Compiler. `git-context.js` reaproveita o padrão de shelling já validado em produção em `scripts/ci/verify-clean-tree.mjs` (`execFileSync('git', [...], { encoding: 'utf8' })`).

## 18. Schema conceitual do Manifest v1

Shape conceitual — refinável durante os Blocos 02–06, não implementado como schema JS nesta etapa:

```json
{
  "schema_version": "1",
  "compiler": {
    "name": "ddae-context-compiler",
    "engine_version": "<version>"
  },
  "project": {
    "name": "...",
    "root_kind": "ddae"
  },
  "goal": {
    "text": "...",
    "normalized": "...",
    "hash": "sha256:..."
  },
  "session": {
    "id": "...",
    "path": "...",
    "selection_reason": "explicit|latest_canonical"
  },
  "budget": {
    "profile": "standard",
    "max_chars": 60000
  },
  "git": {
    "available": true,
    "repository": true,
    "branch": "...",
    "head": "...",
    "working_tree": "clean|dirty"
  },
  "sources": [],
  "decisions": [],
  "constraints": [],
  "bugs": [],
  "validation": [],
  "relevant_files": [],
  "excluded_sources": [],
  "conflicts": [],
  "fingerprint": {
    "algorithm": "sha256",
    "value": "..."
  }
}
```

Observação: `session.id = null` (Seção 6) e `git.available = false` (Seção 10) são estados válidos e esperados, não erros — o schema real (Bloco 06) precisa aceitá-los explicitamente.

## 19. Compatibilidade

Nenhum comando existente (`init`, `session create`, `block create`, `prompt create`, `feedback create`, `validate`, `audit`) muda de comportamento por causa desta sessão. `context` é um namespace inteiramente novo, aditivo. Um projeto scaffolded com `0.2.0` continua funcionando de forma idêntica sob `0.3.0`; `context build` é opt-in.
