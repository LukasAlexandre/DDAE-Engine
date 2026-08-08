# Plano — Session 13: DDAE Self-Hosting Bootstrap

## 1. Objetivo Geral

Adotar o próprio DDAE Engine como consumidor da metodologia que oferece a terceiros, sem apagar o histórico interno já existente (`docs/sessions/`) e sem criar autodependência publicada ou auto-modificação autônoma.

## 2. Fora de Escopo (toda a sessão)

- Instalação de `ddae-engine` publicado via `npm install` (ver `contrato_self_hosting_v1.md`, Seção 3 — decisão revisada em favor de usar somente `node bin/ddae-engine.js`).
- Qualquer alteração em `src/`, `bin/`, `test/`, `scripts/`.
- Migração, renumeração, exclusão ou conversão de `docs/sessions/`.
- Retomada do Bloco 03 da Session 12 (Context Compiler) — a decisão de onde esse trabalho futuro será registrado é explicitamente adiada para um bloco desta sessão, não resolvida no Bloco 01.
- Publicação npm, criação de tag, GitHub Release.

## 3. Ordem e dependências

```text
01 Self-Hosting Contract              (contrato — sem dependências)
   │
   ▼
02 Collision Probe & Safe Scaffold Merge   (depende de 01)
   │
   ▼
03 Canonical Self-Host Session Bootstrap   (depende de 02 — Docs/05_sessions/ precisa existir)
   │
   ▼
04 Self-Hosting Validation Proof           (depende de 03 — precisa de ao menos uma sessão real)
   │
   ▼
05 Package Isolation & Self-Hosting Documentation  (depende de 02–04)
```

## 4. Blocos

### Bloco 01 — Self-Hosting Contract

**Objetivo:** fechar o contrato completo do bootstrap de self-hosting antes de qualquer arquivo ser gerado em `Docs/`.

**Escopo:** princípio de self-hosting, o que self-hosting não significa, modelo host/candidate (decisão revisada: usar apenas o checkout, sem instalar o pacote publicado), separação entre `docs/sessions/` (legacy) e `Docs/05_sessions/` (canônico), estratégia de scaffold seguro via matriz de colisão, proteção do histórico legado, isolamento de pacote (fato verificado via `npm pack --dry-run --json`, não apenas política), status de pausa da Session 12.

**Fora de escopo:** qualquer geração de arquivo em `Docs/`; qualquer `session create`; qualquer instalação de pacote.

**Arquivos previstos:** `docs/sessions/session_13_ddae_self_hosting_bootstrap/{README.md,plano_bloco_13.md,contrato_self_hosting_v1.md,validacao_bloco_01_self_hosting_contract.md}`, `docs/sessions/session_12_context_compiler_foundation/README.md` (atualização de status apenas).

**Dependências:** nenhuma.

**Critérios de aceite:**
- [x] Princípio de self-hosting definido.
- [x] Modelo host/candidate decidido (checkout único, sem `npm install` do pacote publicado) com justificativa verificável.
- [x] Separação `docs/sessions/` vs. `Docs/05_sessions/` definida, com confirmação de que não há colisão de nome sob case-insensitivity.
- [x] Estratégia de scaffold seguro (matriz de colisão) definida para o Bloco 02.
- [x] Proteção do histórico legado definida (paths imutáveis explícitos).
- [x] Isolamento de pacote verificado como fato estrutural (allowlist de `package.json.files`), não apenas assumido.
- [x] Session 12 marcada como pausada após o Bloco 02, sem ser marcada como concluída.
- [x] Zero implementação de scaffold/sessão/instalação confirmada.

**Testes:** não aplicável — bloco documental. Regressão confirmada via `npm test`/`package:check`/`smoke` contra o baseline da Session 12 inalterado.

**Estratégia de compatibilidade:** nenhum comando existente é tocado; apenas arquivos novos sob `docs/sessions/session_13_.../` e uma atualização de status em `docs/sessions/session_12_.../README.md`.

**Definição de pronto:** os 4 documentos da Session 13 criados, `docs/sessions/session_12_.../README.md` atualizado apenas na seção de status, `git diff`/`git status` confirmando que nenhum outro arquivo foi alterado, `npm test`/`package:check`/`smoke` verdes contra o baseline, commit e push autorizados explicitamente pelo usuário para este bloco específico.

---

### Bloco 02 — Collision Probe & Safe Scaffold Merge

**Objetivo:** gerar o scaffold `Docs/` no repositório real, sem sobrescrever nenhum arquivo já existente.

**Escopo:**
- Executar `node bin/ddae-engine.js init --dir <TEMP>` em um diretório temporário fora do checkout.
- Construir a matriz de colisão: para cada path gerado, classificar como `MISSING` (não existe no repositório), `IDENTICAL` (existe e é byte-idêntico) ou `CONFLICT` (existe e diverge) — comparação de path case-insensitive.
- Se não houver `CONFLICT`: copiar apenas os paths `MISSING` para o repositório real.
- Se houver `CONFLICT`: listar cada um; nenhuma sobrescrita automática.

**Fora de escopo:** `session create` (Bloco 03); `validate`/`audit` contra o próprio repositório (Bloco 04).

**Arquivos previstos:** `Docs/**` (novo, apenas paths `MISSING`), `docs/sessions/session_13_.../validacao_bloco_02_collision_probe.md` (novo).

**Dependências:** Bloco 01 (contrato e estratégia).

