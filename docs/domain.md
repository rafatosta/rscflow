# Domínio

`src/domain/models.ts` define `RscProject`, `Teacher`, `RscRequest`, `Education`, `Activity`,
`Evidence`, `Memorial` e `ScoringResult`, com schemas Zod. Projetos contêm identificação, título,
docente, requerimento opcional (`null`), formações, atividades, comprovantes e memorial opcional
(`null`). Arrays vazios representam elaboração inicial. Datas são ISO `YYYY-MM-DD`. IDs são únicos
por coleção; atividades referenciam comprovantes existentes sem duplicação.

## Mapa de modelos e relações

| Modelo/contrato     | Relação e responsabilidade                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `RscProject`        | raiz editável; agrega docente, solicitação, formações, atividades, evidências e memorial     |
| `Teacher`           | dados pessoais, funcionais e de contato de um projeto                                        |
| `RscRequest`        | nível pretendido e eventual data de vigência                                                 |
| `Education`         | registros independentes de formação vinculados ao projeto                                    |
| `Activity`          | experiência que declara um critério, um nível e IDs de zero ou mais evidências               |
| `Evidence`          | metadado documental global do projeto; pode ser referenciado por várias atividades           |
| `Memorial`          | textos editoriais por seção; narrativas de atividade continuam armazenadas em `Activity`     |
| `Regulation`        | raiz do dataset; agrega metadados e exatamente os níveis RSC I, II e III                     |
| `RscLevel`          | agrega diretrizes e critérios do nível                                                       |
| `Directive`         | define título, teto, proveniência e eventual peso descritivo                                 |
| `Criterion`         | pertence a uma diretriz por `directiveId` e contém parâmetros normativos e proveniência      |
| `CalculationResult` | saída derivada e auditável por atividade, critério, diretriz e nível; pode ser indisponível  |
| `ProjectExport`     | união discriminada dos envelopes portáteis 1.0, 2.0 e 2.1                                    |
| `LocalProject`      | envolve o envelope com `localId`, revisão e timestamps exclusivos do IndexedDB               |
| `ProjectRepository` | contrato de CRUD, duplicação, revisão otimista e preferência do projeto ativo                |
| `SaveState`         | estado público da gravação: salvando, salvo ou erro; pendência/conflito ficam no coordenador |

`criterionId` liga a atividade a um `Criterion`; `selectedLevel` registra o nível escolhido e
precisa ser compatível com o critério para o cálculo. `evidenceIds` liga atividades à coleção
`evidence`; excluir a evidência remove essas referências. A referência `regulation` do envelope
liga o projeto ao ID e à versão do dataset, mas a mera importação não certifica esse vínculo.

`src/domain/regulation.ts` define Regulation, RscLevel, Directive e Criterion. Estes contratos são estruturais, não estabelecem elegibilidade, pontuação ou requisitos documentais. ScoringResult representa um resultado associado a versão normativa, sem executar cálculo. A referência de critério da atividade é resolvida pelo motor contra o dataset; a importação não certifica sua existência.

`Activity.selectedLevel` registra a escolha explícita de um nível para a atividade (art. 16). O campo é opcional na importação 2.0 para preservar arquivos já criados, mas obrigatório para calcular. Um único criterionId e um único selectedLevel são permitidos por atividade; IDs de atividade duplicados são rejeitados. O motor não identifica automaticamente a mesma ocorrência cadastrada com IDs diferentes.

`CalculationResult` representa o resultado auditável do motor, com atividades, critérios, diretrizes, níveis, total bruto, total arredondado e requisitos quantitativos. Quando disponível, inclui `requirementProjection`: a visão por requisito com lançamentos, comprovantes, quantidades, fator, peso, limites e pontuações calculada/considerada. Ela é derivada, não persistida. Na indisponibilidade contém apenas motivos, sem pontuação. O contrato anterior ScoringResult permanece disponível por compatibilidade; não é um cache persistido ou a saída do novo motor.

O schema de rascunho 2.1 mantém os contratos tipados e as validações de referência, mas permite nome de docente e critério ainda não informados. Esses vazios são dados de elaboração, não valores normativos. A criação solicita somente RSC pretendido e dataset; o título inicial é um rótulo editável da interface.

## Dados do docente

`Teacher` armazena nome completo, CPF, SIAPE, cargo, campus de lotação, e-mail, telefone, RT/RSC atual, escolaridade e data de ingresso. `RscRequest` armazena o RSC pretendido e, quando informada, a data de vigência. Datas usam o formato ISO `YYYY-MM-DD`.

Para preservar arquivos 2.0 já exportados, `Teacher.registration` continua aceito como campo legado. A tela lê esse valor como SIAPE quando `siape` ainda não existe. Ao salvar a seção, passa a serializar `siape`; a leitura isolada nunca altera o arquivo.

O domínio portátil permite dados incompletos durante a elaboração. A validação da seção exige nome, CPF válido, SIAPE, campus e RSC pretendido para marcar a identificação como completa. Cargo, e-mail, telefone, RT/RSC atual, escolaridade, data de ingresso e data de vigência são opcionais. Essa distinção mede preenchimento da aplicação e não acrescenta exigências à normativa.

Novas edições usam o vocabulário controlado de escolaridade definido em
`domain/vocabularies.ts`: Ensino fundamental, Ensino médio, Curso técnico, Graduação,
Especialização, Mestrado, Doutorado e Pós-doutorado. O valor vazio representa “não informado”. O
schema portátil continua aceitando texto legado para permitir a abertura de arquivos anteriores;
um valor fora do vocabulário aparece identificado no seletor e não pode ser escolhido novamente.

Quando um rascunho importado não contém solicitação, a tela mantém o RSC pretendido sem seleção. Nenhum nível é presumido.

