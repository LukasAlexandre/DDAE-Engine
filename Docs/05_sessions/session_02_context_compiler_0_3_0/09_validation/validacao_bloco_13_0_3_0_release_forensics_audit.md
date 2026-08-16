# Validação — Bloco 13: 0.3.0 Release Forensics Audit

> Sessão: 02 (context_compiler_0_3_0) · Projeto: DDAE · Atualizado em: 2026-08-16

## 1. Contexto

Uma tentativa de `npm publish` foi recusada pelo registro com `You cannot publish over the previously published versions: 0.3.0`, revelando que `ddae-engine@0.3.0` já estava publicado — fora da sequência documentada do Bloco 12 (nenhum dos três Human Gates daquele bloco havia sido executado neste checkout). O Bloco 13 foi aberto para responder, com evidência e não suposição, se o estado local atual é equivalente ao artefato realmente publicado, antes de qualquer decisão de versionamento ou fechamento de release.

## 2. Método

Comparação forense entre dois artefatos gerados independentemente:

- `A` — `npm pack ddae-engine@0.3.0` (tarball real baixado do registro público).
- `B` — `npm pack .` a partir do HEAD local (`0ca3f904be7b292115412dcba27539ac277ad8be`), sem alterar versão, sem publicar.

Ambos extraídos em diretórios isolados (fora de `Docs/`, fora do controle de versão) e comparados por conteúdo (`diff -rq` recursivo), não apenas pelo hash do `.tgz` bruto.

## 3. Evidência

```text
npm shasum (registro):        e41ede33157278f700247d3b4f074a141fc2d9b6
npm shasum (pack local):      e41ede33157278f700247d3b4f074a141fc2d9b6

SHA-256 tarball publicado:    c332de44979e4069ff93b2e35c3076fdd36aa5c1e5115317893abf9c7982271c
SHA-256 tarball local:        c332de44979e4069ff93b2e35c3076fdd36aa5c1e5115317893abf9c7982271c

Arquivos (ambos):             106
diff -rq (conteúdo extraído): 0 diferenças
Adicionados:                  0
Removidos:                    0
Modificados:                  0
```

Os dois tarballs são idênticos até no hash do arquivo `.tgz` compactado (não apenas no conteúdo extraído) — o que também indica processo de empacotamento determinístico (ordem/metadata de entrada estáveis) para este projeto.

Módulos do Context Compiler (`src/context/authority.js`, `compiler.js`, `ddae-context.js`, `fingerprint.js`, `git-context.js`, `manifest.js`, `project-context.js`, `relevance.js`, `renderer.js`, `sensitive-files.js`, `validator.js`, `src/schemas/context-schema.js`, `src/commands/context.js`) — todos incluídos no diff de conteúdo acima, confirmados byte-idênticos entre o artefato publicado e o HEAD local. Nenhuma evolução local não publicada existe nesses arquivos.

Explicação estrutural de por que os 3 commits Git posteriores ao bump de versão (`5ebc283`, `eb94860`, `0ca3f90`) não afetam o pacote: `package.json.files` é uma allowlist explícita (`bin`, `src`, `README.md`, `LICENSE`, `CHANGELOG.md`) — `Docs/**` nunca entra no tarball, independentemente do commit usado para empacotar.

## 4. Validação (reexecutada após a comparação)

```text
npm test              → 448 total, 445 pass, 0 fail, 3 skipped
npm run package:check → OK (required files, forbidden files, metadata, repository identity)
npm run smoke         → OK (init, sessions, block/prompt/feedback flow, validate, audit, legacy detection, context compiler)
```

Resultados idênticos aos obtidos antes da tentativa de `npm publish` que motivou este bloco.

## 5. Decisão

```text
VERDICT: NO NEW RELEASE REQUIRED
0.3.1: NOT REQUIRED
```

Nenhum arquivo do pacote distribuível difere entre o publicado e o local. Não há mudança funcional, de segurança, de compatibilidade ou de superfície pública (CLI/API) pendente de versão. `0.3.0` publicado já é, byte a byte, o estado atual do repositório.

## 6. Critérios de Aceite (do Bloco 13)

- [x] Estado do repositório documentado (branch, HEAD, working tree, tags).
- [x] Metadados do npm `0.3.0` capturados (versão, shasum, integrity, data).
- [x] Tarball publicado e tarball local obtidos e hasheados (SHA-256).
- [x] Diff recursivo completo entre os dois artefatos extraídos.
- [x] Cada diferença classificada semanticamente — não aplicável, zero diferenças encontradas.
- [x] Context Compiler auditado explicitamente arquivo a arquivo.
- [x] Linha do tempo Git das mudanças pós-release construída.
- [x] Deriva de documentação identificada (ver Checkpoint 12.1).
- [x] `npm test`, `package:check`, `smoke` reexecutados e resultado registrado.
- [x] Veredito de versionamento emitido com justificativa.
- [x] Nenhuma ação de release (`version`/`publish`/`tag`/`commit`/`push`) executada nesta etapa.

**BLOCO 13: APROVADO**

## 7. Pendências para o Bloco 12

- Reconciliação do Bloco 12 com o fato de que o Gate A (`npm publish`) já ocorreu fora da sequência documentada — ver Checkpoint 12.1.
- Determinação do canonical release commit para a tag `v0.3.0` — ver Checkpoint 12.1.
- Gates B (`tag v0.3.0`) e C (GitHub Release) continuam pendentes de autorização humana explícita.
