# RSCFlow

RSCFlow é uma aplicação web local para organizar o Memorial Descritivo do Reconhecimento de Saberes
e Competências (RSC) docente do IFBA. Ela reúne dados do docente, formação, trajetória, evidências,
enquadramentos, pontuação quantitativa, memorial, revisão e exportações JSON/PDF. Não há backend,
autenticação, telemetria ou envio dos dados pessoais para serviços externos.

## Estado normativo

A política de cálculo da Resolução CONSUP/IFBA nº 189/2026 foi conferida e está representada em
JSON. O catálogo de diretrizes e critérios de RSC I, II e III foi transcrito dos Anexos IV–VI e
está com status `pending-official-validation` e versão normativa `null`. Ele pode ser consultado,
mas o dataset de produção retorna cálculo indisponível e não habilita novos enquadramentos até a
validação humana final. O conflito interno do RSC II d.5 permanece literal e sinalizado.

Em divergências, vale a seguinte ordem: instrução atual do mantenedor, resolução oficial,
JSON normativo validado, documentação e código. A resolução prevalece sobre a planilha e o
JSON; a divergência e suas fontes devem ser registradas. Ambiguidades internas da resolução não são
resolvidas por inferência. Consulte [Dados e motor normativos](docs/rsc-regulation.md).

## Executar localmente

Requisitos: Node.js 22 ou superior e npm 10 ou superior.

```bash
npm ci
npm run dev
```

O navegador armazena projetos no IndexedDB. Limpar os dados do site ou usar uma sessão privada pode
removê-los; exporte o JSON como cópia portátil. O PDF e o JSON são montados e baixados no próprio
navegador.

## Funcionalidades

- múltiplos projetos locais, duplicação, importação, exportação e autosave com conflitos explícitos;
- perfil docente, formação, trajetória profissional e referências de evidências;
- exploração de catálogo e escolha explícita de nível e critério, quando o dataset estiver validado;
- motor determinístico com limites de item, diretriz e nível e requisitos quantitativos 60/36;
- memorial determinístico com edição autoral preservada;
- prévia A4, PDF local, checklist final e correções por seção;
- rotas responsivas, navegação por teclado e verificações automatizadas com axe-core.

Os envelopes portáteis `1.0`, `2.0` e `2.1` são aceitos. Não há migração silenciosa: o formato
legado permanece opaco e o rascunho 2.1 preserva ausências explícitas. Validação estrutural de um
arquivo não certifica sua referência normativa nem sua pontuação.

## Arquitetura e manutenção

A nova bateria começa pelo [relatório de análise e plano de refatoração](docs/plano-refatoracao.md),
que registra o modelo alvo, a migração e a ordem dos incrementos. A resolução é a única fonte
normativa oficial; a planilha é material informal auxiliar, conforme o roteiro de 11/09/2026.

Antes de alterar código, leia [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md) e a
documentação pertinente:

- [arquitetura e dependências](docs/architecture.md);
- [domínio e relações](docs/domain.md);
- [schemas, versões e persistência](docs/data-model.md);
- [regulamento, divergências e correção de datasets](docs/rsc-regulation.md);
- [frontend e rotas](docs/frontend.md) e [experiência de uso](docs/ux.md);
- [matriz de testes](docs/testing.md) e [fluxo de desenvolvimento](docs/development-workflow.md);
- [convenção de commits](docs/commit-convention.md).

Os valores normativos pertencem exclusivamente aos JSONs em
`src/data/regulations/ifba-189-2026/`. Componentes React apenas apresentam dados e resultados. Uma
correção de fator, unidade, limite, peso, descrição ou teto deve alterar o JSON e sua evidência de
proveniência, sem criar uma exceção no algoritmo ou na interface.

## Qualidade

Execute a mesma sequência do CI antes de solicitar revisão:

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

Fixtures normativas dos testes são sintéticas ou recortes identificados. O modo Vite `e2e` injeta
um catálogo sintético apenas na suíte Playwright; ele não integra o bundle de produção.
