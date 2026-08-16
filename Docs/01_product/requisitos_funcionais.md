# Requisitos Funcionais

> Projeto: DDAE Engine · Atualizado em: 2026-08-16

> Todo bloco de implementação deve referenciar um requisito listado aqui. Se uma tarefa não tem requisito correspondente, atualize esta lista antes de implementar — não implemente "por inferência".

## 1. Lista de Requisitos

Numere os requisitos para que possam ser referenciados por blocos e prompts (ex.: `RF-01`).

| ID | Requisito | Prioridade | Status |
|---|---|---|---|
| RF-01 | O DDAE deve oferecer um Workspace/Project Brain navegável no Obsidian, agregando o estado atual do projeto (sessão ativa, decisões, riscos, bugs, release state) sem duplicar `Docs/` nem se tornar uma fonte de verdade independente. | Should | Pendente |

## 2. Critérios de Aceite

Para cada requisito, descreva como verificar que ele foi atendido (comportamento observável, não implementação).

### RF-01 — Workspace/Project Brain navegável no Obsidian
- [ ] Abrir a raiz do repositório como Vault no Obsidian permite navegar `Docs/` diretamente, sem nenhuma cópia gerada do conteúdo canônico.
- [ ] `ddae-engine workspace build` gera, em `.ddae/brain/`, uma view "Home" e índices (sessões, decisões, riscos, bugs, release state) que apontam para os arquivos reais de `Docs/` via wikilink, sem duplicar conteúdo.
- [ ] `ddae-engine workspace validate` reporta `VALID`/`STALE`/`INVALID` corretamente quando `Docs/`/Git mudam depois do último build.
- [ ] Um projeto que nunca roda `workspace init`/`build` continua funcionando de ponta a ponta exatamente como hoje — nenhum comando existente muda de comportamento.
- [ ] Nenhum arquivo gerado pelo Brain é tratado como fonte de verdade por nenhum outro comando do DDAE.

## 3. Perguntas Orientadoras

- Este requisito está descrito em termos de comportamento (o que o sistema faz), não de implementação (como ele faz)?
- Existe um critério de aceite que um avaliador externo conseguiria checar sem ler o código?
- Este requisito depende de algum outro ainda não atendido?

## 4. Riscos

Requisitos ambíguos, conflitantes ou que dependem de decisões de produto ainda não tomadas.

_..._

## 5. Decisões Pendentes

_..._
