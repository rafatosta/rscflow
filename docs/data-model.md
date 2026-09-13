# Schemas, versões e persistência

## Envelope portátil

`ProjectExport` discrimina 1.0, 2.0, 2.1 e 3.0. A criação usa `occurrenceProjectExportSchema` 3.0. O envelope contém `schemaVersion`, `applicationVersion`, referência `regulation.id/version` e `userData`. Versão normativa null representa pendência, nunca certificação.

| Versão  | Leitura/exportação                            | Interface                                   |
| ------- | --------------------------------------------- | ------------------------------------------- |
| 1.0     | Registro opaco preservado                     | Consulta de estado e exportação, sem edição |
| 2.0/2.1 | Dados tipados com atividades                  | Projeção e conversão para 3.0 ao editar     |
| 3.0     | Grupos, ocorrências, evidências e descritores | Formato nativo de criação e edição          |

`userData` 3.0 reúne id, title, teacher, request, education, criterionEntries, unassignedOccurrences, evidence, storedFiles e memorial. Não persiste activities nem pontuação. A migração de 2.x preserva referências, IDs, quantidades, período, ordem, autoria e metadados. Ler ou exportar um arquivo antigo isoladamente não modifica sua versão. Migração em nova cópia e editor JSON experimental foram removidos da interface.

`activityProjectView` continua sendo uma projeção transitória para regras, memorial e PDF. O antigo adaptador de reconciliação dos formulários foi removido: a interface atualiza 3.0 diretamente. A exportação usa o envelope real, nunca a projeção.

Quando o cálculo está disponível, `CalculationResult.requirementProjection` consolida cada requisito com seus lançamentos, evidências e descritores de arquivo, quantidade informada e considerada, fator, peso, pontuação antes/depois do teto do item, teto da diretriz e estado de validação. É uma visão derivada para interface e futuros artefatos; não replica parâmetros normativos nem grava resultados no projeto.

Docente aceita `institution` e `employmentStatus` opcionais, além dos campos pessoais/funcionais existentes. Lançamentos recebem critério e nível do contexto; datas são ISO, quantidade finita não negativa, descrição opcional. Nenhuma constante normativa é copiada para o projeto. Validação estrutural não certifica enquadramento normativo.

## IndexedDB v2

O banco `rscflow` usa Dexie:

| Tabela      | Chave/índices         | Conteúdo                                                      |
| ----------- | --------------------- | ------------------------------------------------------------- |
| projects    | localId               | Envelope, revision, createdAt, updatedAt, lastBackup opcional |
| preferences | key                   | Identificação do projeto ativo                                |
| files       | [localId+id], localId | Blob vinculado a um descritor e uma cópia local               |

A atualização v1 → v2 adiciona a tabela files, preservando projetos e preferências. Versão do banco, envelope e catálogo são independentes. Arquivos de projetos duplicados recebem o novo localId e continuam disponíveis após apagar a origem. Excluir projeto remove apenas seus vínculos binários. Excluir ocorrência preserva evidências e arquivos, inclusive compartilhados.

`StoredFile` contém id, nome, tipo, tamanho e SHA-256 opcional no leitor. Arquivo novo recebe hash. `FileResolver` lê bytes locais e confere tamanho/hash; ausência, descritor sem hash ou divergência retorna erro explícito. Selecionar novamente um conteúdo com o mesmo hash/tamanho reutiliza o descritor e restaura os bytes do projeto importado.

O PDF derivado de comprovantes não altera esses vínculos. Seu mapa de páginas associa cada
`evidenceId` aos lançamentos que o referenciam e registra intervalos inclusivos do comprovante e de
cada `fileId`. Uma evidência compartilhada possui um único intervalo, ainda que tenha várias
associações.

`updateWithFiles` salva projeto e bytes na mesma transação com revisão otimista; quota, referência inválida ou conflito não deixam atualização parcial. O armazenamento não interpreta normativa.

## Autosave e portabilidade

Dados pessoais, formação e memorial usam fila serial com debounce de 500 ms. O lançamento usa um comando explícito que conclui autosave anterior e grava a transação. Navegação aguarda gravação e impede abandonar formulário alterado; falhas preservam entradas. Revisão desatualizada não pode sobrescrever nem recriar projeto apagado.

`portableProject` rejeita dados não representáveis em JSON. Downloads incluem campos editáveis e descritores, sem Blob, localId, revisão ou preferência. Importação validada cria outra cópia. Arquivo JSON não é backup dos anexos; limpar IndexedDB pode removê-los.

`lastBackup` guarda data e fingerprint SHA-256 da última geração de JSON, sem mudar revisão editorial nem integrar exportação. Importação e duplicação não herdam a marca. A marca não certifica disponibilidade dos bytes nem conclusão do download.

## Catálogos

Datasets usam schema 1.0 independente do projeto. Os três níveis de produção seguem pendentes: RSC I tem 8 diretrizes/48 critérios; II, 7/36; III, 7/53. Parâmetros e proveniência permanecem nos JSONs. `provenance.issue` registra conflito e impede validação. A resolução é a única fonte oficial; o campo legado nullable de planilha não é requisito de certificação.

Política quantitativa validada pode ser apresentada enquanto o catálogo não está certificado. `CalculationResult` contém pontos somente quando o cálculo está disponível. A ausência nunca é convertida em zero. Veja [regulação](rsc-regulation.md).
