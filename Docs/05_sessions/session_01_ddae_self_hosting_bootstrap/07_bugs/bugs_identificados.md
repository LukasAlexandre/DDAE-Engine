# Bugs Identificados

> Projeto: DDAE · Atualizado em: 2026-08-08

> Registre aqui qualquer bug encontrado durante a sessão, mesmo que fora do escopo do bloco atual — não corrija silenciosamente sem registro.

## 1. Lista de Bugs

| ID | Descrição | Severidade | Onde foi encontrado | Status |
|---|---|---|---|---|
| BUG-01 | Template de glossário renderiza placeholders que deveria documentar | P3 | Bloco 04 desta sessão (self-hosting), `Docs/00_ddae_engine/glossario.md` | **Corrigido** — ver `07_bugs/bugs_corrigidos.md` (fonte corrigida no Bloco 10 de `session_02_context_compiler_0_3_0`) |

## 2. Detalhamento

### BUG-01 — Template de glossário renderiza placeholders que deveria documentar

- **Scope:** `ddae-engine init` template rendering (`src/templates/docs_root/00_ddae_engine/glossario.md`).
- **Affected:** qualquer projeto que execute `ddae-engine init` — não é específico deste self-hosting bootstrap.
- **Comportamento observado:** a Seção "2. Placeholders Reconhecidos pelo CLI" de `glossario.md` deveria documentar literalmente os tokens `{{PROJECT_NAME}}` e `{{CURRENT_DATE}}` (no mesmo estilo das linhas seguintes da mesma tabela, que corretamente mostram `{{SESSION_NUMBER}}`, `{{SESSION_TITLE}}`, etc.). Em vez disso, essas duas linhas específicas aparecem já renderizadas com o valor real (ex.: `ddae-self-host-scaffold`, `2026-08-08`) porque `PROJECT_NAME`/`CURRENT_DATE` fazem parte do mapa de substituição usado para templates de `docs_root/` (via `docTransform` em `src/commands/init.js`), enquanto `SESSION_NUMBER`/`SESSION_TITLE`/etc. não fazem parte desse mapa — sobrevivem literalmente por não serem reconhecidos nesse contexto, não porque exista um mecanismo de escape intencional.
- **Comportamento esperado:** a tabela deveria exibir os tokens literais (`{{PROJECT_NAME}}`, `{{CURRENT_DATE}}`) independentemente de qual mapa de substituição está ativo para o tipo de template — exige um mecanismo de escape no `renderTemplate` (`src/utils/text.js`), não apenas mudar o conteúdo do template-fonte.
- **Passos para reproduzir:** `ddae-engine init --dir <qualquer-projeto>` e abrir `Docs/00_ddae_engine/glossario.md`, Seção 2 — as duas primeiras linhas da tabela de placeholders mostram valores concretos, não os tokens `{{...}}`.
- **Bloco/arquivo relacionado:** descoberto no Bloco 04 desta sessão (`docs/sessions/session_13_ddae_self_hosting_bootstrap/validacao_bloco_04_self_host_validation.md`); a instância gerada neste próprio repositório (`Docs/00_ddae_engine/glossario.md`) foi corrigida manualmente no Bloco 05, mas `src/templates/docs_root/00_ddae_engine/glossario.md` e o mecanismo de `renderTemplate` **não foram alterados** — correção da fonte deliberadamente adiada.
- **Impact:** documentação gerada semanticamente incorreta para todo consumidor do `init`; o futuro Context Compiler (`0.3.0`), ao coletar `Docs/` como fonte de contexto, poderia ingerir essa mesma inconsistência em qualquer projeto que ainda não tenha corrigido a instância manualmente.
- **Workaround:** correção manual da instância gerada (aplicada aqui).
- **Source fix:** pendente.
- **Target:** sessão de desenvolvimento `0.3.0` (`session_02_context_compiler_0_3_0`), preferencialmente resolvido antes do Context Compiler começar a consumir `Docs/` como fonte real.
- **Status:** **CORRIGIDO** — fonte (`src/templates/docs_root/00_ddae_engine/glossario.md` + `renderTemplate` em `src/utils/text.js`) corrigida no Bloco 10 de `session_02_context_compiler_0_3_0`, antes do Context Compiler consumir `Docs/` como fonte real (conforme o alvo definido aqui). Detalhamento completo da correção em `07_bugs/bugs_corrigidos.md` desta sessão.

## 3. Perguntas Orientadoras

- Este bug é específico desta sessão ou indica um problema sistêmico que afeta outras partes do produto? **Sistêmico** — afeta `src/templates/`/`renderTemplate`, usado por todo `ddae-engine init`, não apenas por este self-hosting bootstrap.
- Este bug deveria bloquear o bloco atual (P1/P2) ou pode ser registrado para depois (P3/P4)? **P3** — não bloqueia a estrutura (`validate`/`audit` continuam `Status: OK`), é um defeito de conteúdo semântico, mitigado pela correção manual desta instância; não bloqueia o fechamento da Session 13, mas deve ser resolvido antes do Context Compiler depender de `Docs/` como fonte de verdade.

## 4. Decisões Pendentes

Se a correção da fonte (`src/templates/` + `renderTemplate`) deve introduzir um mecanismo de escape genérico (ex.: `\{{TOKEN}}`) ou uma convenção de bloco de código não processado — decisão técnica para o início da `session_02_context_compiler_0_3_0`, não tomada aqui.
