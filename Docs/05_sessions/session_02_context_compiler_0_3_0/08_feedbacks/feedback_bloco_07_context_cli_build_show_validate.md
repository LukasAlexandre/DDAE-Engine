# Feedback — Bloco 07: Context CLI build show validate

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Resumo Executivo

Implementado o primeiro caminho público, persistente, para o Context Compiler: `ddae-engine context build|show|validate`. `src/context/validator.js` é um kernel puro (`validateContextState`) que classifica um pacote já construído como `VALID`/`STALE`/`INVALID` sem nunca escrever, sem rede, sem varrer filesystem, sem abrir `source.path` por conta própria. `src/commands/context.js` implementa os três comandos: `context build` compila inteiramente em memória (Compiler + Renderer + receipt de validação) antes de tocar o filesystem, e só então escreve `.ddae/.gitignore`, `.ddae/context/manifest.json`, `.ddae/context/CONTEXT.md`, `.ddae/context/validation.json` — com containment de path e rejeição de symlink escapando o projeto; `context show` e `context validate` são estritamente read-only. Por decisão de segurança explícita do bloco, `context build` roda em **modo estrutural** — candidatos, claims e fatos textuais permanecem vazios, porque o Sensitive Data Guard que autorizaria ler conteúdo de arquivo ainda não existe; o build ainda assim produz um Manifest real (Git, projeto, sessão DDAE) e um `CONTEXT.md` legível. 59 testes novos (24 do Validator + 35 de integração de CLI), todos passando na primeira execução. Provado em um consumidor TEMP real via o binário Candidate: build/show/validate funcionando, determinismo byte-a-byte em builds repetidos, autoignorância correta de `.ddae/` em um repositório Git real sem tocar o `.gitignore` raiz, detecção de staleness por mudança de HEAD, rejeição de colisão de arquivo e de symlink escapando o projeto. O próprio checkout do DDAE-Engine permanece limpo — nenhum `.ddae/` foi deixado no repositório. CI técnica 5/5 na primeira tentativa. Bloco concluído conforme escopo.

## 2. Objetivo do Bloco

Expor o Context Compiler 0.3.0 — até aqui um kernel em memória — como capability pública via `ddae-engine context build/show/validate`, persistindo o pacote de contexto sob `.ddae/context/`, em modo estrutural seguro até o Sensitive Data Guard existir. Ver `05_blocks/bloco_07_context_cli_build_show_validate.md`.

## 3. Escopo Implementado

