# Feedback — Bloco 08: Sensitive Data Guard and Safe Source Ingestion

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Resumo Executivo

Implementado `src/context/sensitive-files.js` — a fronteira de segurança que permite ao Context Compiler sair do Safe Structural Mode (Bloco 07) e ingerir conteúdo textual real do projeto. É o único lugar de todo o Context Compiler que lê conteúdo de arquivo arbitrário: `collectSafeProjectSources(projectRoot)` faz um traversal recursivo determinístico, aplicando um pipeline único (`inspectPath`) que decide, para cada arquivo, se é seguro ingerir — deny list por nome (case-insensitive, aplicada antes de qualquer leitura de conteúdo), diretórios nunca percorridos (`.git/`, `.ddae/`, `node_modules/`, `dist/`, `build/`, `coverage/`, `vendor/` — proteção explícita contra `.ddae/context/` realimentar um próximo build), symlink nunca seguido (fail-closed, arquivo ou diretório), limite de tamanho verificado via `stat` antes de qualquer leitura, detecção de binário via byte NUL antes de qualquer interpretação como texto, e heurística de conteúdo sensível (`PRIVATE KEY`, `API_KEY=`, `TOKEN=`, `PASSWORD=`, `SECRET=`) que exclui o arquivo inteiro — nunca reaproveita ou redige conteúdo. `readSafeProjectSource`/`collectSafeCurrentSourceHashes` reaproveitam o mesmo pipeline para a releitura de frescor em `context validate`, garantindo que build-time e validate-time nunca divirjam sobre o que é seguro. O Manifest v1 passou a suportar dois shapes de `excluded_sources` — exclusão de relevância (já existente, com `source_id`) e exclusão de segurança (nova, `{path, reason}`, sem `source_id`, sem conteúdo) — com ajustes mínimos em `context-schema.js`, `renderer.js` e `compiler.js`. `context build` agora ingere candidatos reais; `context validate` releem apenas via o Guard. 44 testes novos, todos passando. Provado em consumidor TEMP real com segredo sentinela: zero vazamento em `manifest.json`/`CONTEXT.md`/`validation.json`/stdout/stderr, em qualquer um dos três comandos. Prova self-host contra o próprio repositório DDAE-Engine (read-only, sem escrever `.ddae/`): 300 fontes seguras, 7 exclusões de segurança legítimas e esperadas (arquivos que literalmente contêm os padrões de detecção como texto documentado ou fixture de teste), determinístico, zero vazamento de marcador sensível. CI técnica 5/5 na primeira tentativa. Bloco concluído conforme escopo.

## 2. Objetivo do Bloco

Implementar a fronteira de segurança que permite ao Context Compiler sair do Safe Structural Mode e ingerir conteúdo textual real, com política fail-closed centralizada — nenhum conteúdo chega a `createSource`/Manifest/`CONTEXT.md` sem passar pelo Guard. Ver `05_blocks/bloco_08_sensitive_data_guard_and_safe_source_ingestion.md`.

## 3. Escopo Implementado

Exatamente o escopo planejado, sem divergência: `sensitive-files.js` completo (deny list, diretórios ignorados, symlink fail-closed, limite de tamanho, detecção de binário, heurística de conteúdo, classificação por path), suporte dual-shape de `excluded_sources` em schema/renderer/compiler, integração real em `context build`/`context validate`, e os testes correspondentes. Nenhum Sensitive Data Guard "parcial" foi deixado — a política é centralizada em um único módulo, reaproveitada tanto na ingestão inicial quanto na releitura de frescor. `authority.js`, `relevance.js`, os três coletores, `src/cli.js`, `src/templates/` e `scripts/release/verify-package.mjs` não foram alterados.

## 4. Arquivos Criados

- `src/context/sensitive-files.js`
- `test/context-sensitive-guard.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_08_sensitive_data_guard_and_safe_source_ingestion.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_08_sensitive_data_guard_and_safe_source_ingestion.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_08_sensitive_data_guard_and_safe_source_ingestion.md` (este arquivo)

## 5. Arquivos Alterados

