# Validação — Bloco 01: Context Model & Architecture

## Baseline confirmado antes do bloco

```text
git status --short --branch
## main...origin/main

git rev-parse HEAD
ea1f4064661339fe75a11bad81279137add1777d

git rev-parse origin/main
ea1f4064661339fe75a11bad81279137add1777d

git rev-parse "v0.2.0^{}"
2f4c19ee8ba08f5d4c6fe217aec9e7fdcda999c9
```

HEAD e `origin/main` idênticos, working tree limpo, tag `v0.2.0` apontando para o Release Candidate final da versão 0.2.0 (`2f4c19e`), enquanto o fechamento documental da Session 11 ocorreu posteriormente em `ea1f406` — exatamente o estado esperado antes de iniciar a Session 12.

## Decisões tomadas neste bloco

Todas as decisões abaixo estão fechadas com detalhe completo em `contrato_context_manifest_v1.md`. Resumo executivo:

| # | Decisão | Escolha |
|---|---|---|
| 01 | Canonicidade | `manifest.json` é canônico; `CONTEXT.md` é derivado, nunca o contrário |
| 02 | Determinismo | Nenhum timestamp no payload canônico; `generated_at` fica fora do fingerprint se existir |
| 03 | Paths | Sempre project-relative, separador `/` normalizado, mesmo no Windows |
| 04 | Source Model | `{id, kind, path, section, authority_class, content_hash}`; 10 `kind`s previstos |
| 05 | Authority Model | Por domínio (estado do repositório, metadados, intenção arquitetural, teste, bug ativo, intenção futura, história) — não uma escala numérica universal |
| 06 | Session selection | `--session` explícito vence; senão, maior sessão canônica; sem sessão → `null` válido |
| 07 | Goal | Obrigatório em `context build`; ausente em `context show`/`context validate` |
| 08 | Budget | `minimal` ~20k / `standard` ~60k (default) / `deep` ~120k caracteres; tie-break `score DESC, path ASC` |
| 09 | Fingerprint | SHA-256 via `node:crypto`, campos definidos, exclui path absoluto/timestamp/mtime |
| 10 | Git | Modo B: opcional, com degradação explícita (`git.available=false` + warning + hash de sources como fallback de freshness) |
| 11 | `.ddae/`/ignore | `.ddae/.gitignore` com conteúdo `*`, autocontido — testado empiricamente (ver seção abaixo) |
| 12 | Segurança | Deny list de arquivo + heurística de conteúdo + realpath containment + proteção de symlink + exclusão de binário + limite de tamanho |
| 13 | Contrato de projeto | `Docs/` (consumidor) é o contrato primário; `docs/sessions/` (dogfooding interno do próprio DDAE-Engine) não recebe tratamento especial no compiler |
| 14 | CLI | `context build` (único que escreve) / `context show` (leitura) / `context validate` (leitura) |
| 15 | Staleness | `VALID`/`STALE`/`INVALID` com `reasons` estruturados por código |
| 16 | Versionamento | `package.json.version`/`EXPECTED_VERSION` permanecem `0.2.0` até o Bloco 12; `REQUIRED_SRC_PREFIXES` não alterado ainda |

## Experimento temporário `.ddae/.gitignore`

Executado em repositório Git temporário, fora do checkout do DDAE-Engine (diretório de scratchpad da sessão), removido integralmente ao final. Nenhum arquivo do DDAE-Engine foi tocado durante o experimento.

Comandos executados (resumo — saída completa já registrada na Seção 11 de `contrato_context_manifest_v1.md`):

```bash
git init -q
git config user.email "temp@example.com"
git config user.name "Temp Experiment"

git status --porcelain --branch
# ## No commits yet on master

mkdir -p .ddae/context
printf '*\n' > .ddae/.gitignore
printf '{"schema_version":"1","dummy":true}\n' > .ddae/context/manifest.json
printf '# dummy context\n' > .ddae/context/CONTEXT.md

git status --porcelain --branch
# ## No commits yet on master        (nada apareceu — .ddae/ inteiro ignorado)

git status --porcelain --ignored
# !! .ddae/                          (confirmado como ignorado, não ausente)

git status --porcelain -- .ddae/.gitignore
# (vazio — o próprio arquivo de ignore se autoignora)

printf 'node_modules/\n' > .gitignore
git status --porcelain --branch
# ## No commits yet on master
# ?? .gitignore                      (gitignore raiz simulado aparece normalmente,
#                                       sem nenhuma interferência de .ddae/.gitignore)
```

