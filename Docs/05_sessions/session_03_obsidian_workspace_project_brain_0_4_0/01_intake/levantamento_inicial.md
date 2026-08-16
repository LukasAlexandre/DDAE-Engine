# Levantamento Inicial

> Projeto: DDAE · Atualizado em: 2026-08-16

## 1. Contexto

A linha `0.3.x` (Context Compiler) está integralmente encerrada: `ddae-engine@0.3.0` publicado no npm, tag `v0.3.0` e GitHub Release criados, Stable Host promovido e provado, zero pendência P1/P2 aberta (`session_02_context_compiler_0_3_0`). O roadmap oficial (`Docs/01_product/visao_produto.md`, Seção 4) já reservava a próxima etapa como `0.4.0` — Obsidian Workspace / Project Brain — desde antes da `0.3.0` começar. Esta sessão abre essa etapa, por decisão explícita do usuário, começando por descoberta e arquitetura, não por implementação direta.

## 2. Necessidades Levantadas

- O DDAE hoje produz um registro de engenharia rico (`Docs/`) e um compilador de contexto determinístico (`0.3.0`), mas não oferece uma forma navegável de consumir esse estado — cada visita exige reconstruir mentalmente "onde estamos" a partir de vários arquivos dispersos.
- Precisamos de uma camada de workspace operacional (navegável por humanos via Obsidian, e por agentes de IA via arquivos determinísticos) que agregue estado — sessão ativa, decisões, riscos, bugs, release state — sem se tornar uma segunda fonte de verdade capaz de divergir silenciosamente do DDAE.
- A integração não pode exigir Obsidian como dependência de runtime — o DDAE precisa continuar funcionando de ponta a ponta sem ele.

## 3. Perguntas Abertas

Estas perguntas foram respondidas durante a análise desta sessão (`02_analysis/`) — listadas aqui como o que precisava ser decidido antes de um plano de blocos fazer sentido:

- Onde o Vault Obsidian deve viver em relação a `Docs/` — cópia, geração separada, ou o próprio repositório como Vault?
- Onde os artefatos gerados (índices, Home, current-state) devem viver — versionados ou efêmeros?
- Como detectar divergência entre o que foi gerado e o estado real do DDAE, sem duplicar o kernel do Context Validator às cegas?
- O que exatamente é "Project Brain" tecnicamente, além do termo?
- Qual a superfície mínima de CLI necessária?

## 4. Fontes Consultadas

- `Docs/00_ddae_engine/self_hosting.md`, `Docs/01_product/visao_produto.md` (roadmap oficial, modelo de promoção Stable Host).
- `src/context/**` (compiler, validator, fingerprint, sensitive-files) — precedente arquitetural direto para o que Workspace/Brain deve reaproveitar.
- `src/context/ddae-context.js` (DDAE State Collector) — já coleta sessão atual, módulos, blocos, decisões, bugs; base natural para os índices do Brain.
- `.gitignore`, `scripts/ci/verify-clean-tree.mjs`, `scripts/ci/verify-stable-host.mjs` — convenções existentes de artefato efêmero vs. commitado.
- `package.json` (`files`) — confirma que `scripts/`/`Docs/` nunca entram no pacote npm, relevante para decidir onde a lógica de Workspace deve residir (`src/`, para ser distribuída) versus onde a saída gerada deve residir (fora do pacote, no checkout do consumidor).

## 5. Primeiras Hipóteses de Escopo

Dentro desta sessão (0.4.0): contrato do Workspace/Project Brain, modelo de geração determinística, CLI (`workspace init/build/validate/show`), integração read-only com o Context Compiler existente, hardening de segurança, migração para projetos `0.3.0` existentes.

Fora desta sessão: plugin oficial do Obsidian, MCP Server, extração semântica/NLP, qualquer sistema de "memória" paralelo a `Docs/`, file watcher/rebuild incremental (a menos que uma sessão futura traga evidência real de necessidade).

## 6. Decisões Pendentes

Nenhuma nesta fase de intake — todas resolvidas explicitamente em `02_analysis/`.
