# Feedback — Bloco 01: cross platform self host docs casing

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-08

## 1. Resumo Executivo

O bootstrap de self-hosting (Session 13 legacy) havia comprovado `validate`/`audit` apenas em Windows. Uma revisão pós-fechamento levantou a suspeita de que `Docs/` (esperado pelo contrato do CLI) e `docs/` (o que de fato foi commitado) poderiam ser paths diferentes em Linux. A suspeita foi confirmada tecnicamente (`git ls-tree` mostrava `docs` minúsculo). A correção inicial (via `git mv`, mantendo `Docs/` canônico e `docs/sessions/` legacy como variantes de case) revelou um problema mais grave: dois top-level paths que diferem só por case não podem ser materializados simultaneamente em filesystem case-insensitive (Windows/macOS), o que teria deixado a estrutura frágil para sempre em qualquer clone futuro nesses sistemas — não apenas em Linux. Corrigido renomeando o histórico legacy para um nome genuinamente distinto: `legacy/sessions/` (não uma variação de case de `Docs`). Conteúdo verificado byte-a-byte idêntico em todos os 113 arquivos movidos. Bloco concluído com sucesso.

## 2. Objetivo do Bloco

Corrigir a estrutura física do repositório para que `Docs/` (canônico) e o histórico legacy não dependam de diferenciação por case entre si, antes de retomar a implementação do Context Compiler.

## 3. Escopo Implementado

- Confirmação técnica do casing real via `git ls-tree HEAD`.
- Criação da sessão canônica `session_02_context_compiler_0_3_0` via Stable Host.
- Tentativa inicial via `git mv` (mantendo case-only split) — revertida com segurança ao se revelar estruturalmente frágil, não apenas "precisa de mais teste".
- Decisão corrigida com o usuário: renomear legado para `legacy/sessions/`.
- Execução via `git rm --cached` + `git add` (contornando falha do `git mv` para o rename de diretório de nível superior neste ambiente).
- Verificação de integridade byte-a-byte via comparação de hash de blob Git para os 113 arquivos.
- Revalidação completa: `validate`/`audit` via Stable Host, isolamento de pacote, regressão do candidate.

## 4. Arquivos Criados

