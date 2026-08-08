# DDAE Self-Hosting

> Projeto: DDAE Engine · Atualizado em: 2026-08-08

> Contrato operacional oficial de como o próprio DDAE Engine governa seu desenvolvimento futuro. Estabelecido em `session_13_ddae_self_hosting_bootstrap` (histórico legacy) e `session_01_ddae_self_hosting_bootstrap` (sessão canônica de origem). Válido a partir daqui para toda sessão futura em `Docs/05_sessions/`.

## 1. Stable Host

Package:

```text
ddae-engine@0.2.0
```

Instalação (local, efêmera, nunca persistida em `package.json`):

```bash
npm install \
  --no-save \
  --package-lock=false \
  --ignore-scripts \
  --no-audit \
  --no-fund \
  ddae-engine@0.2.0
```

Execução:

```bash
node node_modules/ddae-engine/bin/ddae-engine.js <command>
```

## 2. Candidate

O checkout atual deste repositório (`bin/`, `src/`, `test/`, `scripts/`) — a versão em desenvolvimento, ainda não publicada.

Execução:

```bash
node bin/ddae-engine.js <command>
```

## 3. Regra central

**Stable Host governa o Candidate.**

- Stable Host: release publicada e conhecida (auditada, testada, distribuída — ver `docs/sessions/session_11_estabilizacao_ci_e_release_0_2_0/`).
- Candidate: versão em desenvolvimento, pode estar instável.

Toda ação de **governança** (criar sessão, `validate`, `audit`) usa o Stable Host. O Candidate pode ser executado para **testar** a capability em desenvolvimento, nunca como baseline de governança — não confundir "executar o candidate para testar" com "usar o candidate como fonte de verdade sobre o estado do projeto".

## 4. Self-dependency — proibido

`ddae-engine` nunca é adicionado a:

- `dependencies`
- `devDependencies`
- `peerDependencies`
- `optionalDependencies`

do próprio `package.json` do DDAE Engine. `node_modules/ddae-engine/` é:

- local (existe apenas na máquina onde foi instalado);
- efêmero (pode ser removido e reinstalado a qualquer momento sem perda de estado — o estado real vive em `Docs/`, versionado no Git);
- coberto por `.gitignore` (nunca entra em um commit);
- nunca publicado (o próprio `ddae-engine` publicado no npm nunca depende de si mesmo).

## 5. Governança — dois planos de controle

```text
Docs/05_sessions/     ← CANONICAL — desenvolvimento futuro, criado pelo Stable Host
docs/sessions/         ← LEGACY — histórico de engenharia, somente evidência, imutável
```

`docs/sessions/` (minúsculo) é o histórico de como o próprio DDAE Engine foi construído antes deste bootstrap — permanece como evidência histórica, nunca migrado, renumerado ou apagado. **Novas sessões de desenvolvimento não são mais criadas ali.**

`Docs/05_sessions/` (o scaffold oficial, mesmo padrão oferecido a qualquer consumidor do DDAE) é o plano de controle canônico a partir de `session_01_ddae_self_hosting_bootstrap`. Toda sessão de desenvolvimento futura do próprio DDAE Engine nasce aqui, numerada sequencialmente, criada pelo Stable Host.

## 6. Política de execução

Enquanto uma capability necessária para governar o desenvolvimento existir no Stable Host, ela é usada a partir do Stable Host. Quando uma sessão canônica precisa **testar** uma capability que só existe no Candidate (por definição, ainda não publicada — é o que está sendo construído), o Candidate é executado para esse teste específico, mas o registro da sessão (criação, estrutura, validação estrutural) continua vindo do Stable Host.

## 7. Modelo de promoção Stable → Candidate

```text
STABLE N
   │
   ▼
governa
   │
   ▼
CANDIDATE N+1
   │
   ▼
tests + CI + release
   │
   ▼
PROMOTION
   │
   ▼
STABLE N+1
```

Quando uma versão candidata é publicada e comprovada (mesmo pipeline rigoroso de release já usado na `0.2.0` — Session 11: CI 5/5, `package:check`, smoke real, verificação independente do registro npm), ela é elegível para ser **promovida** a novo Stable Host, passando a governar o próximo ciclo de desenvolvimento. Essa promoção exige prova explícita (reinstalação do novo Stable Host, reexecução de `validate`/`audit` contra o repositório) — nunca é automática ou implícita.

Aplicação atual do modelo:

```text
0.2.0 Stable Host
        ↓
0.3.0 Candidate — Context Compiler
        ↓
publicação futura (fora do escopo desta sessão)
        ↓
0.3.0 Stable Host
        ↓
0.4.0 Candidate — Obsidian Workspace / Project Brain
```

## 8. Roadmap oficial (referência)

Fonte canônica: `Docs/01_product/visao_produto.md`, Seção 4.

| Versão | Nome | Status |
|---|---|---|
| `0.2.0` | Engineering Foundation | Released |
| `0.3.0` | Context Compiler | In development |
| `0.4.0` | Obsidian Workspace / Project Brain | Planned |

## 9. Defeito conhecido, deliberadamente não corrigido nesta sessão

Um bug real de produto foi encontrado durante o self-hosting (Bloco 04): o template-fonte de `Docs/00_ddae_engine/glossario.md` (`src/templates/docs_root/00_ddae_engine/glossario.md`) renderiza os tokens `{{PROJECT_NAME}}`/`{{CURRENT_DATE}}` em vez de documentá-los literalmente, afetando qualquer projeto que rode `ddae-engine init` — não apenas este bootstrap. A instância gerada neste repositório foi corrigida manualmente; a correção da fonte (`src/templates/` + mecanismo de escape em `renderTemplate`) fica registrada em `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/07_bugs/bugs_identificados.md` (BUG-01), com alvo explícito: início da `session_02_context_compiler_0_3_0`.

## 10. Handoff do Context Compiler

O desenvolvimento do Context Compiler começou em `docs/sessions/session_12_context_compiler_foundation/` (histórico legacy, preservado, nunca retomado para trabalho novo). Estado nesse predecessor: Bloco 01 (Context Model & Architecture) aprovado, Checkpoint 01.1 aprovado, Bloco 02 (Git + Project Collectors — `src/context/git-context.js`, `src/context/project-context.js`) aprovado, Bloco 03 (DDAE State Collector) não iniciado.

A continuação nasce em `Docs/05_sessions/session_02_context_compiler_0_3_0` (ainda não criada nesta sessão), retomando exatamente no DDAE State Collector (`src/context/ddae-context.js`, ainda não existe), com o handoff formal registrado explicitamente para não perder o contexto acumulado.
