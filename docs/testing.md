# Testes

## Ferramentas e comandos

O projeto usa Vitest e Testing Library para testes unitários e de integração, com jsdom e
fake-indexeddb configurados em `tests/setup.ts`. Os E2E, testes de acessibilidade e verificações de
reflow usam Playwright/Chromium e axe-core.

Execute a bateria completa definida no CI:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run test:e2e
git diff --check
```

Testes focados ajudam durante a implementação, mas não substituem a bateria aplicável ao concluir.

A projeção de prontidão possui regressões para dados estruturais obrigatórios, lançamentos sem
enquadramento ou comprovante, arquivos locais inválidos, cálculo indisponível, conflito normativo e
pontuação provisória. Testes de integração confirmam que Revisão e Gerar documentos apresentam os
mesmos estados por artefato após a preparação assíncrona dos comprovantes.

## Matriz vigente

| Escopo      | Local                             | Responsabilidade principal                                                               |
| ----------- | --------------------------------- | ---------------------------------------------------------------------------------------- |
| unitário    | `tests/unit/`                     | schemas, funções puras, regras, casos de uso, persistência e layout PDF                  |
| regulatório | `tests/regulation/`               | parâmetros da resolução, integridade estrutural e indisponibilidade do catálogo pendente |
| integração  | `tests/integration/`              | componentes, formulários, autosave, persistência e geração de documentos                 |
| E2E         | `tests/e2e/`                      | jornada de Requisitos, IndexedDB real, downloads, PDF, acessibilidade e reflow           |
| arquitetura | `tests/unit/architecture.test.ts` | fronteiras entre camadas, ausência de rede e de implementação incompleta                 |

A árvore atual concentra o fluxo público em Visão geral, Dados do docente, Requisitos, Memorial,
Revisão e geração de documentos. Suítes antigas de trajetória, shell e jornada completa foram
removidas; suas verificações úteis foram transferidas para Requisitos, Projeto, Memorial, Revisão,
PDF e acessibilidade. O documento anterior à consolidação está arquivado em
`maintainers/history/testing-before-arrp-update-2026-09-13.md`.

## Fixtures e dados normativos

Fixtures sintéticas devem se identificar como teste e nunca podem ser copiadas para o catálogo de
produção. Recortes regulatórios citam a resolução e fixam resultados esperados fora do algoritmo,
mas não certificam o catálogo completo. Arquivos portáteis usam IDs isolados e cobrem as versões
suportadas.

O modo Vite `e2e` acrescenta, por alias, o catálogo sintético de
`tests/fixtures/criteria-regulation.json`. Builds comuns carregam somente
`src/data/regulations/`. Testes do catálogo IFBA confirmam que dados pendentes não produzem
pontuação presumida.

## Cobertura por fluxo

- `tests/unit/requirements.test.ts`, `tests/integration/requirements.test.tsx` e
  `tests/e2e/requirements.spec.ts` cobrem lançamentos, contexto derivado do dataset, anexos locais,
  autoria, catálogo pendente, navegação protegida, transporte JSON, teclado e reflow.
- Testes de projeto, storage e importação cobrem envelopes compatíveis, migração explícita,
  autosave, conflitos, duplicação, arquivos locais e round-trip.
- Testes de memorial, revisão e PDF cobrem preservação do texto manual, bloqueios estruturais,
  paginação, prévia e download local.
- `tests/e2e/accessibility.spec.ts` verifica axe, foco e reflow em mobile, tablet e desktop.
- `tests/e2e/bootstrap.spec.ts` verifica validação e importação dos contratos portáteis.
- `tests/e2e/process-flow.spec.ts` percorre o projeto demonstrativo pelos três níveis RSC e verifica
  a consistência do mapa de páginas entre prévia, PDFs individuais, formulários, pacote final e
  backup restaurado. A mesma suíte cobre comprovante ausente, PDF inválido e falha transacional da
  geração conjunta.

Todos os E2E usam o suporte compartilhado em `tests/e2e/support/fixtures.ts`. Exceções de página,
`console.error` e `console.warning` inesperados devem falhar o cenário. Não crie exceções sem fonte
externa documentada.

## Critérios para mudanças

Toda mudança de comportamento exige regressão na camada responsável. Use fixtures sintéticas para
comportamento genérico e recortes com proveniência para afirmações normativas. Mudanças em schema ou
persistência devem cobrir compatibilidade, importação/exportação e falhas transacionais. Mudanças de
interface devem incluir estados acessíveis, teclado e tamanhos de viewport aplicáveis.

A validação estrutural dos catálogos e projetos não equivale a validação normativa. Dados ausentes
não podem ser convertidos em zero, e catálogos pendentes permanecem indisponíveis para cálculo.
