# Session 13 — DDAE Self-Hosting Bootstrap

Esta sessão adota o próprio DDAE Engine como consumidor da metodologia que ele oferece a terceiros: o repositório passa a ter um `Docs/` real, sessões canônicas em `Docs/05_sessions/`, e passa a ser validável pelo próprio `ddae-engine validate`/`audit` — sem apagar ou migrar o histórico interno já existente em `docs/sessions/`.

## Objetivo

> Usar a versão estável do próprio DDAE Engine para governar, a partir de agora, o desenvolvimento futuro do repositório DDAE-Engine — sem criar autodependência publicada, sem auto-modificação autônoma, e sem apagar o histórico existente.

## Motivação

Até a Session 12, o próprio desenvolvimento do DDAE-Engine foi documentado em `docs/sessions/` — uma convenção interna simples, criada antes de o produto sequer ter o contrato de sessões/módulos que hoje oferece a consumidores (esse contrato só foi corrigido na Session 10). O DDAE-Engine nunca rodou `ddae-engine validate`/`ddae-engine audit` contra si mesmo. A Session 13 fecha esse gap: o repositório adota o scaffold oficial (`Docs/`), começa uma nova sequência de sessões canônicas em `Docs/05_sessions/`, e passa a ser sujeito às mesmas checagens que qualquer projeto consumidor.

## Baseline pós-Session 12 (Bloco 02)

| Item | Valor |
|---|---|
| HEAD | `1c2fa2b19191c70bf5edb3e107c185ea96a67b0f` |
| origin/main | `1c2fa2b19191c70bf5edb3e107c185ea96a67b0f` |
| Working tree | limpo |
| Tag `v0.2.0` (peeled) | `2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9` |
| NPM `dist-tags.latest` | `0.2.0` |
| `package.json.version` | `0.2.0` |
| Session 12 | Bloco 02 aprovado; Bloco 03 não iniciado; pausada em favor desta sessão |

A tag `v0.2.0` continua imutável durante toda a Session 13.

## Escopo

- Definir o contrato de self-hosting (princípios, modelo host/candidate, separação de planos de controle, estratégia de scaffold seguro, proteção do histórico legado, isolamento de pacote) — Bloco 01.
- Gerar o scaffold `Docs/` com segurança, via matriz de colisão, sem sobrescrever nada existente — Bloco 02.
- Criar a primeira sessão canônica de self-hosting em `Docs/05_sessions/` — Bloco 03.
- Validar o próprio repositório com `ddae-engine validate`/`audit` — Bloco 04.
- Confirmar isolamento de pacote e documentar o contrato de execução self-host — Bloco 05.

## Fora de escopo

- Qualquer alteração em `src/`, `bin/`, `test/`, `scripts/`.
- Migração, renumeração ou exclusão de `docs/sessions/`.
- Retomada do Bloco 03 da Session 12 (Context Compiler) — decidida em bloco futuro desta sessão, não agora.
- Publicação npm, tag, ou GitHub Release.

## Blocos

| Bloco | Objetivo | Status |
|---|---|---|
| 01 — Self-Hosting Contract | Fechar o contrato: princípio de self-hosting, separação de planos de controle, estratégia de scaffold seguro, proteção de histórico, isolamento de pacote | Concluído |
| 01.1 — Stable Host Contract Correction | Corrigir o modelo host/candidate do Bloco 01 (checkout único) para instalação real de `ddae-engine@0.2.0` como stable host efêmero | Concluído |
| 02 — Stable Host Install + Collision Probe & Safe Scaffold Merge | Instalar o stable host; gerar scaffold em TEMP via stable host; matriz de colisão; merge seguro apenas dos paths `MISSING` | Pendente |
| 03 — Canonical Self-Host Session Bootstrap | `session create` via stable host para a primeira sessão canônica de self-hosting | Pendente |
| 04 — Stable Host Self-Validation Proof | `validate`/`audit` contra o próprio repositório, via stable host | Pendente |
| 05 — Package Isolation & Self-Hosting Documentation | Reconfirmar isolamento do pacote npm; documentar o contrato de execução self-host | Pendente |

Ver `plano_bloco_13.md` para o detalhamento de cada bloco, `contrato_self_hosting_v1.md` para o contrato técnico completo (já corrigido no Checkpoint 01.1), `validacao_bloco_01_self_hosting_contract.md` para o registro histórico do Bloco 01 original, e `validacao_checkpoint_01_1_stable_host_correction.md` para a correção.

## Status atual

Bloco 01 concluído; Checkpoint 01.1 concluído — o modelo host/candidate foi corrigido de "checkout único" para "stable host `ddae-engine@0.2.0` instalado localmente e efemeramente via `npm install --no-save`". Nenhum arquivo foi criado em `Docs/`, nenhuma sessão canônica foi criada, nenhuma instalação de pacote foi feita ainda — isso é o Bloco 02. `package.json` e a tag `v0.2.0` permanecem inalterados.

## Próximos passos

Bloco 02 — Stable Host Install + Collision Probe & Safe Scaffold Merge: instalar `ddae-engine@0.2.0` via `npm install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund`, gerar o scaffold completo em um diretório temporário fora do checkout usando exclusivamente o stable host (`node node_modules/ddae-engine/bin/ddae-engine.js init --dir <TEMP>`), construir a matriz de colisão contra o repositório real, e mesclar com segurança apenas os paths ausentes.