**Resultado: confirmado.** `.ddae/.gitignore` com conteúdo `*` mantém `git status --porcelain` limpo, se autoignora, e não interfere com um `.gitignore` raiz pré-existente do consumidor. Esta é a estratégia adotada para o Manifest v1 (Seção 11 do contrato). O fallback `.git/info/exclude` foi avaliado mas não foi necessário implementar/testar, por não haver caso que o exija.

Diretório temporário removido ao final:

```bash
rm -rf <scratchpad>/ddae-gitignore-experiment
```

Confirmado ausente após a remoção.

## Riscos identificados

- **Dependência nova em `git` no PATH, mas apenas para `context build`.** Nenhum outro comando do DDAE Engine passa a depender de Git. Mitigado pelo modo degradado (Decisão 10) — `context build` continua funcionando sem Git, apenas com menos informação e um warning explícito.
- **`.ddae/.gitignore` como estratégia única.** Testado apenas em um cenário (repositório Git padrão, sem regras globais de ignore conflitantes). Se um caso real futuro mostrar insuficiência, o fallback `.git/info/exclude` já está documentado como plano B no contrato — não bloqueia o início do Bloco 02.
- **Extensão futura de `REQUIRED_SRC_PREFIXES` esquecida.** Documentado explicitamente como critério de pronto do Bloco 06 em `plano_bloco_12.md`, para não ser esquecido quando `src/context/`/`src/schemas/` passarem a existir com conteúdo real.
- **Authority Model por domínio é mais complexo de implementar corretamente que uma escala numérica simples.** Aceito conscientemente — a alternativa mais simples foi explicitamente rejeitada por produzir conclusões erradas (Seção 5 do contrato). O caso JWT vs. HttpOnly session fica registrado como teste nomeado obrigatório no Bloco 04.

## Pendências para o Bloco 02

- Implementar `src/context/git-context.js` conforme Decisão 10 (modo A vs. B já resolvido — implementar modo B).
- Implementar `src/context/project-context.js` conforme detecção de stack descrita no contrato.
- Cobrir modo degradado (Git ausente do PATH, diretório não é repositório) com teste automatizado dedicado.
- Nenhum path absoluto deve vazar do output desses collectors — validar com teste específico.

## Confirmação de zero implementação de runtime

- `src/context/` — não existe no repositório.
- `src/schemas/` — não existe no repositório.
- `src/commands/context.js` — não existe.
- `src/cli.js` — não alterado (sem novo `case 'context'`).
- `package.json` — não alterado (`version` permanece `0.2.0`, `scripts` inalterados).
- `scripts/release/verify-package.mjs` — não alterado (`EXPECTED_VERSION` permanece `'0.2.0'`, `REQUIRED_SRC_PREFIXES` inalterado).

Único diretório novo no repositório após este bloco: `docs/sessions/session_12_context_compiler_foundation/`.

## Verificação de que somente a documentação da Session 12 foi alterada

```bash
git diff --check
git diff --stat
git diff --name-only
```

Como os quatro arquivos deste bloco são novos (não modificações de arquivos rastreados), eles não aparecem em `git diff` — aparecem em `git status --short`. Confirmado:

```bash
git status --short
?? docs/sessions/session_12_context_compiler_foundation/
```

Nenhum arquivo fora desse diretório foi criado, modificado ou removido.

## Regressão — testes, package check e smoke contra o baseline 0.2.0

Executados após a criação dos 4 documentos, antes do commit, para confirmar que a documentação-only deste bloco não introduziu nenhuma regressão:

- `npm test`: baseline esperado 38 descobertos, 37 aprovados, 1 skip, 0 falhas.
- `npm run package:check`: baseline esperado `OK`, 93 arquivos.
- `npm run smoke`: baseline esperado `[DDAE smoke] OK`.

(Resultado real de cada comando registrado no corpo da conversa/relatório final desta etapa — nenhuma mudança de código-fonte foi feita, portanto nenhuma variação nesses números é esperada.)

## Conclusão do bloco

O contrato do Context Compiler v1 está fechado. Nenhuma linha de código de runtime foi escrita. O experimento de `.ddae/.gitignore` foi validado empiricamente, fora do checkout, sem deixar resíduo. O Bloco 02 pode iniciar com um contrato estável para os collectors de Git e projeto.