- `src/schemas/context-schema.js` — `checkExcludedSources` substitui o `checkReferenceList` genérico para esse campo, aceitando o shape de segurança (`{path, reason}`, sem `source_id`) além do shape de relevância já existente, e rejeitando explicitamente qualquer campo `content`/`value`/`snippet`/`match`/`secret` em uma exclusão de segurança.
- `src/context/renderer.js` — `renderExcludedSources` distingue os dois shapes pela presença de `source_id`, renderizando a exclusão de segurança apenas com `path`/`reason`.
- `src/context/compiler.js` — `compileContext` aceita `input.securityExclusions` (dados já preparados pelo Guard, nunca I/O no Compiler), ordenadas deterministicamente por `path`/`reason` e compostas junto às exclusões de relevância.
- `src/commands/context.js` — `contextBuildCommand` usa `collectSafeProjectSources` para ingestão real (removido o modo estrutural e seu aviso transitório); o receipt de validação agora é o resultado real de `validateContextState` (nunca mais um `{status: 'VALID'}` hardcoded), usando os hashes já computados pelo Guard, sem segunda leitura. `contextValidateCommand` usa `collectSafeCurrentSourceHashes` para releitura guardada de frescor, nunca `fs.readFileSync` direto de `source.path`.
- `test/context-manifest.test.js`, `test/context-renderer.test.js`, `test/context-compiler.test.js` — testes de forma dupla para `excluded_sources`.
- `test/cli-context.test.js` — os testes que assumiam modo estrutural (fixação de "zero relevant_files"/"warning de modo estrutural") foram atualizados para a nova realidade de ingestão real; novos testes E2E de vazamento de segredo, frescor guardado, determinismo com ingestão real, e regressão de Markdown injection.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
node node_modules/ddae-engine/bin/ddae-engine.js block create "Sensitive Data Guard and Safe Source Ingestion" --session session_02_context_compiler_0_3_0 --dir .
node node_modules/ddae-engine/bin/ddae-engine.js prompt create --block bloco_08_sensitive_data_guard_and_safe_source_ingestion --session session_02_context_compiler_0_3_0 --dir .
node --test test/context-sensitive-guard.test.js test/context-manifest.test.js test/context-renderer.test.js test/context-compiler.test.js test/cli-context.test.js
npm test
npm run package:check
npm run smoke
node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
node node_modules/ddae-engine/bin/ddae-engine.js audit --dir .
node node_modules/ddae-engine/bin/ddae-engine.js feedback create --block bloco_08_sensitive_data_guard_and_safe_source_ingestion --session session_02_context_compiler_0_3_0 --dir .
```

## 8. Testes Realizados

- `test/context-sensitive-guard.test.js` — 29 testes cobrindo: coleta em root válido/inexistente, determinismo independente da ordem de criação no filesystem, paths sempre relativos com `/`, os 7 diretórios ignorados nunca percorridos, deny list por nome (`.env`/`.env.*`/`*.pem`/`*.key`/`id_rsa`/`id_ed25519`/`.npmrc`/`credentials*`/`secrets*`/`*.p12`/`*.pfx`), os 5 padrões de conteúdo sensível (case-insensitive, espaço opcional ao redor de `=`), ausência total de conteúdo/valor sensível no registro de exclusão, ingestão segura de arquivo textual, normalização CRLF→LF com `content_hash` consistente, detecção de binário (NUL byte) sem nunca retornar o conteúdo binário, limite de tamanho sem leitura integral, política fail-closed de symlink (arquivo/diretório/escape, com capability-skip explícito quando o privilégio não está disponível), rejeição de path fora da raiz/`../`/absoluto em `readSafeProjectSource`, `deepEqual` em coletas repetidas, classificação por path (arquitetura/decisão/bug/validação/código-fonte/metadados/documentação, incluindo o caso `test/foo.test.js` → `source_code`, nunca `test_result` automaticamente), verificação estrutural (zero NLP/rede/LLM/embeddings/`child_process`/`eval`), conteúdo tratado como dado puro, `.ddae/context/` nunca visitado (mesmo contendo um build anterior), ausência de qualquer escrita, forma exata `{path, reason}` para exclusão de segurança, e vazamento zero de um segredo sentinela em uma árvore multi-arquivo realista — 29 pass, 0 fail.
- Testes de forma dupla — 3 em `context-manifest.test.js` (exclusão de relevância continua válida; exclusão de segurança `{path, reason}` válida; exclusão de segurança carregando `content`/`value`/`snippet`/`match`/`secret` rejeitada, mais dois testes de path inválido/campos ausentes), 3 em `context-renderer.test.js` (renderização apenas com `path`/`reason`; nunca lança mesmo com zero sources; nunca vaza para Out of Scope), 3 em `context-compiler.test.js` (security exclusions nunca viram Source; coexistência determinística com exclusões de relevância; Compiler continua sem `node:fs`) — todos pass.
- `test/cli-context.test.js` — 5 testes reescritos para a nova realidade de ingestão real (antes assumiam modo estrutural) mais 5 testes E2E novos: vazamento zero de segredo sentinela através de `manifest.json`/`CONTEXT.md`/`validation.json`/stdout/stderr nos três comandos; frescor guardado ponta a ponta (`VALID` → source alterado → `STALE` → source vira conteúdo sensível → nunca `VALID`, nunca vazamento do sentinela); determinismo byte-a-byte com ingestão real; regressão de Markdown injection com ingestão real (conteúdo Docs/ legítimo contém seus próprios sub-headings `##`, então a prova verifica que as dez seções fixas aparecem na ordem correta como subsequência, não que `##` nunca apareça em outro lugar — ajuste de metodologia de teste, não do Renderer, que já tinha essa proteção comprovada no Bloco 06 com fixture controlada) — todos pass.
- Prova self-host (script ad-hoc, não persistido no repositório, `collectSafeProjectSources` chamado diretamente contra o próprio checkout, sem nunca escrever `.ddae/`): 307 arquivos considerados, 300 candidatos seguros, 7 exclusões de segurança — todas por `sensitive_content`, e todas legítimas (o próprio `sensitive-files.js`, que contém os padrões de detecção como literais de regex; o contrato do Manifest v1 e o plano do Bloco 12, que documentam os padrões como exemplo; os arquivos de teste que usam `API_KEY=`/`PASSWORD=` como fixture; e o próprio bloco/prompt deste checkpoint, que cita os padrões). Determinismo confirmado (duas coletas independentes `deepEqual`). Nenhum dos 5 marcadores sensíveis (`PRIVATE KEY`, `API_KEY=`, `PASSWORD=`, `SECRET=`, `TOKEN=`) aparece na saída serializada.

