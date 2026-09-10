# Testing

Use Vitest and Testing Library for unit and integration tests. `tests/setup.ts` enables jsdom and fake IndexedDB. Use Playwright with axe-core in `tests/e2e` for end-to-end and accessibility checks.

Run `npm run test:run` for the non-watch suite and `npm run test:e2e` after the application can be served. Normative rules require focused tests based on source-backed fixtures.

## Validador local de projetos

Os testes unitários cobrem leitura, JSON malformado, raiz inválida, campos obrigatórios e versão incompatível. A integração verifica metadados declarados, mensagens acessíveis, nova seleção, falha de leitura e leituras concluídas fora de ordem. O E2E Chromium usa arquivos em memória para verificar sucesso, rejeição e axe nos estados inicial, válido e inválido. As fixtures são sintéticas e não representam dados normativos validados.

## Motor de pontuação

`tests/unit/scoring.test.ts` usa catálogo sintético para verificar fator/peso, limite compartilhado do critério, teto por diretriz e nível, soma, limites inclusivos 60/36, aritmética decimal, arredondamento somente final, escolha de nível, duplicidade de ID, versões incompatíveis, dados inválidos/pendentes, ausência de política, entradas vazias, imutabilidade e extremos numéricos. Alterações de parâmetros do dataset são testadas sem mudar o algoritmo.

`tests/regulation/scoring.test.ts` fixa parâmetros conferidos nos arts. 12, 15 e 17 e recortes dos três níveis com proveniência em `tests/regulation/fixtures/resolution-excerpts.json`. Os resultados esperados são independentes da implementação. Esses recortes não certificam todo o catálogo: também há regressão que exige indisponibilidade do dataset de produção pendente. O E2E existente continua cobrindo importação e acessibilidade; não há interface de pontuação nesta etapa.
