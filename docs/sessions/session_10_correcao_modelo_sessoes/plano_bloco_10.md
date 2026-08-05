# Plano — Session 10: Correção do Modelo de Sessões e Módulos Internos

## 1. Objetivo Geral

Corrigir a semântica central da DDAE Engine: uma sessão precisa representar um trabalho real do desenvolvimento, não uma pasta estrutural criada antecipadamente. Esta sessão altera o scaffold gerado para projetos consumidores (`ddae-engine init`/`session create`), não a estrutura de desenvolvimento deste próprio repositório.

## 2. Fora de Escopo (toda a sessão)

- Integração Obsidian / vault corporativo.
- Schemas YAML completos.
- IDs globais `SES-*`.
- Máquinas de estado.
- Context Compiler / MCP.
- Dashboards.
- Migração automática de projetos legados (apenas detecção não-destrutiva).
- Publicação npm, commit ou push.

---

## Bloco 01 — Diagnóstico e contrato da mudança

**Objetivo:** mapear com precisão onde e como o comportamento incorreto acontece, antes de qualquer alteração de código.

**Escopo:**
- Localizar onde as 10 sessões são criadas (`src/commands/init.js`, `src/utils/session.js` — constante `BASE_SESSIONS`).
- Entender o cálculo de numeração (`nextSequence` genérica em `src/utils/fs-helpers.js`, usada sem filtro de tipo/formato estrito).
- Confirmar por que a primeira sessão real vira `session_11` (10 sessões pré-criadas + `max+1`).
- Levantar quais comandos/validadores dependem do modelo atual (`validate.js` — checagem "sessão base 1–10 ausente"; `audit.js` — `SESSION_SUBFOLDERS` hardcoded).
- Levantar quais documentos usam terminologia incorreta (`README.md`, `metodologia.md`, `folder_schema.md`, exemplos em `src/cli.js`).
- Definir estratégia de detecção de projetos legados sem apagar nada.

**Fora de escopo:** qualquer alteração funcional em `src/`.

**Arquivos previstos:** nenhuma escrita de código — apenas leitura de `src/commands/*.js`, `src/utils/*.js`, `src/templates/**`, `README.md`, `package.json`, `docs/sessions/**`, `feedback/**`, e histórico Git.

**Dependências:** nenhuma.

**Implementação esperada:** resumo estruturado (`CAUSA RAIZ` / `ARQUIVOS AFETADOS` / `COMPORTAMENTO ATUAL` / `COMPORTAMENTO CORRETO` / `RISCO DE MIGRAÇÃO` / `ESTRATÉGIA DE COMPATIBILIDADE`).

**Riscos:** nenhum — bloco somente-leitura.

**Critérios de aceite:**
- [x] Causa raiz identificada com evidência de arquivo/linha.
- [x] Lista completa de arquivos afetados (código + documentação).
- [x] Estratégia de compatibilidade definida antes de qualquer escrita.

**Testes:** não aplicável (sem código alterado).

**Evidência:** diagnóstico apresentado antes da implementação, confirmando que `nextSequence()` varre qualquer entrada (arquivo ou pasta) cujo nome comece com `session_<dígitos>`, sem exigir tipo diretório nem sufixo válido.

**Definição de pronto:** diagnóstico aprovado implicitamente pela continuidade para o Bloco 02, sem objeção levantada.

---

## Bloco 02 — Correção de `init` e `session create`

**Objetivo:** implementar o comportamento correto de scaffold e numeração.

**Escopo:**
- Remover o loop de `BASE_SESSIONS` em `src/commands/init.js`.
- Reescrever `src/utils/session.js` como fonte canônica: `SESSION_NAME_PATTERN` (`^session_(\d+)_([a-z0-9_]+)$`), `listSessionDirs`, `listNonConformingDirs`, `nextSessionNumber`, `listSessionModules`, `detectLegacyBaseSessions`, `parseSessionFolderName`.
- Criar `src/templates/docs_root/05_sessions/README.md` — passa a ser copiado automaticamente pelo `copyDir(docs_root, ...)` já existente em `init.js`, sem código especial adicional.
- Atualizar `src/commands/session.js` para numerar via `nextSessionNumber` e reportar `Modules created`/`Files created`.
- Atualizar `src/commands/block.js` para reusar `parseSessionFolderName` centralizado (elimina duplicação com regex frouxa).

**Fora de escopo:** `validate`/`audit` (Bloco 03); testes (Bloco 04); documentação de produto além do necessário para o template novo (Bloco 05).

**Arquivos previstos:** `src/commands/init.js`, `src/commands/session.js`, `src/commands/block.js`, `src/utils/session.js`, `src/templates/docs_root/05_sessions/README.md` (novo), `src/cli.js` (exemplos do `--help`).