Exatamente o escopo planejado, sem divergência: `validator.js`, `commands/context.js`, integração em `cli.js` (reaproveitando `parseArgs`/`requireSubcommand`/`projectNameOf` já existentes, sem duplicar nenhuma lógica), modo estrutural fail-closed, containment de path/symlink, `.gitignore` self-ignore, e os dois arquivos de teste. Nenhum Sensitive Data Guard, ingestão textual ampla, ou leitura de `.env`/segredo foi implementada — permanecem fora de escopo, como planejado. `authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `renderer.js` e `context-schema.js` não foram alterados.

## 4. Arquivos Criados

- `src/context/validator.js`
- `src/commands/context.js`
- `test/context-validator.test.js`
- `test/cli-context.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_07_context_cli_build_show_validate.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_07_context_cli_build_show_validate.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_07_context_cli_build_show_validate.md` (este arquivo)

## 5. Arquivos Alterados

- `src/cli.js` — adicionado o comando `context build|show|validate` (22 linhas puramente aditivas: import, entrada no `HELP`, um novo `case 'context'`), reaproveitando `parseArgs`/`requireSubcommand` já existentes, sem alterar nenhum comando pré-existente.

Nenhum outro arquivo de produto pré-existente foi alterado. `src/context/authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `renderer.js`, `src/schemas/context-schema.js`, os três coletores e `src/templates/` permanecem intocados.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
node node_modules/ddae-engine/bin/ddae-engine.js block create "Context CLI build show validate" --session session_02_context_compiler_0_3_0 --dir .
node node_modules/ddae-engine/bin/ddae-engine.js prompt create --block bloco_07_context_cli_build_show_validate --session session_02_context_compiler_0_3_0 --dir .
node --test test/context-validator.test.js test/cli-context.test.js
npm test
npm run package:check
npm run smoke
node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
node node_modules/ddae-engine/bin/ddae-engine.js audit --dir .
node node_modules/ddae-engine/bin/ddae-engine.js feedback create --block bloco_07_context_cli_build_show_validate --session session_02_context_compiler_0_3_0 --dir .
```

## 8. Testes Realizados

- `test/context-validator.test.js` — 24 testes cobrindo: pacote válido/inconsistente/degradado → `VALID`, manifest malformado → `INVALID` (`SCHEMA_VERSION_MISMATCH` quando o campo está ausente/errado, `MANIFEST_INVALID` quando o schema falha por outro motivo), `GOAL_HASH_CHANGED`, `FINGERPRINT_MISMATCH`, `CONTEXT_MARKDOWN_MISMATCH`, Git HEAD inalterado/alterado (`VALID`/`STALE`), Git indisponível em ambos os lados nunca invalida sozinho, sessão inalterada/inexistente/superada por uma `latest_canonical` mais nova (`VALID`/`STALE` com `SESSION_SOURCE_CHANGED`), fontes textuais selecionadas sem hashes atuais seguros nunca produzem falso `VALID` (`SOURCE_FRESHNESS_UNVERIFIED`), hash atual divergente (`SOURCE_CONTENT_CHANGED`), ordem determinística de `reasons`, chamadas repetidas `deepEqual`, verificação estrutural (zero import de `node:fs`, zero acesso a filesystem/rede, nunca lê `source.path`), imutabilidade de entrada, prioridade de `INVALID` sobre `STALE`, resultado congelado — 24 pass, 0 fail.
- `test/cli-context.test.js` — 35 testes cobrindo: `--help` lista os três subcomandos, subcomando desconhecido falha, goal ausente/só-espaço falha, budget inválido falha, os 3 budgets válidos (com default `standard`), sessão explícita válida/inexistente (sem fallback silencioso, sem escrever nada em caso de falha), criação de `.ddae/.gitignore`/`manifest.json`/`CONTEXT.md`/`validation.json`, manifesto válido pelo schema, `CONTEXT.md` byte-idêntico a `renderContextMarkdown(manifest)`, shape determinístico do receipt de validação, builds repetidos byte-idênticos, `show` imprime exatamente o `CONTEXT.md` e falha claramente sem build prévio e nunca modifica o pacote, `validate` reporta `VALID` e nunca modifica o pacote, HEAD alterado → `STALE` exit 1, manifesto/`CONTEXT.md` adulterados → `INVALID` exit 1, build funciona sem Git, `.ddae/` nunca aparece como untracked em um repositório Git real, `.gitignore` raiz do consumidor nunca modificado, ausência de timestamp/path absoluto nos artefatos, build só escreve `.ddae/` no projeto (nada mais na raiz), modo estrutural seleciona zero `relevant_files` e nunca lê um arquivo `.env` sintético presente no consumidor, warning de modo estrutural presente no stdout, `sensitive-files.js` ainda não existe, ausência de LLM/embeddings/rede em `commands/context.js`, e segurança de destino de escrita: `.ddae` como arquivo, `.ddae/context` como arquivo, e symlink de `.ddae` escapando o projeto (com skip explícito por capability quando o privilégio de symlink não está disponível, nunca um falso verde) — 35 pass, 0 fail.
- Prova end-to-end em consumidor TEMP real (script ad-hoc, não persistido no repositório, usando o binário Candidate `bin/ddae-engine.js` via subprocess, nunca o próprio checkout do DDAE-Engine como destino de escrita): `init` → `git init` real → `context build --goal "Context Compiler CLI proof"` (exit 0) → `context show` (exit 0, 1136 caracteres, inicia com `"# DDAE Agent Context\n\n##"`) → `context validate` (exit 0, `Status: VALID`). Determinismo: SHA-256 dos 3 artefatos idêntico antes/depois de um segundo build sem mudança de estado (3/3). `.gitignore`: `.ddae` nunca aparece em `git status --porcelain`, aparece corretamente como `!! .ddae/` em `git status --porcelain --ignored`. TEMP consumer removido ao final; `.ddae/` confirmado ausente do próprio checkout do DDAE-Engine.

## 9. Validações Executadas

- `npm test` — 363 testes, 360 pass, 0 fail, 3 skip (304 pré-existentes + 59 novos).
- `npm run package:check` — `OK`, 105 arquivos (103 → 105, exatamente pelos dois novos arquivos de produção — `validator.js`, `commands/context.js` —, variação explicada, não forçada).
- `npm run smoke` — `[DDAE smoke] OK`.
- `ddae-engine validate --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`.
- `ddae-engine audit --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`, `Warnings: 8` (7 quality gates pendentes de conteúdo, pré-existentes, mais 1 aviso legítimo de bloco sem feedback, capturado antes deste próprio feedback existir).
- CI remota: commit técnico `4c7f1d8dab0e62ea4c51c812f513a467f9650464`, run `31296468999`, `success`, 5/5 na primeira tentativa (`ubuntu-latest / Node 22`, `ubuntu-latest / Node 24`, `ubuntu-latest / Node 26`, `windows-latest / Node 24`, `macos-latest / Node 24`), incluindo o step de prova do Stable Host continuando verde nos 5 ambientes.

## 10. Decisões Técnicas

- **`context build` roda em modo estrutural fail-closed** (candidates/claims/facts vazios): decisão central do bloco, explicitamente instruída, para não implementar um scanner de segurança improvisado dentro da CLI antes do Sensitive Data Guard existir. Testado explicitamente que um arquivo `.env` sintético colocado no consumidor nunca é lido nem vaza para `CONTEXT.md`/`manifest.json`.
- **`context build` monta tudo em memória antes de tocar o filesystem** — `compileContext`/`renderContextMarkdown` podem falhar (goal inválido, sessão explícita inexistente) sem que nenhum artefato parcial seja deixado; a escrita real só começa depois dos dois checks de segurança de destino (`.ddae`/`.ddae/context` não podem ser um arquivo nem um symlink escapando o projeto).
- **`manifest.json` e `validation.json` são serializados via `stableStringify` (reaproveitado de `fingerprint.js`, Bloco 05)**, não uma segunda lógica de serialização JSON — garante que o mesmo objeto lógico sempre produza os mesmos bytes, independente da ordem de construção das chaves.
- **`Validator` nunca importa nenhum coletor, `authority.js`, `relevance.js` ou `compiler.js`** — reconstrói a integridade interna (goal hash, fingerprint) inteiramente a partir dos campos já presentes no próprio Manifest recebido, e só compara com o "mundo atual" para o que o chamador (`context validate`) explicitamente entregou (`currentGitContext`/`currentDdaeContext`). Isso mantém o Validator testável offline, sem qualquer estado de projeto real.
- **Prioridade `INVALID > STALE`**: se o pacote falha um check de consistência interna (ex.: fingerprint adulterado), o Validator nunca reporta apenas `STALE` mesmo que o Git também tenha mudado — testado explicitamente (`INVALID always takes priority over STALE`).
- **`SOURCE_FRESHNESS_UNVERIFIED` como resposta padrão, nunca `VALID` por omissão**: se um Manifest (de um fixture ou de um futuro Bloco 08) tiver `relevant_files` selecionados mas o chamador não fornecer `currentSourceHashes`, o Validator nunca declara frescor por default — reporta `STALE` explicitamente. Isso mantém o Validator seguro por construção mesmo antes do Sensitive Data Guard existir formalmente.

## 11. Problemas Encontrados

Um único ajuste no meio da escrita dos próprios testes (nunca em código de produção): o primeiro caso de teste do Validator para "manifest malformado" usava `{ not: 'a manifest' }` esperando o código `MANIFEST_INVALID`, mas esse objeto não tem `schema_version` — o Validator corretamente reporta `SCHEMA_VERSION_MISMATCH` primeiro (comportamento pretendido: um Manifest sem `schema_version` reconhecível não deveria nem chegar à validação de schema completa). Corrigido dividindo em dois testes: um para `schema_version` ausente/incorreto (`SCHEMA_VERSION_MISMATCH`) e outro para um Manifest com `schema_version` correto mas estruturalmente inválido por outro motivo (`MANIFEST_INVALID`).

## 12. Correções Aplicadas Durante o Bloco

Ver Seção 11 — ajuste de expectativa em um teste do Validator, sem qualquer alteração em `src/context/validator.js`.

## 13. Pendências

### P1 — Crítica

Nenhuma.

### P2 — Importante

Nenhuma.

### P3 — Melhoria Recomendada

- BUG-01 (template do glossário, herdado do Bloco 01 desta sessão) continua aberto — alvo de bloco futuro desta mesma sessão.

### P4 — Opcional

- O modo estrutural de `context build` (Seção 10) é uma decisão de segurança deliberada, documentada, não uma lacuna — resolvida formalmente pelo Bloco 08 (Sensitive Data Guard + Safe Source Ingestion).

## 14. Riscos Restantes

Nenhum novo além do já registrado no bloco (Seção 14 de `05_blocks/bloco_07_context_cli_build_show_validate.md`). O valor prático imediato de `context build` fica limitado até o Bloco 08 habilitar ingestão textual segura — risco aceito, sistema permanece fail-closed no meio tempo. BUG-01 permanece aberto, P3, não relacionado a este bloco.

## 15. Evidências

```text
TEMP consumer E2E proof (via binário Candidate, subprocess real, consumidor descartável):
init: 50 file(s) created
build exit: 0 | "Context package built successfully." / "Structural context only: textual source ingestion is deferred until the Sensitive Data Guard."
show exit: 0 | length: 1136 | starts with: "# DDAE Agent Context\n\n##"
validate exit: 0 | "Status: VALID"

repeated build determinism: 3/3 artifacts byte-identical (SHA-256 comparison)

gitignore proof (repositório Git real):
.ddae untracked in `git status --porcelain`: false
`git status --porcelain --ignored`: "!! .ddae/"

self-host repo cleanliness: .ddae/ absent from the DDAE-Engine checkout itself: true

npm test: 363 tests, 360 pass, 0 fail, 3 skip
npm run package:check: OK, 105 files
npm run smoke: [DDAE smoke] OK
stable host validate: Status OK, Sessions found 2, Errors 0
stable host audit: Status OK, Sessions found 2, Errors 0, Warnings 8 (pré-existentes)

Technical commit: 4c7f1d8dab0e62ea4c51c812f513a467f9650464
Technical CI: 31296468999 — success, 5/5 (primeira tentativa)
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

Bloco 08 — Sensitive Data Guard + Safe Source Ingestion.

## 18. Commit Semântico Sugerido

```
feat(context): add context build show validate CLI
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
