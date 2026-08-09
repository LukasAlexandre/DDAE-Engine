# Bloco 06 — Markdown Renderer

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Objetivo

Implementar `src/context/renderer.js` — uma função pura que transforma um Context Manifest v1 validado em `CONTEXT.md` (string, em memória), sem introduzir nenhuma verdade, seleção ou interpretação nova além do que o Manifest já afirma.

## 2. Contexto

Contrato de referência: `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md`, Seção 1 ("Manifest é canônico... CONTEXT.md é derivado dele, nunca o contrário") e `plano_bloco_12.md` (Bloco 07 — Markdown Renderer: "seções fixas e legíveis por LLM... derivadas estritamente do manifesto — sem lógica de seleção própria no renderer"). Esta sessão já entregou o núcleo do Compiler (Bloco 05) — este bloco é a primeira camada que produz um artefato diretamente consumível por um humano ou agente de IA, sem ainda expor nenhum comando de CLI.

## 3. Problema que Este Bloco Resolve

Sem um Renderer, o Manifest canônico (JSON estruturado) não é diretamente legível por um agente de IA ou humano sem ferramentas adicionais. O risco concreto que este bloco evita: (1) o Renderer "enriquecendo" o Markdown com fatos que o Manifest não contém (ex.: inferir Architecture ou Out of Scope por NLP sobre prosa livre, o mesmo erro que o Authority Model já rejeitou para conflitos); (2) conteúdo de fonte arbitrário (que pode conter headings, fences, ou texto adversarial como "ignore previous instructions") quebrando a estrutura top-level do documento ou sendo interpretado como instrução em vez de evidência.

## 4. Escopo

- `renderContextMarkdown(manifest)` em `src/context/renderer.js` — valida o Manifest via `assertContextManifest` (reaproveitado de `context-schema.js`, nunca duplicado) e produz uma string Markdown determinística.
- Dez seções top-level fixas, sempre na mesma ordem, sempre presentes mesmo vazias: Goal, Project State, Current Session, Architecture, Relevant Files, Decisions, Constraints, Known Bugs, Validation, Out of Scope.
- Architecture como *view* filtrada de `relevant_files` (apenas `source.kind === "architecture"`) — nunca um novo fato.
- Proteção estrutural contra Markdown injection: fences dinâmicos (mais backticks que a maior sequência já presente no conteúdo) para todo conteúdo de fonte, inline-code escaping para todo valor estrutural (paths, ids, hashes).
- `excluded_sources` renderizado como subseção de Relevant Files, nunca como "Out of Scope" (semânticas distintas: orçamento/seleção vs. escopo de produto).
- `test/context-renderer.test.js` cobrindo os 49 cenários do prompt do bloco.

## 5. Fora de Escopo

- `src/commands/context.js`, alteração de `src/cli.js`, comandos `context build/show/validate`.
- `src/context/validator.js` (VALID/STALE/INVALID) — pertence a bloco futuro.
- `src/context/sensitive-files.js` (Sensitive Data Guard completo).
- `.ddae/`, `manifest.json`/`CONTEXT.md` em disco, `validation.json`.
- Recalcular relevância, autoridade, ou fingerprint — o Renderer só lê o que o Manifest já registrou.
- Inferir um campo `out_of_scope` a partir de `constraints`/`excluded_sources`/`kind`/texto livre — Manifest v1 não tem esse campo; a seção sempre reporta ausência explícita de dado.
- Alteração de `src/context/authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `src/schemas/context-schema.js`, os três coletores, `src/templates/`.

## 6. Arquivos e Pastas Envolvidos

- `src/context/renderer.js` (novo).
- `test/context-renderer.test.js` (novo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_06_markdown_renderer.md` (este arquivo).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_06_markdown_renderer.md` e `08_feedbacks/feedback_bloco_06_markdown_renderer.md` (gerados após a CI técnica verde).

## 7. Dependências

- `legacy/sessions/session_12_context_compiler_foundation/contrato_context_manifest_v1.md` (Seção 1) e `plano_bloco_12.md` (Bloco 07).
- `src/schemas/context-schema.js` — único import de produção permitido (`assertContextManifest`), reaproveitado sem alteração.
- `src/context/manifest.js`, `compiler.js` — usados apenas para construir fixtures/provas de teste, nunca importados por `renderer.js`.

## 8. Plano de Implementação

1. Reler Seção 1 do contrato do Manifest v1 e a descrição do Bloco 07 em `plano_bloco_12.md`.
2. Implementar helpers puros: `inlineCode` (escaping de valor estrutural via backtick dinâmico), `codeBlock` (fence dinâmico para conteúdo de fonte, normalização CRLF→LF), `emptyState`.
3. Implementar cada seção como função pura recebendo o Manifest (e um índice `sourceById` quando precisar de proveniência), na ordem fixa documentada.
4. Implementar `renderContextMarkdown(manifest)`: valida via `assertContextManifest`, monta `sourceById`, junta as dez seções, garante exatamente um newline final.
5. Escrever `test/context-renderer.test.js` cobrindo os cenários do prompt do bloco.
6. Rodar `npm test` e confirmar 0 falhas.
7. Rodar a prova self-host: compilar um Manifest real (via `compileContext`, Bloco 05) contra o próprio repositório e renderizá-lo, provando legibilidade, determinismo byte-a-byte, e que o fingerprint do Manifest permanece intocado.
8. Rodar `npm run package:check`, `npm run smoke`, `validate`/`audit` via Stable Host.
9. Confirmar `src/templates/`, `authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `context-schema.js` intocados; auditar o diff antes de commitar.

