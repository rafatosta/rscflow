# Architecture

The application is layered to keep legal/normative decisions auditable and independent of the interface.

- `app`: application entry points and composition.
- `components`: reusable presentation; `components/ui` hosts shadcn-compatible primitives.
- `domain`: versioned business-neutral contracts and schemas.
- `rules`: funções puras de cálculo, consolidação e arredondamento, condicionadas à validação do dataset.
- `data/regulations`: validated, versioned regulation datasets.
- `storage`: local persistence adapters.
- `features`: use-case orchestration.
- `memorial` and `pdf`: future document assembly and output.
- `utils`: framework-agnostic helpers.

React components may present outcomes but must never contain normative criteria or scoring logic.

## Contratos e carregamento

`src/data/regulations/load.ts` carrega os três JSONs e os metadados pelo schema genérico de domínio. Alterações em valores e inclusão de critérios/diretrizes dentro desse contrato exigem apenas edição dos JSONs, sem lógica ou valores normativos em React. A validação é executada pelos testes e em cada carregamento. O motor recebe o envelope e o dataset como argumentos, sem acessar armazenamento ou interface.

## Motor quantitativo

`src/rules/scoring.ts` expõe `calculateActivity`, `roundFinalScore` e `calculateProjectScore`. O resultado discriminado está em `src/domain/scoring.ts`. Cálculos usam aritmética decimal baseada em BigInt, sem arredondamento binário intermediário ou configuração global; conversões fora do intervalo de number retornam indisponibilidade explícita. Dados de entrada são validados e não são alterados.

A sequência é quantidade consolidada por critério → limite do item → fator e peso → soma/teto da diretriz → soma/teto do nível → total geral/arredondamento → mínimos. Pontuações não são persistidas nem incorporadas ao projeto como fonte de verdade.
