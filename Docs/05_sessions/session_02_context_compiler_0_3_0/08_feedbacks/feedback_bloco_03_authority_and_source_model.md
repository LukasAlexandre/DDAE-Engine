# Feedback — Bloco 03: Authority and Source Model

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Resumo Executivo

Implementado `src/context/authority.js` — Source Model v1 (`createSource`) e Authority Model v1 (`resolveAuthorityConflict`), fiéis ao contrato registrado em `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seções 4 e 5), nunca implementado até agora. `createSource` normaliza qualquer evidência coletada em um objeto canônico (`id`, `kind`, `path`, `section`, `authority_class`, `content_hash`), sempre exigindo `domain` explícito do chamador — nunca inferido de `kind` nem de prosa. `resolveAuthorityConflict` decide, entre duas ou mais fontes conflitantes, qual prevalece usando exclusivamente a partição de domínio do contrato: `future_intent` e `history` nunca vencem uma fonte presente-autoritativa; se exatamente uma fonte for presente-autoritativa, ela vence e todas as outras são preservadas em `conflicting_sources` com `reason_superseded` categórico; se zero ou duas-ou-mais forem presente-autoritativas, o resultado é `unresolved`, `winner: null` — nunca um critério de desempate inventado. 34 testes novos, incluindo o caso nomeado JWT (histórico) vs HttpOnly (decisão atual), todos passando. Provado com Sources construídas a partir da saída real de `collectGitContext`/`collectProjectContext`/`collectDdaeContext` contra o próprio repositório self-hosted. Bloco concluído conforme escopo.

## 2. Objetivo do Bloco

Implementar o Source Model v1 e o Authority Model v1 — a camada que normaliza evidência coletada em `Source`s canônicos e resolve, por domínio de autoridade (nunca score numérico), qual fonte prevalece em um conflito. Ver `05_blocks/bloco_03_authority_and_source_model.md`.

## 3. Escopo Implementado

Exatamente o escopo planejado, sem divergência: `SOURCE_KINDS` (10 kinds oficiais), `AUTHORITY_DOMAINS` (7 domínios oficiais), `createSource()` com validação de kind/domain, rejeição de path não-relativo-ao-projeto, id determinístico, `content_hash` normalizado para LF; `resolveAuthorityConflict()` com a regra de partição de domínio, ordenação determinística por `id`, preservação de toda fonte perdedora, estado `unresolved` explícito. Nenhum código de relevância/score, Manifest, Compiler, Renderer, fingerprint ou CLI foi implementado — permanecem fora de escopo deste bloco, como planejado.

## 4. Arquivos Criados

- `src/context/authority.js`
- `test/context-authority.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_03_authority_and_source_model.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_03_authority_and_source_model.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_03_authority_and_source_model.md` (este arquivo)

## 5. Arquivos Alterados

Nenhum arquivo de produto pré-existente foi alterado — apenas arquivos novos. `src/templates/` e a instância do BUG-01 permanecem intocados.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
node node_modules/ddae-engine/bin/ddae-engine.js block create "Authority and Source Model" --session session_02_context_compiler_0_3_0 --dir .
node node_modules/ddae-engine/bin/ddae-engine.js prompt create --block bloco_03_authority_and_source_model --session session_02_context_compiler_0_3_0 --dir .
node --test test/context-authority.test.js
npm test
npm run package:check
npm run smoke
node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
node node_modules/ddae-engine/bin/ddae-engine.js audit --dir .
npm pack --dry-run --json
node node_modules/ddae-engine/bin/ddae-engine.js feedback create --block bloco_03_authority_and_source_model --session session_02_context_compiler_0_3_0 --dir .
```

## 8. Testes Realizados

