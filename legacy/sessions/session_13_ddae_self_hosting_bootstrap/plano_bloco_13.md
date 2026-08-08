# Plano — Session 13: DDAE Self-Hosting Bootstrap

## 1. Objetivo Geral

Adotar o próprio DDAE Engine como consumidor da metodologia que oferece a terceiros, sem apagar o histórico interno já existente (`docs/sessions/`) e sem criar autodependência publicada ou auto-modificação autônoma.

## 2. Fora de Escopo (toda a sessão)

- Qualquer alteração em `src/`, `bin/`, `test/`, `scripts/`.
- Migração, renumeração, exclusão ou conversão de `docs/sessions/`.
- Retomada do Bloco 03 da Session 12 (Context Compiler) — a decisão de onde esse trabalho futuro será registrado é explicitamente adiada para um bloco desta sessão, não resolvida no Bloco 01.
- Publicação npm, criação de tag, GitHub Release.

## 3. Ordem e dependências

```text
01 Self-Hosting Contract                        (contrato — sem dependências)
   │
   ▼
01.1 Stable Host Contract Correction            (corrige a decisão host/candidate do 01)
   │
   ▼
02 Stable Host Install + Collision Probe & Safe Scaffold Merge   (depende de 01.1)
   │
   ▼
03 Canonical Self-Host Session Bootstrap        (depende de 02 — Docs/05_sessions/ precisa existir)
   │
   ▼
04 Self-Hosting Validation Proof                (depende de 03 — precisa de ao menos uma sessão real)
   │
   ▼
05 Package Isolation & Self-Hosting Documentation  (depende de 02–04)
```

## 4. Blocos

### Bloco 01 — Self-Hosting Contract

**Objetivo:** fechar o contrato completo do bootstrap de self-hosting antes de qualquer arquivo ser gerado em `Docs/`.

**Escopo:** princípio de self-hosting, o que self-hosting não significa, modelo host/candidate (decisão original deste bloco: usar apenas o checkout, sem instalar o pacote publicado — **corrigida no Bloco 01.1**, ver abaixo), separação entre `docs/sessions/` (legacy) e `Docs/05_sessions/` (canônico), estratégia de scaffold seguro via matriz de colisão, proteção do histórico legado, isolamento de pacote (fato verificado via `npm pack --dry-run --json`, não apenas política), status de pausa da Session 12.

**Fora de escopo:** qualquer geração de arquivo em `Docs/`; qualquer `session create`; qualquer instalação de pacote.

**Arquivos previstos:** `docs/sessions/session_13_ddae_self_hosting_bootstrap/{README.md,plano_bloco_13.md,contrato_self_hosting_v1.md,validacao_bloco_01_self_hosting_contract.md}`, `docs/sessions/session_12_context_compiler_foundation/README.md` (atualização de status apenas).

**Dependências:** nenhuma.

**Critérios de aceite:**
- [x] Princípio de self-hosting definido.
- [x] Modelo host/candidate decidido (checkout único, sem `npm install` do pacote publicado) com justificativa verificável.
- [x] Separação `docs/sessions/` vs. `Docs/05_sessions/` definida, com confirmação de que não há colisão de nome sob case-insensitivity.
- [x] Estratégia de scaffold seguro (matriz de colisão) definida para o Bloco 02.
- [x] Proteção do histórico legado definida (paths imutáveis explícitos).
- [x] Isolamento de pacote verificado como fato estrutural (allowlist de `package.json.files`), não apenas assumido.
- [x] Session 12 marcada como pausada após o Bloco 02, sem ser marcada como concluída.
- [x] Zero implementação de scaffold/sessão/instalação confirmada.

**Testes:** não aplicável — bloco documental. Regressão confirmada via `npm test`/`package:check`/`smoke` contra o baseline da Session 12 inalterado.

**Estratégia de compatibilidade:** nenhum comando existente é tocado; apenas arquivos novos sob `docs/sessions/session_13_.../` e uma atualização de status em `docs/sessions/session_12_.../README.md`.

**Definição de pronto:** os 4 documentos da Session 13 criados, `docs/sessions/session_12_.../README.md` atualizado apenas na seção de status, `git diff`/`git status` confirmando que nenhum outro arquivo foi alterado, `npm test`/`package:check`/`smoke` verdes contra o baseline, commit e push autorizados explicitamente pelo usuário para este bloco específico.

**Correção posterior:** a decisão de host/candidate registrada neste bloco (checkout único) foi revista no Bloco 01.1, antes de qualquer implementação do Bloco 02. Este registro permanece inalterado como histórico do que foi decidido e por quê — ver `validacao_bloco_01_self_hosting_contract.md`.

---

### Bloco 01.1 — Stable Host Contract Correction

**Objetivo:** corrigir a decisão de host/candidate do Bloco 01 antes de qualquer implementação do scaffold, sem reescrever o registro histórico do Bloco 01.