## 9. Critérios de Aceite

- [x] `CONTEXT.md` gerado a partir de um Manifest fixo é sempre byte-idêntico entre execuções.
- [x] Nenhuma seção do Markdown introduz informação ausente do manifesto.
- [x] As dez seções top-level existem exatamente uma vez cada, sempre na mesma ordem, mesmo vazias.
- [x] Architecture só lista `relevant_files` cujo `source.kind === "architecture"` — nunca promove documentação por menção textual.
- [x] `excluded_sources` aparece sob Relevant Files, nunca sob Out of Scope.
- [x] Out of Scope sempre renderiza a mesma frase neutra (Manifest v1 não tem esse campo).
- [x] Conteúdo de fonte com fences/headings adversariais nunca quebra a estrutura top-level do documento.
- [x] O Renderer nunca importa `authority.js`, `relevance.js`, `compiler.js`, ou qualquer coletor; nunca resolve conflito, nunca recalcula score, nunca recalcula fingerprint.
- [x] Manifest de entrada nunca é mutado.
- [x] Nenhum acesso a filesystem, rede, ou escrita.

## 10. Validações Obrigatórias

- [x] `npm test` — suíte completa, 0 falhas.
- [x] `npm run package:check` — OK, delta de arquivos explicado (não forçado).
- [x] `npm run smoke` — `[DDAE smoke] OK`.
- [x] `ddae-engine validate`/`audit` via Stable Host — `Status: OK`, `Errors: 0`.
- [x] CI remota 5/5 (a confirmar após push).

## 11. Segurança

O Renderer nunca abre `source.path` nem lê nenhum conteúdo além do que já está em `manifest`/`relevant_files[].content` — não amplia a fronteira de leitura estabelecida pelo Compiler (Bloco 05). Todo conteúdo de fonte é tratado como dado/evidência, nunca como instrução: fences dinâmicos garantem que Markdown adversarial embutido em um arquivo-fonte (headings falsos, fences aninhados, prosa tipo "ignore previous instructions") permaneça contido dentro do bloco de código, sem escapar para a estrutura do documento.

## 12. Performance

Não aplicável — concatenação de strings em memória sobre um número pequeno de seções/objetos, sem I/O.

## 13. Design System / UX

Não aplicável ao design system do produto DDAE-Engine em si, mas a legibilidade do `CONTEXT.md` gerado foi revisada manualmente (Etapa 30 do prompt do bloco) como critério de qualidade: um agente deve entender objetivo, estado do projeto, sessão atual, arquitetura selecionada, arquivos relevantes, decisões, constraints, bugs e validação/conflitos sem precisar consultar o Manifest JSON bruto.

## 14. Riscos

- A seção Architecture depende inteiramente de `Source`s formalmente classificadas como `kind: "architecture"` estarem presentes em `relevant_files` — se nenhum candidato desse tipo for fornecido ao Compiler, a seção sempre aparecerá vazia, mesmo que exista documentação de arquitetura relevante em outro `kind`. Comportamento intencional (nunca inferir por NLP), documentado como limitação conhecida, não um bug.
- BUG-01 (template do glossário) continua aberto — não afeta este bloco.

## 15. Pendências Esperadas

- Nenhuma pendência P1/P2 esperada. A limitação de Architecture (Seção 14) é uma decisão de design documentada, não uma lacuna de implementação.

## 16. Feedback Obrigatório

Gerado via `ddae-engine feedback create --block bloco_06_markdown_renderer --session session_02_context_compiler_0_3_0` (Stable Host), somente após a CI técnica verde.

## 17. Commit Semântico Sugerido

```
feat(context): add markdown renderer
```
