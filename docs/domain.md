# Domínio

`src/domain/models.ts` define RscProject, Teacher, RscRequest, Education, Activity, Evidence, Memorial e ScoringResult, com schemas Zod. Projetos contêm identificação, título, docente, requerimento opcional (null), formações, atividades, comprovantes e memorial opcional (null). Arrays vazios representam elaboração inicial. Datas são ISO YYYY-MM-DD. IDs são únicos por coleção; atividades referenciam comprovantes existentes sem duplicação.

`src/domain/regulation.ts` define Regulation, RscLevel, Directive e Criterion. Estes contratos são estruturais, não estabelecem elegibilidade, pontuação ou requisitos documentais. ScoringResult representa um resultado associado a versão normativa, sem executar cálculo. A referência de critério da atividade é resolvida pelo motor contra o dataset; a importação não certifica sua existência.

`Activity.selectedLevel` registra a escolha explícita de um nível para a atividade (art. 16). O campo é opcional na importação 2.0 para preservar arquivos já criados, mas obrigatório para calcular. Um único criterionId e um único selectedLevel são permitidos por atividade; IDs de atividade duplicados são rejeitados. O motor não identifica automaticamente a mesma ocorrência cadastrada com IDs diferentes.

`CalculationResult` representa o resultado auditável do motor, com atividades, critérios, diretrizes, níveis, total bruto, total arredondado e requisitos quantitativos. Na indisponibilidade contém apenas motivos, sem pontuação. O contrato anterior ScoringResult permanece disponível por compatibilidade; não é um cache persistido ou a saída do novo motor.

O schema de rascunho 2.1 mantém os contratos tipados e as validações de referência, mas permite nome de docente e critério ainda não informados. Esses vazios são dados de elaboração, não valores normativos. A criação solicita somente RSC pretendido e dataset; o título inicial é um rótulo editável da interface.