- `test/context-authority.test.js` — 34 testes cobrindo: forma canônica de `createSource`, os 10 kinds e os 7 domínios oficiais, rejeição de kind/domain inválido, rejeição de path absoluto ou com barra invertida, determinismo de `id` (mesma entrada lógica → mesmo id; entrada diferente → id diferente), estabilidade de `content_hash` (incluindo normalização CRLF vs LF), ausência de campo de timestamp, resolução de conflito para cada um dos 5 domínios presente-autoritativos contra `history` (`repository_state`, `runtime_metadata`, `architecture_intent` — caso nomeado JWT vs HttpOnly —, `test_result`, `active_bug_state`), `future_intent` nunca vencendo, preservação de toda fonte perdedora com `reason_superseded`, estado `unresolved` para conflito entre duas fontes do mesmo domínio presente-autoritativo, entre dois domínios presente-autoritativos diferentes, e entre apenas fontes não-presente-autoritativas, independência de ordem de entrada, imutabilidade (`Object.freeze`, sem mutação de entrada), verificação estrutural (leitura do próprio arquivo-fonte) de que o módulo não importa `node:fs`, não faz I/O de arquivo, não faz rede, e não implementa relevância/score, e validação de erros para entrada inválida (`resolveAuthorityConflict` com menos de 2 fontes, `createSource` sem `path`/`identity`) — 34 pass, 0 fail.
- Prova de interoperabilidade (script ad-hoc, não persistido no repositório): Sources construídas a partir da saída real de `collectGitContext` (HEAD atual → `repository_state`), `collectProjectContext` (markers → `runtime_metadata`) e `collectDdaeContext` (bug ativo da sessão atual, apenas quando `current_session` está formalmente disponível → `active_bug_state`) contra o próprio repositório.
- Prova de autoridade self-host: `resolveAuthorityConflict` entre um documento histórico simulado (`history`) e o HEAD real do Git (`repository_state`) resolveu a favor do Git, com `reason_superseded: "current_repository_state_over_history"`; o mesmo padrão confirmado para o bug ativo real (BUG-01) vs o mesmo documento histórico, com `reason_superseded: "current_active_bug_state_over_history"`.

## 9. Validações Executadas

- `npm test` — 127 testes, 124 pass, 0 fail, 3 skip (93 pré-existentes + 34 novos).
- `npm run package:check` — `OK`, 97 arquivos (96 → 97, exatamente pelo novo `src/context/authority.js`, variação explicada, não forçada).
- `npm run smoke` — `[DDAE smoke] OK`.
- `ddae-engine validate --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`.
- `ddae-engine audit --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`, `Warnings: 8` (7 quality gates ainda pendentes de conteúdo — pré-existentes, não relacionados a este bloco — mais 1 aviso legítimo de bloco sem feedback, capturado antes deste próprio feedback existir, resolvido nesta mesma etapa).
- `npm pack --dry-run --json` — 97 arquivos, `src/context/authority.js` presente, zero vazamento de `Docs/`/`legacy/`/`node_modules/`/`package-lock.json`.
- CI remota: commit técnico `79bfc8ab268b5747f6efa8807ac1c512e9dac755`, run `31291787161`, 5/5 (`ubuntu-latest / Node 22`, `ubuntu-latest / Node 24`, `ubuntu-latest / Node 26`, `windows-latest / Node 24`, `macos-latest / Node 24`), todos `success`, incluindo o step de prova do Stable Host (`scripts/ci/verify-stable-host.mjs`) continuando verde nos 5 ambientes.

## 10. Decisões Técnicas

