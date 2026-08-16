# Análise Técnica

> Projeto: DDAE · Atualizado em: 2026-08-16

## 1. Aspectos Técnicos

### Aspecto: Project Brain Indexer
- **Abordagem proposta:** Composição de camadas puras + uma camada fina de filesystem, exatamente o padrão já usado pelo Context Compiler: `discover.js` (filesystem layer — lê `Docs/`, chama `collectDdaeContext`/`collectGitContext` existentes) → `brain-schema.js`/`fingerprint.js` (funções puras — payload canônico, hash) → `renderer.js` (função pura — Manifest → Markdown) → `src/commands/workspace.js` (camada de CLI, único ponto que escreve em disco). Nenhum componente novo mistura leitura de filesystem com lógica de transformação — mesma separação já validada pelos Blocos 02–07 da Session 02.
- **Alternativas consideradas:** Um único módulo monolítico "WorkspaceBuilder" fazendo tudo — rejeitado por replicar o anti-padrão que o próprio Context Compiler evitou deliberadamente (compiler.js orquestra, mas coletores/schema/fingerprint/renderer são módulos puros separados e testáveis isoladamente).
- **Complexidade estimada:** Média — a descoberta/agregação (Bloco 02) é o componente mais complexo por tocar múltiplas fontes (sessões, Git, riscos, bugs); o restante é composição direta de padrões já provados.
- **Depende de:** `src/context/ddae-context.js`, `src/context/git-context.js` (reaproveitados, não alterados), `src/context/sensitive-files.js` (containment de path/symlink).

### Aspecto: Fingerprint e Drift Detection do Brain
- **Abordagem proposta:** Reaproveitar o algoritmo de `src/context/fingerprint.js` (payload canônico + `sha256Hex`) aplicado a um payload próprio do Brain (hash de `Docs/` relevante + Git HEAD + versão do schema) — mesma primitiva, payload diferente. `workspace validate` reaproveita o **modelo** VALID/STALE/INVALID e a prioridade INVALID > STALE de `src/context/validator.js`, mas com razões próprias (`DOCS_CONTENT_CHANGED`, reaproveitando `GIT_HEAD_CHANGED`/`SESSION_SOURCE_CHANGED` onde o conceito é literalmente o mesmo).
- **Alternativas consideradas:** Importar `validateContextState` diretamente e tentar generalizá-lo agora para os dois casos de uso — descartado para esta sessão por introduzir refactor no Context Compiler já publicado/estável sem necessidade imediata; a extração de um kernel compartilhado fica proposta como item explícito do Bloco 07, feita com evidência de dois usos reais lado a lado, não especulativamente.
- **Complexidade estimada:** Baixa — o algoritmo já existe e está provado; o trabalho é aplicá-lo a um novo payload.
- **Depende de:** `src/context/fingerprint.js` (reaproveitado).

### Aspecto: Determinismo do `workspace build`
- **Abordagem proposta:** Mesma garantia já exigida do Context Compiler — saída é função pura do estado observável (conteúdo de `Docs/`, Git HEAD, sessão canônica), nunca do relógio de parede. Nenhum timestamp de execução é embutido no conteúdo gerado (evita que dois builds consecutivos sem nenhuma mudança real produzam diffs espúrios, o que quebraria a própria noção de VALID).
- **Alternativas consideradas:** Incluir "Gerado em: <timestamp>" no rodapé de cada view — rejeitado; quebra determinismo e não agrega valor real (a informação equivalente já existe via Git/fingerprint).
- **Complexidade estimada:** Baixa, se disciplinado desde o schema (Bloco 03).
- **Depende de:** Nenhuma dependência nova.

## 2. Componentes/Módulos Afetados

Nenhum componente existente é modificado. Todos os módulos novos vivem em `src/workspace/` (paralelo a `src/context/`) e `src/commands/workspace.js`. `src/cli.js` ganha o roteamento para o novo comando, sem alterar o roteamento existente.

## 3. Novas Dependências Necessárias

