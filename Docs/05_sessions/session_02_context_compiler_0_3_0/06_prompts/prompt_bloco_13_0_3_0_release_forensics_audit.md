# Prompt — Bloco 13: 0.3.0 release forensics audit

Você é o executor técnico do projeto seguindo a metodologia DDAE Engine.

## 1. Contexto Obrigatório

Antes de qualquer ação, leia:
- `Docs/00_ddae_engine/metodologia.md` e `Docs/00_ddae_engine/regras_ddae_engine.md`
- O bloco completo em `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_13_0_3_0_release_forensics_audit.md`
- Requisitos, contratos e decisões técnicas referenciados pelo bloco

> **Nota de proveniência**: este prompt foi registrado retroativamente. O Bloco 13 foi solicitado diretamente pelo usuário ao agente, em resposta a uma tentativa de `npm publish` recusada pelo registro (`You cannot publish over the previously published versions: 0.3.0`), fora do fluxo padrão `block create` → `prompt create` → execução. O bloco (`05_blocks/bloco_13_0_3_0_release_forensics_audit.md`) e este prompt registram, na íntegra, o que foi de fato pedido e executado — sem reescrever a sequência real dos eventos.

## 2. Objetivo

Determinar, com evidência forense (não suposição), se o estado local atual do repositório é equivalente ao artefato `ddae-engine@0.3.0` efetivamente publicado no npm, e produzir um veredito de versionamento sem executar nenhuma ação de release.

## 3. Escopo

- Estado do repositório (git status/branch/HEAD/log/tags/diff), sem alterar nada.
- Metadados reais de `ddae-engine@0.3.0` via `npm view`.
- `npm pack ddae-engine@0.3.0` (publicado) e `npm pack .` (local) em área temporária, hash SHA-256.
- Extração isolada e diff recursivo de conteúdo entre os dois tarballs.
- Auditoria explícita arquivo a arquivo dos módulos do Context Compiler.
- Correlação com o histórico Git e com a documentação DDAE existente (`Docs/`, `CHANGELOG.md`, `README.md`).
- Reexecução de `npm test`, `npm run package:check`, `npm run smoke`.
- Veredito de versionamento com justificativa.

## 4. Fora de Escopo

- `npm version`, `npm publish`, `git tag`, `git commit`, `git push` — nenhuma ação de release nesta etapa.
- Correção de arquivos de produção ou início de qualquer nova feature.
- Uso de `0.4.0` só porque `0.3.0` já existe.

## 5. Arquivos Permitidos

- `Docs/05_sessions/session_02_context_compiler_0_3_0/05_blocks/bloco_13_0_3_0_release_forensics_audit.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/06_prompts/prompt_bloco_13_0_3_0_release_forensics_audit.md` (este arquivo)
- `Docs/05_sessions/session_02_context_compiler_0_3_0/08_feedbacks/feedback_bloco_13_0_3_0_release_forensics_audit.md`
- `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/validacao_bloco_13_0_3_0_release_forensics_audit.md`
- Área temporária de auditoria (tarballs extraídos), fora de `Docs/` e fora do controle de versão.

## 6. Regras Obrigatórias

- Não expanda o escopo sem reportar e obter confirmação primeiro.
- Não introduza dependência nova sem registrar a decisão em `Docs/04_governance/registro_decisoes.md`.
- Siga as convenções de `Docs/04_governance/convencoes_codigo.md`.
- Registre toda pendência encontrada com prioridade P1–P4.
- Compare conteúdo extraído, não apenas o `.tgz` bruto (metadata de archive pode gerar falso positivo).

## 7. Restrições de Segurança

Nenhum token, senha, OTP ou credencial pode ser exibido, solicitado ou registrado. `npm view`/`npm pack` usam apenas o registro público; nenhuma alteração de auth/config é permitida.

## 8. Restrições de Performance

Não aplicável.

## 9. Restrições de Design System

Não aplicável.

## 10. Tarefas

1. Levantar estado do repositório (Fase 1).
2. Consultar metadados npm de `ddae-engine@0.3.0` (Fase 2).
3. Baixar tarball publicado e empacotar HEAD local, hashear ambos (Fases 3–4).
4. Extrair e comparar recursivamente (Fases 5–6).
5. Auditar explicitamente o Context Compiler arquivo a arquivo (Fase 8).
6. Correlacionar com Git e com a documentação DDAE (Fases 9–10).
7. Reexecutar `npm test`/`package:check`/`smoke` (Fase 11).
8. Emitir veredito de versionamento (Fase 12) e relatório final (Fase 13).

## 11. Critérios de Aceite

- [x] Estado do repositório documentado (branch, HEAD, working tree, tags).
- [x] Metadados do npm `0.3.0` capturados (versão, shasum, integrity, data).
- [x] Tarball publicado e tarball local obtidos e hasheados (SHA-256).
- [x] Diff recursivo completo entre os dois artefatos extraídos.
- [x] Context Compiler auditado explicitamente arquivo a arquivo.
- [x] Linha do tempo Git das mudanças pós-release construída.
- [x] `npm test`, `package:check`, `smoke` reexecutados e resultado registrado.
- [x] Veredito de versionamento emitido com justificativa.
- [x] Nenhuma ação de release executada nesta etapa.

## 12. Validações Locais Obrigatórias

Execute e confirme que passam antes de finalizar:

- [x] `ddae-engine validate`
- [x] `npm test`
- [x] `npm run package:check`
- [x] `npm run smoke`

## 13. Feedback Final Obrigatório

_(nota de proveniência acima documenta que este prompt foi criado após a execução do bloco — o texto abaixo permanece o padrão do template para consistência com os demais blocos.)_


Ao concluir, gere o feedback com:

```
ddae-engine feedback create --block bloco_13_0_3_0_release_forensics_audit --session session_02_context_compiler_0_3_0
```

Preencha todas as seções, incluindo pendências classificadas P1–P4.

## 14. Validação Final

Preencha `Docs/05_sessions/session_02_context_compiler_0_3_0/09_validation/` ou o arquivo de validação do bloco com o status final (Aprovado / Aprovado com ressalvas / Reprovado / Bloqueado).

## 15. Commit Semântico Sugerido

```
docs(session-02): audit 0.3.0 release forensics
```

## 16. Regra de Não Commit Automático

**Não faça commit automaticamente sem confirmação do usuário.** Sugira o commit acima e aguarde aprovação explícita antes de executar `git add`, `git commit` ou `git push`.