**Critérios de aceite:**
- Matriz de colisão completa produzida e revisada antes de qualquer cópia.
- Nenhum arquivo já existente no repositório é sobrescrito.
- `docs/sessions/` permanece byte-a-byte idêntico (diff vazio nesse path).
- Total gerado / `MISSING` / `IDENTICAL` / `CONFLICT` registrados na validação.

**Testes:** `npm test`/`package:check`/`smoke` continuam verdes (nenhuma mudança de código).

**Definição de pronto:** scaffold mesclado com segurança, matriz de colisão documentada, nenhuma sobrescrita, gates verdes.

---

### Bloco 03 — Canonical Self-Host Session Bootstrap

**Objetivo:** criar a primeira sessão canônica de self-hosting.

**Escopo:** `node bin/ddae-engine.js session create "DDAE self hosting bootstrap" --dir .` → `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/`, com os 13 módulos oficiais. Documentar dentro dessa sessão a transição (objetivo, host/candidate, baseline de migração, planos de controle legacy vs. canônico, princípios).

**Fora de escopo:** preencher o conteúdo funcional dos 13 módulos além do registro da transição — isso é trabalho de desenvolvimento contínuo, não deste bootstrap.

**Arquivos previstos:** `Docs/05_sessions/session_01_ddae_self_hosting_bootstrap/**` (novo).

**Dependências:** Bloco 02 (`Docs/05_sessions/` precisa existir).

**Critérios de aceite:**
- `session create` numera a partir de `session_01` (não `session_12`, não uma continuação da numeração legacy).
- 13 módulos oficiais presentes.
- README da sessão documenta explicitamente a transição.

**Testes:** `npm test`/`package:check`/`smoke` continuam verdes.

**Definição de pronto:** sessão canônica criada, documentada, gates verdes.

---

### Bloco 04 — Self-Hosting Validation Proof

**Objetivo:** provar que o próprio DDAE Engine reconhece o repositório como um projeto DDAE consumidor válido.

**Escopo:** `node bin/ddae-engine.js validate --dir .` e `node bin/ddae-engine.js audit --dir .`, executados a partir da raiz do repositório. Nenhuma correção cosmética para "maquiar" o resultado — se houver erro estrutural, ele é diagnosticado e resolvido de forma justificada, não escondido.

**Fora de escopo:** qualquer nova capability de CLI.

**Arquivos previstos:** nenhum arquivo de produto — apenas a evidência da execução na validação do bloco; possíveis ajustes pontuais em `Docs/` se `validate`/`audit` apontarem lacunas reais.

**Dependências:** Bloco 03 (precisa de ao menos uma sessão real para `Sessions found >= 1`).

**Critérios de aceite:**
- `validate` reporta `Status: OK` ou, se `FAILED`, o motivo é diagnosticado e resolvido nesse mesmo bloco.
- `audit` reconhece `session_01_ddae_self_hosting_bootstrap` como sessão real, não como módulo.
- Warnings de conteúdo ainda não preenchido são aceitáveis; erros estruturais não.

**Testes:** a própria execução de `validate`/`audit` é a evidência.

**Definição de pronto:** `validate`/`audit` executados com sucesso estrutural contra o próprio repositório.

---

### Bloco 05 — Package Isolation & Self-Hosting Documentation

**Objetivo:** reconfirmar isolamento de pacote com o scaffold real já existente, e documentar o contrato de execução self-host para uso contínuo.

**Escopo:** `npm pack --dry-run --json` real (pós-scaffold) confirmando zero arquivos `Docs/`/`docs/` no pacote. Criar `Docs/00_ddae_engine/self_hosting.md` (ou path equivalente do scaffold oficial) documentando: comando de execução (`node bin/ddae-engine.js <comando>`), o que é self-hosting, o que não é, e a decisão de não instalar o pacote publicado (Seção 3 do contrato) com a condição explícita de quando revisitar essa decisão.

**Fora de escopo:** qualquer ferramenta ou automação nova.

**Arquivos previstos:** `Docs/00_ddae_engine/self_hosting.md` (novo, dentro do scaffold já mesclado no Bloco 02).

**Dependências:** Blocos 02–04.

**Critérios de aceite:**
- `npm pack --dry-run --json` real confirma zero arquivos `Docs/`/`docs/`.
- Documentação de self-hosting criada e revisada.
- Decisão sobre retomada do Bloco 03 da Session 12 (Context Compiler) registrada explicitamente — dentro de `Docs/05_sessions/` como nova sessão canônica, ou continuando em `docs/sessions/session_12_.../` — antes do encerramento formal da Session 13.

**Testes:** `npm test`/`package:check`/`smoke` finais.

**Definição de pronto:** isolamento reconfirmado, documentação criada, decisão sobre a continuidade do Context Compiler registrada, Session 13 pronta para ser encerrada.

## 5. Estratégia de testes (visão geral)

Nenhum bloco desta sessão altera `src/`, `test/`, ou `scripts/` — portanto a suíte de testes (67 testes desde a Session 12) não ganha novos casos por causa desta sessão. A regressão em cada bloco é confirmada rodando a suíte existente sem alteração, garantindo que o bootstrap de self-hosting não introduz nenhuma quebra no candidate.

## 6. Estratégia de compatibilidade

Nenhum comando existente muda de comportamento. O scaffold `Docs/` é aditivo. `docs/sessions/` permanece intocado. `package.json` permanece inalterado durante toda a sessão.

## 7. Estratégia de release

Esta sessão não publica nada. `package.json.version`, `EXPECTED_VERSION`, e a tag `v0.2.0` permanecem inalterados do início ao fim.
