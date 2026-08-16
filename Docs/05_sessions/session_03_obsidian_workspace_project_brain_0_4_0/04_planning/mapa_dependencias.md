# Mapa de Dependências

> Projeto: DDAE · Atualizado em: 2026-08-16

## 1. Dependências Internas

| Bloco | Depende de | Motivo |
|---|---|---|
| 02 — Workspace Discovery | 01 — Contract | Precisa do schema/modelo de filesystem fixado antes de escrever o coletor. |
| 03 — Schema, Fingerprint & Compiler | 02 — Discovery | O Manifest é construído a partir do que a Discovery coleta. |
| 04 — Renderer | 03 — Schema/Fingerprint/Compiler | Renderiza um Manifest já válido e fingerprinted. |
| 05 — Obsidian Navigation Hardening | 04 — Renderer | Endurece os links que o Renderer já produz. |
| 06 — Context Compiler Integration | 04 — Renderer | Adiciona uma nova view ("Context Packages") ao conjunto já renderizado. |
| 07 — Workspace Validator | 03 — Schema/Fingerprint/Compiler | Valida o mesmo Manifest que o Bloco 03 define. |
| 08 — CLI | 04, 05, 06, 07 | `workspace build/validate/show` expõem, via CLI, tudo que os blocos anteriores implementaram. |
| 09 — Security Hardening | 08 — CLI | Precisa da superfície de CLI real para testar os controles de segurança ponta a ponta. |
| 10 — Existing Project Migration | 08 — CLI | Precisa do comando `workspace init` real para provar não-interferência com projetos existentes. |
| 11 — Real Consumer Smoke | 09, 10 | Deve provar o sistema já endurecido e com migração validada, não antes. |
| 12 — Documentation / Polish | 11 — Real Consumer Smoke | Documenta o comportamento já provado, não o planejado. |
| 13 — Release Preparation | 12 — Documentation / Polish | Mesmo padrão do Bloco 11 da Session 02 — release prep vem depois de tudo provado e documentado. |

Blocos 05 e 06 dependem apenas de 04, não um do outro — podem ser reordenados ou paralelizados sem quebrar o plano.

## 2. Dependências Externas

| Dependência | Tipo | Status | Bloqueia o quê |
|---|---|---|---|
| `src/context/ddae-context.js`, `src/context/git-context.js` | Módulo existente (0.3.0) | Pronta | Bloco 02 (Discovery) — reaproveitados, não recriados. |
| `src/context/sensitive-files.js` | Módulo existente (0.3.0) | Pronta | Blocos 02 e 05 (containment de path/symlink). |
| `src/context/fingerprint.js` | Módulo existente (0.3.0) | Pronta | Bloco 03 (mesma primitiva de hash). |
| `src/context/validator.js` (modelo, não código) | Módulo existente (0.3.0) | Pronta | Bloco 07 (referência de padrão VALID/STALE/INVALID). |
| `.ddae/context/manifest.json` | Artefato opcional, gerado por `context build` | Condicional — pode não existir em um projeto que nunca rodou `context build` | Bloco 06 — deve degradar graciosamente quando ausente, nunca bloquear. |
| Obsidian (aplicativo) | Serviço externo, opcional | Fora do controle do DDAE | Nada — por design, nenhum bloco depende de Obsidian estar instalado para passar seus próprios testes. |

## 3. Perguntas Orientadoras

- **Existe dependência circular?** Não — o grafo é estritamente linear/paralelo, sem ciclos. `src/context/**` é sempre consumido, nunca modificado, então não há risco de o Workspace introduzir uma dependência de volta para o Context Compiler.
- **Alguma dependência externa está fora do controle da equipe?** O Obsidian em si (aplicativo de terceiro) — mas nenhum bloco depende dele para ser testado/aprovado, exatamente para que essa dependência externa nunca vire um bloqueio real (consistente com "Obsidian instalado = melhoria opcional").

## 4. Decisões Pendentes

Nenhuma.
