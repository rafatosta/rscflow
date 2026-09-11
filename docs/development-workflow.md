# Development workflow

1. Read `AGENTS.md` and pertinent docs.
2. Confirm normative sources when a change touches rules or regulation data.
3. Implement in the appropriate layer.
4. Add or update the corresponding tests and documentation.
5. Run format check, lint, typecheck, tests, build, E2E when applicable, and `git diff --check`.
6. Report any check not run and suggest a Conventional Commit; do not commit without authorization.

## Hardening local

Antes de enviar uma alteração, execute a mesma sequência do CI:

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

O Playwright inicia o Vite com `--mode e2e`. Esse modo troca apenas o carregador de datasets por uma
implementação de suporte que acrescenta uma fixture sintética validada; builds comuns continuam
usando somente os arquivos em `src/data/regulations/`. Valores da fixture não podem ser copiados
para código de produção ou tratados como parâmetros normativos. O servidor não reutiliza outra
instância local, garantindo que a suíte execute sempre nesse modo.

Os E2E falham quando a página emite exceções, `console.error` ou `console.warning`. Um aviso novo deve
ser investigado e corrigido; não o inclua em uma lista de exceções sem uma causa externa inevitável
e documentada. Use `npm run format` somente quando quiser formatar o repositório inteiro.

Na auditoria da etapa 14, TypeScript com `noUnusedLocals`/`noUnusedParameters`, ESLint e a análise de
dependências não encontraram código morto nem dependências de runtime sem uso. `autoprefixer` e
`postcss` são referenciados declarativamente por `postcss.config.js`. A busca por parâmetros de
pontuação confirmou que componentes apenas exibem valores recebidos; cálculo e limites permanecem
em `src/rules/`, com valores de produção em `src/data/regulations/`.
