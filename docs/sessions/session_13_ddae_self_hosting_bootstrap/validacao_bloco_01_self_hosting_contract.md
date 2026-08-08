# Validação — Bloco 01: Self-Hosting Contract

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
1c2fa2b19191c70bf5edb3e107c185ea96a67b0f

git rev-parse origin/main
1c2fa2b19191c70bf5edb3e107c185ea96a67b0f

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0
```

Estado idêntico ao commit de fechamento documental do Bloco 02 da Session 12, working tree limpo — exatamente o esperado antes de iniciar a Session 13.

## Decisão revisada antes de qualquer execução

A proposta inicial deste bootstrap previa `npm install --no-save --package-lock=false --ignore-scripts ddae-engine@0.2.0` para instalar um "host estável" separado do "candidate" em `node_modules/ddae-engine/`. Antes de executar qualquer instalação, essa decisão foi levada ao usuário com dois pontos verificáveis:

1. O Bloco 02 da Session 12 não tocou `src/cli.js` nem nenhum comando do CLI — apenas adicionou dois collectors não conectados a nenhuma interface. Logo, o checkout atual (`node bin/ddae-engine.js`) e `ddae-engine@0.2.0` publicado são comportamentalmente idênticos para `init`/`session create`/`validate`/`audit` hoje.
2. O bootstrap completo (scaffold de `Docs/`, ~50 arquivos) é uma decisão de arquitetura de repositório, não um ajuste de bloco — merece um Bloco 01 de contrato próprio, no mesmo padrão já usado nas Sessions 11 e 12.

**Decisão do usuário**: usar somente o checkout (sem `npm install` do pacote publicado) e formalizar como Session 13 com Bloco 01 de contrato antes de qualquer scaffold. Ambas as recomendações foram aceitas. Nenhuma instalação de pacote foi executada nesta sessão.

## Fato verificado: isolamento de pacote

Antes de escrever o contrato, o fato central da Seção 7 (`contrato_self_hosting_v1.md`) foi verificado diretamente, não assumido:

```text
node -e "console.log(require('./package.json').files)"
["bin","src","README.md","LICENSE","CHANGELOG.md"]

npm pack --dry-run --json → 95 arquivos
any docs/Docs-prefixed file in pack today: 0 []
```

`package.json.files` é uma allowlist. Nenhum arquivo com prefixo `docs/` ou `Docs/` aparece no pacote hoje, e nenhum aparecerá depois do scaffold — o mecanismo de proteção não depende de `FORBIDDEN_PREFIXES` nem de nenhuma regra nova; é estrutural. Essa verificação evitou que o contrato descrevesse uma proteção como "política a ser seguida" quando na verdade já é uma garantia do próprio `package.json`.

## Decisões tomadas neste bloco

| # | Decisão | Escolha |
|---|---|---|
| 1 | Princípio de self-hosting | DDAE-Engine consome os mesmos contratos que oferece a consumidores |
| 2 | Host vs. Candidate | Usar somente o checkout (`node bin/ddae-engine.js`); revisitar quando `context` for exposto no CLI e divergir de uma release pública |
| 3 | Planos de controle | `docs/sessions/` = legacy interno, imutável; `Docs/05_sessions/` = canônico self-host, novo, numeração reiniciada em `session_01` |
| 4 | Case-insensitivity (Windows) | `Docs`/`docs` compartilham nó físico, mas `sessions/` e `05_sessions/` são subdiretórios distintos — sem colisão, confirmado por inspeção |
| 5 | Estratégia de scaffold | TEMP dry-run + matriz de colisão (`MISSING`/`IDENTICAL`/`CONFLICT`) + merge seguro só de `MISSING`, nunca sobrescrita automática de `CONFLICT` |
| 6 | Proteção de histórico | `docs/sessions/` e `feedback/` imutáveis durante toda a Session 13 |
| 7 | Isolamento de pacote | Estrutural, via allowlist de `package.json.files` — verificado, não assumido |
| 8 | Status da Session 12 | Pausada após Bloco 02 (não concluída), motivo registrado |

## Inspeção do repositório antes do contrato

```text
=== repo root ===
.claude .git .github .gitignore CHANGELOG.md LICENSE README.md
bin docs feedback package.json scripts src test

=== docs/ contents (todos os subdiretórios) ===
docs/sessions

=== CLAUDE.md / AGENTS.md / .cursorrules / ddae-engine.config.json na raiz? ===
nenhum existe ainda
```

Confirma que o scaffold do Bloco 02 não colide com nada além de `docs/sessions/` (que não é um nome usado por `ddae-engine init`) e que nenhum dos 4 arquivos de raiz gerados por `init` já existe — reduzindo (mas não eliminando) a probabilidade de `CONFLICT` na matriz de colisão do Bloco 02, que ainda assim deve ser produzida e revisada integralmente, não presumida a partir desta amostra.

## Riscos

- **Reversão futura da decisão host/candidate.** Documentada explicitamente no contrato (Seção 3) com a condição exata de quando revisitar (Bloco 08 da Session 12, quando `context` divergir entre candidate e última release pública) — não fica implícita nem esquecida.
- **Bloco 02 pode revelar `CONFLICT`s não antecipados.** Mitigado pela própria estratégia definida aqui: nenhuma sobrescrita automática, decisão manual por conflito.
- **Session 12 pausada, não fechada, por tempo indefinido.** Aceito conscientemente — a alternativa (forçar o fechamento da Session 12 antes de saber onde o Context Compiler será retomado) criaria um registro histórico falso.

## Pendências para o Bloco 02

- Gerar o scaffold real em `<TEMP>` via `node bin/ddae-engine.js init --dir <TEMP>`.
- Construir a matriz de colisão completa (case-insensitive) contra o repositório real.
- Mesclar com segurança apenas os paths `MISSING`.
- Registrar total gerado / `MISSING` / `IDENTICAL` / `CONFLICT` na validação do Bloco 02.

## Confirmação de zero implementação além do contrato

- `Docs/` — não existe no repositório.
- `node_modules/ddae-engine/` — não existe (nenhuma instalação foi executada).
- Nenhuma `session create` foi executada.
- `package.json` — não alterado.
- `src/`, `bin/`, `test/`, `scripts/` — não alterados.
- Único arquivo pré-existente editado: `docs/sessions/session_12_context_compiler_foundation/README.md`, apenas na seção de status (pausa registrada).

## Verificação de que somente os arquivos previstos foram alterados

```bash
git status --short
 M docs/sessions/session_12_context_compiler_foundation/README.md
?? docs/sessions/session_13_ddae_self_hosting_bootstrap/
```

Nenhum arquivo fora desses dois caminhos foi criado, modificado ou removido.

## Regressão — testes, package check e smoke

Executados após a criação dos documentos, antes do commit:

- `npm test`: baseline esperado 67 descobertos, 65 aprovados, 2 skip, 0 falhas (idêntico ao final da Session 12 — nenhum código foi tocado).
- `npm run package:check`: baseline esperado `OK`, 95 arquivos.
- `npm run smoke`: baseline esperado `[DDAE smoke] OK`.

## Conclusão do bloco

O contrato de self-hosting está fechado. A decisão de usar somente o checkout (sem instalar o pacote publicado) elimina um artefato desnecessário sem perda de proteção real hoje. O isolamento de pacote foi verificado como fato estrutural, não como política a confiar. A Session 12 está formalmente pausada, não fechada. O Bloco 02 pode iniciar com um contrato estável e uma estratégia de merge seguro já definida.
