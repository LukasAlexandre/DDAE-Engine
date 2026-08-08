# Contrato — DDAE Self-Hosting v1

Este é o documento principal do Bloco 01 da Session 13. Ele fecha o contrato do bootstrap de self-hosting antes de qualquer arquivo ser gerado em `Docs/`, antes de qualquer `session create` ser executado, e antes de qualquer instalação de pacote. Nenhum scaffold é criado nesta etapa.

## 1. Princípio de Self-Hosting

> O DDAE-Engine deve ser capaz de consumir os mesmos contratos, sessões, validações e workflows que oferece aos seus projetos consumidores.

Até a Session 13, o desenvolvimento do próprio DDAE-Engine foi documentado em `docs/sessions/` (minúsculo, sem o padrão `05_sessions/`) — uma convenção interna própria, mais simples que o contrato oferecido a consumidores, e nunca validada pelo próprio `ddae-engine validate`/`ddae-engine audit`. A Session 13 corrige essa assimetria: o repositório passa a também ser um projeto consumidor do próprio DDAE, com uma pasta `Docs/` real, sessões reais em `Docs/05_sessions/`, e sujeito às mesmas checagens de `validate`/`audit` que qualquer outro projeto.

## 2. O que self-hosting NÃO significa

- **Não é self-dependency publicada.** `ddae-engine` nunca aparece em `package.json.dependencies`/`devDependencies` do próprio `ddae-engine`.
- **Não é auto-modificação autônoma.** Nenhum bloco desta sessão gera código de produto (`src/`) automaticamente a partir de si mesmo; o scaffold afeta apenas documentação/governança (`Docs/`), nunca `src/`, `bin/`, `test/`, `scripts/`.
- **Não é migração do histórico legado.** `docs/sessions/` (sessões 00–12) não é apagado, movido, renumerado ou convertido.

## 3. Modelo Host/Candidate

**Nota de correção (Checkpoint 01.1):** o Bloco 01 desta sessão inicialmente decidiu usar somente o checkout (`node bin/ddae-engine.js`), sem instalar o pacote publicado, com base no fato verificável de que o Bloco 02 da Session 12 não alterou nenhum comando de CLI — checkout e `0.2.0` publicada eram comportamentalmente idênticos para `init`/`session create`/`validate`/`audit`. Essa decisão foi revista no Checkpoint 01.1: usar apenas o checkout provaria "o DDAE executando seu próprio código corrente", não a propriedade que este bootstrap existe para demonstrar — uma release pública estável governando o desenvolvimento do candidate. Essa propriedade precisa existir *antes* de o candidate divergir do host, não ser introduzida só depois que a divergência já tiver acontecido. O registro original da decisão permanece, sem alteração, em `validacao_bloco_01_self_hosting_contract.md`; esta seção reflete a decisão corrigida, vigente a partir do Bloco 02.

**STABLE HOST:** `ddae-engine@0.2.0`, instalado local e efemeramente via:

```bash
npm install \
  --no-save \
  --package-lock=false \
  --ignore-scripts \
  --no-audit \
  --no-fund \
  ddae-engine@0.2.0
```

Local esperado: `node_modules/ddae-engine/`. Binário: `node node_modules/ddae-engine/bin/ddae-engine.js`.

**CANDIDATE:** o checkout atual do repositório (`bin/`, `src/`, `test/`, `scripts/`). Binário: `node bin/ddae-engine.js`.

```text
ddae-engine@0.2.0 PUBLIC
          │
          ▼
      STABLE HOST
          │
          │ governa
          ▼
   DDAE REPOSITORY
          │
          ▼
       CANDIDATE
          │
          ▼
    future 0.3.0
```

Todas as ações de self-hosting a partir do Bloco 02 (scaffold, criação da sessão canônica, `validate`/`audit` contra o próprio repositório) são executadas exclusivamente pelo **stable host**, nunca pelo candidate. Isso materializa a propriedade "release pública estável governa o desenvolvimento do candidate" — que usar apenas o checkout não provava, mesmo sendo, hoje, comportamentalmente equivalente.

**Isolamento do host:** a instalação local do stable host nunca modifica `package.json.dependencies`, `devDependencies`, `optionalDependencies` ou `peerDependencies`, e nunca cria `package-lock.json`. `node_modules/` permanece ignorado pelo Git (já coberto pela primeira linha do `.gitignore` do repositório). O pacote publicado `ddae-engine` nunca depende de si mesmo — a instalação é efêmera, local, e não-persistida em nenhum manifesto.

**Justificativa de por que o host estável é intencional, não circunstancial:**

