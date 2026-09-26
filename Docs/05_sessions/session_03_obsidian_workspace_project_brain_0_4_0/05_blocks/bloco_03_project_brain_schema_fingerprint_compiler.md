# Bloco 03 — project brain schema fingerprint compiler

> Sessão: 03 (obsidian_workspace_project_brain_0_4_0) · Projeto: DDAE · Atualizado em: 2026-09-26

> **Status: PREPARADO — NÃO INICIADO.** Este documento define o bloco para revisão. Nenhum código foi escrito. A implementação só começa após aprovação explícita deste bloco.

## 1. Objetivo

Transformar o snapshot determinístico produzido por `src/workspace/discover.js` em um **Brain Manifest v1** estruturado, validável e com fingerprint reproduzível, sem escrever em disco e sem qualquer conceito de memória persistente.

## 2. Contexto

Terceiro bloco da `0.4.0` (Project Brain), executado contra o contrato congelado no Bloco 01 (`Docs/03_contracts/contrato_workspace_project_brain.md`, Seções B, C e H) e sobre a camada de descoberta aprovada no Bloco 02. Segue `04_planning/plano_execucao.md` (ordem 3; depende do Bloco 2). Requisito: `RF-01`. Decisão de base: `DT-01`.

A decisão arquitetural `DT-02` (`Docs/02_architecture/adr_knowledge_memory_context.md`) se aplica assim: o Brain Manifest é uma representação de **Knowledge** (estado canônico de `Docs/` + Git), derivada e recomputável. Ele **não** modela Memory nem Persistent Memory Providers; nada neste bloco referencia Claude-Mem ou provider algum.

## 3. Problema que Este Bloco Resolve

O Discovery entrega dados em memória sem forma contratual, sem validação e sem identidade. Sem um manifesto validado e fingerprinted, não há como o Renderer (Bloco 04) renderizar de forma determinística nem como o Validator (Bloco 07) distinguir `VALID` / `STALE` / `INVALID` — o modo de falha que o contrato proíbe é o Brain divergir silenciosamente de `Docs/`.

## 4. Escopo

- **Schema** (`brain-schema.js`): constante de versão `brain-manifest-v1`, `validateBrainManifest(manifest)` (retorna lista de erros, sem lançar) e `assertBrainManifest(manifest)` (lança). Cobre todos os campos da Seção B do contrato com type / obrigatoriedade / paths relativos com `/` / ordenação de arrays / ausência de path absoluto.
- **Fingerprint** (`fingerprint.js`): `buildBrainFingerprintPayload(manifestSemFingerprint)` e `computeBrainFingerprint(payload)` → `{ algorithm: "sha256", value }`. Payload canônico exclui `generated_at`, timestamps, UUIDs e qualquer ordenação dependente de SO.
- **Compiler** (`compiler.js`): `compileBrainManifest(projectRoot, options)` — chama `discoverWorkspaceState`, mapeia o snapshot para o manifesto (entidades por chave, `sources` como proveniência por referência, arrays ordenados), calcula o fingerprint e devolve o manifesto **em memória**.
- Testes do bloco (a escrever **na implementação**, não agora): schema, fingerprint, compiler, determinismo, zero escrita em disco, ausência de path absoluto, arrays ordenados, manifesto inválido rejeitado.

## 5. Fora de Escopo

- Escrever `.ddae/brain/manifest.json` ou qualquer arquivo em disco — persistência pertence ao CLI (Bloco 08); o compiler deste bloco é puro.
- Renderer / views Markdown (Bloco 04); navegação Obsidian (Bloco 05); integração com `.ddae/context/` (Bloco 06); Validator e o cálculo de `VALID`/`STALE`/`INVALID` (Bloco 07 — este bloco só fornece o fingerprint e o schema que o Validator usará); CLI `workspace *` (Bloco 08).
- Qualquer alteração a `src/context/**` e ao contrato congelado.
- Claude-Mem, `MemoryProvider`, entidade "Memory", `ddae doctor`, e todo item de "Future Agentic Environment" da ADR.
- Extração de kernel compartilhado com `context/validator.js` (avaliação explícita do Bloco 07, `ID-07`).