**Escopo:** substituir o modelo "checkout único" por "stable host instalado localmente" em `contrato_self_hosting_v1.md` (Seção 3), `README.md` e `plano_bloco_13.md` (documentos vivos/prospectivos); preservar `validacao_bloco_01_self_hosting_contract.md` sem alteração de conteúdo (registro histórico do que foi decidido no Bloco 01); criar `validacao_checkpoint_01_1_stable_host_correction.md` documentando a correção e sua justificativa.

**Motivo da correção:** usar apenas o checkout testaria "o DDAE executando seu próprio código corrente", não a propriedade que o self-hosting existe para demonstrar — uma release pública estável governando o desenvolvimento do candidate. Essa propriedade precisa existir antes de o candidate divergir do host, não ser introduzida só depois.

**Fora de escopo:** qualquer instalação de pacote (isso é Bloco 02); qualquer geração de arquivo em `Docs/`.

**Arquivos previstos:** `docs/sessions/session_13_.../{README.md,contrato_self_hosting_v1.md,plano_bloco_13.md,validacao_checkpoint_01_1_stable_host_correction.md}`.

**Dependências:** Bloco 01.

**Critérios de aceite:**
- [x] Modelo host/candidate corrigido para stable host instalado localmente (`npm install --no-save`), com justificativa registrada.
- [x] `validacao_bloco_01_self_hosting_contract.md` preservado sem reescrita — apenas os documentos vivos (contrato, README, plano) refletem a decisão corrigida.
- [x] Commit anterior (`e6e074d`) preservado, sem amend, sem force.
- [x] Zero implementação de instalação/scaffold neste checkpoint.

**Testes:** não aplicável — bloco documental. Regressão confirmada via `npm test`/`package:check`/`smoke`.

**Definição de pronto:** documentos corrigidos, `git diff`/`git status` confirmando que somente `docs/sessions/session_13_.../` foi alterado, gates verdes, commit e push autorizados explicitamente pelo usuário para este checkpoint específico.

---

### Bloco 02 — Stable Host Install + Collision Probe & Safe Scaffold Merge

**Objetivo:** instalar `ddae-engine@0.2.0` como stable host efêmero e gerar o scaffold `Docs/` no repositório real usando exclusivamente esse stable host, sem sobrescrever nenhum arquivo já existente.

**Escopo:**
- Calcular SHA-256 de `package.json` antes da instalação.
- `npm install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund ddae-engine@0.2.0`.
- Verificar fisicamente `node_modules/ddae-engine/package.json` (`name`, `version`, `bin`, `dependencies`) e `node node_modules/ddae-engine/bin/ddae-engine.js --version`/`--help`.
- Confirmar SHA-256 de `package.json` inalterado, `package-lock.json` ausente, `dependencies`/`devDependencies` ainda `{}`.
- Executar `node node_modules/ddae-engine/bin/ddae-engine.js init --dir <TEMP>` em um diretório temporário fora do checkout.
- Construir a matriz de colisão: para cada path gerado, classificar como `MISSING` (não existe no repositório), `IDENTICAL` (existe e é byte-idêntico) ou `CONFLICT` (existe e diverge) — comparação de path case-insensitive.
- Se não houver `CONFLICT`: copiar apenas os paths `MISSING` para o repositório real.
- Se houver `CONFLICT`: listar cada um; nenhuma sobrescrita automática.
- Confirmar via `npm pack --dry-run --json` que `node_modules/`, `package-lock.json` e o scaffold `Docs/`/`docs/` não aparecem no pacote.

**Fora de escopo:** `session create` (Bloco 03); `validate`/`audit` contra o próprio repositório (Bloco 04).

**Arquivos previstos:** `Docs/**` (novo, apenas paths `MISSING`), `docs/sessions/session_13_.../validacao_bloco_02_stable_host_collision_scaffold.md` (novo). `node_modules/ddae-engine/` é local/efêmero — nunca commitado (já coberto por `.gitignore`).

**Dependências:** Bloco 01.1 (contrato corrigido e estratégia).

**Critérios de aceite:**
- Stable host instalado, verificado fisicamente, `package.json`/`package-lock.json`/`dependencies` comprovadamente inalterados (hash antes/depois).
- Matriz de colisão completa produzida e revisada antes de qualquer cópia.
- Nenhum arquivo já existente no repositório é sobrescrito.
- `docs/sessions/` e `feedback/` permanecem byte-a-byte idênticos (diff vazio nesses paths).
- Total gerado / `MISSING` / `IDENTICAL` / `CONFLICT` registrados na validação.
- Isolamento de pacote reconfirmado com o scaffold real já existente.

**Testes:** `npm test`/`package:check`/`smoke` continuam verdes (nenhuma mudança de código de produto).

