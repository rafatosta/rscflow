# RSCFlow

RSCFlow é uma aplicação web local para organizar o Memorial Descritivo do Reconhecimento de Saberes
e Competências (RSC) docente do IFBA. O fluxo reúne dados do docente, formação, requisitos,
lançamentos, documentos, memorial, revisão e exportações JSON/PDF. Não há backend, autenticação,
telemetria ou envio dos dados pessoais para serviços externos.

## Estado normativo

A política de cálculo da Resolução CONSUP/IFBA nº 189/2026 foi conferida e está representada em
JSON. O catálogo de diretrizes e critérios de RSC I, II e III foi transcrito dos Anexos IV–VI e
está com status `pending-official-validation` e versão normativa `null`. Ele pode ser consultado e
receber registros e calcular pontuação provisória por requisito, com aviso de validação humana
pendente. Totais do projeto permanecem indisponíveis até a validação final. O conflito interno do
RSC II d.5 permanece literal e sinalizado, sem cálculo desse critério.

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
- perfil docente, formação e lançamentos por requisito em RSC I, II e III;
- documento comprobatório opcional no próprio lançamento, armazenado localmente e verificado por hash;
- motor determinístico com limites de item, diretriz e nível e requisitos quantitativos 60/36;
- memorial determinístico com edição autoral preservada;
- prévia A4 na revisão, PDF local, checklist final e correções por seção;
- rotas responsivas, navegação por teclado e verificações automatizadas com axe-core.

Os envelopes portáteis `1.0`, `2.0`, `2.1` e `3.0` são aceitos. Novos projetos usam 3.0; editar
2.0/2.1 converte a cópia ao formato de ocorrências. O formato 1.0 permanece exportável para
consulta. JSON não inclui bytes dos documentos. Validação estrutural de um arquivo não certifica
sua referência normativa nem sua pontuação.

## Arquitetura e manutenção

O [plano de refatoração de 11/09/2026](docs/maintainers/history/plano-refatoracao.md) foi preservado
como histórico da evolução que levou ao estado atual. A resolução é a única fonte normativa oficial;
a planilha é material informal auxiliar, conforme a decisão registrada nessa etapa.

Antes de alterar código, comece por [AGENTS.md](AGENTS.md) e use o
[mapa de documentação](docs/ai/documentation-map.md) para selecionar o contexto pertinente:

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