- **`domain` é sempre um parâmetro explícito e obrigatório de `createSource`, nunca um default derivado de `kind`.** Esta é a decisão central do bloco, diretamente exigida pelo contrato: o mesmo `kind` (`decision`, por exemplo) pode ser `architecture_intent` (decisão atual e aprovada) ou `history` (decisão superada), e só o chamador — que tem acesso ao estado formal real — sabe qual é o caso. Nenhum código de inferência de prosa foi escrito.
- **A regra de conflito usa partição binária de domínio (presente-autoritativo vs não), não uma ordem/prioridade entre os 5 domínios presente-autoritativos.** Quando duas fontes de domínios presente-autoritativos diferentes conflitam diretamente (ex.: uma decisão arquitetural e um resultado de teste sobre o "mesmo fato"), o resultado é `unresolved`, não uma escolha arbitrária — porque o contrato não define uma ordem entre esses 5 domínios, e inventá-la seria repetir o erro do score numérico que o contrato rejeita.
- **Ordenação por `id` (não por ordem de array) antes de aplicar a regra de resolução**, garantindo que `resolveAuthorityConflict([a, b])` e `resolveAuthorityConflict([b, a])` produzam exatamente o mesmo objeto (`deepEqual`), testado explicitamente.
- **`content_hash` normaliza `\r\n` para `\n` antes do hash**, para que o mesmo conteúdo lido em Windows ou Linux produza o mesmo hash — consistente com a preocupação de portabilidade cross-platform já registrada nesta sessão (Bloco 01).

## 11. Problemas Encontrados

Um único ajuste durante a escrita dos testes: o teste estrutural que verifica "o módulo nunca referencia `legacy/`" inicialmente usava um regex simples (`/legacy/`), que falhou porque os comentários do próprio `authority.js` citam corretamente a proveniência do contrato (`legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md`) — uma citação de documentação legítima, não um acesso em runtime. Corrigido para verificar especificamente chamadas de acesso a arquivo (`readFileSync`/`readdirSync`/`join`/`resolve`) contendo `legacy`, que é o que o critério de aceite realmente exige (nenhum acesso em runtime a `legacy/`, não "a palavra nunca aparece").

## 12. Correções Aplicadas Durante o Bloco

Ver Seção 11 — correção de um falso positivo no próprio teste, sem impacto no código de produção (`src/context/authority.js` não foi alterado por essa correção).

## 13. Pendências

### P1 — Crítica

Nenhuma.

### P2 — Importante

Nenhuma.

### P3 — Melhoria Recomendada

- BUG-01 (template do glossário, herdado do Bloco 01 desta sessão) continua aberto — alvo de bloco futuro desta mesma sessão (Bloco 10, conforme plano do README).

### P4 — Opcional

- O caso de conflito entre dois domínios presente-autoritativos diferentes retorna `unresolved` por design (ver Seção 10) — documentado como risco aceito no bloco (`05_blocks/bloco_03_authority_and_source_model.md`, Seção 14), não uma lacuna de implementação. Nenhuma ação necessária neste bloco; se surgir um caso real, a decisão de como tratá-lo pertence à governança do produto, não a uma heurística inventada aqui.

## 14. Riscos Restantes

Nenhum novo além do já registrado no bloco (Seção 14 de `05_blocks/bloco_03_authority_and_source_model.md`).

## 15. Evidências

```text
Collector interop + self-host authority proof (execução direta contra o próprio repositório):
gitSource.authority_class: repository_state
projectSource.authority_class: runtime_metadata
bugSource.authority_class: active_bug_state (BUG-01, session_02_context_compiler_0_3_0)

resolveAuthorityConflict(staleDoc[history], gitSource[repository_state]):
  status: resolved
  winner_domain: repository_state
  reason_superseded: current_repository_state_over_history

resolveAuthorityConflict(staleDoc[history], bugSource[active_bug_state]):
  status: resolved
  winner_domain: active_bug_state
  reason_superseded: current_active_bug_state_over_history

npm test: 127 tests, 124 pass, 0 fail, 3 skip
npm run package:check: OK, 97 files
npm run smoke: [DDAE smoke] OK
stable host validate: Status OK, Sessions found 2, Errors 0
stable host audit: Status OK, Sessions found 2, Errors 0, Warnings 8 (pré-existentes)
npm pack --dry-run --json: 97 files, src/context/authority.js present

Technical commit: 79bfc8ab268b5747f6efa8807ac1c512e9dac755
Technical CI run: 31291787161 — success, 5/5
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

Bloco 04 — Relevance Engine v1.

## 18. Commit Semântico Sugerido

```
feat(context): add authority and source model
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
