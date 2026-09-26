# Feedback — Bloco 05: obsidian navigation hardening

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-26

## 1. Resumo Executivo

O Bloco 05 endureceu, com evidência adversarial, o gerador de link do Renderer (Bloco 04) e fechou a decisão de frontmatter que estava explicitamente aberta no contrato. Resultado: **16 testes novos** (39–54, mais reforço de propriedade sobre um corpus de 51 entradas) cobrindo traversal literal e codificado, double-encoding, injeção de esquema, Unicode look-alike/bidi, controles, `%` malformado e simetria de navegação sob dados adversariais — **zero alteração em `src/workspace/renderer.js`**, porque o mecanismo existente (rejeição por segmento + `encodeURIComponent` de passagem única) já classificava corretamente todos os casos investigados. Frontmatter foi decidido como **não usado no v1** e registrado diretamente no contrato, sem nova DT, por ser uma decisão trivialmente reversível. A lacuna de defesa em profundidade do Schema (`isProjectRelativePath` não rejeita `..`/esquemas isoladamente) permanece registrada como P4 para o Bloco 07, não corrigida aqui — o Renderer já a neutraliza de forma independente.

Status final: **concluído conforme escopo, aprovado, sem blocker.**

## 2. Objetivo do Bloco

Provar e endurecer, com testes, a navegação (Home ⇄ 7 views ⇄ `Docs/`) já produzida pelo Renderer, e fechar a decisão de frontmatter — sem redesenhar navegação nem introduzir mecanismo Obsidian-específico.

## 3. Escopo Implementado

Exatamente o previsto (bloco, Seções 5 e 13): 16 testes adversariais em `test/workspace-renderer.test.js` (39–54); decisão de frontmatter fechada no contrato (Seção D.1); lacuna do Schema (9.3) mantida como P4, não corrigida. Nenhum módulo novo criado (Seção 7 do bloco: decisão A — endurecer via testes, sem extrair `links.js`/`paths.js`).

## 4. Arquivos Criados

Nenhum arquivo de produção. Este feedback e `09_validation/validacao_bloco_05_obsidian_navigation_hardening.md`.

## 5. Arquivos Alterados

- `test/workspace-renderer.test.js` — 16 testes novos (39–54), reaproveitando `renderPaths`/`entryLine`/`decodeOnce` como helpers locais do próprio arquivo.
- `Docs/03_contracts/contrato_workspace_project_brain.md` — Seção D.1, decisão de frontmatter fechada.
- `Docs/05_sessions/session_03_.../05_blocks/bloco_05_...md` — resultado da implementação e critérios marcados.
- `Docs/05_sessions/session_03_.../README.md` — status do Bloco 05.

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
node --test test/workspace-renderer.test.js   (RED confirmado nos 2 testes com bug de teste, depois GREEN 54/54)
npm test
npm run package:check
npm run smoke
node bin/ddae-engine.js validate
node bin/ddae-engine.js audit
git diff --check
```

## 8. Testes Realizados

54 testes em `test/workspace-renderer.test.js` (38 herdados do Bloco 04 + 16 novos), todos passando. Os 16 novos cobrem: traversal literal (`../`, `Docs/../..`, segmento vazio/`.`/`..`) nunca vira link; traversal codificado (`%2e%2e`, `%2E%2E`, `%2e.`, `.%2e`) nunca decodifica de volta para `..` após um decode; double-encoding (`%252e%252e`) nunca "desembrulha"; injeção de esquema (`http:`, `https:`, `javascript:`, `file:`, `data:`, `mailto:`, letra de drive) sempre com `:` codificado e destino sempre `../`-prefixado; Unicode look-alike de `.`/`/`/`\`/`:` (leader dots, ellipsis, fullwidth, division slash, RTL override) nunca interpretado como separador ou traversal; `%`/escapes malformados nunca lançam exceção; brackets/parênteses/crases/espaços/`#`/`?`/aspas sempre percent-encoded; caracteres de controle e surrogate solto nunca linkados e nunca vazam crus; paths absolutos/drive/backslash/UNC rejeitados no Schema antes de chegar ao Renderer; elegibilidade de link exige presença em `manifest.sources` e extensão `.md`; propriedade sobre corpus de 51 entradas (todo link gerado é `../`-prefixado, ASCII puro, codificado uma única vez, e mapeia de volta a uma fonte `.md` conhecida — nenhum link inventado, nenhum dos 17 casos "não deve linkar" vazou); determinismo byte a byte sob o corpus inteiro; simetria de navegação Home ⇄ 6 views também sob dados adversariais e sob Manifest vazio (BFS: as 7 views sempre alcançáveis, nenhum link para fora do conjunto); ausência de frontmatter/wikilink/URI do Obsidian/Dataview em qualquer saída; guarda de pureza reforçada (sem `decodeURI*`, `.normalize()`, `node:path`, acoplamento a Obsidian); limitação documentada (não corrigida) sobre bidi override em nome de arquivo.

