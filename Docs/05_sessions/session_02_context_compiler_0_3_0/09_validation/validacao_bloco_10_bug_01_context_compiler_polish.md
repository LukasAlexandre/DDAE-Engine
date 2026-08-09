# Validação — Bloco 10: BUG-01 and Context Compiler Polish

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-09

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
6a8251285f266743ceac4f6515f5eae3f3ba17fa

git rev-parse origin/main
6a8251285f266743ceac4f6515f5eae3f3ba17fa

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0

Stable Host --version: 0.2.0
Candidate --version: 0.2.0
```

## Contrato fechado antes do código

Registrado em `05_blocks/bloco_10_bug_01_and_context_compiler_polish.md`, Seções 3 e 4, reaproveitando o registro original de BUG-01 em `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_identificados.md` — que já apontava a causa raiz correta (`renderTemplate` precisa de um mecanismo de escape, não apenas mudar o template-fonte) e o alvo (`session_02_context_compiler_0_3_0`).

## Reprodução do bug (antes de qualquer alteração de código)

```text
node bin/ddae-engine.js init --dir <consumidor TEMP>

Docs/00_ddae_engine/glossario.md gerado, Seção 2:
EXPECTED: | `{{PROJECT_NAME}}` | ... |  | `{{CURRENT_DATE}}` | ... |
ACTUAL:   | `ddae-bug01-repro` | ... |  | `2026-08-09` | ... |

Controle (não afetado): | `{{SESSION_NUMBER}}` | ... | — permaneceu literal corretamente
```

Confirmado que a causa é exatamente a descrita no registro original: `PROJECT_NAME`/`CURRENT_DATE` fazem parte do mapa de dados usado por `docTransform` (`src/commands/init.js`) para todo template de `docs_root/`, incluindo o cabeçalho do próprio glossário (interpolação correta, esperada), mas a mesma chave também aparece na tabela de documentação do arquivo, onde deveria permanecer literal.

## Investigação do mecanismo central

`renderTemplate` (`src/utils/text.js`) é a única função de substituição de placeholders, usada por 5 call sites (`init.js`, `session.js`, `block.js`, `prompt.js`, `feedback.js`). Antes da correção, não existia nenhuma forma de escape — uma chave presente no mapa de dados era sempre substituída, em toda ocorrência do documento, sem distinção de intenção. O único "escape" pré-existente era `{{NEXT_BLOCK}}`, que sobrevive literal apenas por nunca estar presente no mapa passado por `feedback.js` — mecanismo que não serve para `PROJECT_NAME`/`CURRENT_DATE`, pois essas chaves precisam ser interpoladas em outros pontos do mesmo documento.

## Correção implementada

`renderTemplate` passou a reconhecer um prefixo `\` imediatamente antes de `{{KEY}}`: quando presente, a barra é removida e o token sobrevive sem substituição, independentemente de a chave estar no mapa de dados. Aplicado apenas às duas linhas comprovadamente afetadas de `src/templates/docs_root/00_ddae_engine/glossario.md` (`\{{PROJECT_NAME}}`, `\{{CURRENT_DATE}}`), mais uma frase curta documentando a convenção (que usa `\\{{PROJECT_NAME}}` no template-fonte para exibir a própria sintaxe de escape, com a barra visível, no documento gerado).

## Verificação da correção

```text
node bin/ddae-engine.js init --dir <consumidor TEMP>

Docs/00_ddae_engine/glossario.md gerado, Seção 2:
| `{{PROJECT_NAME}}` | Nome da pasta do projeto alvo (`--dir`). | ...
| `{{CURRENT_DATE}}` | Data corrente em `YYYY-MM-DD`, ... | ...
| `{{SESSION_NUMBER}}` | Número de 2 dígitos da sessão ... | ...  (inalterado)