**Dependências:** Bloco 01.

**Implementação esperada:** ver seção "Contrato de Comportamento Desejado" — `init` gera `Docs/05_sessions/README.md` e nada mais; `session create "autenticacao"` gera `session_01_autenticacao/` com os 13 módulos.

**Riscos:** quebrar `block create`/`prompt create`/`feedback create`, que dependem de `parseSessionFolderName` — mitigado reexportando a função centralizada com a mesma assinatura.

**Critérios de aceite:**
- [x] `init --dir <projeto>` não cria nenhuma `session_01`..`session_10`.
- [x] `Docs/05_sessions/README.md` existe após `init`.
- [x] `session create "autenticacao"` cria `session_01_autenticacao/` com os 13 módulos.
- [x] Segunda chamada a `session create` cria `session_02_...`.
- [x] Lacunas de numeração são preservadas (`session_01` + `session_03` manual → próxima é `session_04`).
- [x] Arquivos soltos, módulos e nomes fora do padrão não alteram a numeração.
- [x] `block create`/`prompt create`/`feedback create` continuam funcionando sem alteração de interface.

**Testes:** `test/session-numbering.test.js`, `test/cli-init.test.js`, `test/cli-session.test.js` (Bloco 04).

**Evidência:** execução manual registrada em `validacao_bloco_10_correcao_modelo_sessoes.md`.

**Definição de pronto:** todos os critérios de aceite verificados manualmente antes de avançar ao Bloco 03.

---

## Bloco 03 — Validação e auditoria

**Objetivo:** fazer `validate` e `audit` refletirem o novo modelo sessão/módulo.

**Escopo:**
- `src/commands/validate.js`: remover a checagem "sessão base 1–10 ausente"; adicionar checagem de `Docs/05_sessions/README.md`; adicionar detecção de numeração de sessão duplicada (erro); adicionar checagem de módulos obrigatórios por sessão real (warning); reportar `Sessions found: N`.
- `src/commands/audit.js`: filtrar `auditSessions` para só tratar como sessão o que casa com `SESSION_NAME_PATTERN`; pastas fora do padrão viram `suggestions`; reusar `listSessionModules()` em vez da constante `SESSION_SUBFOLDERS` duplicada; adicionar `detectLegacyBaseSessions` como warning não-destrutivo; classificar cada sessão como `vazia`/`em andamento`/`concluída`; reportar `Sessions found: N` e um bloco `Sessions:`.

**Fora de escopo:** qualquer alteração nos quality gates (`06_quality_gates`) — inalterados.

**Arquivos previstos:** `src/commands/validate.js`, `src/commands/audit.js`.

**Dependências:** Bloco 02 (usa `listSessionDirs`, `listSessionModules`, `detectLegacyBaseSessions` de `utils/session.js`).

**Implementação esperada:** `validate --dir <projeto-recém-iniciado>` → `Sessions found: 0`, `Status: OK`. `audit` no mesmo projeto → `Nenhuma sessão criada ainda.` em vez de listar módulos como se fossem sessões.

**Riscos:** falso positivo tratando módulo como sessão (mitigado pelo filtro estrito de nome + teste dedicado); falso negativo na detecção de legado (mitigado por comparar contra a lista exata dos 10 slugs do scaffold antigo, não um heurístico frouxo).

**Critérios de aceite:**
- [x] `validate` aceita projeto com zero sessões (`Status: OK`).
- [x] `validate` falha (`Status: FAILED`) com numeração de sessão duplicada.
- [x] `audit` nunca lista uma pasta de módulo (`01_intake`, `05_blocks`, ...) como sessão.
- [x] `audit` detecta e sinaliza scaffold legado sem apagar/renumerar nada.
- [x] `audit` distingue sessão vazia, em andamento e concluída.

**Testes:** `test/cli-validate-audit.test.js`.

**Evidência:** saídas de `validate`/`audit` capturadas em `validacao_bloco_10_correcao_modelo_sessoes.md`.

**Definição de pronto:** todos os critérios verificados manualmente e cobertos por teste automatizado antes do Bloco 04 ser considerado concluído.

---

## Bloco 04 — Testes automatizados com `node:test`

**Objetivo:** proteger o comportamento corrigido contra regressão futura, sem introduzir dependências externas.

**Escopo:**
- `test/helpers.js` — utilitário de diretório temporário e execução do CLI real via `child_process`.
- `test/session-numbering.test.js` — testes unitários de `src/utils/session.js`.
- `test/cli-init.test.js` — testes de integração do `init`.
- `test/cli-session.test.js` — testes de integração do `session create` (numeração, módulos, não-destrutividade, lacunas).
- `test/cli-validate-audit.test.js` — testes de integração de `validate`/`audit` (zero sessões, duplicidade, módulos vs. sessões, legado).
- `package.json` — script `"test": "node --test"`.

