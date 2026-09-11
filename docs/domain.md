# Domínio

`src/domain/models.ts` define RscProject, Teacher, RscRequest, Education, Activity, Evidence, Memorial e ScoringResult, com schemas Zod. Projetos contêm identificação, título, docente, requerimento opcional (null), formações, atividades, comprovantes e memorial opcional (null). Arrays vazios representam elaboração inicial. Datas são ISO YYYY-MM-DD. IDs são únicos por coleção; atividades referenciam comprovantes existentes sem duplicação.

`src/domain/regulation.ts` define Regulation, RscLevel, Directive e Criterion. Estes contratos são estruturais, não estabelecem elegibilidade, pontuação ou requisitos documentais. ScoringResult representa um resultado associado a versão normativa, sem executar cálculo. A referência de critério da atividade é resolvida pelo motor contra o dataset; a importação não certifica sua existência.

`Activity.selectedLevel` registra a escolha explícita de um nível para a atividade (art. 16). O campo é opcional na importação 2.0 para preservar arquivos já criados, mas obrigatório para calcular. Um único criterionId e um único selectedLevel são permitidos por atividade; IDs de atividade duplicados são rejeitados. O motor não identifica automaticamente a mesma ocorrência cadastrada com IDs diferentes.

`CalculationResult` representa o resultado auditável do motor, com atividades, critérios, diretrizes, níveis, total bruto, total arredondado e requisitos quantitativos. Na indisponibilidade contém apenas motivos, sem pontuação. O contrato anterior ScoringResult permanece disponível por compatibilidade; não é um cache persistido ou a saída do novo motor.

O schema de rascunho 2.1 mantém os contratos tipados e as validações de referência, mas permite nome de docente e critério ainda não informados. Esses vazios são dados de elaboração, não valores normativos. A criação solicita somente RSC pretendido e dataset; o título inicial é um rótulo editável da interface.

## Dados do docente

`Teacher` armazena nome completo, CPF, SIAPE, cargo, campus de lotação, e-mail, telefone, RT/RSC atual, escolaridade e data de ingresso. `RscRequest` armazena o RSC pretendido e, quando informada, a data de vigência. Datas usam o formato ISO `YYYY-MM-DD`.

Para preservar arquivos 2.0 já exportados, `Teacher.registration` continua aceito como campo legado. A tela lê esse valor como SIAPE quando `siape` ainda não existe. Ao salvar a seção, passa a serializar `siape`; a leitura isolada nunca altera o arquivo.

O domínio portátil permite dados incompletos durante a elaboração. A validação da seção exige nome, CPF válido, SIAPE, campus e RSC pretendido para marcar a identificação como completa. Cargo, e-mail, telefone, RT/RSC atual, escolaridade, data de ingresso e data de vigência são opcionais. Essa distinção mede preenchimento da aplicação e não acrescenta exigências à normativa.

Quando um rascunho importado não contém solicitação, a tela mantém o RSC pretendido sem seleção. Nenhum nível é presumido.

## Formação, aperfeiçoamento e titulação

`Education` identifica cada registro por ID e pode armazenar tipo, curso ou título, instituição, área, data inicial, data de conclusão, situação, referência textual ao documento comprobatório, observações e timestamps de criação e atualização. Datas civis usam `YYYY-MM-DD`; timestamps usam ISO 8601 com fuso.

Tipo, curso ou título, instituição e situação são obrigatórios nos novos cadastros da interface. As demais informações são opcionais, e a conclusão, quando presente com a data inicial, não pode ser anterior a ela. Tipo e situação são textos declarados pelo usuário: não representam classificação ou validação normativa.

Os campos acrescentados permanecem opcionais no schema portátil para aceitar registros de versões anteriores que continham somente ID, título, instituição e eventual conclusão. Editar um registro antigo acrescenta os campos exigidos pela tela e inicializa seus timestamps explicitamente.

## Trajetória profissional e evidências

`Activity` mantém os campos existentes `criterionId` e `evidenceIds`, que representam respectivamente a referência de critério (`criterionRef`) e a coleção de evidências (`evidences[]`) do cadastro. Essa escolha preserva o contrato usado pelo motor e evita duas fontes para o mesmo vínculo. A categoria admite somente Ensino, Pesquisa, Extensão, Gestão, Produção, Formação e Outros.

Além de ID, título, quantidade e vínculos, a atividade pode armazenar instituição, setor ou departamento, datas inicial e final, papel ou função, descrição, resultados, competências e timestamps. Datas civis usam `YYYY-MM-DD`; a data final não pode anteceder a inicial. Competências são uma lista de textos. Os novos campos são opcionais no schema portátil para manter registros anteriores válidos, mas título e categoria são exigidos nos novos cadastros da interface.

`Evidence` guarda metadados e referências: tipo, título, identificador, emissor, data, referência de processo e notas. `fileName` e `description` continuam aceitos como campos legados. Nenhum arquivo binário integra esse modelo. Excluir uma evidência remove seu ID das atividades vinculadas e atualiza o timestamp dessas atividades, mantendo a integridade referencial exigida pelo projeto.

O critério pode permanecer vazio em rascunhos 2.1 e é obrigatório no contrato 2.0. Categoria, textos e evidências não determinam critério ou nível automaticamente; eventual pontuação continua sob responsabilidade exclusiva do motor e do dataset validado.
