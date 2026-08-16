# Checkpoint 12.1 — v0.3.0 Publish Reconciliation & Canonical Release Commit

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-16

## Natureza

Checkpoint procedural, sem implementação e sem operação irreversível. Reconcilia um fato descoberto fora da sequência documentada do Bloco 12: `ddae-engine@0.3.0` já está publicado no npm, mas nenhum dos três Human Gates do Bloco 12 foi executado neste checkout — ou seja, o Gate A (`npm publish`) ocorreu por um caminho não registrado no DDAE antes deste checkpoint. Este documento não reescreve essa história para parecer planejada; registra o que de fato aconteceu, formaliza a evidência forense do Bloco 13, e determina o canonical release commit para a tag `v0.3.0` (Gate B), que permanece **não executada**.

## Baseline confirmado neste checkpoint

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
0ca3f904be7b292115412dcba27539ac277ad8be

Working tree: limpo (apenas 1 arquivo untracked: bloco_13_0_3_0_release_forensics_audit.md,
sem relação com src/bin/package.json/scripts/test)

git tag --list
v0.2.0   (v0.3.0 ausente)

git ls-remote --tags origin
v0.2.0   (v0.3.0 ausente)

gh release list
DDAE Engine v0.2.0  Latest  v0.2.0  2026-08-08T08:34:05Z   (v0.3.0 ausente)

npm view ddae-engine@0.3.0 dist.shasum
e41ede33157278f700247d3b4f074a141fc2d9b6

