# Bloco 03 — Authority and Source Model

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Objetivo

Implementar o Source Model v1 e o Authority Model v1 (`src/context/authority.js`) — a camada que normaliza qualquer evidência coletada em um `Source` canônico e resolve, por domínio de autoridade (nunca por score numérico), qual fonte prevalece quando duas ou mais fazem afirmações conflitantes sobre o mesmo fato.

## 2. Contexto

Contrato de referência: `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md`, Seção 4 (Source Model) e Seção 5 (Authority Model) — ambas definidas naquela sessão, nunca implementadas. Esta sessão já entregou os três sensores que produzem evidência bruta (`collectGitContext`, `collectProjectContext`, `collectDdaeContext` — Blocos 01/02 desta sessão e do predecessor legacy). Este bloco é a primeira camada que opera sobre a saída desses sensores, e a base sobre a qual o Relevance Engine (Bloco 04) e o Compiler (Bloco 05) serão construídos.

## 3. Problema que Este Bloco Resolve

Sem um modelo de autoridade explícito, qualquer camada futura que precise decidir "em quem eu confio quando duas fontes discordam" teria que inventar uma heurística ad-hoc — e o risco concreto é score numérico universal (`decision=100`, `documentation=40`...), que já foi explicitamente rejeitado no contrato da Session 12 por poder produzir o erro motivador do contrato: um roadmap antigo dizendo "usar JWT" vencendo uma decisão arquitetural atual dizendo "usar cookie HttpOnly" só porque `kind=decision` tem score mais alto que `kind=documentation`, quando na verdade o roadmap também é `kind=decision` — o que desqualifica esse roadmap não é o tipo, é o domínio da afirmação (`future_intent`/`history`, nunca autoritativo sobre o presente).

## 4. Escopo

- `createSource({ kind, domain, path, section, identity, content })` em `src/context/authority.js`, produzindo a forma canônica `{ id, kind, path, section, authority_class, content_hash }` (Seção 4 do contrato).
- `SOURCE_KINDS` — os 10 kinds oficiais do contrato (`git`, `session`, `decision`, `architecture`, `bug`, `validation`, `test`, `project_metadata`, `source_code`, `documentation`).
- `AUTHORITY_DOMAINS` — os 7 domínios oficiais do contrato (`repository_state`, `runtime_metadata`, `architecture_intent`, `test_result`, `active_bug_state`, `future_intent`, `history`), sempre exigidos explicitamente do chamador, nunca inferidos de `kind` ou de prosa.
- `resolveAuthorityConflict(sources)` — resolução por partição de domínio: `future_intent` e `history` nunca vencem o presente; exatamente uma fonte presente-autoritativa vence; toda fonte perdedora é preservada em `conflicting_sources` com `reason_superseded` categórico; zero ou duas-ou-mais fontes presente-autoritativas produz `status: 'unresolved'`, `winner: null`.
- Determinismo (id derivado de `kind`+identidade+`section`, nunca de timestamp/posição/random), imutabilidade (`Object.freeze`) e independência de ordem de entrada.
- `test/context-authority.test.js` cobrindo criação de Source, os 7 domínios, resolução de conflito (incluindo o caso nomeado JWT vs HttpOnly), estados `unresolved`, preservação de fontes perdedoras, determinismo/imutabilidade, e verificação estrutural de que o módulo não acessa filesystem/rede/LLM nem implementa relevância/score.

## 5. Fora de Escopo

- Relevance Engine (ranking por relevância ao objetivo da sessão) — Bloco 04.
- Context Manifest, Compiler, Markdown Renderer, fingerprint — Blocos 05/06.
- Qualquer comando de CLI (`ddae-engine context ...`) ou output em `.ddae/` — Bloco 07 em diante.
- Qualquer NLP/inferência semântica para determinar `domain` a partir de `kind` ou de conteúdo — `domain` é sempre informado explicitamente pelo chamador.
- Correção do BUG-01 (template do glossário) e qualquer alteração em `src/templates/` — continua aberto, P3, fora deste bloco.

## 6. Arquivos e Pastas Envolvidos

