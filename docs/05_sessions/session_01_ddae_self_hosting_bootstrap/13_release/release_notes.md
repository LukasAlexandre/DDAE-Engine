# Release Notes

> Projeto: DDAE · Atualizado em: 2026-08-08

> Diferente do changelog (técnico, granular), release notes são para quem vai usar a mudança — linguagem direta, foco em valor.

## 1. Destaques

**Nenhuma publicação npm foi realizada nesta sessão.** Esta sessão é um bootstrap interno de governança — o DDAE Engine passou a consumir sua própria release pública estável (`ddae-engine@0.2.0`) como ferramenta de desenvolvimento do próprio repositório, sem gerar nenhum artefato novo para usuários externos do pacote.

## 2. Impacto para Usuários Existentes

Nenhum. `package.json.version` permanece `0.2.0`; `npm view ddae-engine version` continua `0.2.0`; nenhuma tag nova; nenhuma mudança de comportamento de nenhum comando (`init`, `session create`, `block create`, `prompt create`, `feedback create`, `validate`, `audit`) consumido por qualquer projeto externo.

## 3. Conhecidos Problemas / Limitações

BUG-01 (`07_bugs/bugs_identificados.md`): o template-fonte de `Docs/00_ddae_engine/glossario.md` renderiza `{{PROJECT_NAME}}`/`{{CURRENT_DATE}}` em vez de documentá-los literalmente — afeta qualquer projeto que rode `ddae-engine init`, incluindo consumidores externos já em produção. P3, não estrutural, correção de fonte planejada para `session_02_context_compiler_0_3_0`.

## 4. Decisões Pendentes

Nenhuma.