**Nenhuma.** Zero dependências de runtime ou desenvolvimento novas — mantém `dependencies`/`devDependencies` vazios, propriedade que o projeto preserva desde a `0.1.0` e reconfirma explicitamente a cada release (`package:check`). Nenhuma biblioteca de parsing de Markdown/YAML frontmatter é necessária: o Brain apenas *gera* Markdown com frontmatter simples (formato já usado nos templates existentes, `src/templates/**`), não precisa *interpretar* Markdown arbitrário do usuário.

## 4. SemVer

```text
0.3.0 → 0.4.0 (MINOR)
```

Justificativa: mudança inteiramente aditiva. Nenhum comando existente muda de comportamento, nenhuma nova dependência obrigatória, `workspace *` é opt-in por definição (RS-06). Consistente com a política já declarada em `CHANGELOG.md` ("enquanto o pacote estiver em `0.x`, mudanças incompatíveis incrementam a versão `MINOR`") — e esta mudança nem é incompatível, então `MINOR` é a escolha correta por qualquer leitura da política.

`package.json` **não foi alterado nesta execução** — o bump de versão fica reservado para a fase de release preparation (mesmo padrão do Bloco 11 da Session 02), não para a fase de arquitetura.

## 5. Estratégia de Testes (Matriz Completa)

| Categoria | Cobertura planejada |
|---|---|
| Unit | `brain-schema.js`, `fingerprint.js`, `renderer.js` — funções puras, testáveis com fixtures sintéticas, mesmo padrão de `test/context-*.test.js`. |
| Integration | `discover.js` contra o próprio self-host do DDAE (mesmo padrão de "provar contra o próprio repositório" já usado em toda a Session 02). |
| CLI | `workspace init/build/validate/show` via `node --test` chamando o binário, mesmo padrão de `test/cli-init.test.js`. |
| Filesystem | Containment de path, criação idempotente de `.gitignore`, não-sobrescrita de arquivo humano-autorado. |
| Windows / Linux / macOS | Matriz de CI existente (`ubuntu-latest` ×3, `windows-latest`, `macos-latest`) — sem etapa nova de CI necessária, apenas os novos testes rodando na matriz já existente. |
| Security | Path traversal (RS-01), symlink fail-closed (RS-02), reaproveitando fixtures já existentes de `test/context-sensitive-guard.test.js` onde aplicável. |
| Determinism | Dois `workspace build` consecutivos sem mudança de estado produzem saída byte-idêntica (mesmo teste conceitual já existente para o Renderer do Context Compiler). |
| Idempotency | `workspace init` rodado duas vezes não duplica linhas de `.gitignore` nem falha. |
| Drift | `workspace validate` reporta STALE após uma mudança real em `Docs/`, VALID quando nada mudou, INVALID quando o manifesto é adulterado — espelhando a suíte de `test/context-validator.test.js`. |
| Migration | Projeto `0.3.0` existente, nunca rodando `workspace *`, permanece byte-idêntico após atualização do pacote (RS-06). |
| Existing-project compatibility | Suíte completa de regressão (448 testes atuais) permanece verde sem alteração. |
| npm distribution smoke | `scripts/release/smoke-distribution.mjs` ganha uma nova etapa aditiva (`workspaceJourney`), mesmo padrão já usado para `contextCompilerJourney` (Bloco 09, Session 02). |
| Stable Host | `scripts/ci/verify-stable-host.mjs` continua provando que o Stable Host publicado governa o checkout — sem mudança de mecanismo, só mais uma versão eventualmente promovida no futuro. |

## 6. Perguntas Orientadoras

- **A abordagem técnica é a mais simples que resolve o problema?** Sim — nenhuma dependência nova, nenhuma abstração nova além do que o Context Compiler já provou funcionar; a única generalização considerada (kernel de validação compartilhado) foi deliberadamente adiada em vez de antecipada sem uso duplo real ainda.
- **Alguma parte exige spike antes de comprometer o plano de blocos?** Não identificada — todos os componentes têm precedente direto e testado dentro do próprio repositório.

## 7. Decisões Pendentes

Nenhuma nesta análise.
