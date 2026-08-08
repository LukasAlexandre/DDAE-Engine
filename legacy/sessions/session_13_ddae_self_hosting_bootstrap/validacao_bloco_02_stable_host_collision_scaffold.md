# Validação — Bloco 02: Stable Host Install + Collision Probe & Safe Scaffold Merge

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
f4b7360a9721731da843a4f75950e67bf3e62a61

git rev-parse origin/main
f4b7360a9721731da843a4f75950e67bf3e62a61

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9
```

Estado idêntico ao commit do Checkpoint 01.1, working tree limpo — exatamente o esperado antes de instalar o stable host.

## Etapa A — Fingerprint do package metadata (antes)

```text
SHA-256(package.json) antes = 88354e5332011682410500d64b56fe8f0a6a1102b69b3912ce13e424a40a7693
package-lock.json = ausente
dependencies = {}
devDependencies = {}
```

## Etapa B — Instalação do stable host

```bash
npm install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund ddae-engine@0.2.0
```

```text
added 1 package in 765ms
```

## Etapa C — Verificação física da instalação

```text
node_modules/ddae-engine/package.json:
  name: ddae-engine
  version: 0.2.0
  bin: {"ddae-engine":"bin/ddae-engine.js"}
  dependencies: {}

node node_modules/ddae-engine/bin/ddae-engine.js --version
0.2.0

node node_modules/ddae-engine/bin/ddae-engine.js --help
ddae-engine — Document-Driven AI Engineering Engine
Usage:
  ddae-engine <command> [options]
Commands: ...
```

Stable host confirmado fisicamente distinto do candidate: `node_modules/ddae-engine/bin/ddae-engine.js` (host) vs. `bin/ddae-engine.js` (candidate) — dois arquivos diferentes em locais diferentes, mesmo reportando a mesma versão textual hoje.

## Etapa D — Prova de que o package metadata não mudou

```text
SHA-256(package.json) depois = 88354e5332011682410500d64b56fe8f0a6a1102b69b3912ce13e424a40a7693
MATCH: package.json unchanged

git diff -- package.json → (vazio)
package-lock.json → ausente
dependencies = {}
devDependencies = {}
git status --short (imediatamente após a instalação) → (vazio, sem node_modules/ listado)
```

A instalação do stable host não deixou nenhum vestígio em `package.json`, não criou `package-lock.json`, e `node_modules/` permaneceu corretamente invisível ao Git (primeira linha do `.gitignore` do repositório).

## Etapa E — Scaffold em TEMP via stable host

```bash
node node_modules/ddae-engine/bin/ddae-engine.js init --dir <TEMP>
```

```text
Created: 50 file(s)
Docs/05_sessions/ contém apenas README.md — zero sessions reais.
```

Executado exclusivamente com o binário do stable host (nunca `bin/ddae-engine.js` do candidate), em diretório temporário fora do checkout.

## Etapa F — Matriz de colisão

Comparação `case-insensitive` (nativa do filesystem Windows — `fs.existsSync`/`fs.readFileSync` resolvem `Docs/`/`docs/` como o mesmo nó físico automaticamente) entre os 50 arquivos gerados e o repositório real:

```text
TOTAL GENERATED: 50
MISSING: 50
IDENTICAL: 0
CONFLICT: 0
```

Nenhum `CONFLICT`. A lista completa de `MISSING` cobre: `.cursorrules`, `AGENTS.md`, `CLAUDE.md`, `ddae-engine.config.json`, e as 46 páginas de `Docs/00_ddae_engine/` até `Docs/99_archive/` (incluindo `Docs/05_sessions/README.md`) — nenhuma delas existia previamente no repositório, confirmando a análise prévia do Bloco 01 (Seção 4 do contrato: nenhum desses nomes já existia).

## Etapa G — Safe merge

Copiados exatamente os 50 paths `MISSING` do TEMP para o repositório real (nenhum `IDENTICAL` a pular, nenhum `CONFLICT` a preservar). Confirmado após a cópia:

```text
git diff --stat (arquivos rastreados) → (vazio — nenhum arquivo existente foi modificado)
git status --short docs/sessions/ → (vazio — histórico legado intocado)
git status --short feedback/ → (vazio — feedback legado intocado)
```

`docs/` agora contém, lado a lado, sob o mesmo nó físico (`Docs`/`docs`, case-insensitive no Windows): `docs/sessions/` (legacy, intocado) e `docs/00_ddae_engine/` ... `docs/99_archive/` (novo, incluindo `docs/05_sessions/`) — exatamente a estrutura prevista na Seção 4 do contrato. `git status` exibe os novos diretórios com a casing `docs/` (minúscula) porque essa é a casing já conhecida pelo Git a partir de `docs/sessions/`, independentemente de terem sido escritos fisicamente via `Docs/...` — comportamento nativo de filesystem case-insensitive, não um bug.

## Etapa H — Session create não executada

Confirmado: nenhum comando `session create` foi executado neste bloco. `Docs/05_sessions/` contém apenas `README.md` — isso é trabalho do Bloco 03.

## Etapa I — Isolamento de pacote (reconfirmado com o scaffold real)

```bash
npm pack --dry-run --json
```

```text
leaked files: 0 []
total files: 95
```

Idêntico ao total antes do scaffold (95 arquivos) — confirma empiricamente, com o scaffold real já presente, o que a Seção 7 do contrato previu como fato estrutural: `node_modules/`, `package-lock.json`, `Docs/`/`docs/` (incluindo `docs/sessions/`) nunca aparecem no pacote publicável.

## Etapa J — Regressão

```text
npm test        → 67 tests, 65 pass, 0 fail, 2 skip
npm run package:check → OK, 95 files
npm run smoke    → [DDAE smoke] OK
```

Idêntico ao baseline anterior a este bloco — o scaffold `Docs/` não afeta nenhum comportamento de código.

## Riscos

- **Comparação de colisão depende do comportamento nativo do Windows.** Em um filesystem case-sensitive (Linux/macOS com volume case-sensitive), a mesma lógica (`fs.existsSync`) funcionaria de forma equivalente porque `Docs/sessions/` e `docs/sessions/` seriam paths genuinamente diferentes lá — mas isso nunca ocorre neste bootstrap, porque o scaffold nunca gera nada chamado `sessions/` (só `05_sessions/`), então não há path que dependa dessa nuance para ser classificado corretamente.
- **Diretório temporário do scaffold.** Removido integralmente ao final da etapa E–G, sem deixar resíduo no scratchpad.

## Pendências para o Bloco 03

- `node node_modules/ddae-engine/bin/ddae-engine.js session create "DDAE self hosting bootstrap" --dir .` → `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/`.
- Documentar a transição dentro dessa sessão (objetivo, stable host/candidate, baseline de migração, planos de controle legacy vs. canônico).

## Confirmação de zero implementação além do escopo

- `src/`, `bin/`, `test/`, `scripts/` — não alterados.
- `package.json` — não alterado (hash idêntico antes/depois).
- `package-lock.json` — ausente.
- `dependencies`/`devDependencies` — `{}`.
- `node_modules/ddae-engine/` — presente localmente, nunca commitado.
- `docs/sessions/`, `feedback/` — intocados.
- Nenhuma `session create` executada.
