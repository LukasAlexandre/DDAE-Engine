# Análise de Riscos

> Projeto: DDAE · Atualizado em: 2026-08-16

## 1. Riscos Identificados

| ID | Risco | Probabilidade | Impacto | Área |
|---|---|---|---|---|
| RS-01 | Wikilink gerado apontando para fora da raiz do projeto (path traversal em geração de link) | Baixa | Alto | Segurança |
| RS-02 | Symlink dentro de `Docs/` seguido durante a varredura de descoberta do Brain | Baixa | Médio | Segurança |
| RS-03 | Usuário habilita Obsidian Sync/Publish sem perceber que expõe todo o conteúdo de `Docs/` (incluindo segredos que já estivessem lá) | Média | Alto | Segurança |
| RS-04 | `.obsidian/workspace.json` commitado acidentalmente, vazando caminhos locais de arquivos abertos | Média | Baixo | Segurança |
| RS-05 | `workspace build` lento em monorepos com milhares de arquivos `Docs/` | Baixa | Médio | Performance |
| RS-06 | Projeto `0.3.0` existente afetado inadvertidamente ao atualizar para `0.4.0` | Baixa | Alto | Compatibilidade |
| RS-07 | Duplicação de lógica entre `context/validator.js` e o novo `workspace/validator.js` diverge silenciosamente ao longo do tempo | Média | Médio | Técnico |

## 2. Detalhamento

### RS-01 — Wikilink apontando para fora da raiz
- **Descrição:** Um bug no gerador de índices poderia produzir um link relativo malformado (`../../etc/passwd`-like) se a descoberta de arquivos não validar containment.
- **Gatilho:** Bug de implementação no Bloco 04 (Renderer) ao construir caminhos relativos.
- **Plano de mitigação:** Reaproveitar o containment de path já implementado e testado em `src/context/sensitive-files.js` (mesma Guard usada pelo Compiler) em vez de reimplementar a validação — qualquer caminho gerado passa pelo mesmo `fail-closed` já provado em produção desde o Bloco 08 da Session 02.
- **Responsável:** Bloco 09 (Security Hardening), com teste de regressão dedicado.

### RS-02 — Symlink seguido durante descoberta
- **Descrição:** Um symlink dentro de `Docs/` (incomum, mas possível em clones Linux/macOS) poderia levar a varredura do Brain para fora do projeto.
- **Gatilho:** `src/workspace/discover.js` percorrendo `Docs/` sem a mesma proteção `fail-closed` de symlink já existente na Sensitive Data Guard.
- **Plano de mitigação:** Mesma resposta do RS-01 — reaproveitar, não reimplementar.
- **Responsável:** Bloco 02 (Workspace Discovery).

### RS-03 — Obsidian Sync/Publish expondo o Vault
- **Descrição:** Fora do controle do DDAE por definição — uma vez que o usuário aponta o Obsidian para o repositório, decisões de sincronização/publicação do próprio app (nuvem, Publish) são inteiramente do usuário.
- **Gatilho:** Usuário habilita um recurso de nuvem do Obsidian sem perceber o que está incluído no Vault.
- **Plano de mitigação:** DDAE não pode prevenir — mas pode e deve **tornar o risco visível**: `workspace init` imprime um aviso explícito de que o Vault aponta para a raiz do projeto e que qualquer sincronização/publicação do Obsidian incluiria todo o conteúdo de `Docs/`. Documentado também em `Docs/00_ddae_engine/self_hosting.md` ou equivalente do Workspace.
- **Responsável:** Bloco 09 (Security Hardening) — item de documentação/aviso, não de código bloqueante.

### RS-04 — `.obsidian/workspace.json` commitado
- **Descrição:** Vaza caminhos de arquivos locais recentemente abertos.
- **Gatilho:** Usuário roda `git add -A` antes de `workspace init` gitignorar `.obsidian/`.
- **Plano de mitigação:** `workspace init` gitignora `.obsidian/` como primeiro passo, antes de qualquer outra ação; `package:check`-like verificação pode alertar se `.obsidian/` aparecer staged (avaliar no Bloco 09, sem prometer agora).
- **Responsável:** Bloco 01 (Contract) já fixa isso como requisito não-negociável do `workspace init`.

### RS-05 — Performance em monorepos grandes
- **Descrição:** Rebuild completo a cada `workspace build` pode ficar lento se `Docs/` crescer para milhares de arquivos.
- **Gatilho:** Ainda não observado — nenhuma evidência real de lentidão hoje (DDAE em si tem dezenas de arquivos `Docs/`, não milhares).
- **Plano de mitigação:** MVP roda full-rebuild sempre; cache/incremental fica proposto em `03_ideas/ideias_e_melhorias.md`, condicionado a evidência real de lentidão — não implementado preventivamente.
- **Responsável:** Reavaliar apenas se um consumidor real reportar o problema.

### RS-06 — Projeto 0.3.0 existente afetado por engano
- **Descrição:** Atualizar `ddae-engine` para `0.4.0` (Stable Host de um consumidor, ou `npm install` de um projeto que usa o pacote) não deve, por si só, alterar nada no projeto do consumidor.
- **Gatilho:** `workspace` sendo ativado implicitamente por algum outro comando (`init`, `validate`, `audit`) em vez de exigir invocação explícita.
- **Plano de mitigação:** `workspace init`/`build` são **sempre opt-in**, nunca disparados automaticamente por nenhum outro comando existente — decisão de contrato fixada no Bloco 01.
- **Responsável:** Bloco 10 (Migração), com teste de regressão explícito: projeto `0.3.0` sem nunca rodar `workspace *` permanece bit-a-bit idêntico após `npm update`.

### RS-07 — Duplicação de kernel de validação divergindo
- **Descrição:** Copiar a lógica INVALID/STALE/VALID do Context Validator para o Workspace Validator sem compartilhar código cria dois lugares para corrigir o mesmo bug no futuro.
- **Gatilho:** Pressão de prazo levando a copy-paste em vez de extração.
- **Plano de mitigação:** Registrado explicitamente como item do Bloco 07 (Workspace Validator): avaliar extrair um kernel mínimo compartilhado (enum de status, ordenação de prioridade INVALID > STALE) — não feito nesta sessão de arquitetura, mas não esquecido.
- **Responsável:** Bloco 07.

## 3. Perguntas Orientadoras

- **Algum risco aqui é estrutural o suficiente para a matriz geral?** RS-03 (Obsidian Sync/Publish) é estrutural o bastante para ser promovido a `Docs/04_governance/matriz_riscos.md` quando a implementação começar — registrado como candidato, promoção formal fica para o Bloco 09.
- **Algum risco bloquearia toda a sessão?** Não — todos têm mitigação concreta e nenhum invalida o modelo arquitetural escolhido (Seção 6 de `analise_arquitetural.md`).