## 9. Validações Executadas

- `npm test` — 412 testes, 409 pass, 0 fail, 3 skip (368 pré-existentes + 44 novos).
- `npm run package:check` — `OK`, 106 arquivos (105 → 106, exatamente pelo novo `src/context/sensitive-files.js`, variação explicada, não forçada).
- `npm run smoke` — `[DDAE smoke] OK`.
- `ddae-engine validate --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`.
- `ddae-engine audit --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`, `Warnings: 8` (7 quality gates pendentes de conteúdo, pré-existentes, mais 1 aviso legítimo de bloco sem feedback, capturado antes deste próprio feedback existir).
- CI remota: commit técnico `4bbb759c277c4562e080ed1072eb2ac32fa46b23`, run `31301941179`, `success`, 5/5 na primeira tentativa (`ubuntu-latest / Node 22`, `ubuntu-latest / Node 24`, `ubuntu-latest / Node 26`, `windows-latest / Node 24`, `macos-latest / Node 24`), incluindo o step de prova do Stable Host continuando verde nos 5 ambientes.

## 10. Decisões Técnicas

- **Pipeline único (`inspectPath`) reaproveitado tanto pelo traversal (`collectSafeProjectSources`) quanto pela releitura pontual (`readSafeProjectSource`)** — decisão central do bloco: garante que a política de segurança usada no `context build` (ingestão inicial) e no `context validate` (verificação de frescor) nunca possam divergir, porque são literalmente a mesma função.
- **`excluded_sources` ganhou um segundo shape discriminado pela ausência de `source_id`, nunca um campo discriminador separado** — uma exclusão de segurança nunca teve um `source_id` para começo de conversa (o arquivo nunca virou `Source`), então a ausência do campo já é o discriminador natural, sem necessidade de um campo extra como `type: 'security'`.
- **`context build` monta o receipt de `validation.json` chamando o próprio `validateContextState` real, em vez de um objeto hardcoded** — antes (Bloco 07, modo estrutural), o receipt era sempre `{status: 'VALID', reasons: []}` porque não havia nada para verificar; agora que há conteúdo real, usar a verificação real é mais honesto e captura automaticamente qualquer inconsistência introduzida durante o próprio build, sem duplicar lógica de validação.
- **`MAX_SOURCE_BYTES = 262144` (256 KiB) validado contra os arquivos de texto reais do próprio projeto antes de ser fixado** — o maior arquivo de texto legítimo do repositório tem ~23 KB; 256 KiB é generoso (11x) sem abrir a porta para arquivos anormalmente grandes consumirem o budget de contexto.
- **Extensão desconhecida nunca gera uma entrada em `excluded_sources`** — apenas arquivos textuais reconhecidos entram no universo de candidatos; um arquivo `.zip`/`.png`/etc. é silenciosamente ignorado, para não poluir a lista de exclusões com centenas de entradas de arquivos que nunca seriam considerados de qualquer forma.
- **Classificação de `Source` por `Docs/**` primeiro, extensão de código depois** — garante que `test/foo.test.js` seja classificado como `source_code`/`runtime_metadata` (é código, não é evidência formal de que um teste passou), e que apenas conteúdo formalmente sob `Docs/05_sessions/*/09_validation/` seja `validation`/`test_result` — sem inferir por nome de arquivo ("contém a palavra test") em lugar nenhum.

## 11. Problemas Encontrados

