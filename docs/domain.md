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
