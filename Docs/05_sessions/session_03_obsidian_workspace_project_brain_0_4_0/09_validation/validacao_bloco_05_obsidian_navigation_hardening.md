# Validação — Bloco 05: Obsidian Navigation Hardening

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-26

## 1. Escopo

Verificar se o gerador de link do Renderer (Bloco 04) resiste a entrada adversarial de `source_path` (traversal, encoding, esquema, Unicode) sem produzir link inseguro, sem lançar exceção e sem regressão; e se a decisão de frontmatter foi fechada, não deixada em aberto.

## 2. Contract Compliance

```text
Links Markdown relativos como mecanismo principal (DT-03, D.1):  confirmado — nenhum wikilink em nenhuma saída — PASS
Nenhum link para fora de manifest.sources/.md:                    confirmado (testes 42, 48, 49)         — PASS
Nenhum path absoluto/dotfolder/backslash em saída:                 confirmado (testes 47, 52)              — PASS
Nenhum mecanismo Obsidian-específico obrigatório (Seção G):          confirmado (teste 52)                  — PASS
Frontmatter (Seção D.1):                                              decidido — NÃO usado no v1              — PASS
manifest.views não alterado pelo Renderer:                              inalterado nesta execução (herdado)   — PASS
```

## 3. Evidência Adversarial

| Categoria | Casos | Resultado |
|---|---|---|
| Traversal literal | `../`, `Docs/../..`, segmento vazio/`.`/`..` | Nunca vira link (teste 39) |
| Traversal codificado | `%2e%2e`, `%2E%2E`, `%2e.`, `.%2e` | Único encode; decode único devolve o texto original, nunca `..` (teste 40) |
| Double-encoding | `%252e%252e` | Codificado mais uma vez; nunca "desembrulha" (teste 41) |
| Injeção de esquema | `http:`, `javascript:`, `file:`, `data:`, `mailto:`, drive | `:` sempre codificado; destino sempre `../`-prefixado (teste 42) |
| Unicode look-alike | leader dots, ellipsis, fullwidth `.`/`/`/`:`, division slash, RTL override | Preservados como texto; nunca separador/traversal (teste 43) |
| `%` malformado | `100%`, `%zz`, `%`, `%%%`, `%2F`, `%00` | Nunca lança exceção; texto literal preservado (teste 44) |
| Controles/surrogate | NUL, `\n`, `\r`, `\t`, ESC, DEL, `\u0085`, U+2028/2029, surrogate solto | Nunca linkado; nunca vaza cru na saída (teste 46) |
| Paths absolutos/drive/UNC/backslash | 6 casos | Rejeitados no Schema antes do Renderer (teste 47) |
| Elegibilidade | fora de `sources`, extensão não-`.md` | Nunca linkado, permanece código inerte (teste 48) |
| Propriedade (corpus) | 51 entradas | Todo link: `../`-prefixado, ASCII, single-encode, mapeável a fonte `.md` conhecida; 17 casos "não deve linkar" confirmados ausentes (teste 49) |
| Determinismo | corpus inteiro | Byte a byte idêntico entre execuções (teste 50) |
| Navegação | normal, adversarial, vazio | Home ⇄ 6 views simétrica, 7 views sempre alcançáveis, grafo idêntico independente dos dados de entidade (teste 51) |
| Portabilidade Markdown | todas as saídas | Sem frontmatter, wikilink, URI Obsidian, Dataview, backslash/drive em link (teste 52) |
| Guarda de pureza | código-fonte | Sem `decodeURI*`, `.normalize()`, `node:path`, acoplamento a Obsidian (teste 53) |
| Limitação documentada | bidi override | Preservado verbatim em code span (dado inerte); P4 para Bloco 09 (teste 54) |

## 4. Regressão

`npm test` 574/571/0/3 (era 558/555/0/3). `package:check` OK, 111 arquivos (sem mudança de produção). `smoke` OK. `validate`/`audit` 0 erros. `git diff --check` limpo. `git status --short src/` confirma zero alteração em `src/`.

## 5. Matriz de Aceite

| # | Critério | Resultado |
|---|---|---|
| 1 | Cenários adversariais cobertos com resultado real documentado | PASS |
| 2 | Nenhuma alteração de comportamento nas 38 saídas existentes | PASS (regressão idêntica) |
| 3 | Decisão de frontmatter registrada explicitamente | PASS — não usado no v1 |
| 4 | Lacuna do Schema registrada como P4, não corrigida | PASS |
| 5 | Nenhum módulo novo sem necessidade comprovada | PASS — nenhum criado |
| 6 | Nenhuma alteração a `manifest.views`, Compiler, Fingerprint, Discovery, Schema | PASS |
| 7 | Regressão completa verde | PASS |

## 6. Resultado

```text
APPROVED
```

Nenhuma pendência P1/P2. P3/P4 herdadas e duas novas P4 registradas no feedback.

## 7. Próximo Passo

Confirmar/criar formalmente o Bloco 06 (Context Compiler Integration) em execução futura, conforme `mapa_dependencias.md` (paralelizável com o Bloco 05, ambos dependentes só do Bloco 04).
