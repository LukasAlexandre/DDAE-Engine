# Session 11 — Estabilização de CI e Release 0.2.0

## Contexto

A Session 10 corrigiu o modelo de sessões da DDAE Engine e foi integrada a `main` (commit `3de0da5`), mas a versão `0.2.0` resultante ainda não foi publicada no npm — o registro público continua em `0.1.0`. Durante o push da Session 10, o GitHub informou que o repositório foi movido para `github.com/LukasAlexandre/DDAE-Engine`; o push só funcionou por redirect automático, porque o remote local e os metadados do pacote (`package.json`) ainda apontam para o nome antigo, `github.com/LukasAlexandre/DDAD`.

Esta sessão existe para regularizar essa identidade, construir a primeira fundação de CI do projeto, proteger o processo de publicação e validar a distribuição real de `0.2.0` — **antes** de publicar qualquer coisa e antes de iniciar a Session 12 (Obsidian/Vault).

## Objetivo

Preparar a publicação segura e verificável de `ddae-engine@0.2.0`, sem publicar nada até que identidade, CI, proteção de release e smoke tests estejam todos aprovados.

## Escopo

1. Regularizar a identidade oficial do repositório e do pacote (`repository`, `homepage`, `bugs`, remote Git local).
2. Estabelecer CI multiplataforma (GitHub Actions).
3. Proteger o processo de empacotamento e publicação (`prepublishOnly` → `release:check`).
4. Validar a distribuição real de `0.2.0` via smoke test do tarball instalado.
5. Publicar `0.2.0` com tag e release — somente com autorização humana separada e específica para esse passo.

## Fora de Escopo

- Integração Obsidian/Vault (Session 12).
- Context Compiler, MCP, dashboards.
- Publicação automatizada sem supervisão humana.
- Criação retroativa da tag `v0.1.0` (exigiria auditoria de reprodutibilidade do artefato publicado, não realizada nesta sessão).
- Reescrita de qualquer documento histórico (`docs/sessions/session_00`–`09`, `feedback/` anteriores).

## Estado Inicial Confirmado

```text
Branch: main
HEAD: 3de0da5
origin/main: 3de0da5 (idêntico)
Working tree: limpo
Testes: 29/29 aprovados
Versão local: 0.2.0
Versão publicada no npm: 0.1.0
Tag v0.2.0: inexistente
CI: inexistente
Remote atual: https://github.com/LukasAlexandre/DDAD.git
Remote correto: https://github.com/LukasAlexandre/DDAE-Engine.git
```

## Blocos

| Bloco | Objetivo | Status |
|---|---|---|
| 01 — Regularização da identidade oficial | Corrigir `repository`/`homepage`/`bugs` e o remote local; preservar histórico | Concluído / Aprovado |
| 02 — Fundação de CI multiplataforma | GitHub Actions: Ubuntu (Node 24, 26), Windows (Node 24), macOS (Node 24) | Não iniciado |
| 03 — Proteção de empacotamento e publicação | `package:check`, `smoke`, `release:check`, `prepublishOnly` | Não iniciado |
| 04 — Smoke tests da distribuição 0.2.0 | Instalar o tarball real isoladamente e validar o binário instalado | Não iniciado |
| 05 — Tag, release e publicação controlada | Somente com nova autorização humana | Não iniciado |

## Decisões Aprovadas (revisão do usuário sobre o planejamento inicial)

1. Remote/URLs oficiais: `https://github.com/LukasAlexandre/DDAE-Engine.git` (e variantes `.git`/`/issues`).
2. Suporte Node oficial para os próximos blocos: `>=24` (substitui a proposta inicial `>=18`/matriz ampla) — decisão a ser aplicada em `package.json` no **Bloco 02**, não neste bloco.
3. Matriz de CI: Ubuntu/Node 24, Ubuntu/Node 26, Windows/Node 24, macOS/Node 24 — 4 jobs, sem matriz cartesiana excessiva.
4. Nenhum `package-lock.json` será criado artificialmente enquanto o projeto não tiver dependências reais.
5. `prepublishOnly` chamará `release:check` (que agrega `npm test` + `package:check` + `smoke`), não apenas `npm test`.
6. A tag `v0.1.0` retroativa **não será criada** nesta sessão.
7. A publicação continua manual — sem automação de `npm publish`.
8. O Bloco 05 exige autorização humana separada da autorização geral desta sessão.

## Riscos

- Ausência de teste real em Node 24/26 até agora (ambiente de desenvolvimento usado nas Sessions 10 foi Node v24.15.0, mas nunca testado contra Node 26 nem contra `engines` `>=24` formalmente).
- Custo de runners macOS no GitHub Actions (aceito conscientemente pela natureza fortemente dependente de filesystem/paths do projeto).
- Repetição do histórico de bloqueio de nome no `npm publish` (risco residual baixo — o nome `ddae-engine` já está registrado na mesma conta).

## Critérios Globais da Sessão

- Nenhum documento histórico (`docs/sessions/session_00`–`09`, `feedback/` anteriores) alterado.
- Nenhuma referência operacional atual continua apontando para `DDAD` ao final da sessão.
- CI verde antes de qualquer publicação.
- `release:check` aprovado localmente antes de qualquer publicação.
- Publicação real ocorre somente no Bloco 05, com autorização separada.

## Condição para Publicação

`npm publish` de `0.2.0` só pode ocorrer depois que: identidade regularizada (Bloco 01) + CI verde (Bloco 02) + `release:check` aprovado (Bloco 03) + smoke test do tarball instalado aprovado (Bloco 04) + autorização humana explícita para o Bloco 05.

## Status Atual

Em andamento. Bloco 01: concluído/aprovado. Bloco 02: próximo bloco, ainda não iniciado. Blocos 03–05: não iniciados.
