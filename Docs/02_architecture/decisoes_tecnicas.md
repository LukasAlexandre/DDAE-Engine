# Decisões Técnicas

> Projeto: DDAE Engine · Atualizado em: 2026-08-16

> Registre apenas decisões caras de reverter (troca de framework, modelo de dados, estratégia de autenticação, etc.) — não decisões triviais de estilo de código.

## 1. Decisões Registradas

Use uma entrada por decisão, mais recente primeiro. Nunca edite uma decisão antiga para "corrigi-la" — registre uma nova decisão que a supersede.

### DT-01 — Vault Obsidian = raiz do repositório; `.ddae/brain/` efêmero para views geradas

- **Data:** 2026-08-16
- **Contexto:** A `0.4.0` (Obsidian Workspace / Project Brain, `session_03_obsidian_workspace_project_brain_0_4_0`) precisa decidir onde o Vault Obsidian vive em relação a `Docs/`, e onde artefatos gerados (índices, Home) residem — decisão cara de reverter porque toda a implementação subsequente (Discovery, Renderer, CLI) depende dela.
- **Decisão:** O Vault Obsidian é a **raiz do repositório** (não uma cópia, não `Docs/` isolado) — `Docs/` é navegado diretamente, sem geração, sem duplicação. Views agregadas geradas pelo DDAE (Home, índices) vivem em `.ddae/brain/`, efêmero e self-`.gitignore`d, seguindo exatamente o precedente já estabelecido por `.ddae/context/` na `0.3.0`. `Docs/` e Git continuam sempre autoritativos; `.ddae/brain/` é sempre uma view recomputável, nunca uma fonte.
- **Alternativas consideradas:**
  - Vault gerado em árvore separada, duplicando `Docs/` — descartada: garante drift e duplicação de armazenamento, contradiz "DDAE = fonte de verdade".
  - Diretório de workspace paralelo dedicado (`.ddae/workspace/`, espelhando conteúdo) — descartada pelo mesmo motivo, apenas realocado.
  - Symlink/junction entre `Docs/` e uma pasta de Vault — descartada: frágil entre plataformas (junctions no Windows exigem privilégio/Developer Mode; Git trata symlinks de forma inconsistente entre SOs), contradiz a decisão já tomada na Session 02 (Bloco 01, "Cross-Platform Self-Host Docs Casing") de eliminar fragilidade cross-platform equivalente.
  - Detalhe completo da comparação dos 6 modelos avaliados em `Docs/05_sessions/session_03_obsidian_workspace_project_brain_0_4_0/02_analysis/analise_arquitetural.md`, Seção 5.
- **Consequências:** Torna mais fácil: zero duplicação de conteúdo canônico, zero risco estrutural de drift silencioso (o gerado é sempre recomputável ou reportado STALE/INVALID), reversibilidade trivial (apagar dois diretórios gitignored). Torna mais difícil: nada identificado — a decisão estende um padrão já provado (Stable Host, Context Compiler) em vez de introduzir um novo. Torna impossível (por design, deliberado): o Project Brain nunca pode ganhar autoridade sobre `Docs/`.
- **Status:** Vigente.

## 2. Perguntas Orientadoras

- Esta decisão seria cara de reverter dentro de 3 meses? Se sim, ela pertence aqui.
- As alternativas descartadas estão registradas com o motivo real, ou só "decidimos não fazer assim"?
- Esta decisão contradiz alguma decisão anterior? Se sim, a anterior foi marcada como superada?

## 3. Critérios de Aceite

- [ ] Toda decisão tem alternativas consideradas registradas, não apenas a escolha final.
- [ ] Nenhuma decisão antiga foi editada in-place quando uma nova decisão a substituiu — foi criada uma nova entrada com referência cruzada.

## 4. Riscos

Decisões tomadas sob pressão de tempo, sem alternativas reais avaliadas, ou que dependem de uma pessoa específica para serem entendidas.

_..._

## 5. Decisões Pendentes

Decisões que precisam ser tomadas mas ainda não foram.

_..._
