# Validação — Checkpoint 01.1: Stable Host Contract Correction

## Baseline confirmado antes do checkpoint

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
e6e074dfd3dba864ae86d2135efcfd9a43a556e2

git rev-parse origin/main
e6e074dfd3dba864ae86d2135efcfd9a43a556e2

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9

npm view ddae-engine version
0.2.0
```

Estado idêntico ao commit de fechamento do Bloco 01 da Session 13, working tree limpo.

## O que foi corrigido

O Bloco 01 decidiu, com justificativa técnica válida, usar somente o checkout do repositório (`node bin/ddae-engine.js`) para todas as ações de self-hosting, sem instalar `ddae-engine@0.2.0` via `npm install`. A justificativa — Bloco 02 da Session 12 não alterou nenhum comando de CLI, logo checkout e release publicada são comportamentalmente idênticos hoje — é factualmente correta e permanece registrada, sem alteração, em `validacao_bloco_01_self_hosting_contract.md`.

Essa decisão foi revista **não** porque a justificativa técnica estivesse errada, mas porque ela resolve a pergunta errada. O objetivo declarado do self-hosting não é "o binário do checkout funciona corretamente" — isso já é coberto pela suíte de testes existente. O objetivo é demonstrar uma propriedade mais forte: **uma release pública estável do DDAE consegue governar o desenvolvimento da próxima versão**. Usar apenas o checkout como "host" faz o DDAE executar seu próprio código corrente sobre si mesmo — não prova nada sobre a propriedade que motivou a sessão, mesmo que produza o mesmo resultado prático hoje.

## Decisão corrigida

**Modelo oficial a partir deste checkpoint:**

| Papel | Identidade | Local | Binário |
|---|---|---|---|
| **Stable Host** | `ddae-engine@0.2.0`, publicado no registro npm | `node_modules/ddae-engine/` (local, efêmero, gitignored) | `node node_modules/ddae-engine/bin/ddae-engine.js` |
| **Candidate** | checkout atual do repositório | `bin/`, `src/`, `test/`, `scripts/` | `node bin/ddae-engine.js` |

Todas as ações de self-hosting a partir do Bloco 02 (scaffold, `session create`, `validate`, `audit`) passam a ser executadas exclusivamente pelo stable host — nunca pelo candidate.

## Documentos alterados

- `contrato_self_hosting_v1.md` — Seção 3 reescrita: modelo stable host + comando de instalação + diagrama + justificativa de 7 pontos de por que o host estável é intencional, não circunstancial. Seções 9 (fora de escopo) e 10 (critérios de aceite) ajustadas para remover a exclusão da instalação e apontar para o stable host.
- `README.md` — tabela de blocos atualizada (Bloco 01.1 inserido; Bloco 02 renomeado para "Stable Host Install + Collision Probe & Safe Scaffold Merge"; Blocos 03/04 renomeados para deixar explícito o uso do stable host), seção "Fora de escopo" (removida a exclusão da instalação), "Status atual" e "Próximos passos" atualizados.
- `plano_bloco_13.md` — nova seção "Bloco 01.1"; Bloco 01 recebeu uma nota de "Correção posterior" sem alterar seus critérios de aceite originais; Bloco 02 reescrito com os passos reais de instalação, fingerprint de `package.json`, e verificação do stable host; Blocos 03/04/05 com os comandos corrigidos para o binário do stable host.
- `validacao_bloco_01_self_hosting_contract.md` — **conteúdo original preservado sem alteração**; apenas uma seção final "Nota de correção (Checkpoint 01.1)" foi anexada, apontando para este documento. O registro histórico do que foi decidido no Bloco 01 continua legível exatamente como foi na época.

## Por que `validacao_bloco_01_self_hosting_contract.md` não foi reescrito

Reescrever o registro original para dizer que o Bloco 01 sempre decidiu pelo stable host falsificaria a evidência: o Bloco 01 realmente decidiu pelo checkout único, essa decisão foi realmente commitada (`e6e074d`) e validada em CI 5/5. O princípio que rege toda esta sessão — "corrigir a arquitetura de forma explícita e rastreável, sem reescrever o passado" — se aplica também à própria documentação da correção, não só ao código e ao histórico de sessões legado. `e6e074d` permanece intocado como commit histórico da primeira hipótese.

## Verificação de que somente os documentos previstos foram alterados

```bash
git status --short
 M docs/sessions/session_13_ddae_self_hosting_bootstrap/README.md
 M docs/sessions/session_13_ddae_self_hosting_bootstrap/contrato_self_hosting_v1.md
 M docs/sessions/session_13_ddae_self_hosting_bootstrap/plano_bloco_13.md
 M docs/sessions/session_13_ddae_self_hosting_bootstrap/validacao_bloco_01_self_hosting_contract.md
?? docs/sessions/session_13_ddae_self_hosting_bootstrap/validacao_checkpoint_01_1_stable_host_correction.md
```

Nenhum arquivo fora de `docs/sessions/session_13_ddae_self_hosting_bootstrap/` foi tocado. `docs/sessions/session_12_.../`, `src/`, `bin/`, `test/`, `scripts/`, `package.json` permanecem inalterados neste checkpoint.

## Regressão

- `npm test`: baseline esperado 67 descobertos, 65 aprovados, 2 skip, 0 falhas (idêntico — nenhum código foi tocado).
- `npm run package:check`: baseline esperado `OK`, 95 arquivos.
- `npm run smoke`: baseline esperado `[DDAE smoke] OK`.

## Conclusão do checkpoint

A correção foi aplicada de forma explícita e rastreável: o commit `e6e074d` permanece como registro histórico da primeira hipótese, o registro de validação do Bloco 01 permanece legível sem alteração, e os documentos vivos (contrato, README, plano) agora refletem o modelo stable host que rege o Bloco 02 em diante. Nenhuma instalação de pacote, scaffold, ou sessão canônica foi criada neste checkpoint — isso é o Bloco 02.
