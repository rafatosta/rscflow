# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Formulários

Para a entrada e validação de dados em formulários, use exclusivamente a combinação abaixo:

- [`react-hook-form`](https://react-hook-form.com/): gerencia o estado dos campos, a submissão, os erros e o desempenho dos formulários.
- [`zod`](https://zod.dev/): define os schemas, as regras de validação e os tipos dos dados, incluindo campos obrigatórios, CPF, datas e referências.
- [`@hookform/resolvers`](https://github.com/react-hook-form/resolvers): conecta os schemas do Zod ao React Hook Form.

Não utilize outra biblioteca para gerenciamento ou validação de formulários sem uma justificativa documentada ou uma limitação comprovada dessas ferramentas.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
