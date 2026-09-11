# Architecture

The application is layered to keep legal/normative decisions auditable and independent of the interface.

- `app`: application entry points and composition.
- `components`: reusable presentation; `components/ui` hosts shadcn-compatible primitives.
- `domain`: versioned business-neutral contracts and schemas.
- `rules`: funções puras de cálculo, consolidação e arredondamento, condicionadas à validação do dataset.
- `data/regulations`: validated, versioned regulation datasets.
- `storage`: local persistence adapters.
- `features`: use-case orchestration.
- `memorial` and `pdf`: future document assembly and output.
- `utils`: framework-agnostic helpers.

React components may present outcomes but must never contain normative criteria or scoring logic.

## Contratos e carregamento

`src/data/regulations/load.ts` carrega os três JSONs e os metadados pelo schema genérico de domínio. Alterações em valores e inclusão de critérios/diretrizes dentro desse contrato exigem apenas edição dos JSONs, sem lógica ou valores normativos em React. A validação é executada pelos testes e em cada carregamento. O motor recebe o envelope e o dataset como argumentos, sem acessar armazenamento ou interface.

## Motor quantitativo

`src/rules/scoring.ts` expõe `calculateActivity`, `roundFinalScore` e `calculateProjectScore`. O resultado discriminado está em `src/domain/scoring.ts`. Cálculos usam aritmética decimal baseada em BigInt, sem arredondamento binário intermediário ou configuração global; conversões fora do intervalo de number retornam indisponibilidade explícita. Dados de entrada são validados e não são alterados.

A sequência é quantidade consolidada por critério → limite do item → fator e peso → soma/teto da diretriz → soma/teto do nível → total geral/arredondamento → mínimos. Pontuações não são persistidas nem incorporadas ao projeto como fonte de verdade.

## Projetos locais

`src/domain/local-project.ts` define ProjectRepository, LocalProject e SaveState. `src/storage/project-repository.ts` implementa CRUD, duplicação, revisão otimista e seleção ativa com Dexie/IndexedDB. `src/domain/portable-project.ts` valida o envelope e a representação JSON sem perdas.

`src/features/local-projects/` contém criação e arquivos portáteis, fila serial de autosave com debounce e coordenação da sessão de edição. O hook preserva rascunhos em falhas, conclui gravações antes de navegar e permite descartar explicitamente alterações não gravadas. Componentes apresentam lista, formulário de criação, editor JSON, estados e ações locais. A verificação de arquivos permanece independente da gravação; importar é uma ação explícita que sempre cria outra cópia.

A persistência não calcula pontuação, não valida referências normativas como oficiais e não contém regras normativas. Não há backend, autenticação, upload ou telemetria. Exportação usa Blob e download local.

## Shell e navegação

A etapa 04 substitui a tela única por um shell responsivo com React Router, sidebar e Sheet Radix. A sessão de persistência permanece acima das seções, preservando fila, revisão e rascunho durante a navegação. Rotas e projeções de preenchimento ficam em `features/project-shell`; componentes não contêm cálculos normativos.

Criação por nível/dataset usa o envelope 2.1 para representar campos inicialmente ausentes e versão normativa null. Os formatos anteriores continuam aceitos sem migração automática. A prévia textual fica em `src/memorial/`, separada do motor. Consulte `docs/frontend.md` para rotas e `docs/ux.md` para comportamento e limites.
