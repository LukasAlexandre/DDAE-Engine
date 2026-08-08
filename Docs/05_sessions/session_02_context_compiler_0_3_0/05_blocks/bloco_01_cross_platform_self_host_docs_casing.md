# Bloco 01 — cross platform self host docs casing

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-08

## 1. Objetivo

Corrigir a estrutura física do próprio repositório para que o control plane canônico (`Docs/`) e o histórico legacy não dependam de diferenciação por maiúscula/minúscula entre si — condição necessária antes de qualquer implementação nova do Context Compiler.

## 2. Contexto

Ao revisar o fechamento do bootstrap de self-hosting (`legacy/sessions/session_13_ddae_self_hosting_bootstrap/`, commit `c5adca3`), foi levantada a suspeita de que o Git poderia estar armazenando o control plane canônico como `docs/` (minúsculo) em vez de `Docs/` (maiúsculo, conforme o contrato do CLI). Essa suspeita foi confirmada tecnicamente antes de qualquer implementação: `git ls-tree HEAD` mostrava exatamente um componente de raiz chamado `docs` (minúsculo) — não uma ilusão do Windows, é o path exato armazenado na árvore Git — enquanto `src/commands/init.js`, `session.js`, `validate.js`, `audit.js` e `block.js` usam literalmente `path.join(dir, 'Docs', ...)`, com D maiúsculo, hardcoded.

## 3. Problema que Este Bloco Resolve

Em um filesystem case-sensitive (Linux, incluindo os runners `ubuntu-latest` já usados pela própria CI do projeto — que nunca haviam sido testados contra o self-host, apenas contra a suíte do candidate), `Docs` e `docs` são paths genuinamente diferentes. Um clone fresco deste repositório em Linux, seguido de `ddae-engine validate --dir .`, reportaria `"Docs/ não encontrado"` — o self-hosting inteiro, comprovado apenas em Windows, quebraria silenciosamente em qualquer ambiente Linux.

## 4. Escopo

- Confirmar tecnicamente o casing real armazenado na árvore Git (`git ls-tree`), independente do que o filesystem Windows mostra.
- Corrigir a estrutura para que `Docs/` (canônico) e o histórico legacy nunca dependam de diferenciação por case entre si.
- Preservar o conteúdo de ambos byte-a-byte (verificado por comparação de hash de blob, não apenas por inspeção visual).
- Revalidar `validate`/`audit` via Stable Host, regressão completa do candidate, e isolamento do pacote npm.

## 5. Fora de Escopo

- Qualquer implementação do DDAE State Collector ou blocos seguintes do Context Compiler (Bloco 02 em diante).
- Alteração de `src/`, `bin/`, `test/`, `scripts/`, `.github/`, `package.json`.
- Adição de um step de CI que execute `validate`/`audit` do self-host em runner Linux real — não implementado neste bloco; a prova de correção usada aqui é o hash exato do path armazenado na árvore Git (`git ls-tree`), que é uma propriedade do objeto Git em si, independente de sistema operacional, mais a CI existente (5/5, incluindo Ubuntu) confirmando que nenhuma regressão estrutural foi introduzida. Uma prova ainda mais forte (rodar `validate`/`audit` de fato dentro de um runner Ubuntu) fica registrada como possível bloco futuro, não decidida aqui.

## 6. Arquivos e Pastas Envolvidos

