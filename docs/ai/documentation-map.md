# Mapa de documentação

Use este arquivo como roteador. Leia somente o contexto relacionado à tarefa.

| Se a tarefa afetar...                     | Consulte primeiro...                                  | Contexto adicional                             |
| ----------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| objetivo, escopo ou execução local        | `project-context.md`, `../../README.md`               | `../../CONTRIBUTING.md`                        |
| interpretação, decomposição ou capacidade | `task-protocol.md`                                    | `decision-policy.md`                           |
| arquitetura ou dependências               | `../architecture.md`, `../development-workflow.md`    | código e testes arquiteturais                  |
| domínio                                   | `../domain.md`                                        | `../data-model.md`                             |
| importação, exportação ou persistência    | `../data-model.md`, `../domain.md`                    | `../architecture.md`                           |
| regras ou dados normativos                | `../rsc-regulation.md`                                | resolução citada em `../ifba/`; `../domain.md` |
| interface                                 | `../frontend.md`, `../ux.md`                          | `../architecture.md`                           |
| memorial ou PDF                           | `../architecture.md`, `../frontend.md`                | `../testing.md`                                |
| testes ou fixtures                        | `../testing.md`                                       | `../../.github/workflows/quality.yml`          |
| workflow ou contribuição                  | `../development-workflow.md`, `../../CONTRIBUTING.md` | `../../CHANGELOG.md`                           |
| commit ou changelog                       | `../commit-convention.md`, `../../CHANGELOG.md`       | `../development-workflow.md`                   |
| decisão, conflito ou lacuna               | `decision-policy.md`                                  | documento especializado da área                |
| alteração já implementada                 | `task-protocol.md`                                    | diff e documentos da área afetada              |

## Públicos e histórico

- `docs/ai/`: instruções operacionais e roteamento para agentes;
- `README.md`: produto, instalação e uso;
- `CONTRIBUTING.md` e documentos técnicos em `docs/`: manutenção e desenvolvimento;
- `docs/maintainers/history/`: planos e auditorias históricas, fora do contexto inicial.

Os documentos normativos oficiais e auxiliares permanecem em `docs/ifba/` por sua função de fonte,
e não como documentação operacional.
