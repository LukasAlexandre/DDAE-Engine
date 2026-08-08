# Regressão

> Projeto: DDAE · Atualizado em: 2026-08-08

> Use esta lista para verificar que funcionalidades existentes não foram quebradas pelos blocos desta sessão — não é o mesmo que `plano_testes.md`, que cobre o que é novo.

## 1. Casos de Regressão

| ID | Funcionalidade existente afetada | Como verificar | Resultado |
|---|---|---|---|
| RG-01 | Suíte de testes do candidate (`npm test`) | Executar após cada bloco do bootstrap | Passou — 67 total, 65 pass, 0 fail, 2 skip, em todos os blocos (02–05) |
| RG-02 | Empacotamento npm (`npm run package:check`) | Executar após instalação do stable host e após o scaffold `Docs/` | Passou — `OK`, 95 files, sem variação |
| RG-03 | Distribuição real (`npm run smoke`) | Executar após cada bloco | Passou — `[DDAE smoke] OK` em todos os blocos |
| RG-04 | `ddae-engine validate --dir .` contra o próprio repositório, via Stable Host | Bloco 04 (antes/depois da normalização) e reconfirmação no Bloco 05 | Passou — `Status: OK`, `Errors: 0`, idêntico nas 3 execuções |
| RG-05 | `ddae-engine audit --dir .` contra o próprio repositório, via Stable Host | Bloco 04 (antes/depois) e reconfirmação no Bloco 05 | Passou — `Status: OK`, `Errors: 0`, `Sessions found: 1`, `session_01` reconhecida como sessão real |
| RG-06 | Isolamento do pacote npm (`npm pack --dry-run --json`) | Após instalação do stable host, após o scaffold, e no fechamento | Passou — 95 arquivos, zero vazamento de `Docs/`/`docs/`/`node_modules/`/`package-lock.json` em todas as verificações |

## 2. Áreas de Risco para Regressão

Nenhum código de produto (`src/`, `bin/`, `test/`, `scripts/`) foi alterado por esta sessão — todo o trabalho é aditivo em `Docs/` (novo) e documental em `docs/sessions/session_13_.../` (legacy, orquestração da transição). A área de maior risco teórico era o gate de empacotamento (`package.json.files` allowlist) deixar vazar o novo scaffold para o tarball publicável — mitigado e comprovado estruturalmente inofensivo (RG-06), já que a allowlist nunca incluiu `Docs/`/`docs/`.

## 3. Perguntas Orientadoras

- Esta sessão alterou algum contrato (`Docs/03_contracts/`) consumido por outra parte do sistema não diretamente tocada? Não — os contratos gerados pelo scaffold são templates ainda não preenchidos, sem consumidor real além desta própria sessão.
- Existe teste automatizado cobrindo esta área, ou a verificação é só manual? Ambos: `npm test`/`package:check`/`smoke` são automatizados (67 testes); `validate`/`audit` via Stable Host foram execuções manuais registradas como evidência em cada bloco (RG-04/RG-05), por serem a própria prova de self-hosting, não algo coberto pela suíte `node:test` do candidate.

## 4. Decisões Pendentes

Nenhuma.
