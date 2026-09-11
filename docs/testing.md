# Testing

Use Vitest and Testing Library for unit and integration tests. `tests/setup.ts` enables jsdom and fake IndexedDB. Use Playwright with axe-core in `tests/e2e` for end-to-end and accessibility checks.

Run `npm run test:run` for the non-watch suite and `npm run test:e2e` after the application can be served. Normative rules require focused tests based on source-backed fixtures.

## Validador local de projetos

Os testes unitários cobrem leitura, JSON malformado, raiz inválida, campos obrigatórios e versão incompatível. A integração verifica metadados declarados, mensagens acessíveis, nova seleção, falha de leitura e leituras concluídas fora de ordem. O E2E Chromium usa arquivos em memória para verificar sucesso, rejeição e axe nos estados inicial, válido e inválido. As fixtures são sintéticas e não representam dados normativos validados.

## Motor de pontuação

`tests/unit/scoring.test.ts` usa catálogo sintético para verificar fator/peso, limite compartilhado do critério, teto por diretriz e nível, soma, limites inclusivos 60/36, aritmética decimal, arredondamento somente final, escolha de nível, duplicidade de ID, versões incompatíveis, dados inválidos/pendentes, ausência de política, entradas vazias, imutabilidade e extremos numéricos. Alterações de parâmetros do dataset são testadas sem mudar o algoritmo.

`tests/regulation/scoring.test.ts` fixa parâmetros conferidos nos arts. 12, 15 e 17 e recortes dos três níveis com proveniência em `tests/regulation/fixtures/resolution-excerpts.json`. Os resultados esperados são independentes da implementação. Esses recortes não certificam todo o catálogo: também há regressão que exige indisponibilidade do dataset de produção pendente. O E2E existente continua cobrindo importação e acessibilidade; não há interface de pontuação nesta etapa.

## Persistência, autosave e arquivos

`tests/unit/storage.test.ts` usa fake-indexeddb com bancos isolados para CRUD, múltiplas cópias, reabertura da conexão, seleção ativa, duplicação, exclusão, revisões concorrentes, preservação normativa e round-trip dos envelopes 1.0/2.0. Cobre também dados não portáveis, importações inválidas, debounce, gravação em andamento, falha/repetição e descarte de pendências.

`tests/integration/local-projects.test.tsx` verifica estados visuais, edição após recarga, erro de armazenamento sem perda do rascunho, troca com gravação pendente e rejeição de edição inválida. Os testes antigos do validador agora montam diretamente ProjectImport.

`tests/e2e/local-projects.spec.ts` executa criação, edição, autosave, reload, download real, duplicação, exclusão e importação do arquivo em um segundo contexto isolado de navegador. Confere também continuidade do legado, rejeição de versão desconhecida e acessibilidade axe no editor. Os testes de interface usam referências sintéticas, sem afirmar validação normativa.

## Shell, rotas e elaboração inicial

`tests/unit/project-shell.test.ts` verifica rotas, endereços desconhecidos, criação mínima, contrato 2.1, portabilidade, preservação dos contratos anteriores, progresso editorial e montagem da prévia. Os testes de integração da sessão agora montam o shell em MemoryRouter e verificam URL direta, autosave, erros e bloqueio de navegação com JSON inválido.

`tests/e2e/shell.spec.ts` cobre todas as URLs, recarga, navegação pelo histórico, estados vazios/ausentes, formulários reais, prévia, menu móvel com foco contido e Escape, ausência de overflow e axe. `tests/e2e/local-projects.spec.ts` cobre criação por nível/dataset, autosave, duplicação, cancelamento/confirmacão de exclusão e transporte de 2.1 entre contextos isolados. O legado mantém round-trip e edição sem conversão.

## Dados do docente

`tests/unit/teacher-profile.test.ts` cobre obrigatoriedade, CPF, e-mail, telefone, datas, opcionais, normalização, compatibilidade com matrícula legada, completude e round-trip JSON. `tests/integration/teacher-profile.test.tsx` verifica associação acessível dos erros, autosave, reload, edição posterior e atualização da visão geral. Os testes E2E existentes exercitam o perfil dentro da navegação real e confirmam persistência após recarga.

## Formação, aperfeiçoamento e titulação

`tests/unit/education.test.ts` cobre schema, intervalo de datas, timestamps, edição, duplicação, ordenação estável, compatibilidade e round-trip JSON. `tests/integration/education.test.tsx` cobre erros acessíveis e o ciclo persistido de criação, recarga, edição, duplicação e exclusão confirmada. O E2E verifica ordem cronológica, CRUD, reload, layout móvel, axe e transporte dos campos estendidos por exportação e importação JSON.