## 6. Arquivos e Pastas Envolvidos

Nomes a confirmar contra o contrato na revisão (a Seção B não fixa nomes de arquivo):

- `src/workspace/brain-schema.js` (novo)
- `src/workspace/fingerprint.js` (novo)
- `src/workspace/compiler.js` (novo)
- `test/workspace-brain-schema.test.js`, `test/workspace-brain-fingerprint.test.js`, `test/workspace-brain-compiler.test.js` (novos)
- `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/` — feedback e validação do bloco.

**Não tocar:** `src/context/**`, `src/workspace/discover.js` (salvo evidência registrada, ver Seção 15), `scripts/`, `bin/`, `package.json`, `Docs/03_contracts/**`.

## 7. Dependências

- Bloco 01 (contrato) e Bloco 02 (`discover.js`) aprovados.
- Reuso, **sem modificar**, de `src/context/fingerprint.js` (`stableStringify`, `sha256Hex`, `FINGERPRINT_ALGORITHM` — todos já exportados) para não duplicar serialização canônica. A adequação exata é confirmada na implementação.
- `DT-01` e `DT-02`.

## 8. Plano de Implementação

1. Revisar este bloco e resolver as **Decisões Abertas** (Seção 15) antes de codar.
2. Escrever os testes de `brain-schema.js` primeiro (TDD), depois implementá-lo.
3. Implementar `fingerprint.js` reutilizando o serializador canônico do Context Compiler.
4. Implementar `compiler.js` como função pura sobre `discoverWorkspaceState`, com mapeamento snake_case do snapshot → campos da Seção B.
5. Provar determinismo (duas execuções → `deepEqual`), zero escrita e ausência de path absoluto; provar contra o próprio self-host do DDAE.
6. Rodar a regressão completa e gerar feedback/validação do bloco.

## 9. Critérios de Aceite

