# Feedback — Bloco 10: BUG-01 and Context Compiler Polish

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## 1. Resumo Executivo

Bloco de polish/correção, deliberadamente pequeno: corrigiu BUG-01 (o template do glossário renderizava, em vez de documentar, os tokens `{{PROJECT_NAME}}`/`{{CURRENT_DATE}}`) com um mecanismo mínimo de escaping em `renderTemplate`, sem tocar o núcleo do Context Compiler já provado no Bloco 09. O bug foi reproduzido contra o binário Candidate antes de qualquer alteração de código, confirmando exatamente o comportamento descrito no registro original (`session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_identificados.md`). A correção adiciona suporte a um prefixo `\` que preserva um placeholder como token literal (`\{{PROJECT_NAME}}` → `{{PROJECT_NAME}}`), aplicado apenas às duas linhas afetadas do glossário-fonte, mais uma frase curta documentando a própria convenção. 10 testes novos (8 unitários sobre `renderTemplate`, 2 E2E via `ddae-engine init` real) provam o comportamento operacional preservado, o comportamento literal corrigido, e determinismo. `src/context/**`, `src/schemas/context-schema.js` e `src/commands/context.js` permanecem intocados — confirmado por diff explícito antes do commit técnico. Regressão fechou em 448 testes (438 pré-existentes + 10 novos), 0 falhas. Commit técnico `d561210c6ca9b48038a7f525e5876ff25e538bd8`, CI 5/5 na primeira tentativa. "Bloco concluído conforme escopo, **aprovado, sem blocker**."

## 2. Objetivo do Bloco

Corrigir BUG-01 com o menor mecanismo possível, sem tocar o núcleo do Context Compiler já provado no Bloco 09, e fechar o polish documental pendente da Session 02 (incluindo a correção de uma inexatidão de provenance encontrada no documento de validação do Bloco 09).

## 3. Escopo Implementado

Exatamente o escopo planejado, sem divergência: reprodução do bug, escape mínimo em `renderTemplate`, aplicação no glossário-fonte, testes de regressão unitários e E2E, auditoria de P3/P4, correção documental de provenance do Bloco 09, e fechamento de BUG-01 (aberto → corrigido) no registro original da sessão predecessora.

## 4. Arquivos Criados

- `test/text-render-template.test.js`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_10_bug_01_and_context_compiler_polish.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_10_bug_01_and_context_compiler_polish.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_10_bug_01_and_context_compiler_polish.md` (este arquivo)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_10_bug_01_context_compiler_polish.md`

## 5. Arquivos Alterados

- `src/utils/text.js` — `renderTemplate` ganha suporte a um prefixo `\` que escapa um placeholder, preservando-o literal.
- `src/templates/docs_root/00_ddae_engine/glossario.md` — as duas linhas afetadas da tabela usam o escape; uma frase curta documenta a convenção.
- `test/cli-init.test.js` — 2 testes E2E novos.
- `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_identificados.md` e `bugs_corrigidos.md` — BUG-01 movido de aberto para corrigido.
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_09_real_consumer_smoke.md` — correção factual de provenance (ver Seção 10).
- `Docs/05_sessions/session_02_context_compiler_0_3_0/README.md`, `09_validation/fechamento_sessao.md`.

**`src/context/**`, `src/schemas/context-schema.js`, `src/commands/context.js` não foram alterados.**

## 6. Arquivos Removidos

Nenhum.

## 7. Comandos Executados

```
node node_modules/ddae-engine/bin/ddae-engine.js block create "BUG-01 and Context Compiler Polish" --session session_02_context_compiler_0_3_0 --dir .
node node_modules/ddae-engine/bin/ddae-engine.js prompt create --block bloco_10_bug_01_and_context_compiler_polish --session session_02_context_compiler_0_3_0 --dir .
node bin/ddae-engine.js init --dir <consumidor TEMP>   (reprodução, antes e depois da correção)
node --test test/text-render-template.test.js
node --test test/cli-init.test.js
npm test
npm run package:check
npm run smoke
node node_modules/ddae-engine/bin/ddae-engine.js validate --dir .
node node_modules/ddae-engine/bin/ddae-engine.js audit --dir .
git diff --name-only -- src/context/ src/schemas/ src/commands/context.js
node node_modules/ddae-engine/bin/ddae-engine.js feedback create --block bloco_10_bug_01_and_context_compiler_polish --session session_02_context_compiler_0_3_0 --dir .
```

## 8. Testes Realizados

- **Reprodução manual antes da correção**: `ddae-engine init` real contra consumidor TEMP; leitura de `Docs/00_ddae_engine/glossario.md` gerado confirmou EXPECTED (tokens literais `{{PROJECT_NAME}}`/`{{CURRENT_DATE}}` na tabela) vs. ACTUAL (valores reais substituídos, ex.: `ddae-bug01-repro`, `2026-08-09`), enquanto `{{SESSION_NUMBER}}` e demais placeholders não mapeados permaneciam corretamente literais — confirmando exatamente o BUG-01 descrito no registro original.
- **Verificação manual após a correção**: mesmo fluxo, glossário gerado mostra `{{PROJECT_NAME}}`/`{{CURRENT_DATE}}` literais na tabela, cabeçalho do próprio documento (`> Projeto: ... · Atualizado em: ...`) continua interpolado com valores reais.
- `test/text-render-template.test.js` — 8 testes unitários sobre `renderTemplate`: substituição operacional, ausência de chave no mapa preserva o token (comportamento pré-existente), escape preserva o token mesmo com a chave presente no mapa, forma operacional e escapada da mesma chave coexistem no mesmo documento, escape duplo exibe a própria sintaxe de escape, pureza/determinismo da função, barra invertida não-adjacente a um placeholder não é afetada, múltiplos placeholders operacionais e escapados no mesmo documento — 8 pass, 0 fail.
- `test/cli-init.test.js` — 2 testes E2E novos via CLI real: (1) glossário gerado interpola operacionalmente no cabeçalho mas preserva literal na tabela — inclusive checando que o nome real do projeto não vaza para a tabela e que placeholders não mapeados (`SESSION_NUMBER`, `NEXT_BLOCK`) continuam se comportando como antes; (2) determinismo — dois projetos com o mesmo nome (`fixed-project-name`, em diretórios temporários distintos) produzem glossário byte-idêntico — 2 pass, 0 fail (4 pré-existentes de `cli-init.test.js` continuam passando, 6/6 no arquivo).
- Suíte completa (`npm test`): 448 testes, 445 pass, 0 fail, 3 skip.

## 9. Validações Executadas

- `npm test` — 448/445/0/3 (438 pré-existentes + 10 novos, nenhuma remoção).
- `npm run package:check` — OK, 106 files (inalterado).
- `npm run smoke` — `[DDAE smoke] OK` (inclui `Fresh init: OK`, exercitando a correção através do tarball instalado; `Context compiler: OK` inalterado).
- `ddae-engine validate --dir .` (Stable Host) — `Status: OK`, `Errors: 0`.
- `ddae-engine audit --dir .` (Stable Host) — `Status: OK`, `Errors: 0`, `Warnings: 8` (7 quality gates pendentes pré-existentes + 1 aviso esperado de bloco sem feedback, capturado antes deste próprio feedback existir).
- `git diff --name-only -- src/context/ src/schemas/ src/commands/context.js` — vazio, confirmado antes do commit técnico.

## 10. Decisões Técnicas

- **Escape por prefixo `\` diretamente antes de `{{KEY}}`**, consumido no render (`\{{X}}` → `{{X}}`), em vez de qualquer forma de pós-processamento específico do arquivo do glossário — decisão deliberada para satisfazer a regra do bloco de não usar hack frágil (regex exclusiva de uma linha, path hardcoded, marker aleatório). É a menor extensão possível do mecanismo já existente (`renderTemplate`), consistente com o padrão de sintaxe de escape usado por outros template engines simples (ex.: Handlebars).
- **Apenas as duas linhas comprovadamente afetadas (`PROJECT_NAME`, `CURRENT_DATE`) foram escapadas no glossário-fonte** — as demais linhas da tabela (`SESSION_NUMBER`, `SESSION_TITLE`, etc.) já sobreviviam literais por simples ausência do mapa de dados usado por `docTransform`; escapá-las também não mudaria o resultado, mas ampliaria o diff sem corrigir um bug reproduzível — mantido fora do escopo.
- **Nota de uma frase documentando a convenção de escape foi adicionada ao próprio glossário** — decisão de manter a correção auto-descritiva: um futuro autor de template (humano ou agente) precisa saber que o mecanismo existe para poder usá-lo corretamente em templates futuros.
- **Correção de provenance do Bloco 09 tratada como correção factual isolada, não como reabertura do resultado técnico** — ver Seção 13 e a nota explícita no próprio documento corrigido.

## 11. Problemas Encontrados

Nenhum problema bloqueante. A reprodução manual confirmou o bug exatamente como descrito no registro original antes de qualquer alteração de código, e a correção funcionou na primeira tentativa (verificada manualmente antes de escrever os testes automatizados).

## 12. Correções Aplicadas Durante o Bloco

Nenhuma correção adicional além do escopo planejado.

## 13. Pendências

### P1 — Crítica

Nenhuma.

### P2 — Importante

Nenhuma.

### P3 — Melhoria Recomendada

- **Structured context completeness (UX)** — herdada do Bloco 09, mantida P3, não implementada aqui por não haver evidência nova de blocker (ver `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_09_real_consumer_smoke.md`).
- **Documentation provenance accuracy** — encontrada no Bloco 09 (baseline do documento de validação registrado incorretamente como o próprio commit técnico do bloco), **RESOLVIDA** neste bloco (ver Seção 10 e a nota explícita no documento corrigido).

### P4 — Opcional

Nenhuma.

## 14. Riscos Restantes

Nenhum risco novo. BUG-01 fechado; nenhum outro placeholder pré-existente foi afetado pela correção (confirmado pela suíte completa e pelo `smoke` real).

## 15. Evidências

```text
Reprodução (antes da correção), tabela de placeholders do glossário gerado:
| `ddae-bug01-repro` | Nome da pasta do projeto alvo (`--dir`). | ...
| `2026-08-09` | Data corrente em `YYYY-MM-DD`, ... | ...
| `{{SESSION_NUMBER}}` | Número de 2 dígitos da sessão ... | ...   <- já correto antes

Verificação (depois da correção), mesma tabela:
| `{{PROJECT_NAME}}` | Nome da pasta do projeto alvo (`--dir`). | ...
| `{{CURRENT_DATE}}` | Data corrente em `YYYY-MM-DD`, ... | ...
| `{{SESSION_NUMBER}}` | Número de 2 dígitos da sessão ... | ...

Cabeçalho do glossário gerado (operacional, inalterado):
> Projeto: ddae-bug01-repro3 · Atualizado em: 2026-08-09

npm test: 448 tests, 445 pass, 0 fail, 3 skip
npm run package:check: OK, 106 files (inalterado)
npm run smoke: [DDAE smoke] OK
stable host validate: Status OK, Errors 0
stable host audit: Status OK, Errors 0, Warnings 8 (pré-existentes + 1 esperado)
git diff --name-only -- src/context/ src/schemas/ src/commands/context.js: (vazio)

Technical commit: d561210c6ca9b48038a7f525e5876ff25e538bd8
Technical CI: 31337743031 — success, 5/5 (primeira tentativa)
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

Bloco 11 — Context Compiler 0.3.0 Release Preparation.

## 18. Commit Semântico Sugerido

```
fix(init): preserve literal glossary placeholders
```

_Lembrete: este commit não é executado automaticamente — exige confirmação explícita do usuário._