- `Docs/05_sessions/session_02_context_compiler_0_3_0/**` (21 arquivos do scaffold da sessão, gerados pelo Stable Host).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_01_cross_platform_self_host_docs_casing.md`.
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_01_cross_platform_self_host_docs_casing.md`.
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_01_cross_platform_self_host_docs_casing.md` (este arquivo).

## 5. Arquivos Alterados

- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md` (preenchido).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/01_intake/levantamento_inicial.md` (preenchido).
- 68 arquivos reindexados de `docs/*` para `Docs/*` (conteúdo idêntico, apenas path).
- 45 arquivos reindexados de `docs/sessions/*` para `legacy/sessions/*` (conteúdo idêntico, apenas path).

## 6. Arquivos Removidos

Nenhum — todo conteúdo foi preservado via rename (reindexação de path), nunca deletado.

## 7. Comandos Executados

```
git ls-tree HEAD
node node_modules/ddae-engine/bin/ddae-engine.js session create "context compiler 0 3 0" --dir .
git mv docs docs_casing_tmp                          # tentativa 1, parcialmente executada
git mv docs_casing_tmp/sessions docs_sessions_tmp     # tentativa 1
mkdir Docs && git mv docs_casing_tmp/<11 dirs> Docs/<dir>   # tentativa 1
git mv docs_sessions_tmp docs                         # tentativa 1 — resultado incorreto (aninhamento)
git reset                                             # reversão segura (não-destrutiva)
mv "Docs/docs_sessions_tmp" "docs/sessions"           # recuperação física manual
git mv docs/sessions legacy/sessions                  # falhou (fatal, mas sem side-effect)
mv docs/sessions legacy_sessions_tmp && mkdir -p legacy && mv legacy_sessions_tmp legacy/sessions   # abordagem 2, física
git add -A -- docs legacy
git rm -r --cached docs/<11 dirs canônicos>
git add Docs/<11 dirs canônicos>
node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
node node_modules/ddae-engine/bin/ddae-engine.js audit --dir .
npm pack --dry-run --json
npm test && npm run package:check && npm run smoke
node node_modules/ddae-engine/bin/ddae-engine.js block create "cross platform self host docs casing" --session session_02_context_compiler_0_3_0 --dir .
```

## 8. Testes Realizados

- Comparação de hash de blob Git (`git rev-parse HEAD:<path>` vs. `git rev-parse :<novo-path>`) para os 113 arquivos renomeados, via script Node — 0 mismatches.
- `npm test` — 67 testes, 65 pass, 0 fail, 2 skip (idêntico ao baseline).
- `npm run package:check` — OK, 95 arquivos (idêntico ao baseline).
- `npm run smoke` — `[DDAE smoke] OK`.

## 9. Validações Executadas

- `ddae-engine validate --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`.
- `ddae-engine audit --dir .` (Stable Host) — `Status: OK`, `Sessions found: 2`, `Errors: 0`, `Suggestions: 0` (a sugestão anterior "pasta fora do padrão: Docs/sessions" desapareceu, já que o legado não está mais aninhado dentro de `Docs/`).
- `npm pack --dry-run --json` — 95 arquivos, zero vazamento de `Docs/`/`legacy/`/`node_modules/`/`package-lock.json`.

## 10. Decisões Técnicas

- **Renomear o legado para `legacy/sessions/` (nome distinto), não manter `docs/sessions/` como variante de case de `Docs/`.** Decisão tomada em conjunto com o usuário após a Tentativa 1 revelar o problema estrutural — registrada aqui e no bloco; não requer entrada separada em `Docs/04_governance/registro_decisoes.md` por ser específica desta sessão de bootstrap, não uma decisão de arquitetura de produto.
- **Usar `git rm --cached` + `git add` em vez de `git mv` para o rename dos 11 diretórios canônicos**, após `git mv` se mostrar não confiável para renomes de diretório de nível superior neste ambiente (falha atômica sem side-effect, mas também sem sucesso).

## 11. Problemas Encontrados

- `git mv docs docs_casing_tmp` seguido de tentativa de recriar `docs` a partir de `docs_sessions_tmp` resultou em aninhamento incorreto (`docs/docs_sessions_tmp/...`) porque a sessão `session_02` (ainda não rastreada) fisicamente ancorava o diretório `docs`/`Docs` (nó único case-insensitive) durante toda a operação. Identificado antes do commit, revertido com `git reset` (não-destrutivo).
- `git mv docs/sessions legacy/sessions` falhou com `fatal: renaming 'docs/sessions' failed: No such file or directory` no nível do diretório, apesar de listar corretamente cada arquivo individual no log verboso — a operação foi abortada atomicamente sem deixar estado parcial (verificado).

## 12. Correções Aplicadas Durante o Bloco

Ambos os problemas da Seção 11 foram corrigidos dentro deste mesmo bloco, antes de qualquer commit: o primeiro via `git reset` + realocação física manual; o segundo trocando a estratégia de `git mv` de diretório para `mv` físico + `git add -A`, que funcionou de forma confiável e foi verificado byte-a-byte antes do commit.

## 13. Pendências

### P1 — Crítica

Nenhuma.

### P2 — Importante

Nenhuma.

### P3 — Melhoria Recomendada

- Considerar adicionar um step de CI que rode `validate`/`audit` do self-host de fato em um runner Linux (prova ainda mais forte de portabilidade do que a inspeção de `git ls-tree`). Não implementado neste bloco — fora de escopo.
- BUG-01 (bug de template do glossário, herdado de `session_01`) continua aberto, alvo desta mesma sessão (Bloco 10 planejado).

### P4 — Opcional

Nenhuma.

## 14. Riscos Restantes

Nenhum novo. Ver Seção 14 do bloco (`05_blocks/bloco_01_...md`).

## 15. Evidências

```text
git ls-tree HEAD (antes da correção)
040000 tree e41fa028ec39f1f625adaef8a0457a185eb7a696    docs

Blob hash verification (após a correção): 113 renames checked, 0 mismatches.

validate (após a correção):
Status: OK
Sessions found: 2
Errors: 0

audit (após a correção):
Status: OK
Sessions found: 2
Errors: 0
Suggestions: 0

npm pack --dry-run --json: 95 files, 0 leaked
npm test: 67 total, 65 pass, 0 fail, 2 skip
npm run package:check: OK, 95 files
npm run smoke: [DDAE smoke] OK
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Bloco 02 — DDAE State Collector (`src/context/ddae-context.js`).

## 18. Commit Semântico Sugerido

```
fix(self-host): make Docs/ and legacy history case-collision-safe
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
