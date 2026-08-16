# Matriz de Riscos

> Projeto: DDAE Engine · Atualizado em: 2026-08-16

> Esta matriz é o consolidado de riscos de todo o projeto (produto, arquitetura, segurança, operação). Riscos detalhados por área continuam vivendo em seus documentos específicos (`Docs/02_architecture/riscos_arquiteturais.md`, `Docs/06_quality_gates/security_gate.md`, etc.) — aqui entra a visão executiva.

## 1. Objetivo

Dar visibilidade consolidada sobre o que pode dar errado no projeto, priorizado por probabilidade e impacto.

## 2. Riscos

| ID | Risco | Área | Probabilidade | Impacto | Status |
|---|---|---|---|---|---|
| MR-01 | Stable Host deste checkout continua pinado em `ddae-engine@0.2.0` (`scripts/ci/verify-stable-host.mjs`) apesar de `0.3.0` já estar publicado, taggeado (`v0.3.0` → `0ca3f904be7b292115412dcba27539ac277ad8be`) e released no GitHub. Promoção planejada no escopo original do Bloco 12, não executada — ver `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_12_controlled_0_3_0_release.md`, pendência P2. | Operação | Baixa | Baixo | Aberto |

## 3. Probabilidade × Impacto

Use esta matriz para priorizar: riscos de alta probabilidade e alto impacto são tratados primeiro, independentemente de quando foram identificados.

| | Impacto Baixo | Impacto Médio | Impacto Alto |
|---|---|---|---|
| **Probabilidade Alta** | Monitorar | Mitigar em breve | Mitigar agora |
| **Probabilidade Média** | Aceitar | Monitorar | Mitigar em breve |
| **Probabilidade Baixa** | Aceitar | Aceitar | Monitorar |

## 4. Plano de Resposta

Para cada risco em "Mitigar agora" ou "Mitigar em breve", qual é a ação concreta e quem é responsável.

_..._

## 5. Regras Obrigatórias

- [ ] Todo risco aceito (sem mitigação ativa) tem essa decisão registrada explicitamente, com justificativa.
- [ ] Esta matriz é revisada ao final de cada sessão, não apenas quando um incidente já ocorreu.

## 6. Decisões Pendentes

_..._
