# Testing

Use Vitest and Testing Library for unit and integration tests. `tests/setup.ts` enables jsdom and fake IndexedDB. Use Playwright with axe-core in `tests/e2e` for end-to-end and accessibility checks.

Run `npm run test:run` for the non-watch suite and `npm run test:e2e` after the application can be served. Normative rules require focused tests based on source-backed fixtures.

## Validador local de projetos

Os testes unitários cobrem leitura, JSON malformado, raiz inválida, campos obrigatórios e versão incompatível. A integração verifica metadados declarados, mensagens acessíveis, nova seleção, falha de leitura e leituras concluídas fora de ordem. O E2E Chromium usa arquivos em memória para verificar sucesso, rejeição e axe nos estados inicial, válido e inválido. As fixtures são sintéticas e não representam dados normativos validados.
