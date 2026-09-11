# Testing

Use Vitest and Testing Library for unit and integration tests. `tests/setup.ts` enables jsdom and fake IndexedDB. Use Playwright with axe-core in `tests/e2e` for end-to-end and accessibility checks.

Run `npm run test:run` for the non-watch suite and `npm run test:e2e` after the application can be served. Normative rules require focused tests based on source-backed fixtures.

## Validador local de projetos

Os testes unitários cobrem leitura, JSON malformado, raiz inválida, campos obrigatórios e versão incompatível. A integração verifica metadados declarados, mensagens acessíveis, nova seleção, falha de leitura e leituras concluídas fora de ordem. O E2E Chromium usa arquivos em memória para verificar sucesso, rejeição e axe nos estados inicial, válido e inválido. As fixtures são sintéticas e não representam dados normativos validados.

## Motor de pontuação

`tests/unit/scoring.test.ts` usa catálogo sintético para verificar fator/peso, limite compartilhado do critério, teto por diretriz e nível, soma, limites inclusivos 60/36, aritmética decimal, arredondamento somente final, escolha de nível, duplicidade de ID, versões incompatíveis, dados inválidos/pendentes, ausência de política, entradas vazias, imutabilidade e extremos numéricos. Alterações de parâmetros do dataset são testadas sem mudar o algoritmo.

`tests/regulation/scoring.test.ts` fixa parâmetros conferidos nos arts. 12, 15 e 17 e recortes dos três níveis com proveniência em `tests/regulation/fixtures/resolution-excerpts.json`. Os resultados esperados são independentes da implementação. Esses recortes não certificam todo o catálogo: também há regressão que exige indisponibilidade do dataset de produção pendente.

`tests/integration/scoring-dashboard.test.tsx` alimenta a interface somente com resultados reais do motor sobre fixtures sintéticas. Cobre os três níveis, duas diretrizes no mesmo nível, teto, itens utilizados, total, limites inclusivos 60/36, requisitos atingidos e não atingidos e estado parcial sem zero presumido. O E2E verifica o resumo inicial, a tela de pontuação com catálogo oficial pendente, textos que não dependem apenas de cor, layout móvel sem overflow e axe-core.

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

## Trajetória profissional e evidências

`tests/unit/trajectory.test.ts` cobre categorias, validação de período e quantidade, exigência condicional de critério, competências, timestamps, edição, duplicação, ordenação, agrupamento anual, busca, filtro, metadados de evidência, limpeza de vínculos, compatibilidade e round-trip JSON. `tests/integration/trajectory.test.tsx` verifica estados vazios, erros associados, CRUD persistido, reload, edição posterior, vínculos e filtros reais. O E2E cobre timeline, períodos, evidências, busca, categoria, persistência, layout móvel, axe, memorial e transporte completo por exportação/importação.

## Memorial Descritivo

`tests/unit/memorial.test.ts` cobre saída determinística, sequência narrativa, ordem cronológica, estrutura do art. 10, edição manual, detecção de dados alterados, manutenção, regeneração explícita e round-trip dos campos novos. `tests/integration/memorial-section.test.tsx` verifica o editor por seções e que nenhuma atualização implícita substitui o texto autoral. O E2E atravessa cadastro, geração, edição, alteração estruturada, manutenção, recarga, regeneração e prévia no armazenamento real do navegador.

## Prévia A4 e PDF

`tests/unit/pdf.test.ts` verifica dados principais, caracteres portugueses, ordem das seções,
paginação de texto longo, divisão de palavras extensas, limites geométricos e validade estrutural do
PDF. O teste de integração cobre carregamento, navegação, retorno ao editor e comando de geração.
`tests/e2e/pdf.spec.ts` usa o navegador real para montar conteúdo extenso, conferir as duas primeiras
páginas, executar o download e reabrir o arquivo com `pdf-lib`, incluindo nome, assinatura, tamanho
e quantidade de páginas. As regressões de layout usam coordenadas e margens, sem snapshots de pixels.

## Revisão e exportação final

`tests/unit/final-review.test.ts` cobre as nove áreas, severidades, bloqueios estruturais, avisos de
enquadramento e a mensagem documental. Os testes de integração verificam os resumos acessíveis,
links de correção, bloqueio exclusivo do PDF, warnings permissivos, nomes sugeridos, último autosave
atualizado e comandos de exportação. O E2E percorre o estado bloqueado, corrige identificação e
conclusão, revisa avisos, exporta e reabre o JSON e gera o PDF depois da revisão.
