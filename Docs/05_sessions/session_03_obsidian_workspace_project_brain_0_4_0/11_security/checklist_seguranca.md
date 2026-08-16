# Checklist de Segurança

> Projeto: DDAE · Atualizado em: 2026-08-16

> O threat model completo desta sessão está em `02_analysis/analise_riscos.md` (RS-01 a RS-04) — este checklist é o gate formal a confirmar antes do fechamento do Bloco 09 (Security Hardening), não uma reanálise.

## 1. Itens de Verificação

- [ ] Nenhum wikilink gerado pelo Brain resolve para fora da raiz do projeto (RS-01) — reaproveita `src/context/sensitive-files.js`.
- [ ] Nenhum symlink dentro de `Docs/` é seguido de forma não-fail-closed durante a descoberta (RS-02) — reaproveita a mesma Guard.
- [ ] `workspace init` avisa explicitamente sobre o risco de Obsidian Sync/Publish expor todo o Vault (RS-03).
- [ ] `.obsidian/` é gitignorado por `workspace init` antes de qualquer outra ação (RS-04).
- [ ] Nenhuma credencial, token ou segredo é introduzido por este trabalho (nenhuma dependência nova, nenhum serviço externo).
- [ ] `.ddae/brain/` nunca é lido como fonte de verdade por nenhum outro comando DDAE — apenas escrito/lido por `workspace *`.

## 2. Riscos Específicos Desta Sessão

RS-01 a RS-04 em `02_analysis/analise_riscos.md`.

## 3. Perguntas Orientadoras

- **Se um usuário malicioso controlasse o conteúdo de um arquivo em `Docs/`, o que ele conseguiria via um link gerado pelo Brain?** Nada além de navegar dentro do próprio Vault — a Sensitive Data Guard reaproveitada impede que a geração de link escape da raiz do projeto.
- **Esta mudança altera algum contrato de autenticação?** Não aplicável — o Workspace não introduz autenticação, autorização ou endpoint algum.

## 4. Decisões Pendentes

Nenhuma nesta fase — os itens acima são critério de aceite do Bloco 09, não decisões em aberto agora.
