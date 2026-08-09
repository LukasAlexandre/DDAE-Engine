# Bugs Corrigidos

> Projeto: DDAE · Atualizado em: 2026-08-08

> Mova um bug de `bugs_identificados.md` para aqui somente depois que a correção foi verificada — não apenas implementada.

## 1. Lista de Correções

| ID | Bug original | Correção aplicada | Verificado em |
|---|---|---|---|
| BUG-01 | Template de glossário renderiza placeholders que deveria documentar | Escape `\{{KEY}}` em `renderTemplate` (`src/utils/text.js`) + aplicação nas duas linhas afetadas de `src/templates/docs_root/00_ddae_engine/glossario.md` | `session_02_context_compiler_0_3_0`, Bloco 10 — commit `d561210c6ca9b48038a7f525e5876ff25e538bd8`, CI 5/5 |

## 2. Detalhamento

### BUG-01 — Template de glossário renderiza placeholders que deveria documentar
- **Causa raiz:** `renderTemplate` (`src/utils/text.js`) não tinha nenhum mecanismo para distinguir "este `{{KEY}}` deve ser interpolado aqui" de "este `{{KEY}}` deve ser documentado literalmente aqui" — toda ocorrência de uma chave presente no mapa de dados era substituída, em qualquer lugar do documento. `PROJECT_NAME`/`CURRENT_DATE` estão no mapa usado por `docTransform` (`src/commands/init.js`) para todo template de `docs_root/`, incluindo o cabeçalho do próprio glossário (interpolação correta e esperada), mas a mesma chave também é citada, com a mesma sintaxe, na tabela de documentação do arquivo — onde deveria permanecer literal.
- **Correção aplicada:** `renderTemplate` passou a reconhecer um prefixo `\` imediatamente antes de `{{KEY}}` como escape — a barra é removida no render e o token sobrevive sem substituição, independentemente de a chave estar no mapa de dados. Aplicado apenas às duas linhas comprovadamente afetadas do glossário-fonte (`\{{PROJECT_NAME}}`, `\{{CURRENT_DATE}}`), mais uma frase curta documentando a convenção no próprio arquivo gerado.
- **Como foi verificado:** Ambos. Reprodução manual do bug contra o binário Candidate antes da correção (confirmando EXPECTED vs. ACTUAL exatamente como descrito neste registro); verificação manual da correção pelo mesmo fluxo; e 10 testes automatizados novos — 8 unitários sobre `renderTemplate` (`test/text-render-template.test.js`) e 2 E2E via `ddae-engine init` real (`test/cli-init.test.js`, incluindo um teste de determinismo entre dois projetos com o mesmo nome).
- **Risco de regressão:** Baixo. A mudança é aditiva — um novo padrão de escape opcional que não altera o comportamento de nenhum placeholder pré-existente que não o usa (confirmado pela suíte completa, 448 testes, 0 falhas, e por `npm run smoke`, que exercita `init` através do tarball instalado). Núcleo do Context Compiler (`src/context/**`, `src/schemas/context-schema.js`, `src/commands/context.js`) não foi tocado por esta correção.

## 3. Decisões Pendentes

Nenhuma. A decisão registrada em `bugs_identificados.md`, Seção 4 (mecanismo de escape genérico `\{{TOKEN}}` vs. convenção de bloco não processado) foi tomada no Bloco 10 de `session_02_context_compiler_0_3_0`: escape por prefixo `\`, por ser a extensão mínima do mecanismo já existente.