- [ ] `compileBrainManifest` produz um manifesto que passa `validateBrainManifest` para o self-host do DDAE e para um projeto scaffolded vazio.
- [ ] Todos os campos da Seção B do contrato estão presentes, com `schema_version = "brain-manifest-v1"`.
- [ ] Duas execuções sobre o mesmo estado produzem manifestos `deepEqual` e o mesmo fingerprint.
- [ ] O fingerprint muda quando muda qualquer entrada canônica (ex.: risco, decisão, bug aberto, `git.head`) e **não** muda com `generated_at`.
- [ ] Manifesto malformado (campo ausente, tipo errado, `schema_version` incompatível, path absoluto ou com `\`) é reportado por `validateBrainManifest` e lançado por `assertBrainManifest`.
- [ ] Nenhuma escrita em disco; nenhuma criação de `.ddae/brain/`; nenhum acesso à rede; nenhum LLM.
- [ ] Nenhum path absoluto de máquina no manifesto; arrays ordenados de forma independente de filesystem/SO.
- [ ] Nenhum arquivo de `src/context/**`, `scripts/`, `bin/`, `package.json` ou `Docs/03_contracts/**` alterado.
- [ ] Nenhuma referência a Claude-Mem, memory provider ou entidade "Memory" no código.
- [ ] Regressão completa verde (466+ testes, `package:check`, `smoke`).

## 10. Validações Obrigatórias

- [ ] `npm test`
- [ ] `npm run package:check`
- [ ] `npm run smoke`
- [ ] `ddae-engine validate`
- [ ] `ddae-engine audit`
- [ ] `git diff --check`

## 11. Segurança

Sem novo ponto de leitura de filesystem: o compiler consome apenas o snapshot já produzido pelo Discovery (que reaproveita os helpers e a política fail-closed existentes). O schema rejeita path absoluto e `\`. Nenhum conteúdo de arquivo é copiado para o manifesto — apenas referências e resumos de uma linha extraídos verbatim (Seção B/C do contrato). Nenhuma escrita em disco reduz a superfície ao mínimo.

## 12. Performance

Não aplicável — operação sobre dados já em memória, do mesmo volume que o Discovery.

## 13. Design System / UX

Não aplicável — nenhuma saída visual.

## 14. Riscos

- **Deriva de schema** entre o contrato (Seção B) e o código: mitigada testando o schema campo a campo contra a Seção B.
- **Fingerprint instável** por incluir dado não determinístico (ex.: `generated_at`, ordem de filesystem): mitigado por testes de determinismo e pela exclusão explícita dos campos voláteis.
- **Duplicar a serialização canônica** do Context Compiler: mitigado reutilizando `stableStringify`/`sha256Hex` sem modificá-los.
- **Manifesto virar segunda fonte de verdade:** mitigado por o compiler ser puro, não persistir e só referenciar (nunca copiar) conteúdo de `Docs/`.

## 15. Decisões Abertas (resolver na revisão, antes de implementar)

Divergências reais entre o contrato e o snapshot atual do Discovery, encontradas na preparação deste bloco. Nenhuma foi decidida aqui.

1. **Campo `git`.** O contrato define `{ available, head }`; o Discovery também retorna `repository` e `branch`. *Recomendação:* o manifesto segue o contrato (só `available`/`head`) — `branch` deixa o manifesto mais volátil sem exigência do schema.
2. **Campo `ddae` (sessão canônica, módulos, contagens).** O snapshot do Discovery não o expõe (só `current_session`, `decisions`, `risks`, `open_bugs`, `recent_changes`, `current_tasks`, `release_state`). *Opções:* (a) o compiler chama `collectDdaeContext` diretamente; (b) estender o Discovery. *Recomendação:* (a), sem tocar `discover.js`; (b) exigiria um novo Architecture Delta Gate.
3. **Campo `views`.** As views são geradas no Bloco 04. *Recomendação:* neste bloco `views` é emitido como lista fixa e ordenada dos nomes de arquivo previstos no contrato (Seção D) ou vazio até o Renderer existir — decidir e registrar.
4. **`engine_version` dentro do fingerprint?** Incluí-lo torna todo Brain `STALE` após upgrade do pacote (possivelmente desejável); excluí-lo ignora mudanças de comportamento do engine. *Recomendação:* incluir, e documentar o efeito.
5. **`entities`** deve conter as entidades DERIVED/GENERATED da Seção C que o Discovery já cobre (`decisions`, `risks`, `open_bugs`, `recent_changes`, `current_tasks`, `release_state`); entidades CANONICAL REFERENCE (link) e as que dependem do Bloco 06 (`Important Files`, `Context Packages`) ficam para blocos posteriores — confirmar a lista exata.

## 16. Pendências Esperadas

- P3 — Ordenação lexicográfica de tags (herdada do Bloco 02) afeta `release_state`; sem ação neste bloco.
- P3 — Kernel de freshness compartilhado (`ID-07`) continua para o Bloco 07.
- P4 — `recent_commits` sem assunto (herdado do Bloco 02, Delta A) — decisão no Bloco 04/05.

## 17. Feedback Obrigatório

_Lembrete: ao final deste bloco, gerar e preencher o feedback via `ddae-engine feedback create --block bloco_03_project_brain_schema_fingerprint_compiler --session session_03_obsidian_workspace_project_brain_0_4_0`. Sem feedback preenchido, o bloco não está concluído._

## 18. Commit Semântico Sugerido

_Sugestão de commit no padrão de `Docs/04_governance/convencoes_commits.md`. Nunca executado automaticamente — exige confirmação explícita do usuário._

```
feat(workspace): add brain manifest schema, fingerprint and compiler
```