Cabeçalho do mesmo documento (operacional, linha 3):
> Projeto: <nome real do diretório> · Atualizado em: <data real ISO>
```

## Testes

- `test/text-render-template.test.js` — 8 testes unitários (novo): substituição operacional, ausência de chave preserva token, escape preserva token mesmo com chave presente, forma operacional e escapada coexistindo no mesmo documento, escape duplo exibe a sintaxe de escape, pureza/determinismo, barra não-adjacente não afetada, múltiplas ocorrências mistas — 8 pass.
- `test/cli-init.test.js` — 2 testes E2E novos via CLI real: comportamento operacional vs. literal no glossário gerado (incluindo checagem de que o nome real do projeto não vaza para a tabela, e de que `SESSION_NUMBER`/`NEXT_BLOCK` continuam se comportando como antes); determinismo entre dois projetos com o mesmo nome em diretórios distintos (glossário byte-idêntico) — 2 pass, mais os 4 testes pré-existentes do arquivo, 6/6.

## Regressão

```text
npm test              → 448 tests, 445 pass, 0 fail, 3 skip (438 pré-existentes + 10 novos)
npm run package:check  → OK, 106 files (inalterado)
npm run smoke           → [DDAE smoke] OK (Fresh init: OK exercitando a correção via tarball instalado)
stable host validate    → Status OK, Errors 0
stable host audit       → Status OK, Errors 0, Warnings 8 (7 pré-existentes + 1 esperado de bloco sem feedback)
```

## Diff auditado — núcleo do Context Compiler intocado

```text
git diff --name-only -- src/context/ src/schemas/ src/commands/context.js
(vazio)

git diff --name-only -- src/
src/templates/docs_root/00_ddae_engine/glossario.md
src/utils/text.js
```

Confirmado antes do commit técnico — a restrição central deste bloco de polish.

## Commit técnico e CI

- Commit técnico: `d561210c6ca9b48038a7f525e5876ff25e538bd8` — CI run `31337743031` — `success`, 5/5, primeira tentativa:
  - `ubuntu-latest / Node 22`: success
  - `ubuntu-latest / Node 24`: success
  - `ubuntu-latest / Node 26`: success
  - `windows-latest / Node 24`: success
  - `macos-latest / Node 24`: success

## Auditoria de P3/P4

- BUG-01 → corrigido neste bloco (movido para `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_corrigidos.md`).
- Structured context completeness (Bloco 09) → mantida P3, sem evidência nova de blocker; não implementada.
- Documentation provenance accuracy (Bloco 09) → corrigida neste bloco (ver seção seguinte).
- Sensitive Guard conservative false positives, Relevance lexical-only, Explicit claim groups → design v1 conhecido, não alterado, conforme instruído.

## Correção de provenance do Bloco 09

`09_validation/validacao_bloco_09_real_consumer_smoke.md` registrava incorretamente, na seção "Baseline confirmado antes do bloco", o SHA `8ab26b0221f001d46071a3c924da25b727e435ba` como o `HEAD` anterior ao início do Bloco 09 — esse SHA é, na verdade, o **commit técnico produzido pelo próprio Bloco 09**. O baseline real, anterior ao início do Bloco 09, era `1e35cf4c08dc2d2d73db885e1a46ad229510c40d` (fechamento do Bloco 08). Corrigido no documento, distinguindo explicitamente `PRE-BLOCK BASELINE` de `TECHNICAL COMMIT`, sem reescrever o restante do histórico do documento e sem alterar o resultado técnico do Bloco 09 (que permanece aprovado). Classificado como **P3 — documentation provenance accuracy — RESOLVED**.

## Riscos

Nenhum risco novo. BUG-01 fechado sem afetar nenhum outro placeholder pré-existente.

## Pendências para o Bloco 11

- Bloco 11 — Context Compiler 0.3.0 Release Preparation: version bump, changelog, release notes, npm publish, tag `v0.3.0`.
- Structured context completeness (P3, não bloqueante) segue disponível para avaliação nesse ou em bloco futuro dedicado, a critério do usuário.

## Confirmação de zero implementação além do escopo

- `src/context/authority.js`, `relevance.js`, `manifest.js`, `fingerprint.js`, `compiler.js`, `renderer.js`, `validator.js`, `sensitive-files.js`, `src/schemas/context-schema.js`, `src/commands/context.js`, os três coletores, `src/cli.js` — não alterados.
- `package.json`, `package-lock.json` — não alterados/ausente.
- `.ddae/` — ausente do próprio repositório DDAE-Engine.
- Nenhum version bump, publish, tag ou release neste bloco.

## Resultado Final

**BLOCO 10 — BUG-01 + CONTEXT COMPILER POLISH: APROVADO**