## Formação, aperfeiçoamento e titulação

`Education` identifica cada registro por ID e pode armazenar tipo, curso ou título, instituição, área, data inicial, data de conclusão, situação, referência textual ao documento comprobatório, observações e timestamps de criação e atualização. Datas civis usam `YYYY-MM-DD`; timestamps usam ISO 8601 com fuso.

Tipo, curso ou título, instituição e situação são obrigatórios nos novos cadastros da interface. As demais informações são opcionais, e a conclusão, quando presente com a data inicial, não pode ser anterior a ela. Tipo usa Curso técnico, Graduação, Pós-graduação, Aperfeiçoamento, Capacitação, Mestrado, Doutorado ou Pós-doutorado. Situação usa Em andamento, Concluído, Interrompido ou Trancado. Esses vocabulários são classificações do domínio da aplicação e não representam validação normativa.

Os campos acrescentados permanecem opcionais e textuais no schema portátil para aceitar registros de versões anteriores que continham somente ID, título, instituição e eventual conclusão. Novas gravações validam os vocabulários controlados. Ao editar, um valor legado fora da lista fica visível e precisa ser substituído antes de salvar; o registro só então recebe os campos exigidos e timestamps explícitos.

## Trajetória profissional e evidências

`Activity` mantém os campos existentes `criterionId` e `evidenceIds`, que representam respectivamente a referência de critério (`criterionRef`) e a coleção de evidências (`evidences[]`) do cadastro. Essa escolha preserva o contrato usado pelo motor e evita duas fontes para o mesmo vínculo. A categoria admite somente Ensino, Pesquisa, Extensão, Gestão, Produção, Formação e Outros.

Além de ID, título, quantidade e vínculos, a atividade pode armazenar instituição, setor ou departamento, datas inicial e final, papel ou função, descrição, resultados, competências e timestamps. Datas civis usam `YYYY-MM-DD`; a data final não pode anteceder a inicial. Competências são uma lista de textos. Os novos campos são opcionais no schema portátil para manter registros anteriores válidos, mas título e categoria são exigidos nos novos cadastros da interface.

`Evidence` guarda metadados e referências: tipo, título, identificador, emissor, data, referência de processo e notas. `fileName` e `description` continuam aceitos como campos legados. Nenhum arquivo binário integra esse modelo. Excluir uma evidência remove seu ID das atividades vinculadas e atualiza o timestamp dessas atividades, mantendo a integridade referencial exigida pelo projeto.

O critério pode permanecer vazio em rascunhos 2.1 e é obrigatório no contrato 2.0. Categoria, textos e evidências não determinam critério ou nível automaticamente; eventual pontuação continua sob responsabilidade exclusiva do motor e do dataset validado.

## Memorial Descritivo

`Memorial` preserva título, apresentação introdutória e conclusão dos arquivos anteriores e pode armazenar textos complementares para formação, atuação docente, produção, serviços à comunidade, gestão e títulos/prêmios/concursos. A introdução é uma opção editorial e não é usada como requisito de completude. Os campos adicionais são opcionais para manter compatibilidade com projetos 2.0 e 2.1 já exportados.

Cada `Activity` pode armazenar `generatedText`, `editedText` e `isManuallyEdited`. O primeiro registra a última base produzida pelos dados estruturados; o segundo contém a versão apresentada no memorial; o terceiro distingue edição autoral. Esses campos são conteúdo do projeto e participam normalmente de IndexedDB, exportação e importação JSON. Pontuação e valores normativos não são copiados para eles.

## Critérios e ocorrências — envelope 3.0

`src/domain/criterion-entry.ts` define `OccurrenceProject` (raiz RscProject do formato 3.0),
`CriterionEntry`, `Occurrence`, `OccurrenceEvidence` e `StoredFile`. O contrato `RscProject`
anterior permanece para leitura de 2.0/2.1; não é reinterpretado silenciosamente.

Um lançamento `CriterionEntry` contém ID próprio, referência normativa `criterionId`, escolha
explícita `selectedLevel` e várias ocorrências. O par critério/nível é único no projeto. Nível
pode estar ausente em uma referência antiga e impede cálculo, sem inferência. Uma ocorrência
sem critério fica em `unassignedOccurrences`, preservando eventual nível informado.

`Occurrence` reaproveita título, categoria, local, função, quantidade, descrição, resultados,
competências, evidências, timestamps e textos autorais de Activity. `period.start/end` substituem
startDate/endDate; `order` preserva a sequência global anterior mesmo após agrupar por critério.
Cada ID de ocorrência é único em todo o projeto. Quantidade não é inferida de datas ou do número
de registros: o motor soma as quantidades declaradas e aplica os limites do dataset.

`OccurrenceEvidence` estende os metadados de Evidence com `fileIds`. Ocorrências compartilham
Evidence por `evidenceIds`; evidências podem compartilhar um descritor StoredFile. O schema
rejeita IDs duplicados, vínculos inexistentes e parâmetros normativos copiados para o projeto.
Arrays de evidências/arquivos podem ficar vazios durante a elaboração.

StoredFile contém id, name, mediaType, size e sha256 opcional. É um descritor portátil; em uma
cópia local 3.0, os bytes são guardados por `localId` no IndexedDB e verificados por tamanho e hash.
Importação JSON não transporta os bytes. Migração não transforma fileName legado em arquivo
existente. Textos gerados/manuais continuam na ocorrência e `memorial` conserva sua estrutura,
preservando autoria.

Os comandos em `features/criterion-entries/entries.ts` criam grupos, adicionam e editam ocorrências
sem mutação e validam referências no projeto completo. Novas edições validam a ordem das datas;
a leitura/migração conserva períodos legados aceitos pelo schema antigo, mesmo se invertidos.
