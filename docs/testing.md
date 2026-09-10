# Testing

Use Vitest and Testing Library for unit and integration tests. `tests/setup.ts` enables jsdom and fake IndexedDB. Use Playwright with axe-core in `tests/e2e` for end-to-end and accessibility checks.

Run `npm run test:run` for the non-watch suite and `npm run test:e2e` after the application can be served. Normative rules require focused tests based on source-backed fixtures.