**Definição de pronto:** stable host instalado e comprovadamente isolado do package metadata, scaffold mesclado com segurança, matriz de colisão documentada, nenhuma sobrescrita, gates verdes.

**Resultado:** Bloco concluído. `ddae-engine@0.2.0` instalado (`added 1 package in 765ms`), hash de `package.json` idêntico antes/depois, `package-lock.json` ausente, `dependencies`/`devDependencies` `{}`. Matriz de colisão: 50 gerados, 50 `MISSING`, 0 `IDENTICAL`, 0 `CONFLICT` — merge completo dos 50 sem risco. `docs/sessions/`/`feedback/` confirmados intocados. `npm pack --dry-run --json` pós-scaffold: 95 arquivos, zero vazamento de `Docs/`/`docs/`/`node_modules/`. Gates: 67/65/0/2, `package:check` OK 95 arquivos, `[DDAE smoke] OK`. Detalhe completo em `validacao_bloco_02_stable_host_collision_scaffold.md`.

---

### Bloco 03 — Canonical Self-Host Session Bootstrap

**Objetivo:** criar a primeira sessão canônica de self-hosting.

**Escopo:** `node node_modules/ddae-engine/bin/ddae-engine.js session create "DDAE self hosting bootstrap" --dir .` (stable host, nunca o candidate) → `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/`, com os 13 módulos oficiais. Documentar dentro dessa sessão a transição (objetivo, host/candidate, baseline de migração, planos de controle legacy vs. canônico, princípios).

**Fora de escopo:** preencher o conteúdo funcional dos 13 módulos além do registro da transição — isso é trabalho de desenvolvimento contínuo, não deste bootstrap.

**Arquivos previstos:** `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/**` (novo).

**Dependências:** Bloco 02 (`Docs/05_sessions/` precisa existir).

**Critérios de aceite:**
- `session create` numera a partir de `session_01` (não `session_12`, não uma continuação da numeração legacy).
- 13 módulos oficiais presentes.
- README da sessão documenta explicitamente a transição.

**Testes:** `npm test`/`package:check`/`smoke` continuam verdes.

**Definição de pronto:** sessão canônica criada, documentada, gates verdes.

**Resultado:** Bloco concluído. `session_01_ddae_self_hosting_bootstrap` criada exclusivamente pelo Stable Host, 13 módulos, 21 arquivos. Roadmap oficial (`0.2.0` released, `0.3.0` in development, `0.4.0` planned) persistido em `Docs/01_product/`. `docs/sessions/` intocado. Gates 67/65/0/2, `package:check` 95 arquivos, `[DDAE smoke] OK`. Achado registrado (não corrigido neste bloco): `PROJECT_NAME` incorreto em ~44 arquivos do scaffold do Bloco 02. Detalhe completo em `validacao_bloco_03_canonical_self_host_session.md`.

---

### Bloco 04 — Self-Hosting Validation Proof + Project Identity Normalization

**Objetivo:** provar que o próprio DDAE Engine reconhece o repositório como um projeto DDAE consumidor válido, e corrigir a pendência de identidade temporária identificada no Bloco 03.

**Escopo:** `node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .` e `... audit --dir .` (stable host) executados **antes** de qualquer edição, para evidência factual do estado bruto; localização de todas as ocorrências de `ddae-self-host-scaffold` no scaffold canônico (excluindo `docs/sessions/` legacy); normalização mecânica exclusiva do cabeçalho de identidade; `validate`/`audit` executados novamente **depois**, para comparação. Nenhuma correção cosmética para "maquiar" o resultado — se houver erro estrutural, ele é diagnosticado e resolvido de forma justificada, não escondido.

**Fora de escopo:** qualquer nova capability de CLI; qualquer alteração em `src/templates/` (mesmo que um bug real de template seja encontrado — registrado como pendência, não corrigido aqui).

**Arquivos previstos:** os 43 arquivos do scaffold canônico com o cabeçalho de identidade a corrigir; evidência dentro de `Docs/05_sessions/session_01_.../09_validation/fechamento_sessao.md`; validação da própria sessão legacy de transição.

**Dependências:** Bloco 03 (precisa de ao menos uma sessão real para `Sessions found >= 1`).

**Critérios de aceite:**
- `validate` reporta `Status: OK` ou, se `FAILED`, o motivo é diagnosticado e resolvido nesse mesmo bloco.
- `audit` reconhece `session_01_ddae_self_hosting_bootstrap` como sessão real, não como módulo.
- Warnings de conteúdo ainda não preenchido são aceitáveis; erros estruturais não.
- Identidade temporária (`ddae-self-host-scaffold`) removida do scaffold canônico, preservada no histórico legacy.

**Testes:** a própria execução de `validate`/`audit` (antes e depois) é a evidência.

