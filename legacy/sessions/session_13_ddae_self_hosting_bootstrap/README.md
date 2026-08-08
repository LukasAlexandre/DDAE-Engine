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
| 02 — Stable Host Install + Collision Probe & Safe Scaffold Merge | Instalar o stable host; gerar scaffold em TEMP via stable host; matriz de colisão; merge seguro apenas dos paths `MISSING` | Concluído |
| 03 — Canonical Self-Host Session Bootstrap | `session create` via stable host para a primeira sessão canônica de self-hosting | Concluído |
| 04 — Stable Host Self-Validation Proof | `validate`/`audit` contra o próprio repositório, via stable host | Concluído |
| 05 — Self-Hosting Closure + Package Isolation Contract | Reconfirmar isolamento do pacote npm; documentar o contrato de execução self-host; fechar a sessão | Concluído |

Ver `plano_bloco_13.md` para o detalhamento de cada bloco, `contrato_self_hosting_v1.md` para o contrato técnico completo (já corrigido no Checkpoint 01.1), `validacao_bloco_01_self_hosting_contract.md` para o registro histórico do Bloco 01 original, e `validacao_checkpoint_01_1_stable_host_correction.md` para a correção.

## Status atual

Bloco 01 concluído; Checkpoint 01.1 concluído (modelo corrigido para stable host); Bloco 02 concluído — `ddae-engine@0.2.0` instalado como stable host efêmero (`node_modules/ddae-engine/`, nunca commitado), scaffold `Docs/` (50 arquivos) gerado exclusivamente pelo stable host e mesclado com segurança (0 `CONFLICT`, 0 `IDENTICAL`, 50 `MISSING` copiados), `docs/sessions/`/`feedback/` preservados intocados, isolamento de pacote reconfirmado (95 arquivos, zero vazamento). `package.json` permanece byte-a-byte inalterado (hash confirmado antes/depois) e a tag `v0.2.0` permanece imutável. Ainda não existe nenhuma sessão canônica real em `Docs/05_sessions/` (só `README.md`).

## Status atual (Bloco 03)

Bloco 03 concluído — `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/` criada exclusivamente pelo Stable Host (`session create`, 13 módulos, 21 arquivos), transição registrada dentro da própria sessão, roadmap oficial (`0.3.0` Context Compiler in development, `0.4.0` Obsidian Workspace / Project Brain planned) persistido em `Docs/01_product/visao_produto.md` e `proposta_solucao.md`. `docs/sessions/` permanece intocado. Isolamento de pacote reconfirmado (95 arquivos). Achado registrado: `PROJECT_NAME` incorreto (`ddae-self-host-scaffold`) em ~44 arquivos do scaffold herdado do diretório TEMP do Bloco 02 — corrigido apenas nos 2 arquivos editados neste bloco, correção mecânica dos demais fica pendente.

## Status atual (Bloco 04)

Bloco 04 concluído — `validate`/`audit` via Stable Host confirmados idênticos antes e depois da normalização (`Status: OK`, 0 erros em ambos), provando que não havia problema estrutural. 43 arquivos do scaffold canônico tiveram o cabeçalho de identidade (`> Projeto: ...`) normalizado de `ddae-self-host-scaffold` para `DDAE Engine`, mudança puramente textual (diff de 1 linha por arquivo). Achado real registrado, não corrigido neste bloco: `docs/00_ddae_engine/glossario.md` linha 28 tem um bug de template-fonte (`src/templates/`) que renderiza `{{PROJECT_NAME}}`/`{{CURRENT_DATE}}` em vez de documentá-los literalmente — afeta todo projeto que roda `ddae-engine init`, não é específico deste bootstrap, fica pendente para sessão futura dedicada.

## Status atual (Bloco 05) — SESSION 13 CONCLUÍDA

Bloco 05 concluído — bootstrap de self-hosting formalmente encerrado. A instância de `Docs/00_ddae_engine/glossario.md` foi corrigida (placeholders exibidos literalmente); o bug de template-fonte correspondente (BUG-01) foi registrado em `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_identificados.md`, deliberadamente não corrigido em `src/templates/` nesta sessão. `Docs/00_ddae_engine/self_hosting.md` foi criado como contrato operacional oficial, incluindo o modelo de promoção Stable → Candidate. Isolamento de pacote reconfirmado uma última vez (95 arquivos, zero vazamento). `session_01_ddae_self_hosting_bootstrap` foi formalmente fechada como **Aprovada com ressalvas** (única ressalva: BUG-01, P3, não bloqueante).

**Esta sessão legacy de transição (`session_13_ddae_self_hosting_bootstrap`) está CONCLUÍDA.** A partir deste ponto, `docs/sessions/` não recebe novas sessões de desenvolvimento — permanece como histórico de engenharia imutável (sessões `session_00` a `session_13`). Toda sessão de desenvolvimento futura do DDAE Engine nasce em `Docs/05_sessions/`, criada pelo Stable Host.

## Próxima sessão canônica

`Docs/05_sessions/session_02_context_compiler_0_3_0` (ainda não criada) — retoma o Context Compiler exatamente no ponto em que `docs/sessions/session_12_context_compiler_foundation/` parou (Bloco 03 — DDAE State Collector), agora sob o control plane canônico. Recomendado resolver BUG-01 no início dessa sessão.
