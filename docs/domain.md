# Domínio

`src/domain/models.ts` define RscProject, Teacher, RscRequest, Education, Activity, Evidence, Memorial e ScoringResult, com schemas Zod. Projetos contêm identificação, título, docente, requerimento opcional (null), formações, atividades, comprovantes e memorial opcional (null). Arrays vazios representam elaboração inicial. Datas são ISO YYYY-MM-DD. IDs são únicos por coleção; atividades referenciam comprovantes existentes sem duplicação.

`src/domain/regulation.ts` define Regulation, RscLevel, Directive e Criterion. Estes contratos são estruturais, não estabelecem elegibilidade, pontuação ou requisitos documentais. ScoringResult representa um resultado associado a versão normativa, sem executar cálculo. A referência de critério da atividade será resolvida contra o dataset na etapa de avaliação; a importação não certifica sua existência.
