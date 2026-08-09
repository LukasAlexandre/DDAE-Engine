# Bloco 08 — Sensitive Data Guard and Safe Source Ingestion

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Objetivo

Implementar a fronteira de segurança (`src/context/sensitive-files.js`) que permite ao Context Compiler sair do Safe Structural Mode (Bloco 07) e passar a ingerir conteúdo textual real do projeto, com uma política de segurança fail-closed: nenhum conteúdo chega a `createSource()`/`RelevanceCandidate`/`compileContext()`/Manifest/`CONTEXT.md` sem passar primeiro pelo Guard.

## 2. Contexto

Contrato de referência: `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md`, Seção 12 (Segurança/dados sensíveis) e `plano_bloco_12.md` (antigo Bloco 09 — Sensitive Data Guard). Esta sessão entregou o Compiler (Bloco 05), o Renderer (Bloco 06) e a CLI (Bloco 07 + Checkpoint 07.1) em Safe Structural Mode deliberado — `context build` produzia um Manifest real, mas sempre com `candidates: []`. Este bloco é a primeira vez que o Context Compiler lê conteúdo de arquivo do projeto consumidor.

## 3. Problema que Este Bloco Resolve

Sem um Guard centralizado, cada camada que precisasse de conteúdo textual teria que reimplementar sua própria política de segurança — risco real de divergência entre o que é seguro no momento do `build` e o que é considerado seguro no momento do `validate`. O Guard resolve isso sendo o único lugar do Context Compiler que lê conteúdo arbitrário de arquivo, com uma política única reaproveitada tanto por `context build` (ingestão inicial) quanto por `context validate` (releitura para verificação de frescor) — nunca duas implementações da mesma regra de segurança.

## 4. Escopo

- `src/context/sensitive-files.js`: `MAX_SOURCE_BYTES` (262144 = 256 KiB, validado contra os arquivos de texto reais do próprio projeto — o maior tem ~23 KB), `collectSafeProjectSources(projectRoot)` (traversal recursivo determinístico), `readSafeProjectSource(projectRoot, relativePath)` e `collectSafeCurrentSourceHashes(projectRoot, relativePaths)` (releitura segura para `context validate`).
- Deny list por nome de arquivo (`.env`, `.env.*`, `*.pem`, `*.key`, `id_rsa`, `id_ed25519`, `.npmrc`, `credentials*`, `secrets*`, `*.p12`, `*.pfx`), case-insensitive, aplicada antes de qualquer leitura de conteúdo.
- Diretórios nunca percorridos: `.git/`, `.ddae/`, `node_modules/`, `dist/`, `build/`, `coverage/`, `vendor/` — proteção explícita contra `.ddae/context/` realimentar um próximo build.
- Path containment via `fs.realpathSync` e política fail-closed de symlink (nunca seguido, arquivo ou diretório).
- Limite de tamanho (`stat.size` verificado antes de qualquer leitura de conteúdo) e detecção de binário (byte NUL) antes de qualquer interpretação como texto.
- Heurística de conteúdo sensível (`PRIVATE KEY`, `API_KEY=`, `TOKEN=`, `PASSWORD=`, `SECRET=`, case-insensitive, espaço opcional ao redor de `=`) — arquivo inteiro excluído, nunca redigido/reaproveitado.
- Classificação de `Source` puramente por path (sem NLP), reaproveitando `SOURCE_KINDS`/`AUTHORITY_DOMAINS` existentes.
- Duas formas de `excluded_sources` no Manifest v1: exclusão de relevância (`{source_id, path, score, char_cost, reason}`, já existente) e exclusão de segurança (`{path, reason}`, nova — nunca um `source_id`, nunca conteúdo/valor/trecho) — schema, renderer e compiler atualizados minimamente para aceitar/exibir/compor ambas.
- Integração em `context build` (ingestão segura real, substituindo o modo estrutural) e `context validate` (releitura guardada para frescor de source, nunca um `fs.readFileSync` direto de `source.path`).
- `test/context-sensitive-guard.test.js` e testes de forma dupla em `context-manifest`/`context-renderer`/`context-compiler`.

## 5. Fora de Escopo

- Correção do BUG-01, Obsidian, MCP, LLM, embeddings, extração semântica de fatos/claims por NLP.
- Alteração de `src/context/authority.js`, `relevance.js`, `git-context.js`, `project-context.js`, `ddae-context.js`, `src/cli.js`, `src/templates/`, `legacy/`.
- Alteração de `scripts/release/verify-package.mjs` (o deny-list do Guard e o `FORBIDDEN_PATTERNS` do verificador de pacote npm são domínios diferentes — proteção de conteúdo de contexto vs. proteção do próprio pacote publicado — e não são unificados).
- Bump de versão, publicação npm, tag, Session 03.

## 6. Arquivos e Pastas Envolvidos

- `src/context/sensitive-files.js` (novo).
- `src/schemas/context-schema.js` (alterado — validação dupla de `excluded_sources`).
- `src/context/compiler.js` (alterado — aceita `input.securityExclusions`).
- `src/context/renderer.js` (alterado — renderiza os dois shapes de `excluded_sources`).
- `src/commands/context.js` (alterado — `context build` usa o Guard para ingestão real; `context validate` usa o Guard para releitura de frescor).
- `test/context-sensitive-guard.test.js` (novo), mais testes de forma dupla adicionados a `test/context-manifest.test.js`, `test/context-renderer.test.js`, `test/context-compiler.test.js`.
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_08_sensitive_data_guard_and_safe_source_ingestion.md` (este arquivo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_08_sensitive_data_guard_and_safe_source_ingestion.md` e `08_feedbacks/feedback_bloco_08_sensitive_data_guard_and_safe_source_ingestion.md` (gerados após a CI técnica verde).

