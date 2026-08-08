# Migração de Identidade — DDAD para DDAT

## Status

Concluído.

## Nome anterior

`ddad` — Document-Driven AI Development.

## Nome novo

`ddat` — Document-Driven AI Tools.

## Motivo da mudança

O nome `ddad` foi bloqueado pelo npm por similaridade com pacotes existentes. A alternativa escolhida foi DDAT, com significado oficial Document-Driven AI Tools.

## Decisão

- **Nome do projeto:** DDAT
- **Significado:** Document-Driven AI Tools
- **Pacote npm:** `ddat`
- **Comando CLI:** `ddat`

## Impactos

- `package.json`: campo `name` (`ddad` → `ddat`) e campo `bin` (`{"ddad": "./bin/ddad.js"}` → `{"ddat": "./bin/ddat.js"}`).
- `bin/ddad.js` renomeado para `bin/ddat.js` (shebang e lógica de entrada preservados).
- `src/cli.js`: texto de ajuda, mensagens de uso e exemplos atualizados de `ddad`/"Document-Driven AI Development" para `ddat`/"Document-Driven AI Tools".
- Mensagens de console em `src/commands/{init,validate,audit,block,session}.js` atualizadas para `ddat`.
- Pasta de template `src/templates/docs_root/00_ddad/` renomeada para `src/templates/docs_root/00_ddat/`, refletida em `Docs/00_ddat/` em todo projeto gerado pelo `ddat init`.
- Arquivo `src/templates/docs_root/00_ddat/regras_ddad.md` renomeado para `regras_ddat.md`.
- Arquivo de configuração gerado pelo `init` renomeado de `ddad.config.json` para `ddat.config.json`.
- `MAIN_SUBFOLDERS` e `ROOT_FILES` em `src/commands/validate.js` e `src/commands/audit.js` atualizados para apontar para `00_ddat` e `ddat.config.json`.
- Todos os templates oficiais (`agents/`, `prompt/`, `block/`, `validation/`, `feedback/`, `session/*`, `docs_root/*`, `quality_gates/final_audit_gate.md`) tiveram as referências institucionais (`DDAD`, `Document-Driven AI Development`, `ddad`) substituídas por (`DDAT`, `Document-Driven AI Tools`, `ddat`), incluindo os caminhos cruzados `Docs/00_ddad/...` → `Docs/00_ddat/...`.
- `README.md` principal: rebranding completo (título, exemplos `npx ddad ...` → `npx ddat ...`, árvore de pastas, seção de uso local) e nota de migração adicionada no topo.
- `.gitignore`: adicionada a entrada `tmp_ddat_*/`, mantendo `tmp_ddad_*/` por compatibilidade com artefatos antigos.
- Histórico de `docs/sessions/session_00` a `session_05` e respectivos `feedback/feedback_bloco_00` a `feedback_bloco_05` **não foi alterado** — preservados como registro do que de fato aconteceu sob o nome DDAD.
- URLs do repositório GitHub (`repository`, `homepage`, `bugs` em `package.json`) **não foram alteradas** nesta etapa: apontam para o repositório real (`github.com/LukasAlexandre/DDAD`), cuja eventual renomeação está fora do escopo deste bloco de código.

## Compatibilidade

Não haverá publicação oficial como `ddad`. O nome `ddad` permanece bloqueado/indisponível no registro npm e não será reutilizado. Toda publicação futura do CLI usará exclusivamente o nome `ddat`.

## Exemplos de uso

```bash
npx ddat init
npx ddat validate
npx ddat audit
```