**Definição de pronto:** `validate`/`audit` executados com sucesso estrutural contra o próprio repositório, identidade normalizada, gates verdes.

**Resultado:** Bloco concluído. `validate`/`audit` idênticos antes/depois (`Status: OK`, 0 erros em ambos) — não havia erro estrutural a corrigir; a normalização foi puramente semântica. 43 arquivos corrigidos (diff de 43 linhas). Achado real não corrigido: bug de template-fonte em `glossario.md` (`{{PROJECT_NAME}}`/`{{CURRENT_DATE}}` renderizados em vez de documentados literalmente) — afeta todo `ddae-engine init`, registrado como pendência para sessão futura. Gates 67/65/0/2, `package:check` 95 arquivos, `[DDAE smoke] OK`. Detalhe completo em `validacao_bloco_04_self_host_validation.md`.

---

### Bloco 05 — Self-Hosting Closure + Package Isolation Contract

**Objetivo:** reconfirmar isolamento de pacote com o scaffold real já existente, e documentar o contrato de execução self-host para uso contínuo.

**Escopo:** `npm pack --dry-run --json` real (pós-scaffold) confirmando zero arquivos `Docs/`/`docs/`/`node_modules/` no pacote. Criar `Docs/00_ddae_engine/self_hosting.md` (ou path equivalente do scaffold oficial) documentando: comando do stable host (`node node_modules/ddae-engine/bin/ddae-engine.js <comando>`) vs. comando do candidate (`node bin/ddae-engine.js <comando>`), o que é self-hosting, o que não é, e a condição explícita de quando o candidate deve passar a ser usado para self-hosting (quando uma release publicada mais nova já incluir as capabilities em desenvolvimento).

**Fora de escopo:** qualquer ferramenta ou automação nova.

**Arquivos previstos:** `Docs/00_ddae_engine/self_hosting.md` (novo, dentro do scaffold já mesclado no Bloco 02).

**Dependências:** Blocos 02–04.

**Critérios de aceite:**
- `npm pack --dry-run --json` real confirma zero arquivos `Docs/`/`docs/`.
- Documentação de self-hosting criada e revisada.
- Decisão sobre retomada do Bloco 03 da Session 12 (Context Compiler) registrada explicitamente — dentro de `Docs/05_sessions/` como nova sessão canônica, ou continuando em `docs/sessions/session_12_.../` — antes do encerramento formal da Session 13.

**Testes:** `npm test`/`package:check`/`smoke` finais.

**Definição de pronto:** isolamento reconfirmado, documentação criada, decisão sobre a continuidade do Context Compiler registrada, Session 13 pronta para ser encerrada.

**Resultado:** Bloco concluído. Instância de `glossario.md` corrigida (BUG-01 registrado em `07_bugs/bugs_identificados.md`, fonte deliberadamente não alterada). `Docs/00_ddae_engine/self_hosting.md` criado com o contrato operacional completo, incluindo o modelo de promoção Stable → Candidate. Continuidade do Context Compiler decidida e registrada: `session_02_context_compiler_0_3_0` (canônica, ainda não criada), nunca mais em `docs/sessions/`. `session_01_ddae_self_hosting_bootstrap` fechada como Aprovada com ressalvas. Isolamento de pacote reconfirmado uma última vez (95 arquivos). Gates finais 67/65/0/2, `package:check` 95 arquivos, `[DDAE smoke] OK`. **Session 13 CONCLUÍDA.** Detalhe completo em `validacao_bloco_05_self_host_closure.md`.

---

## Encerramento da Session 13

Com a aprovação do Bloco 05, `session_13_ddae_self_hosting_bootstrap` está formalmente **CONCLUÍDA**. Todos os 6 blocos/checkpoints (01, 01.1, 02, 03, 04, 05) foram aprovados. `docs/sessions/` não recebe mais sessões de desenvolvimento novas a partir deste ponto — o control plane canônico é `Docs/05_sessions/`, e a próxima sessão de desenvolvimento (`session_02_context_compiler_0_3_0`) nasce lá, criada pelo Stable Host.

## 5. Estratégia de testes (visão geral)

Nenhum bloco desta sessão altera `src/`, `test/`, ou `scripts/` — portanto a suíte de testes (67 testes desde a Session 12) não ganha novos casos por causa desta sessão. A regressão em cada bloco é confirmada rodando a suíte existente sem alteração, garantindo que o bootstrap de self-hosting não introduz nenhuma quebra no candidate.

## 6. Estratégia de compatibilidade

Nenhum comando existente muda de comportamento. O scaffold `Docs/` é aditivo. `docs/sessions/` permanece intocado. `package.json` permanece inalterado durante toda a sessão.

## 7. Estratégia de release

Esta sessão não publica nada. `package.json.version`, `EXPECTED_VERSION`, e a tag `v0.2.0` permanecem inalterados do início ao fim.