## 9. Validações Executadas

- `npm test` — 574 total, 571 pass, 0 fail, 3 skip (558 → 574, +16 novos, todos passando).
- `npm run package:check` — OK, 111 arquivos (sem mudança — nenhum arquivo de produção novo neste bloco).
- `npm run smoke` — OK.
- `ddae-engine validate` — Status OK, 0 erros, 0 warnings.
- `ddae-engine audit` — Status OK, 0 erros; o único warning novo é "Bloco 05 sem feedback", fechado por este arquivo.
- `git diff --check` — limpo.

## 10. Decisões Técnicas

- **Nenhuma extração de módulo novo:** a lógica de path/link já era coesa e privada em `renderer.js`; criar `links.js` sem um segundo consumidor real contradiria a prática já estabelecida nos Blocos 01–04.
- **Frontmatter registrado direto no contrato, sem DT-04:** a decisão é trivialmente reversível (adicionar depois não quebra nada existente), então não atende ao critério de "decisão cara de reverter" que `decisoes_tecnicas.md` reserva para entradas DT.
- **Property test sobre corpus (teste 49), não só casos pontuais:** generaliza a garantia de que todo link produzido satisfaz o invariante (destino `../`-prefixado, ASCII, single-encode, mapeável a uma fonte conhecida), em vez de depender só de asserts caso a caso.
- **Limitação de bidi documentada como P4, não corrigida:** o valor já é dado inerte (nunca interpretado como Markdown); neutralizar por *visual spoofing* é decisão de apresentação/segurança do Bloco 09, fora do escopo de "path/link validation pura" deste bloco.

## 11. Problemas Encontrados

Dois bugs nos próprios testes novos (não em produção), corrigidos antes do commit: (1) a contagem de linhas com "entry " colidia com o texto do teste de bidi que injetava a mesma substring; (2) o teste de propriedade (49) construía o conjunto de fontes conhecidas a partir do array de entrada em vez do `manifest.sources` real, então uma fonte legitimamente linkável (`bugs_identificados.md` do fixture) aparecia como "dangling" por engano.

## 12. Correções Aplicadas Durante o Bloco

Os dois itens acima, ambos em `test/workspace-renderer.test.js`. Nenhuma correção em `src/workspace/renderer.js`.

## 13. Pendências

### P1 — Crítica
Nenhuma.

### P2 — Importante
Nenhuma.

### P3 — Melhoria Recomendada
Herdadas, inalteradas (ordenação de tags, `recent_changes` sem recência, entidades sem `status`).

### P4 — Opcional
- Lacuna de defesa em profundidade no Schema (`isProjectRelativePath` não rejeita `..`/esquemas isoladamente) — contrato Seção 9.3 do bloco; destino: Bloco 07 (Validator).
- Bidi override em nome de arquivo preservado verbatim no rótulo do link (dado inerte, nunca estrutura) — destino: Bloco 09 (Security Hardening), se houver decisão de neutralizar por razão de apresentação.

## 14. Riscos Restantes

Nenhum novo. Os riscos RS-01/02/03/04 continuam com seus destinos já atribuídos (RS-01 investigado e fechado aqui via teste; RS-02 já mitigado no Bloco 02; RS-03/04 seguem para o Bloco 09).

## 15. Evidências

```text
npm test:              574 total, 571 pass, 0 fail, 3 skip
package:check:          OK, 111 files (sem mudança de produção)
smoke:                    OK
validate / audit:          Errors 0

Testes novos (39–54): traversal literal/codificado, double-encoding, scheme
injection, Unicode look-alike/bidi, controles, % malformado, elegibilidade de
sources, propriedade sobre corpus de 51 entradas, determinismo, simetria de
navegação sob dados adversariais/vazios, portabilidade Markdown, guarda de
pureza reforçada, limitação bidi documentada.

src/workspace/renderer.js touched:   NO
src/context/**, compiler.js, fingerprint.js, discover.js, brain-schema.js touched: NO
Frontmatter:                          decidido — NÃO usado no v1 (contrato D.1)
```

## 16. Resultado Final

- [x] Bloco concluído conforme escopo
- [ ] Bloco concluído com ressalvas (ver pendências)
- [ ] Bloco bloqueado

## 17. Próximo Bloco Recomendado

Conforme `04_planning/mapa_dependencias.md`, os Blocos 05 e 06 dependem apenas do Bloco 04 (paralelizáveis entre si). O Bloco 06 (Context Compiler Integration) pode ser o próximo, a confirmar/criar formalmente em execução futura — este bloco não o cria.

## 18. Commit Semântico Sugerido

```
test(workspace): harden project brain renderer link generation
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
