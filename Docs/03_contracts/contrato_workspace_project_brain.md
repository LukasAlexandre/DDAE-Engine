# Contrato de Workspace / Project Brain

> Projeto: DDAE Engine · Atualizado em: 2026-08-16

> Congelado pelo Bloco 01 (`session_03_obsidian_workspace_project_brain_0_4_0`) a partir da análise arquitetural/funcional/riscos/técnica já aprovada. Blocos 02–13 implementam contra este contrato sem reabri-lo, salvo decisão explícita registrada como nova entrada em `Docs/02_architecture/decisoes_tecnicas.md`.

## 1. Objetivo

Definir, sem ambiguidade, a fronteira entre o que é fonte de verdade e o que é gerado, o schema do Brain Manifest v1, a superfície de CLI, e as regras de segurança/ownership não-negociáveis do Workspace/Project Brain — antes de qualquer implementação técnica.

## A. Fonte de Verdade

```text
Docs/                        CANONICAL — autoritativo, humano + DDAE-autorado
.ddae/context/                 GENERATED / EPHEMERAL — já existe (0.3.0)
.ddae/brain/                    GENERATED / EPHEMERAL — novo, nunca ganha autoridade sobre Docs/
.obsidian/                       LOCAL / EPHEMERAL / OPTIONAL — preferência de máquina
```

Regra não-negociável: **Project Brain nunca pode ganhar autoridade sobre `Docs/`.** Qualquer divergência entre o gerado e o real é sempre resolvida a favor de `Docs/`+Git, nunca do inverso — estruturalmente, porque o gerado é sempre uma função pura desses dois, nunca escrito por um humano.

## B. Brain Manifest Schema v1

```text
schema_version        string, obrigatório — "brain-manifest-v1"
engine_version         string, obrigatório — versão do ddae-engine que gerou o manifesto
project                object, obrigatório — { name, root_relative_path }
git                     object, obrigatório — { available: bool, head: string|null } (reaproveita a forma já usada por git-context.js)
ddae                     object, obrigatório — sessão canônica, módulos, contagens — reaproveita a saída de collectDdaeContext sem redefinir um formato paralelo
current_session          object|null — { id, selection_reason } (mesmo conceito de session.selection_reason já usado no Context Manifest, para consistência)
sources                   array — proveniência de cada entidade agregada (qual arquivo Docs/ originou qual item do índice), nunca conteúdo copiado, só referência
entities                   object — uma chave por entidade da Seção C abaixo, cada uma um array de referências (id, source path, one-line summary extraído verbatim)
views                       array — quais arquivos .ddae/brain/*.md foram gerados nesta build (Seção D)
fingerprint                 object — { algorithm: "sha256", value: string } sobre um payload canônico determinístico
```