1. O self-host precisa provar que uma release pública real do DDAE consegue governar o desenvolvimento da próxima versão — não apenas que o binário do checkout funciona.
2. O candidate pode ficar instável durante o desenvolvimento — é exatamente o que está em construção.
3. O stable host fornece uma baseline operacional conhecida e já publicamente auditada (Session 11).
4. Hoje `0.2.0` e o candidate são semelhantes no CLI, mas isso é circunstancial, não uma garantia de design.
5. Quando `src/context/` e outras capabilities forem expostas no candidate (Bloco 08 da Session 12, ainda pausado), stable host e candidate passarão naturalmente a divergir.
6. A distinção precisa existir *antes* dessa divergência, não ser introduzida depois dela.
7. O modelo é equivalente a um bootstrap de compilador: a versão estável N governa a construção da versão candidata N+1.

## 4. Dois planos de controle distintos, não sobrepostos

```text
docs/
├── sessions/                              ← LEGACY INTERNAL CONTROL PLANE
│   ├── session_00_framework_base/
│   ├── ...
│   └── session_12_context_compiler_foundation/
│       └── PAUSADA APÓS BLOCO 02
│
└── 05_sessions/                           ← CANONICAL SELF-HOST CONTROL PLANE
    ├── README.md
    └── session_01_...
```

No Windows (e no macOS com o volume padrão), `Docs/` e `docs/` resolvem para o **mesmo diretório físico** por case-insensitividade do filesystem — verificado nesta sessão, sem regressão em relação ao que já era sabido desde o Bloco 01 da Session 12. Isso não é um problema: `sessions/` e `05_sessions/` são nomes de subdiretório diferentes (não há colisão entre eles), então ambos convivem como irmãos dentro do mesmo nó físico `docs`/`Docs`. Confirmado por inspeção direta: `docs/` hoje contém apenas `sessions/` — nenhum outro nome usado pelo scaffold de `init` (`00_ddae_engine`, `01_product`, ..., `05_sessions`, ..., `99_archive`) já existe, e a raiz do repositório não possui ainda `CLAUDE.md`, `AGENTS.md`, `.cursorrules` ou `ddae-engine.config.json`.

- **`docs/sessions/`** — histórico interno do desenvolvimento do próprio DDAE-Engine, sessões 00–12, convenção pré-self-hosting. Imutável a partir de agora: nunca apagado, movido, renumerado ou convertido para o formato novo.
- **`Docs/05_sessions/`** — plano de controle canônico de self-hosting, gerado pelo scaffold oficial (`ddae-engine init`), numerado a partir de `session_01` (reinício de numeração intencional — os dois planos são históricos distintos, não uma sequência única).

## 5. Estratégia de scaffold seguro (para o Bloco 02)

Nenhum scaffold é gerado neste bloco. A estratégia fica definida aqui para execução no Bloco 02:

1. Gerar o scaffold completo usando o **stable host** (`node node_modules/ddae-engine/bin/ddae-engine.js init --dir <TEMP>`) em um diretório temporário **fora do checkout**, nunca diretamente na raiz do repositório.
2. Construir uma matriz de colisão comparando cada path gerado contra o repositório real, com comparação de path **case-insensitive** (consequência direta da Seção 4): `MISSING` (não existe no repositório), `IDENTICAL` (existe e é byte-idêntico), `CONFLICT` (existe e o conteúdo diverge).
3. Se não houver nenhum `CONFLICT`: copiar todos os paths `MISSING` para o repositório real. Paths `IDENTICAL` não precisam ser copiados novamente.
4. Se houver `CONFLICT`: nenhuma substituição automática. Cada conflito é listado e decidido manualmente, nunca sobrescrito silenciosamente.
5. Em nenhum cenário `ddae-engine init` é executado diretamente na raiz do repositório sem a matriz de colisão ter sido produzida e revisada antes.

Esta estratégia prioriza preservar qualquer arquivo já existente no repositório sobre completar o scaffold — o objetivo é adotar o modelo do DDAE, não substituir a identidade atual do DDAE-Engine.

## 6. Proteção do histórico legado

Durante toda a Session 13, os seguintes caminhos são tratados como imutáveis, sem exceção:

- `docs/sessions/session_00_framework_base/` até `docs/sessions/session_12_context_compiler_foundation/`.
- `feedback/` (registros de feedback histórico das sessões internas).
- Qualquer arquivo de `docs/sessions/session_12_context_compiler_foundation/` já existente — a marcação de "pausada" (Seção 8) é a única edição permitida, e é feita nesta própria sessão, não silenciosamente por um bloco futuro.