**Fora de escopo:** cobertura de `block create`/`prompt create`/`feedback create` (inalterados nesta sessão, já cobertos indiretamente pelo uso em `test/cli-session.test.js`); CI/CD (recomendado como próxima sessão, não implementado aqui).

**Arquivos previstos:** `test/*.js` (5 arquivos), `package.json`.

**Dependências:** Blocos 02 e 03 (os testes exercitam o comportamento já implementado).

**Implementação esperada:** `npm test` roda `node --test` e cobre os 21 cenários levantados no diagnóstico (numeração, estrutura, compatibilidade).

**Riscos:** testes de integração via `child_process.execFileSync` são mais lentos (~15s para a suíte inteira) — aceito conscientemente para manter zero dependências (sem mocking de `fs`).

**Critérios de aceite:**
- [x] `npm test` executa sem erro de configuração.
- [x] 26/26 testes aprovados.
- [x] Suíte cobre: inicialização, numeração (incluindo lacunas e nomes espúrios), estrutura de módulos, não-destrutividade, `validate`, `audit`, compatibilidade com legado.

**Testes:** a própria suíte (autorreferente).

**Evidência:** saída completa de `npm test` registrada em `validacao_bloco_10_correcao_modelo_sessoes.md`.

**Definição de pronto:** `npm test` verde antes do Bloco 05.

---

## Bloco 05 — Documentação, compatibilidade e fechamento

**Objetivo:** alinhar toda a documentação de produto à terminologia correta (sessão vs. módulo) e fechar a sessão.

**Escopo:**
- `README.md` — remover árvore com 10 sessões pré-criadas; corrigir exemplos (`session_11` → `session_01`); explicar o modelo sessão/módulo.
- `src/templates/docs_root/00_ddae_engine/metodologia.md` — seção 9 reescrita; nova subseção "Sessão vs. Módulo".
- `src/templates/docs_root/00_ddae_engine/folder_schema.md` — remover texto sobre "10 sessões base"; adicionar tabela sessão vs. módulo; corrigir exemplo residual `session_11_dashboard_admin`.
- `src/templates/docs_root/00_ddae_engine/glossario.md` — reescrever termo "Sessão"; adicionar termo "Módulo".
- `src/cli.js` — exemplos do `--help`.
- `package.json` — versão `0.1.0` → `0.2.0` (mudança incompatível no output do `init`).
- `CHANGELOG.md` (novo, na raiz) — primeiro changelog formal do repositório, registrando as entradas `0.2.0` e `0.1.0`.
- `docs/sessions/session_10_correcao_modelo_sessoes/` e `feedback/feedback_bloco_10_correcao_modelo_sessoes.md` — registro formal desta sessão.

**Fora de escopo:** `docs/sessions/session_00`..`session_09` e `feedback/feedback_bloco_00`..`09` — preservados sem alteração, por serem registro histórico do comportamento então vigente.

**Arquivos previstos:** listados acima.

**Dependências:** Blocos 02–04 (a documentação descreve comportamento já implementado e testado).

**Implementação esperada:** nenhuma referência residual a `session_11`, "10 sessões base" ou `BASE_SESSIONS` em `src/` ou `README.md` (confirmado via `grep` recursivo).

**Riscos:** renumerar seções existentes de `metodologia.md` quebraria referências cruzadas ("seção 12" é citada em `CLAUDE.md`/`AGENTS.md`/`regras_ddae_engine.md`/`glossario.md` para a escala P1–P4) — mitigado inserindo a nova subseção "Sessão vs. Módulo" como `###` dentro da seção 9 existente, sem renumerar 10–13.

**Critérios de aceite:**
- [x] Nenhuma referência residual a `session_11`/"10 sessões base"/`BASE_SESSIONS` em `src/` ou `README.md`.
- [x] Terminologia sessão vs. módulo consistente em `metodologia.md`, `folder_schema.md`, `glossario.md`.
- [x] Referências cruzadas por número de seção permanecem válidas.
- [x] Versão de `package.json` incrementada e justificada.
- [x] `CHANGELOG.md` criado na raiz, com entradas `0.2.0` e `0.1.0`.
- [x] `docs/sessions/session_10_correcao_modelo_sessoes/` criado seguindo o padrão das sessões anteriores.

**Testes:** `grep` de confirmação (não é teste automatizado formal — registrado como validação manual).

**Evidência:** ver `validacao_bloco_10_correcao_modelo_sessoes.md`.

**Definição de pronto:** grep de resíduos limpo, `npm test` verde, `npm pack --dry-run` aprovado, working tree contendo apenas alterações desta sessão, nada commitado.