Para cada campo: **type** conforme acima; **required/optional** conforme marcado; **source**: `git`/`ddae`/`current_session`/`sources`/`entities` vêm de coletores já existentes (`git-context.js`, `ddae-context.js`) ou de leitura direta de `Docs/`; **authority**: nenhum campo é editável manualmente — o manifesto inteiro é saída de `workspace build`; **canonicalization**: strings sempre UTF-8 normalizadas, paths sempre relativos à raiz do projeto com `/` (nunca `\`, mesmo no Windows, mesma convenção já usada pelo Context Manifest); **ordering**: arrays (`sources`, `entities.*`, `views`) sempre ordenados deterministicamente (ordem alfabética de path ou de id, nunca ordem de filesystem/OS, que não é estável entre plataformas); **security constraints**: nenhum path absoluto de máquina, nenhum conteúdo de arquivo sensível (a Sensitive Data Guard se aplica à descoberta antes de qualquer entrada chegar ao manifesto).

**Explicitamente fora do payload canônico usado no fingerprint** (para preservar determinismo): timestamps de execução (`Date.now()`), qualquer UUID aleatório, qualquer ordenação dependente de filesystem/SO. O manifesto pode ter um campo informativo `generated_at` fora do payload fingerprinted (não afeta VALID/STALE/INVALID), mas nunca dentro dele — mesmo princípio já aplicado pelo Context Compiler (`fingerprint.js`).

## C. Project Brain Entities

| Entidade | Classificação |
|---|---|
| Project Overview | CANONICAL REFERENCE (link para `visao_produto.md`/`README.md`) |
| Current State | GENERATED VIEW |
| Goals | CANONICAL REFERENCE (link) |
| Active Session | DERIVED (de `collectDdaeContext`) |
| Decisions | DERIVED + GENERATED VIEW (índice sobre `registro_decisoes.md`) |
| Architecture | CANONICAL REFERENCE (link) |
| Dependencies | CANONICAL REFERENCE (link para `package.json`/`mapa_dependencias.md`, sem grafo dedicado no MVP) |
| Risks | DERIVED + GENERATED VIEW (índice sobre `matriz_riscos.md`) |
| Open Bugs | DERIVED + GENERATED VIEW (agregado entre sessões) |
| Recent Changes | DERIVED (de `git-context.js`) |
| Current Tasks / Next Actions | DERIVED (checklist não marcado do bloco ativo) |
| Important Files | DERIVED, condicional a `.ddae/context/manifest.json` existir |
| Context Packages | DERIVED (status via `context validate` existente, nunca recomputado pelo Brain) |
| Release State | GENERATED VIEW |
| Timeline | GENERATED VIEW, prioridade baixa (Bloco 12) |
| Memory | **EXCLUDED** — `Docs/` já cumpre esse papel; nenhum sistema de memória paralelo é criado. |

Nenhuma entidade acima duplica conteúdo — `DERIVED`/`GENERATED VIEW` sempre significa "índice com link e resumo de uma linha", nunca cópia de conteúdo integral.

## D. Generated Files Contract

| Arquivo | Propósito | Fonte | Ownership | Fingerprinted | Regra de validação |
|---|---|---|---|---|---|
| `.ddae/brain/manifest.json` | Manifesto canônico v1 | Discovery + Git + DDAE state | MACHINE GENERATED | Sim (é o próprio fingerprint) | Schema válido = pré-requisito para qualquer status ≠ INVALID |
| `.ddae/brain/Home.md` | Ponto de entrada | Manifest | MACHINE GENERATED | Indiretamente (renderizado do Manifest) | Deve corresponder byte-a-byte à renderização determinística do Manifest atual |
| `.ddae/brain/Sessions.md`, `Decisions.md`, `Risks.md`, `Bugs.md`, `Releases.md`, `Context-Packages.md`, `Recent-Activity.md` | Índices por entidade | Manifest | MACHINE GENERATED | Indiretamente | Mesma regra do `Home.md` |
| `.ddae/brain/.gitignore` | Self-ignore | `workspace init`/`build` | MACHINE GENERATED | Não | Sempre presente após `init`; conteúdo fixo (`*`) |

Nenhum arquivo redundante: cada view corresponde a uma entidade da Seção C com valor operacional distinto (mesma verificação já feita em `analise_funcional.md`, Seção 4).

## E. Ownership Contract

```text
HUMAN AUTHORED       Docs/ (exceto onde o próprio DDAE já gera scaffolds, ex. templates de init)
MACHINE GENERATED     .ddae/context/*, .ddae/brain/* — nunca editados à mão
DERIVED                Views/índices calculados a partir de HUMAN AUTHORED, nunca a fonte
EPHEMERAL               node_modules/ddae-engine/, .obsidian/ — locais, recriáveis, gitignored
IMMUTABLE HISTORY        docs/sessions/ (legacy, minúsculo) — nunca reescrito, nunca gerado
```

**Regra de detecção de edição manual**: se um artefato MACHINE GENERATED for modificado manualmente e deixar de corresponder ao fingerprint recomputado a partir do estado atual de `Docs/`+Git, o resultado é **INVALID** (via `FINGERPRINT_MISMATCH`/`CONTEXT_MARKDOWN_MISMATCH`-equivalente, mesmo mecanismo do Context Validator) — nunca é silenciosamente aceito como novo estado canônico. A edição manual não é impedida tecnicamente (são arquivos comuns em disco), mas nunca é tratada como fonte de verdade.

## F. CLI Contract

| Comando | Purpose | Args | Input | Output | Writes | Read-only? | Idempotent? | Deterministic? | Exit codes | Failure modes |
|---|---|---|---|---|---|---|---|---|---|---|
| `workspace init` | Setup único, opt-in | `--dir` | — | Confirmação textual | `.gitignore` (append se ausente), `.ddae/brain/.gitignore` | Não | Sim | N/A | 0 sucesso | `.gitignore` não gravável → erro explícito, exit ≠ 0 |
| `workspace build` | Gera o Brain a partir do estado atual | `--dir` | `Docs/`+Git+sessão atual | Resumo do que foi gerado | `.ddae/brain/manifest.json`, `.ddae/brain/*.md` | Não | Sim (mesmo estado → mesma saída) | Sim | 0 sucesso | Docs/ ilegível, permissão negada → erro explícito |
| `workspace validate` | Verifica frescor | `--dir` | `.ddae/brain/` já construído | Relatório VALID/STALE/INVALID + razões | Nada | **Sim, estrito** | Sim | Sim | 0 = VALID, 1 = STALE/INVALID | `.ddae/brain/` inexistente → erro explícito distinto de INVALID |
| `workspace show` | Imprime a Home | `--dir` | `.ddae/brain/Home.md` já construído | Conteúdo no stdout | Nada | **Sim, estrito** | Sim | Sim | 0 sucesso, 1 se não construído | Mesma distinção acima |

**Rejeitados** (não implementar): `workspace sync` (nome sugere bidirecionalidade, modelo é estritamente unidirecional `Docs/` → Brain), `workspace open` (OS-specific, frágil), `brain build`/`brain show` como verbo separado (redundante com `workspace`).

## G. Obsidian Contract

- `workspace init` **nunca sobrescreve** um `.obsidian/` já existente — apenas garante que está gitignorado; se já estiver, não toca em nada dentro dele.
- **Nenhum plugin community é exigido.** MVP funciona inteiramente com Obsidian vanilla (wikilinks, backlinks, tags, frontmatter, Graph View).
- Obsidian **nunca é uma dependência de runtime** — nenhum comando DDAE chama, verifica a presença de, ou falha na ausência do aplicativo Obsidian.

## H. Drift Contract

```text
VALID    — inputs canônicos inalterados desde o último build + artefatos gerados íntegros (fingerprint bate)
STALE     — estado canônico (Docs/, DDAE state, Git) mudou desde o último build
INVALID    — schema malformado, schema_version incompatível, fingerprint não bate, payload adulterado,
             invariante de segurança de path quebrado (link gerado fora da raiz do projeto)

Prioridade: INVALID > STALE > VALID (nunca STALE quando já é INVALID)
```

Modelo reaproveitado de `src/context/validator.js` (mesmo enum, mesma prioridade, razões próprias do domínio Brain). **Não** refatora o Context Validator neste bloco — kernel compartilhado é avaliação explícita do Bloco 07, com os dois usos reais já existindo para guiar a extração corretamente, não especulação prematura.

## I. Security Contract

Reaproveita a Sensitive Data Guard existente (`src/context/sensitive-files.js`) para: containment de path (link gerado nunca resolve fora da raiz do projeto), symlink traversal (fail-closed, mesma política já provada), exclusão de `.env`/chaves privadas/tokens/senhas/segredos (mesma heurística já existente), detecção de binário, arquivos grandes. Itens específicos do Brain, sem mecanismo próprio duplicado:

- **Markdown injection / wikilink escaping / frontmatter injection**: o Brain só gera Markdown a partir de dados estruturados que ele mesmo controla (paths, resumos de uma linha extraídos verbatim) — nunca interpreta Markdown arbitrário do usuário como comando. Fences dinâmicos seguem a mesma proteção estrutural já usada pelo Context Renderer.
- **Obsidian Sync exposure / Obsidian Publish exposure**: fora do controle técnico do DDAE — mitigado por aviso explícito impresso por `workspace init` (não por bloqueio, que é impossível de implementar de fora do aplicativo Obsidian).

## J. Migration Contract

```text
npm update (ou promoção de Stable Host)  → nenhum efeito colateral em workspace; nada muda sem opt-in
workspace init                             → opt-in explícito, não sobrescreve .obsidian/ existente
workspace build                              → gera .ddae/brain/, nunca toca Docs/
reversal                                       → apagar .ddae/brain/ e/ou .obsidian/; nenhum estado a recuperar,
                                                 porque nada em Docs/ foi tocado
```

Nenhuma migração destrutiva é possível por construção — `workspace *` nunca escreve fora de `.gitignore`/`.ddae/brain/`.

## 2. Validações

- [ ] Todo campo do Schema v1 (Seção B) tem type/required/source/authority/canonicalization/ordering definidos, não apenas listados.
- [ ] Nenhuma entidade da Seção C duplica conteúdo de `Docs/`.
- [ ] Os 4 comandos da Seção F cobrem input/output/writes/read-only/idempotência/determinismo/exit codes.
- [ ] Nenhum mecanismo de segurança é reimplementado onde a Sensitive Data Guard já existente pode ser reaproveitada.

## 3. Versionamento do Contrato

Mudanças de fundo neste contrato (não apenas detalhe de nome de arquivo) exigem uma nova entrada em `Docs/02_architecture/decisoes_tecnicas.md` referenciando e superando DT-01, nunca edição silenciosa deste arquivo.

## 4. Decisões Pendentes

- Nome de arquivo definitivo de cada view (`Home.md` vs. prefixo numérico para ordenação no file explorer do Obsidian) — detalhe de implementação para o Bloco 04 (Renderer), não bloqueia este contrato.