## 7. Isolamento de pacote — fato verificado, não apenas política

`package.json.files` do DDAE-Engine é uma **allowlist**, não uma blocklist: `["bin", "src", "README.md", "LICENSE", "CHANGELOG.md"]`. Isso significa que `npm pack` só inclui o que está explicitamente listado ali — qualquer conteúdo criado em `Docs/` ou `docs/` (ou qualquer outro diretório fora dessa lista) **nunca** entra no tarball publicável, independentemente de qualquer regra em `FORBIDDEN_PREFIXES` de `scripts/release/verify-package.mjs`. Verificado nesta etapa via `npm pack --dry-run --json`: zero arquivos com prefixo `docs/` ou `Docs/` aparecem no pacote atual (95 arquivos, todos sob `bin/`, `src/`, ou os 4 arquivos de raiz permitidos).

Consequência prática: o Bloco 02 (scaffold) e blocos seguintes desta sessão **não precisam** adicionar `Docs/`/`docs/` a `FORBIDDEN_PREFIXES` para obter proteção — essa proteção já existe estruturalmente, por a allowlist nunca ter incluído esses diretórios. `FORBIDDEN_PREFIXES` continua útil como defesa em profundidade para os diretórios que já lista (`test/`, `.github/`, `docs/sessions/`, `feedback/`, `scripts/ci/`, `scripts/release/`, `node_modules/`, `.git/`), mas o isolamento do novo `Docs/05_sessions/` não depende dela. Os blocos seguintes devem, ainda assim, reconfirmar isso via `npm pack --dry-run --json` real após o scaffold existir, não apenas confiar nesta análise prévia.

## 8. Session 12 — status após este bloco

`docs/sessions/session_12_context_compiler_foundation/README.md` é atualizado nesta mesma etapa para registrar, factualmente:

- Bloco 01: continua Aprovado.
- Checkpoint 01.1: continua Aprovado.
- Bloco 02: continua Aprovado.
- Bloco 03 (DDAE State Collector): **não iniciado** — sessão pausada em favor da Session 13.
- Motivo da pausa: bootstrap de DDAE self-hosting (Session 13).
- Session 12 **não é marcada como concluída** — permanece formalmente em andamento, pausada.

Nenhum outro conteúdo de `session_12_context_compiler_foundation/` é alterado neste bloco (plano histórico, contrato do Manifest v1, validações dos Blocos 01/02 permanecem exatamente como estão).

## 9. Fora de escopo (todo o bootstrap de self-hosting)

- Geração de qualquer arquivo em `Docs/` fora do fluxo TEMP + matriz de colisão + merge seguro (Bloco 02).
- `ddae-engine session create` (Bloco 03).
- `ddae-engine validate`/`audit` contra o próprio repositório (Bloco 04).
- Retomada do Bloco 03 da Session 12 (Context Compiler) — decisão sobre onde o desenvolvimento futuro do Context Compiler será registrado (dentro de `Docs/05_sessions/` ou continuando em `docs/sessions/`) fica para um bloco posterior desta sessão, não decidida agora.
- Qualquer alteração em `src/`, `bin/`, `test/`, `scripts/`.
- Qualquer alteração em `package.json` (versão, dependencies, devDependencies).
- Qualquer publicação npm, tag, ou GitHub Release.

## 10. Critérios de aceite da Session 13 (para os blocos futuros)

- [ ] Scaffold gerado com segurança (matriz de colisão aplicada, nenhum `CONFLICT` sobrescrito automaticamente) — Bloco 02.
- [ ] `docs/sessions/` preservado byte-a-byte — verificável em todos os blocos via diff vazio nesse caminho.
- [ ] `Docs/05_sessions/session_01_...` criada como primeira sessão canônica de self-hosting — Bloco 03.
- [ ] `ddae-engine validate --dir .`/`ddae-engine audit --dir .` executados contra o próprio repositório via **stable host** (`node node_modules/ddae-engine/bin/ddae-engine.js`, conforme Seção 3 corrigida no Checkpoint 01.1) sem erros estruturais — Bloco 04.
- [ ] `npm pack --dry-run --json` confirmado, após o scaffold existir, sem nenhum arquivo `Docs/`/`docs/` no pacote — Bloco 05 (reconfirmação, não apenas a análise prévia da Seção 7).
- [ ] Zero dependências adicionadas; `package.json` inalterado.
- [ ] `npm test`/`package:check`/`smoke` continuam verdes a cada bloco.
- [ ] CI 5/5 a cada commit técnico/documental.