- `Docs/00_ddae_engine/` até `Docs/99_archive/` (11 diretórios canônicos, renomeados de `docs/*` minúsculo).
- `legacy/sessions/` (novo nome do antigo `docs/sessions/` — histórico de engenharia pré-self-hosting, 45 arquivos, conteúdo idêntico).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/` (esta própria sessão, criada antes da correção).

## 7. Dependências

`legacy/sessions/session_13_ddae_self_hosting_bootstrap/` (contrato de self-hosting) e `session_01_ddae_self_hosting_bootstrap/` (self-hosting já operacional).

## 8. Plano de Implementação

1. Confirmar o baseline (`git status`, `HEAD`, `origin/main`, tag `v0.2.0`, versões do Stable Host e do Candidate).
2. Confirmar tecnicamente o casing real via `git ls-tree HEAD`.
3. Criar esta sessão canônica (`session_02_context_compiler_0_3_0`) via Stable Host.
4. **Tentativa 1 (revertida com segurança):** usar `git mv` para renomear os 11 diretórios canônicos de `docs/*` para `Docs/*` e o legado de volta para `docs/sessions/*`. Essa abordagem expôs um problema mais sério do que o previsto: como `Docs` e `docs` resolvem para o **mesmo nó físico** no Windows, é impossível materializar simultaneamente dois diretórios de nível superior que diferem só por maiúscula/minúscula neste ambiente — não é só uma questão de "testar no Linux", é uma fragilidade estrutural que afetaria qualquer clone futuro em Windows/macOS. A tentativa foi revertida com `git reset` (não-destrutivo) mais realocação física manual, sem perda de dados, `HEAD` permanecendo inalterado durante todo o processo.
5. Decisão corrigida, validada com o usuário: renomear o histórico legado para um nome genuinamente distinto (não uma variação de case) — `legacy/sessions/`, em vez de manter `docs/sessions/`.
6. Executar a correção: mover fisicamente `docs/sessions/` para `legacy/sessions/` (rename real, não de case) e reindexar os 11 diretórios canônicos de `docs/*` para `Docs/*` via `git rm --cached` + `git add` (contornando uma falha específica do `git mv` para renomes de diretório de nível superior neste ambiente).
7. Verificar conteúdo byte-a-byte idêntico via comparação de hash de blob Git (`git rev-parse HEAD:<path>` vs. `git rev-parse :<novo-path>`) para todos os 113 arquivos renomeados — não apenas confiar na detecção heurística de rename do `git status`/`git diff`.
8. Revalidar `validate`/`audit` via Stable Host, isolamento de pacote, e regressão completa (`npm test`/`package:check`/`smoke`).
9. Documentar este bloco, commitar, push, aguardar CI 5/5.

## 9. Critérios de Aceite

- [x] Casing real confirmado via `git ls-tree` antes de qualquer alteração.
- [x] `Docs/` (canônico) e `legacy/` (histórico) não compartilham nenhum prefixo case-variante entre si.
- [x] Conteúdo de todos os 113 arquivos renomeados verificado byte-a-byte idêntico (0 mismatches).
- [x] Nenhum arquivo permanece sob o path `docs/` (minúsculo) na árvore staged.
- [x] `validate`/`audit` via Stable Host reconhecem `Sessions found: 2` (`session_01`, `session_02`), `Errors: 0`.
- [x] `npm pack --dry-run --json` continua reportando 95 arquivos, zero vazamento de `Docs/`/`legacy/`/`node_modules/`.
- [x] `npm test`/`package:check`/`smoke` idênticos ao baseline (67/65/0/2, 95 arquivos, `[DDAE smoke] OK`).

## 10. Validações Obrigatórias

- [x] `ddae-engine validate --dir .` via Stable Host — `Status: OK`.
- [x] `ddae-engine audit --dir .` via Stable Host — `Status: OK`, `Errors: 0`.
- [x] `npm test` — 67/65/0/2.
- [x] `npm run package:check` — OK, 95 arquivos.
- [x] `npm run smoke` — `[DDAE smoke] OK`.
- [x] CI remota 5/5 — confirmado, run `31283311633`.
- [x] Stable Host publicado (`ddae-engine@0.2.0`) instalado e executado (`--version`/`validate`/`audit`) em runner Linux real dentro da CI, com evidência de log capturada — Checkpoint 01.1, commit `d0a9221`.

## 11. Segurança

Não aplicável — bloco estrutural de reorganização de diretórios, sem superfície de rede, autenticação, ou dado sensível envolvido. A verificação de conteúdo byte-a-byte (Seção 9) é, em si, uma garantia de integridade, não uma preocupação de segurança tradicional.

## 12. Performance

Não aplicável.

## 13. Design System / UX

Não aplicável.

## 14. Riscos

- **`git mv` de diretório de nível superior é pouco confiável neste ambiente** (Windows, filesystem case-insensitive, possivelmente interação com o merge físico Docs/docs). Mitigado: abandonado em favor de `git rm --cached` + `git add` por arquivo/diretório, que se mostrou confiável e foi o método efetivamente usado.
- **Qualquer novo diretório de nível superior criado futuramente com nome que colida por case com `Docs` reintroduziria o mesmo problema.** Mitigado: a nova convenção (`legacy/` como nome genuinamente distinto, não `docs/`) elimina a classe de problema, não apenas a instância atual.

## 15. Pendências Esperadas

- ~~P3 (não bloqueante): uma prova mais forte de portabilidade (executar `validate`/`audit` do self-host de fato em um runner Linux via CI) não foi implementada neste bloco~~ — **resolvida no Checkpoint 01.1** (`scripts/ci/verify-stable-host.mjs`, step de CI nos 5 jobs da matriz, evidência de log real capturada). Ver `08_feedbacks/feedback_bloco_01_cross_platform_self_host_docs_casing.md`, seção "Checkpoint 01.1". Este era o único gate que impedia o fechamento integral do bloco — não foi deixado como dívida.

## 16. Feedback Obrigatório

Gerar e preencher via `ddae-engine feedback create --block bloco_01_cross_platform_self_host_docs_casing --session session_02_context_compiler_0_3_0` antes de considerar este bloco concluído.

## 17. Commit Semântico Sugerido

```
fix(self-host): make Docs/ and legacy history case-collision-safe

Rename the legacy engineering history from docs/sessions/ to legacy/sessions/
(a genuinely distinct name, not a case variant) and re-index the canonical
scaffold under Docs/ (capitalized), eliminating a structural fragility where
two top-level paths differing only by case could not be reliably represented
on case-insensitive filesystems (Windows/macOS) — verified byte-identical
across all 113 renamed files via Git blob hash comparison.
```