- `src/context/authority.js` (novo).
- `test/context-authority.test.js` (novo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_03_authority_and_source_model.md` (este arquivo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_03_authority_and_source_model.md` e `08_feedbacks/feedback_bloco_03_authority_and_source_model.md` (gerados após a CI técnica verde).

## 7. Dependências

- `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seções 4 e 5 — contrato vinculante, não reaberto para discussão neste bloco).
- `src/context/git-context.js`, `src/context/project-context.js`, `src/context/ddae-context.js` — coletores existentes, usados apenas para a prova de interoperabilidade (Etapa 23/24), sem alteração.

## 8. Plano de Implementação

1. Reler Seções 4 e 5 do contrato do Manifest v1 antes de escrever qualquer código.
2. Implementar `SOURCE_KINDS` e `AUTHORITY_DOMAINS` como listas fechadas, fiéis ao contrato.
3. Implementar `createSource()` com validação de `kind`/`domain`, rejeição (nunca reescrita silenciosa) de path não-relativo-ao-projeto, id determinístico via SHA-256, `content_hash` normalizado para `\n` (LF) antes do hash.
4. Implementar `resolveAuthorityConflict()` com a regra de partição de domínio, ordenação determinística por `id` (independente da ordem de entrada), e preservação de toda fonte perdedora.
5. Escrever `test/context-authority.test.js` cobrindo os cenários da Seção 9.
6. Rodar `npm test` e confirmar 0 falhas.
7. Construir Sources a partir de saída real de `collectGitContext`/`collectProjectContext`/`collectDdaeContext` (prova de interoperabilidade) e de um conflito representativo self-host (prova de autoridade).
8. Rodar `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
9. Confirmar `src/templates/` e BUG-01 intocados.

## 9. Critérios de Aceite

- [x] `createSource` produz a forma canônica exata do contrato (`id`, `kind`, `path`, `section`, `authority_class`, `content_hash`).
- [x] Os 10 `kind`s e os 7 `domain`s do contrato são exatamente os implementados — nenhum a mais, nenhum a menos.
- [x] `domain` é sempre explícito no chamador; nunca inferido de `kind` nem de prosa.
- [x] `future_intent` e `history` nunca vencem uma fonte presente-autoritativa, incondicionalmente.
- [x] O caso nomeado JWT (histórico) vs HttpOnly (decisão atual) resolve a favor da decisão atual, com o roadmap preservado em `conflicting_sources`.
- [x] Toda fonte perdedora é preservada com `reason_superseded` categórico — nunca descartada silenciosamente.
- [x] Conflito com zero ou duas-ou-mais fontes presente-autoritativas retorna `status: 'unresolved'`, `winner: null`, sem inventar critério de desempate.
- [x] `resolveAuthorityConflict` é independente da ordem de entrada e não muta as fontes recebidas.
- [x] Nenhum acesso a filesystem, rede ou LLM dentro de `authority.js` (verificado por teste estrutural).
- [x] Nenhuma lógica de relevância/score numérico implementada neste bloco.

## 10. Validações Obrigatórias

- [x] `npm test` — suíte completa, 0 falhas.
- [x] `npm run package:check` — OK, delta de arquivos explicado (não forçado a um número fixo).
- [x] `npm run smoke` — `[DDAE smoke] OK`.
- [x] `ddae-engine validate`/`audit` via Stable Host — `Status: OK`, `Errors: 0`.
- [x] CI remota 5/5 (a confirmar após push).

## 11. Segurança

Não aplicável a novo vetor — o módulo é puro (sem I/O, sem rede, sem execução de código externo); `createSource` recebe conteúdo já lido por um chamador responsável pelo próprio boundary de segurança (ex.: `collectDdaeContext` já não lê `.env`/`legacy/`). O único ponto de atenção é não permitir que um path absoluto vaze para dentro de um Source — mitigado por `assertProjectRelativePath`, testado.

## 12. Performance

Não aplicável — operações síncronas em memória sobre um número pequeno de objetos (hash SHA-256 de strings curtas, ordenação de arrays pequenos).

## 13. Design System / UX

Não aplicável.

## 14. Riscos

- A regra de partição de domínio (`future_intent`/`history` nunca autoritativos) é simples por design, mas significa que dois domínios presente-autoritativos em conflito direto (ex.: duas decisões arquiteturais formalmente ativas e contraditórias) ficam `unresolved` em vez de escolher uma — isso é intencional (não inventar critério), mas empurra a responsabilidade de resolver esse caso para a camada de governança (`Docs/04_governance/registro_decisoes.md` nunca deveria ter duas decisões ativas conflitantes ao mesmo tempo).
- BUG-01 (template do glossário) continua aberto — não afeta este bloco.

## 15. Pendências Esperadas

- Nenhuma pendência P1/P2 esperada. Risco P4 registrado acima (conflito entre dois domínios presente-autoritativos) é um comportamento de design documentado, não uma lacuna de implementação.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_03_authority_and_source_model --session session_02_context_compiler_0_3_0` (Stable Host), somente após a CI técnica verde.

## 17. Commit Semântico Sugerido

```
feat(context): add authority and source model
```
