# RSCFlow

RSCFlow is a web application scaffold for organizing work related to RSC processes. This repository deliberately contains no inferred scoring or eligibility rules.

## Start

Requires Node.js 22+ and npm 10+.

```bash
npm ci
npm run dev
```

## Quality checks

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run test:e2e
npm run format:check
```

## Architecture

Read [the architecture](docs/architecture.md), [the normative-data policy](docs/rsc-regulation.md), and [the agent contract](AGENTS.md) before implementing functionality.

The regulation files under `src/data/regulations/ifba-189-2026/` are safe, empty, versioned envelopes. They will be populated only from the official resolution and official scoring spreadsheet validated by a human maintainer.

## Verificar um projeto

Execute `npm run dev` e selecione um arquivo JSON na tela inicial. A aplicação informa se a estrutura do envelope é válida e apresenta os metadados declarados. Erros de leitura, JSON inválido e incompatibilidade de esquema aparecem em português.

A verificação é local, sem salvar ou enviar o arquivo. Validade estrutural não certifica a referência normativa nem calcula pontuação. Consulte o contrato em [docs/data-model.md](docs/data-model.md).