npm view ddae-engine@0.3.0 time
"0.3.0": "2026-08-10T01:52:59.338Z"
```

## Gate A — Reconciliação

`npm publish` real de `ddae-engine@0.3.0` **já ocorreu**, confirmado pelo registro público (`npm view ddae-engine@0.3.0` retorna metadados reais, não 404; `dist-tags.latest = 0.3.0`). A tentativa de `npm publish` que motivou o Bloco 13 foi corretamente recusada com:

```text
You cannot publish over the previously published versions: 0.3.0
```

Isto **não é uma falha de release** — é a garantia de imutabilidade de versão do npm funcionando como projetado (o mesmo `name@version` nunca pode ser sobrescrito, mesmo após unpublish). A ação correta diante desse erro é auditar equivalência de artefato, não tentar forçar uma nova publicação.

O Bloco 12, como documentado, previa o Gate A sendo executado dentro desta sessão, com verificação pública imediatamente após. Isso não aconteceu nesta ordem — o publish já estava consumado quando este checkpoint foi aberto. Registrado como fato, não corrigido retroativamente.

## Evidência forense (Bloco 13)

```text
npm shasum:      e41ede33157278f700247d3b4f074a141fc2d9b6  (publicado == local)
SHA-256 tarball: c332de44979e4069ff93b2e35c3076fdd36aa5c1e5115317893abf9c7982271c  (publicado == local)
Arquivos:        106 / 106
diff -rq:        0 diferenças (0 adicionados, 0 removidos, 0 modificados)
Context Compiler: byte-idêntico entre publicado e HEAD local, arquivo a arquivo
npm test:        448 total, 445 pass, 0 fail, 3 skipped
package:check:   OK
smoke:           OK
```

Detalhe completo em `09_validation/validacao_bloco_13_0_3_0_release_forensics_audit.md`.

```text
VERDICT: NO NEW RELEASE REQUIRED
0.3.1: NOT REQUIRED
```

## Determinação do canonical release commit

Quatro candidatos foram avaliados: `ede702a` (bump de versão), `5ebc283`, `eb94860`, `0ca3f90` (commits de documentação subsequentes). Como nenhum deles altera arquivos empacotados (`package.json.files` é allowlist e exclui `Docs/**`), os quatro produzem o **mesmo tarball byte-a-byte** — o artefato publicado, isolado, não permite decidir entre eles.

A decisão não foi feita por inferência de timestamp. O registro npm armazena o campo `gitHead` — a SHA do HEAD Git local no momento do `npm publish` real, capturado automaticamente quando o publish roda dentro de um repositório Git. Esse campo foi consultado diretamente:

```text
npm view ddae-engine@0.3.0 gitHead
→ 0ca3f904be7b292115412dcba27539ac277ad8be
```

Esse valor foi cruzado contra o mesmo campo nas duas releases anteriores, como prova de que o mecanismo é confiável para este projeto (e não um artefato acidental):

```text
npm view ddae-engine@0.2.0 gitHead  → 2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9
git rev-list -n 1 v0.2.0             → 2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9
                                        ✅ idêntico — a tag v0.2.0 já aponta exatamente
                                           para o gitHead que o npm registrou no publish

npm view ddae-engine@0.1.0 gitHead  → f120a411960f1796bd9af5d415c0b6df01a78fce
                                        (commit real do histórico, mesmo padrão)
```

Isso prova que, para este projeto, `npm view <pkg>@<version> gitHead` já foi historicamente usado (implícita ou explicitamente) como a fonte de verdade para qual commit uma tag de release deve apontar — `v0.2.0` é a prova viva desse padrão.

```text
Exact publish commit: PROVEN, não inferido.
Publish execution commit: 0ca3f904be7b292115412dcba27539ac277ad8be
```

Como este commit também é o HEAD atual e não altera nenhum arquivo empacotado em relação aos três anteriores, o **canonical release commit** coincide com o **publish execution commit** — não há divergência entre "o que foi de fato publicado" e "o que deveria representar a release" neste caso.

## Recomendação

```text
Recommended canonical release commit:
0ca3f904be7b292115412dcba27539ac277ad8be

Reason:
Provado pelo campo `gitHead` do próprio registro npm (não inferido por timestamp),
com o mesmo mecanismo validado contra v0.1.0 e v0.2.0 — v0.2.0 é prova direta de que
este projeto já usa gitHead == tag commit como convenção. Também é o commit mais
recente com toda a documentação de fechamento do Bloco 11/Checkpoint 11.1 disponível,
e não altera nenhum arquivo do pacote distribuído em relação aos outros candidatos.

Alternative:
ede702ad3ec83f902024d1cf1a801656cce27efd (chore(release): prepare ddae-engine 0.3.0)

Why not:
É o commit do bump de versão, mas o registro npm não o aponta como gitHead — usá-lo
contradiria a evidência direta do publish real e quebraria a convenção estabelecida
por v0.1.0/v0.2.0 (gitHead == tag commit). Adotá-lo exigiria ignorar prova em favor
de uma leitura "mais limpa" da história, o que este checkpoint deliberadamente evita.
```

## Estado de fechamento da release (Fase 7)

```text
Distribution
  npm: published
  version: 0.3.0
  artifact verified: yes
  artifact/local equivalence: yes

Git
  canonical release commit: 0ca3f904be7b292115412dcba27539ac277ad8be (provado via npm gitHead)
  v0.3.0 tag: pending Human Gate B

GitHub
  GitHub Release v0.3.0: pending Human Gate C

Validation
  tests: pass (448/445/0/3)
  package check: pass
  distribution smoke: pass

Versioning
  0.3.1 required: no
  0.4.0 required: no
  next feature started: no
```

## Segurança

Nenhum token, senha, OTP ou credencial foi exibido, solicitado ou registrado. `npm view`/`gh release list`/`git ls-remote` usam apenas endpoints públicos de leitura; nenhuma alteração de auth/config foi feita. Nenhuma tag foi criada, nenhum push foi executado, nenhum release foi criado neste checkpoint.

## Decisão do Checkpoint

- [x] Gate A reconciliado — publish real confirmado, tentativa recusada corretamente entendida como imutabilidade de versão, não falha.
- [x] Evidência forense do Bloco 13 formalizada (shasum, SHA-256, 106 arquivos, 0 diff).
- [x] Canonical release commit determinado por prova (`npm gitHead`), não por inferência.
- [x] Mecanismo de prova validado contra precedente real (`v0.2.0`, `v0.1.0`).
- [x] `NO NEW RELEASE REQUIRED` / `0.3.1 NOT REQUIRED` formalizados.
- [ ] Tag `v0.3.0` criada — **pendente, Human Gate B**.
- [ ] GitHub Release `v0.3.0` criado — **pendente, Human Gate C**.
- [ ] Session 02 fechada — pendente de Gates B e C.

**CHECKPOINT 12.1: APROVADO** (âmbito de reconciliação/determinação). Bloco 12 permanece **em andamento** — Gate A reconciliado, Gates B e C aguardando autorização humana explícita.

## Pendências para o Bloco 12 (continuação)

- Human Gate B: `git tag -a v0.3.0 0ca3f904be7b292115412dcba27539ac277ad8be -m "DDAE Engine v0.3.0 — Context Compiler"` + `git push origin v0.3.0` — somente mediante autorização explícita.
- Human Gate C: GitHub Release `v0.3.0` — somente após a tag existir local e remotamente, mediante autorização explícita.
- Fechamento formal da Session 02 — somente após Gates B e C.