Três ajustes de teste (nunca de código de produção) durante a escrita da suíte de integração de CLI, todos causados pela mudança real de comportamento (ingestão passou a ser real) ou por metodologia de teste imprecisa:
1. Os testes #31/#32 pré-existentes ("nenhum timestamp"/"nenhum path absoluto" em qualquer lugar do arquivo) começaram a falhar porque, com ingestão real, conteúdo legítimo ingerido (o próprio `ddae-engine.config.json`, que tem um campo `createdAt` real) passou a aparecer no Manifest — correto e esperado. Corrigido para verificar a propriedade real (nenhum campo canônico do Manifest é um timestamp; nenhum `path` do Manifest é absoluto; o path do projeto TEMP nunca vaza), não mais uma regex cega sobre o arquivo inteiro.
2. Um teste próprio (Bloco 08, 34-36) usava um fixture `SECRET.env` que não corresponde à convenção real de nome de dotfile de ambiente (`.env`, `.env.*`) nem à extensão reconhecida como texto — corrigido para usar `.env` (nome de dotfile real), que é o caso que a deny list por nome realmente cobre.
3. Um teste próprio de regressão de Markdown injection extraía cegamente toda linha `## ` do `CONTEXT.md` esperando exatamente 10 — com ingestão real, conteúdo Docs/ legítimo contém seus próprios sub-headings `##` dentro do bloco fenced, o que é correto e seguro (a proteção do Renderer, já comprovada com fixture controlada no Bloco 06, continua intacta), mas invalidava a contagem cega do teste. Corrigido para verificar que as dez seções fixas aparecem, em ordem, como subsequência do documento — a propriedade que realmente importa.

## 12. Correções Aplicadas Durante o Bloco

Ver Seção 11 — todas em arquivos de teste (`test/cli-context.test.js`), nunca em `src/context/sensitive-files.js`, `compiler.js`, `renderer.js`, `context-schema.js`, ou `commands/context.js`.

## 13. Pendências

### P1 — Crítica

Nenhuma.

### P2 — Importante

Nenhuma.

### P3 — Melhoria Recomendada

- BUG-01 (template do glossário, herdado do Bloco 01 desta sessão) continua aberto — alvo de bloco futuro desta mesma sessão.

### P4 — Opcional

- A heurística de conteúdo sensível é deliberadamente conservadora — a prova self-host excluiu 7 arquivos legítimos do próprio DDAE (documentação de contrato, fixtures de teste, o próprio código do Guard) por conterem os padrões de detecção como texto/regex/fixture, não como segredo real. Comportamento aceito e documentado: segurança vence recall nesta versão (Seção 40 do prompt do bloco).

## 14. Riscos Restantes

Nenhum novo além do já registrado no bloco (Seção 14 de `05_blocks/bloco_08_sensitive_data_guard_and_safe_source_ingestion.md`). BUG-01 permanece aberto, P3, não relacionado a este bloco.

## 15. Evidências

```text
Self-host proof (execução direta contra o próprio repositório, read-only):
files considered: 307
safe candidates: 300
security exclusions: 7 (todas sensitive_content, todas legítimas — regex/fixture/contrato citando os padrões)
elapsed: ~200ms
deepEqual (duas coletas independentes): true
.ddae/ ausente do repo após a prova: true
marcadores sensíveis na saída serializada: PRIVATE KEY=false, API_KEY==false, PASSWORD==false, SECRET==false, TOKEN==false

E2E sentinel leak proof (consumidor TEMP real, via binário Candidate):
build exit: 0
manifest.json sentinel leak: false
CONTEXT.md sentinel leak: false
validation.json sentinel leak: false
stdout sentinel leak: false
stderr sentinel leak: false
show sentinel leak: false
validate sentinel leak: false
excluded_sources: config/.env (sensitive_name), config/hidden-secret.txt (sensitive_content)

E2E guarded freshness proof:
build → validate: VALID
source content changed → validate: STALE (SOURCE_CONTENT_CHANGED)
source becomes sensitive → validate: never VALID, never leaks sentinel

npm test: 412 tests, 409 pass, 0 fail, 3 skip
npm run package:check: OK, 106 files
npm run smoke: [DDAE smoke] OK
stable host validate: Status OK, Sessions found 2, Errors 0
stable host audit: Status OK, Sessions found 2, Errors 0, Warnings 8 (pré-existentes)

Technical commit: 4bbb759c277c4562e080ed1072eb2ac32fa46b23
Technical CI: 31301941179 — success, 5/5 (primeira tentativa)
  ubuntu-latest / Node 22: success
  ubuntu-latest / Node 24: success
  ubuntu-latest / Node 26: success
  windows-latest / Node 24: success
  macos-latest / Node 24: success
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Bloco 09 — Real Consumer Smoke / Agent Workflow.

## 18. Commit Semântico Sugerido

```
feat(context): add sensitive data guard
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
