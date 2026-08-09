# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue, livremente, [Keep a Changelog](https://keepachangelog.com/). O versionamento segue [SemVer](https://semver.org/); enquanto o pacote estiver em `0.x`, mudanças incompatíveis incrementam a versão `MINOR`.

## [0.3.0] — 2026-08-09

Context Compiler. Registrado em `Docs/05_sessions/session_02_context_compiler_0_3_0/`.

### Added

- `ddae-engine context build --goal "<text>" [--session <name>] [--budget minimal|standard|deep]`: compila o estado atual do Git, dos arquivos do projeto e da sessão DDAE (`Docs/05_sessions/`) em um pacote de contexto determinístico, sob `.ddae/context/` (self-`.gitignore`d) — `manifest.json` (canônico, fingerprinted), `CONTEXT.md` (leitura humana/agente) e `validation.json` (recibo de frescor).
- `ddae-engine context show` / `ddae-engine context validate`: leitura e verificação de frescor (`VALID` / `STALE` / `INVALID`) estritamente read-only.
- Coleta de contexto (Git, projeto, sessão DDAE), Source/Authority Model, motor de relevância lexical goal-driven (sem tradução/stemming/sinônimos, sem threshold mínimo — exclusão só por pressão de orçamento), Context Manifest v1 com fingerprint canônico, e renderer Markdown determinístico com dez seções fixas.
- Sensitive Data Guard: deny-list por nome, limite de tamanho, detecção de binário, containment de path, symlink fail-closed e heurística de conteúdo sensível — aplicados antes de qualquer leitura de conteúdo, permitindo ingestão segura de texto real do projeto.
- Zero chamada a LLM, zero acesso a rede, zero embeddings — todo o pipeline roda local e offline.

### Fixed

- BUG-01: o template do glossário (`Docs/00_ddae_engine/glossario.md`) renderizava, em vez de documentar, os tokens `{{PROJECT_NAME}}`/`{{CURRENT_DATE}}` em sua própria tabela de referência.

### Known limitation

- As seções estruturadas do manifesto (`decisions`, `bugs`, `validation`) só são populadas a partir de entrada formalmente estruturada — não há extração automática por NLP a partir de Markdown. O conteúdo correspondente continua selecionado e disponível em `## Relevant Files`.

## [0.2.0] — 2026-08-07

Correção do modelo de sessões e módulos internos. Registrado em `docs/sessions/session_10_correcao_modelo_sessoes/`.

### Changed

- `ddae-engine init` não cria mais dez sessões predefinidas — `Docs/05_sessions/` passa a conter apenas `README.md` logo após o `init`.
- A primeira sessão real criada em qualquer projeto agora começa em `session_01` (antes: `session_11`, porque as 10 sessões pré-criadas consumiam a numeração).
- Os diretórios internos (`01_intake` ... `13_release`) passam a ser tratados explicitamente como **módulos** de uma sessão, nunca como sessões em si.
- A numeração de sessões considera somente diretórios que casam estritamente com `^session_(\d+)_([a-z0-9_]+)$` diretamente sob `Docs/05_sessions/` — arquivos, módulos e nomes fora do padrão nunca interferem.
- `ddae-engine validate` aceita projetos ainda sem nenhuma sessão como válidos, e passa a reportar `Sessions found: N`.
- `ddae-engine audit` passa a distinguir sessão de módulo, reportar `Sessions found: N`, e classificar cada sessão como `vazia`, `em andamento` ou `concluída`.
- Metadados do pacote (`repository`, `homepage`, `bugs`) e o remote Git local corrigidos para apontar para o repositório atual (`github.com/LukasAlexandre/DDAE-Engine`), refletindo a renomeação já efetivada do lado do GitHub. Registrado em `docs/sessions/session_11_estabilizacao_ci_e_release_0_2_0/`.
- Suporte oficial de Node.js redefinido para `>=22` (era `>=18`). Node 18 e 20 estão end-of-life e saem da política oficial; Node 22 continua LTS mantido, Node 24 é a referência principal, Node 26 é validado em CI como linha Current.

### Added

- 29 testes automatizados com `node:test` (`npm test`), sem dependências novas.
- Detecção não destrutiva de projetos com o layout legado de 10 sessões pré-criadas (`ddae-engine audit` emite um warning; nada é apagado ou renumerado automaticamente).
- `Docs/05_sessions/README.md` — novo documento gerado pelo `init`, explicando o modelo sessão vs. módulo dentro do próprio projeto scaffolded.
- CI multiplataforma (GitHub Actions) cobrindo Ubuntu (Node 22/24/26), Windows (Node 24) e macOS (Node 24) — validada remotamente com 5/5 jobs aprovados.
- `npm run package:check` (`scripts/release/verify-package.mjs`): valida metadados essenciais (`name`, `version`, `engines.node`, `bin`), identidade de repositório, presença de arquivos obrigatórios (`README.md`, `LICENSE`, `CHANGELOG.md`, `bin/ddae-engine.js`) e ausência de arquivos proibidos (`test/`, `.github/`, `docs/sessions/`, segredos) no conteúdo real do pacote (`npm pack --dry-run --json`), não apenas em `package.json.files`.
- `npm run release:check` (`npm test && npm run package:check && npm run smoke`) e `prepublishOnly` (`npm run release:check`) — `npm publish` passa a executar automaticamente testes, verificação do pacote e o smoke de distribuição antes de qualquer publicação real.
- `npm run smoke` (`scripts/release/smoke-distribution.mjs`): empacota um tarball real (`npm pack`, não dry-run), instala-o isoladamente em um diretório temporário fora do checkout, e executa a jornada completa do CLI (`--version`, `--help`, `init`, `session create` ×2, `block create`, `prompt create`, `feedback create`, `validate`, `audit`, detecção de layout legado) contra o binário efetivamente instalado — provando que o artefato publicável funciona de forma independente do repositório de origem, não apenas do checkout local.
- CI com hardening de supply chain: `actions/checkout` e `actions/setup-node` fixadas por SHA de commit imutável (não mais por tag móvel); `persist-credentials: false` no checkout; `npm run smoke` roda nos 5 ambientes da matriz.
- O pacote permanece sem dependências de runtime ou desenvolvimento (`dependencies` e `devDependencies` vazios), preservando a distribuição zero-dependency.

### Compatibility

Projetos criados com a versão `0.1.0` (ou anterior) podem conter `session_01_project_foundation` ... `session_10_final_audit` já scaffolded, mesmo sem trabalho real dentro. Essas pastas **não são migradas, apagadas ou renumeradas automaticamente**. `ddae-engine audit` identifica esse layout legado e recomenda revisão manual antes de qualquer consolidação ou renumeração. Uma ferramenta de migração assistida (`doctor`/`migrate sessions`) não foi implementada nesta versão — fica planejada para uma sessão futura dedicada.

## [0.1.0] — 2026-06-25

Primeira publicação pública no registro npm, como `ddae-engine`, após a sequência de tentativas bloqueadas por similaridade de nome (`ddad`, `ddat`, `ddae`). Ver `docs/sessions/session_09_migracao_final_ddae_engine/`.