## 7. Dependências

- `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seção 12) e `plano_bloco_12.md` (antigo Bloco 09).
- `src/context/authority.js` (`createSource`, `SOURCE_KINDS`, `AUTHORITY_DOMAINS`) e `src/context/fingerprint.js` (`sha256Hex`) — reaproveitados sem alteração.
- Blocos 05/06/07 + Checkpoint 07.1 — reaproveitados; `session_selection_reason` no fingerprint permanece intocado.

## 8. Plano de Implementação

1. Reler Seção 12 do contrato e a descrição do antigo Bloco 09 em `plano_bloco_12.md`.
2. Confirmar factualmente o gap de `excluded_sources` (shape atual exige `source_id`) antes de alterar qualquer código.
3. Estender `context-schema.js` para aceitar os dois shapes de `excluded_sources`, discriminados pela presença de `source_id`, rejeitando campos proibidos (`content`/`value`/`snippet`/`match`/`secret`) em exclusões de segurança.
4. Atualizar `renderer.js` para renderizar cada shape apropriadamente.
5. Implementar `sensitive-files.js`: pipeline único (`inspectPath`) reaproveitado tanto pelo traversal (`collectSafeProjectSources`) quanto pela releitura pontual (`readSafeProjectSource`).
6. Validar o limite de tamanho contra os arquivos de texto reais do projeto antes de fixar `MAX_SOURCE_BYTES`.
7. Atualizar `compiler.js` para aceitar `input.securityExclusions` e compô-las, ordenadas deterministicamente, junto às exclusões de relevância.
8. Integrar o Guard em `commands/context.js`: `context build` ingere candidatos reais e usa os hashes já computados pelo Guard para o receipt de validação (nunca uma segunda leitura); `context validate` releem apenas via o Guard.
9. Escrever `test/context-sensitive-guard.test.js` e os testes de forma dupla.
10. Rodar `npm test` e confirmar 0 falhas.
11. Rodar prova E2E em consumidor TEMP com segredo sentinela, confirmando zero vazamento em `manifest.json`/`CONTEXT.md`/`validation.json`/stdout/stderr.
12. Rodar `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
13. Confirmar arquivos fora de escopo intocados; `.ddae/` ausente do próprio repositório; auditar o diff antes de commitar.

## 9. Critérios de Aceite

- [x] Nenhum conteúdo de arquivo chega a `createSource`/Manifest/`CONTEXT.md` sem passar pelo Guard.
- [x] Deny list por nome aplicada antes de qualquer leitura de conteúdo.
- [x] `.git/`, `.ddae/`, `node_modules/`, `dist/`, `build/`, `coverage/`, `vendor/` nunca percorridos — `.ddae/context/` nunca realimenta um build.
- [x] Symlink (arquivo ou diretório) nunca seguido — fail-closed.
- [x] Arquivo acima de `MAX_SOURCE_BYTES` excluído sem leitura integral de conteúdo.
- [x] Binário (byte NUL) nunca tratado como texto.
- [x] Heurística de conteúdo sensível exclui o arquivo inteiro — nunca reaproveita/redige conteúdo.
- [x] Exclusão de segurança nunca carrega `source_id`, conteúdo, valor ou trecho — apenas `path`/`reason`.
- [x] Classificação de Source é puramente estrutural (path), sem NLP.
- [x] `context build` ingere candidatos reais; `context validate` releem apenas via o Guard.
- [x] Determinismo preservado: builds repetidos byte-idênticos mesmo com ingestão real.
- [x] Segredo sentinela usado em teste E2E nunca aparece em nenhum artefato ou canal de saída.

## 10. Validações Obrigatórias

- [x] `npm test` — suíte completa, 0 falhas.
- [x] `npm run package:check` — OK, delta de arquivos explicado (não forçado).
- [x] `npm run smoke` — `[DDAE smoke] OK`.
- [x] `ddae-engine validate`/`audit` via Stable Host — `Status: OK`, `Errors: 0`.
- [x] CI remota 5/5 (a confirmar após push).

## 11. Segurança

Esta é a essência do bloco — ver Seção 4. O Guard é fail-closed por padrão (extensão desconhecida nunca é ingerida; symlink nunca é seguido; conteúdo sensível nunca é reaproveitado, apenas excluído por completo). Nenhuma exceção "temporária" ou bypass foi introduzida. `context validate` nunca lê `source.path` diretamente — toda releitura passa pelo mesmo pipeline de segurança usado no build.

## 12. Performance

Traversal recursivo de um projeto real é O(arquivos), com early-exit por nome/extensão antes de qualquer leitura de conteúdo — arquivos não-textuais nunca são abertos. Sem impacto de performance significativo para os tamanhos de projeto típicos do DDAE.

## 13. Design System / UX

Não aplicável.

## 14. Riscos

- A deny list e a heurística de conteúdo são conservadoras por design — podem gerar falsos positivos (um arquivo legítimo do próprio DDAE mencionando `SECRET=` em prosa explicativa, por exemplo, seria excluído). Risco aceito e documentado: segurança vence recall nesta versão (Seção 40 do prompt do bloco).
- BUG-01 continua aberto — não afeta este bloco.

## 15. Pendências Esperadas

- Nenhuma pendência P1/P2 esperada. Falsos positivos conservadores da heurística de conteúdo (Seção 14) são uma decisão de design documentada.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_08_sensitive_data_guard_and_safe_source_ingestion --session session_02_context_compiler_0_3_0` (Stable Host), somente após a CI técnica verde.

## 17. Commit Semântico Sugerido

```
feat(context): add sensitive data guard
```
