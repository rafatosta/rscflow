# Guia técnico do RSCFlow

Este documento reúne os pontos de entrada para instalação, desenvolvimento, manutenção e publicação
do projeto. Antes de alterar o código, leia [AGENTS.md](../AGENTS.md) e use o
[mapa de documentação](ai/documentation-map.md) para selecionar somente o contexto relacionado à
mudança.

## Ambiente local

Requisitos:

- Node.js 22 ou superior;
- npm 10 ou superior.

Instale as dependências e inicie o ambiente de desenvolvimento:

```bash
npm ci
npm run dev
```

## Documentação por área

- [arquitetura e dependências](architecture.md);
- [domínio e relações](domain.md);
- [schemas, versões e persistência](data-model.md);
- [dados normativos e divergências](rsc-regulation.md);
- [frontend e rotas](frontend.md);
- [experiência de uso](ux.md);
- [testes](testing.md);
- [fluxo de desenvolvimento](development-workflow.md);
- [convenção de commits](commit-convention.md);
- [orientações para contribuição](../CONTRIBUTING.md).

O histórico de decisões e planos concluídos está em [docs/maintainers](maintainers/README.md).

## Arquitetura e compatibilidade

A aplicação não possui backend, autenticação ou telemetria. Projetos ficam no IndexedDB, e os
documentos e backups são montados e baixados no navegador.

Os envelopes portáteis `1.0`, `2.0`, `2.1` e `3.0` são aceitos. Novos projetos usam `3.0`; editar
um projeto `2.0` ou `2.1` converte uma cópia ao formato de ocorrências. O formato `1.0` permanece
exportável para consulta. O JSON não inclui os bytes dos documentos, enquanto o backup `.rscflow`
inclui. A validação estrutural de um arquivo não certifica sua referência normativa ou pontuação.

Os valores normativos pertencem exclusivamente aos JSONs em
`src/data/regulations/ifba-189-2026/`. Componentes React apresentam dados e resultados sem conter
valores ou critérios normativos. Correções de fator, unidade, limite, peso, descrição ou teto devem
alterar o JSON e sua evidência de proveniência, sem criar exceções no algoritmo ou na interface.

O [plano de refatoração de 11/09/2026](maintainers/history/plano-refatoracao.md) registra a evolução
que levou à arquitetura atual. A resolução é a única fonte normativa oficial; a planilha é material
informal auxiliar.

## Validação

Execute a sequência do CI antes de solicitar revisão:

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

Fixtures normativas usadas nos testes são sintéticas ou recortes identificados. O modo Vite `e2e`
injeta o catálogo sintético somente na suíte Playwright e não o inclui no bundle de produção.

## Publicação

O site público é publicado no GitHub Pages quando uma release é publicada no GitHub. O workflow
`Publish GitHub Pages` usa o commit da tag da release. Pushes e pull requests executam o workflow de
qualidade, sem publicar uma nova versão.

No repositório, configure **Settings → Pages → Build and deployment → Source** como **GitHub
Actions**. Crie a tag e publique a release correspondente; o workflow configura o prefixo do
repositório e o fallback das rotas.
