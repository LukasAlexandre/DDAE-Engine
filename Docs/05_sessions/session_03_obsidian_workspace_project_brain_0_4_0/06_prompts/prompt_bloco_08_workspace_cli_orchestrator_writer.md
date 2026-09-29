# Prompt — Bloco 08: Workspace CLI, Orchestrator & Writer

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/05_blocks/bloco_08_workspace_cli_orchestrator_writer.md` (**inclusive as Decisões Abertas, Seção 27**)
- `Docs/03_contracts/contrato_workspace_project_brain.md` (Seções B.1, D, D.1, E, F, H — fonte principal, não reabrir)
- `Docs/02_architecture/decisoes_tecnicas.md` (DT-01, DT-02, DT-03) e `Docs/02_architecture/adr_knowledge_memory_context.md`
- Blocos 03–07 (+ Correção 07b), seus feedbacks e validações
- `src/workspace/{discover,compiler,fingerprint,renderer,context-packages,validator}.js`, `src/schemas/brain-schema.js`, `src/commands/context.js`, `src/cli.js` e os testes correspondentes

**Pré-condição:** as Decisões D1–D11 do bloco devem estar aprovadas pelo usuário antes de qualquer código. Se não estiverem, pare e pergunte. Confirme também, lendo o código, que o pipeline da Seção 8 do bloco ainda vale.

**Ponto de partida (verifique):** branch `feat/0.4.0-project-brain`, working tree limpo, baseline `npm test` = 655 total / 652 pass / 0 fail / 3 skip.

## 2. Objetivo

Conectar as peças puras existentes em um workspace materializado: Orchestrator puro + Writer (única fronteira de escrita) + CLI `workspace init|build|validate|show`, gerando `.ddae/brain/manifest.json` e `DDAE-Brain/*.md` de forma determinística, idempotente e segura. **Coordenar, nunca reimplementar** Discovery, Compiler, Validator, Renderer, Context Compiler ou Context Packages.

## 3. Escopo

Conforme a Seção 5 do bloco, nas fases internas aprovadas em D1:
- **Fase A (puro):** `views` no Compiler (antes do fingerprint), navegação Home→Context-Packages (D2), parâmetro opcional de contexts em Context Packages (D4), `src/workspace/orchestrator.js`, e o ajuste do Validator só se D3 for aprovada.
- **Fase B:** `src/workspace/writer.js`.
- **Fase C:** `src/commands/workspace.js`, `src/cli.js`, self-host.

## 4. Fora de Escopo

`src/context/**` (não alterar); Bloco 09 (Sync/Publish, `.obsidian/`, bidi/Unicode, corpus adversarial); Blocos 10–13; Claude-Mem, Memory, Skills/References, Block Types; `validation.json` (D9); apagar arquivos (D7); ler `CONTEXT.md`/conteúdo; rede; push, tag, release.

## 5. Arquivos Permitidos

- Criar: `src/workspace/orchestrator.js`, `src/workspace/writer.js`, `src/commands/workspace.js`, `test/workspace-orchestrator.test.js`, `test/workspace-writer.test.js`, `test/workspace-cli.test.js`
- Alterar (mudanças mínimas, aditivas, retrocompatíveis): `src/workspace/compiler.js`, `src/workspace/renderer.js`, `src/workspace/context-packages.js`, `src/cli.js`; `src/workspace/validator.js` **somente** se D3 aprovada; testes existentes correspondentes **apenas por adição**
- Documentação do Bloco 08 e da Session 03 (bloco, feedback, validação, README)
- Qualquer outro arquivo: pare e reporte antes.

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md` e o estilo do código vizinho (comentários, nomes, idioma).
- Registre toda pendência encontrada com prioridade P1–P4.
- **TDD por fase:** testes primeiro, RED real registrado (quantidade e motivo), depois implementação mínima, GREEN, regressão. Não edite testes antigos para chegar a GREEN (salvo erro comprovado — pare e explique).
- **Session = Feature:** continue na Session 03; problemas viram novos blocos/correções dentro dela.
- Orchestrator **puro** (sem fs/Git/rede/relógio/aleatoriedade/console); todo I/O em Discovery/Context state, Writer e comando.
- `views` entra no Manifest **antes** do fingerprint; nunca mutar o Manifest depois.
- Todos os testes que escrevem em disco usam diretório temporário; nenhum teste escreve `DDAE-Brain/` ou `.ddae/brain/` no repositório real.

## 7. Restrições de Segurança

Writer com allow-list (`DDAE-Brain/*.md`, `.ddae/brain/manifest.json`, `.ddae/brain/.gitignore`), path lexical + `realpath`/`lstat` fail-closed (symlink que escapa ⇒ recusa), validação de **todos** os paths antes da primeira escrita, overwrite conforme D6, reasons/mensagens sem conteúdo de arquivo. Sem novos pontos de leitura de conteúdo. Não antecipar o Bloco 09.

## 8. Restrições de Performance

Um Discovery e um `collectContextPackageState` por comando; sem releitura de `Docs/` além do Discovery; rebuild idêntico ⇒ zero escritas.

## 9. Restrições de Design System

Não aplicável (saída Markdown/CLI textual; sem UI).

## 10. Tarefas

1. Gate: `git status`, branch, `git log -5`; baseline de testes. Divergência ⇒ pare.
2. Reconstruir contexto (Seção 1) e confirmar D1–D11 aprovadas.
3. **Fase A** (TDD): Compiler `views`; Renderer navegação; Context Packages contexts opcionais; Orchestrator (declaração de producers, `expectedViews` derivado, compile→validate→render→compose, invariantes de duplicata e declared==generated); Validator só se D3.
4. **Fase B** (TDD): Writer (allow-list, path/symlink, overwrite D6, idempotência, atomicidade D8, sem cleanup D7).
5. **Fase C** (TDD): `workspace init|build|validate|show` no padrão de `context`; exit codes do contrato; HELP; self-host em temporário.
6. Regressão global; revisão de escopo; documentação (bloco, feedback, validação, README).
7. Commit(s) seletivos **somente com autorização**; sem push.

## 11. Critérios de Aceite

Os da Seção 26 do bloco.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit` (0 erros)
- [ ] testes específicos por fase e `npm test` (0 falhas; baseline 655/652/0/3 + novos)
- [ ] `npm run package:check` e `npm run smoke`
- [ ] `git diff --check`
- [ ] Revisão de escopo: `src/context/**`, `brain-schema.js`, `fingerprint.js`, `discover.js` inalterados; Bloco 09 não antecipado; sem Claude-Mem/rede

## 13. Feedback Final Obrigatório

Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_08_workspace_cli_orchestrator_writer --session session_03_obsidian_workspace_project_brain_0_4_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/09_validation/` com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
feat(workspace): compile brain views before fingerprint
feat(workspace): add brain workspace writer
feat(workspace): add workspace cli
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
