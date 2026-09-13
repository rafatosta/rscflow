# Análise do estado atual e plano de refatoração

> Documento histórico de 11/09/2026. Registra o estado e as propostas daquela data; consulte a
> documentação vigente em `docs/` para o comportamento atual.

Data: 11/09/2026. Base inspecionada: `ca06a90`, árvore inicialmente limpa.
Escopo: primeira etapa da nova bateria; análise e documentação, sem alterar código,
schemas, dados normativos ou comportamento. As propostas abaixo ainda não estão implementadas.

## 1. Decisões de partida

O RSCFlow será organizado em torno do processo do docente: dados cadastrados uma vez,
com pontuação, formulários, memorial e arquivos finais derivados desses dados. A aplicação
existente deve evoluir incrementalmente, mantendo importação, autosave e textos autorais.

Conforme o roteiro desta bateria, a Resolução CONSUP/IFBA nº 189/2026 é a única fonte
normativa oficial. A planilha em `docs/ifba/` é material informal auxiliar de terceiro.
Essa orientação substitui as referências anteriores a “planilha oficial”; não autoriza
interpretar ambiguidades da resolução. Os registros de divergências em
[rsc-regulation.md](../../rsc-regulation.md) continuam preservados como histórico.

A presente análise não revalida a transcrição normativa nem certifica formulários legais.
Valores, unidades, fatores, pesos e limites continuam exclusivamente nos JSONs versionados;
não haverá editor de normativa na aplicação, backend ou processamento remoto de documentos.

## 2. Inventário comprovado

| Área          | Implementação atual e evidência                                                                                                       | Destino recomendado                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Domínio       | `src/domain/models.ts`: Teacher, RscRequest, Education, Activity, Evidence e Memorial; schemas estritos e integridade de IDs/vínculos | preservar contratos antigos e acrescentar nova versão                           |
| Activity      | um critério, nível opcional, quantidade, período, categoria, descrição, resultados, competências, evidências e textos gerados/manuais | cada Activity torna-se uma Occurrence sem perder campos                         |
| Evidence      | metadados, referência de processo, campos legados fileName/description; nenhum binário                                                | preservar identidade e acrescentar referências a arquivos locais                |
| Catálogo      | metadata + níveis preenchidos (48/36/53 critérios), ainda pendentes; conflito RSC II d.5 explícito                                    | manter indisponibilidade até validação humana e resolução do conflito           |
| Pontuação     | `rules/scoring.ts` e `decimal.ts`: funções puras, BigInt, limites consolidados por critério/diretriz/nível, arredondamento final      | reaproveitar matemática, adaptar entrada e rastreabilidade                      |
| Persistência  | `storage/project-repository.ts`: banco Dexie v1, tabelas projects/preferences, revisão otimista em transação                          | ampliar com armazenamento de arquivos e operações atômicas                      |
| Autosave      | `features/local-projects/autosave.ts`: debounce 500 ms, fila serial, snapshot mais recente, retry e flush                             | manter fila para dados estruturados; arquivos fora dos snapshots JSON           |
| Sessão        | `use-local-projects.ts`: seleção, cópias, rascunho inválido, conflitos, descarte explícito, proteção de saída                         | extrair comandos tipados progressivamente                                       |
| Portabilidade | `domain/project.ts` e `portable-project.ts`: JSON 1.0 opaco, 2.0 tipado, 2.1 rascunho; Blob/Date não são JSON portátil                | preservar leitores; acrescentar pacote binário separado                         |
| Shell         | `app/App.tsx`, `features/project-shell/routes.ts`: dez seções e URLs locais, sessão acima das rotas                                   | preservar URLs e substituir seções incrementalmente                             |
| Formação      | `features/education/education.ts` e componente próprio: CRUD, datas, duplicação, referência textual de comprovante                    | manter Education; relacionar formação e ocorrência quando necessário            |
| Trajetória    | `features/trajectory/trajectory.ts`, `trajectory-section.tsx`: CRUD, filtro, timeline e evidências                                    | timeline vira projeção das ocorrências; edição por critério usa a mesma coleção |
| Critérios     | busca sem acentos, abas por nível e combobox; parâmetros vêm do dataset                                                               | reutilizar como entrada para grupos de lançamentos                              |
| Memorial      | `memorial/generator.ts` e `preview.ts`: narrativa determinística, seis seções, ordenação e preservação autoral                        | separar modelo derivado e overrides persistidos                                 |
| PDF           | `pdf/layout.ts`, `model.ts`, `generator.ts`: layout A4 e desenho local com pdf-lib                                                    | manter memorial; acrescentar pipeline distinto para provas e formulários        |
| Revisão       | `features/final-review/review.ts`: achados por área e bloqueio por erro editorial                                                     | evoluir para prontidão por artefato, sem confundir com aprovação normativa      |
| Exportação    | `final-export.tsx`: JSON e PDF do memorial; importação cria outra cópia                                                               | acrescentar backup completo e pacote final com manifesto                        |
| UI/a11y       | React Hook Form/Zod, Button, Sheet e AlertDialog Radix, foco, landmarks e axe em três tamanhos                                        | manter padrões e estender aos fluxos novos                                      |

### Limitações concretas do fluxo atual

- O processo nasce com título “Memorial RSC …”; critério é atributo de uma atividade,
  não o contexto de uma coleção de lançamentos.
- `CriterionEntry`, `Occurrence`, `StoredFile`, `FileResolver`, `EvidenceBundle`, `PageMap`,
  `.rscflow`, formulários derivados e pacote final ainda não existem no código.
- Quantidade é declarada manualmente. Datas não devem passar a gerar quantidades sem regra
  expressamente validada para a unidade correspondente.
- `Education.evidenceReference` é texto, enquanto `Activity.evidenceIds` referencia entidades.
  Não há vínculo formal entre uma formação e uma atividade que descrevam o mesmo fato.
- O memorial combina Education e Activity de categoria Formação: pode repetir um fato cadastrado
  nas duas coleções. A aplicação não consegue identificar isso com segurança por similaridade.
- A geração textual usa o ID do critério, sem um modelo semântico de referência de páginas.
- “Documentação indicada” verifica referências, não presença, integridade ou páginas de arquivos.
- O backup atual JSON não contém documentos. Salvo localmente não significa backup externo.
- A prévia usa posições calculadas com métricas do PDF, mas renderiza fontes CSS Georgia/Times;
  isso não equivale a uma prévia rasterizada do arquivo nem comprova igualdade visual absoluta.
- O PDF atual é textual. Não concatena PDFs de evidências nem incorpora imagens como comprovantes.

### RSC I / II / III e catálogo

O requerimento escolhe um nível pretendido; as atividades podem declarar enquadramentos nos três
níveis. O motor verifica compatibilidade entre critério e nível explicitamente escolhido, soma
por nível e aplica a política do JSON. O nível pretendido não deve filtrar e apagar ocorrências
nos outros níveis durante a migração.

`projectScoring` adapta somente em memória envelopes 2.1 para a entrada 2.0 do motor.
`linkedDataset` exige ID e versão exatos. Dataset ausente ou pendente não produz total presumido.
As fixtures E2E são injetadas somente pelo modo Vite `e2e` e não validam o catálogo real.

**Incompatibilidade prioritária:** `domain/regulation.ts` exige
`metadata.source.officialScoringSpreadsheet` para um dataset validado. O nome e a obrigatoriedade
contrariam a orientação atual. A próxima mudança normativa deverá tornar a resolução a fonte
obrigatória e a planilha um auxiliar opcional, com leitor compatível e testes. Não basta renomear
uma frase na documentação nem preencher o campo com uma fonte fictícia.

## 3. Reaproveitamento e dívida técnica

Reutilizar schemas pessoais, integridade referencial, aritmética decimal, agregação quantitativa,
revisão otimista, fila de autosave, busca de critérios, componentes acessíveis, gerador determinístico,
layout A4, testes regulatórios e round-trip. Nenhuma dessas áreas requer reconstrução do zero.

Pontos a decompor durante as respectivas mudanças:

- `trajectory-section.tsx` tem 795 linhas e reúne formulários, timeline e evidências. Separar
  formulário de ocorrência, grupo por critério, seletor de evidências e projeção cronológica.
- A sessão edita o envelope por serialização integral de `userData`. Manter editor JSON legado,
  mas oferecer comandos tipados para o domínio novo; nunca serializar arquivos a cada tecla.
- `createProject` cria 2.0 e aparece nos testes; o shell usa `createDraft` 2.1. Tratar a primeira
  como compatibilidade, não excluí-la por suposto código morto.
- `ScoringResult` em `models.ts` é contrato anterior; `CalculationResult` é a saída real.
  Manter adaptador/nomes explícitos e não criar um terceiro resultado concorrente.
- Helpers de período, ordenação e rótulos se repetem. A timeline ordena recente→antigo e o memorial
  antigo→recente; unificação deve preservar essa diferença intencional.
- `updateEvidence` reconstrói os campos editáveis e não preserva `fileName` legado. Criar regressão
  de edição sem perda antes de ampliar Evidence; esta etapa não corrige o comportamento.
- O teste arquitetural usa expressões regulares e imports diretos. É uma proteção parcial: não
  comprova ausência de dependências transitivas indevidas, toda forma de rede ou toda regra literal.
- A documentação chama `RscLevel` de agregador, mas o tipo é a enumeração dos três níveis;
  o objeto agregador é validado por `regulationLevelSchema`. Corrigir na etapa de contratos.

## 4. Modelo alvo recomendado

Recomendação técnica para a próxima implementação; nomes abaixo não são schemas já existentes.

```text
ProjectEnvelope v3.0 (proposta)
├── regulation: id + version (null enquanto pendente)
└── RscProject
    ├── Teacher / RscRequest / Education[]
    ├── CriterionEntry[] { id, criterionId, selectedLevel, occurrences[] }
    ├── unassignedOccurrences[]
    ├── Evidence[] { metadados, attachments[] }
    ├── StoredFile[] { somente descritores }
    ├── MemorialOverrides
    └── ExportPreferences
LocalProject
├── revisão / timestamps / envelope
└── BackupState (metadados locais de backup)
IndexedDB files
└── bytes por projeto e fileId
```

Ajustes deliberados ao desenho conceitual do roteiro: preservar Education, reservar ocorrências
sem enquadramento e manter BackupState local. Isso evita perda de rascunhos e dependência circular
entre exportar um backup e modificar o conteúdo do próprio backup.

| Conceito          | Contrato recomendado e invariantes                                                                                                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CriterionEntry    | ID estável, criterionId e selectedLevel explícitos; agrupa por par critério/nível dentro da versão normativa do projeto; sem cópia de fator, peso ou limite                                                                  |
| Occurrence        | ID global no projeto, título, categoria editorial, período com extremos opcionais, quantidade, descrição, resultados, competências, local, função, evidenceIds e timestamps; preserva todos os campos relevantes de Activity |
| Sem enquadramento | coleção explícita de ocorrências; referências inválidas mas declaradas permanecem preservadas nos grupos com diagnóstico, sem inventar correspondências                                                                      |
| Education         | mantém formação não pontuável; vínculo opcional por ID à ocorrência quando ambas descrevem o mesmo fato; sem criação automática de pontuação                                                                                 |
| Evidence          | identidade documental reutilizável; metadados e attachments ordenados com fileId e seleção de páginas, sem exigir arquivo para ler projetos antigos                                                                          |
| StoredFile        | fileId, nome original, tipo declarado/detectado, tamanho, hash e estado de processamento; bytes fora do JSON; contagem de páginas somente após leitura real                                                                  |
| FileResolver      | porta assíncrona para resolver fileId em bytes e erro explícito; implementação local injetada nos casos de uso, sem Dexie no motor ou no memorial                                                                            |
| ScoringResult     | continuar usando CalculationResult como saída canônica; detalhamento por occurrenceId e entryId, mantendo razões de indisponibilidade                                                                                        |
| MemorialOverrides | textos de abertura, conclusão e seções; ajustes por occurrenceId com base gerada anterior e estado manual; nunca substituir autoria silenciosamente                                                                          |
| MemorialModel     | projeção semântica com seções, parágrafos e referências tipadas; não é segunda fonte editável do processo                                                                                                                    |
| EvidenceBundle    | plano ordenado de arquivos/páginas selecionadas, seguido do PDF produzido e diagnósticos; reutiliza a mesma evidência compartilhada sem inclusão acidental repetida                                                          |
| PageMap           | mapeamento de evidenceId/fileId/página de origem para páginas finais; distingue comprovantes.pdf e eventual documento combinado; derivado, nunca digitado                                                                    |
| ExportPreferences | ordem explícita de comprovantes, artefatos selecionados e opções editoriais; padrões de aplicação identificados como tais, não exigências legais                                                                             |
| BackupState       | data da geração, revisão/hash do snapshot e estado local; não afirmar que o navegador confirmou gravação física do download                                                                                                  |

Cada ocorrência pertence a um único grupo ou à coleção sem enquadramento. Não duplicar a mesma
ocorrência em grupos para conceder múltiplas pontuações. Não deduplicar fatos automaticamente.
Grupos diferentes para um mesmo critério não podem multiplicar seu limite compartilhado.

## 5. Dependências e pipeline de saídas

```text
Schemas e migrações → repositório e comandos → edição por critério/ocorrência
                               ↓
Projeto + dataset → adaptador quantitativo → motor existente → CalculationResult
                               ↓
Projeto + FileResolver → seleção/ordem → EvidenceBundle + PageMap
                               ↓
Projeto + resultado + PageMap → formulários e MemorialModel → PDFs
                               ↓
Snapshot consistente + artefatos → pacote final
Snapshot consistente + originais → backup .rscflow
```

Arquivos são lidos na camada de casos de uso, por portas de domínio; `storage` implementa as portas.
O motor não recebe Blob, React, banco ou rede. Memorial recebe referências resolvidas como dados.
`pdf` recebe modelos e bytes, sem consultar IndexedDB. Formulários/anexos são projeções de saída,
com campos e layouts conferidos na resolução antes de implementação.

Gerar primeiro o PDF de comprovantes e seu mapa de páginas, depois incorporar referências no
memorial e formulários. Recomenda-se inicialmente arquivos separados, com referências nomeando
explicitamente o PDF de comprovantes; se houver PDF único, calcular offsets após paginação e
verificar estabilidade antes de exportar. Não usar página da prévia como referência persistida.

Toda exportação usa uma revisão congelada de projeto, dataset, preferências e hashes dos arquivos.
Edição ou substituição posterior invalida resultados derivados. Arquivo ausente/corrompido bloqueia
o artefato que depende dele com diagnóstico; não gera pacote anunciado como completo.

## 6. Migração e projetos existentes

### Compatibilidade de dados

1. Introduzir leitor da versão proposta 3.0 sem alterar os leitores 1.0/2.0/2.1.
2. Manter 1.0 opaco e exportável. Seu conteúdo não permite migração sem mapeamento explícito;
   oferecer continuidade no editor legado, sem adivinhar semântica.
3. Oferecer migração 2.0/2.1 como criação de nova cópia, mantendo a original. Exibir relatório
   de transformação e pendências antes da confirmação. Leitura e recarga não migram silenciosamente.
4. Copiar cada Activity para uma Occurrence com mesmo ID, valores, ordem relativa, período,
   timestamps e vínculos. Agrupar por criterionId + selectedLevel em ordem estável; IDs de grupos
   devem ser determinísticos para a mesma entrada. Não agregar ou arredondar quantidades na migração.
5. CriterionId vazio ou nível ausente fica em pendência explícita, preservando qualquer referência
   parcial. Referência declarada incompatível é preservada e diagnosticada; não escolher outro nível.
6. Copiar Teacher, RscRequest, Education e Evidence integralmente. Não transformar fileName ou
   evidenceReference em arquivo existente. Não fundir formações e ocorrências por título/período.
7. Transferir generatedText, editedText e isManuallyEdited para overrides por occurrenceId sem
   regenerar. Preservar introdução, título, conclusão e sectionTexts, inclusive strings vazias.
8. Preservar ID/versão normativa, inclusive null, e registrar schema/aplicação de origem e relatório
   de migração. Distinguir identidade da nova cópia e proveniência da original.
9. Validar destino e equivalência da projeção quantitativa, IDs, textos e vínculos; só então gravar.
   Falha não altera origem. Migração repetida da mesma entrada gera conteúdo transformado equivalente.
10. Exportar 3.0 com versão explícita. Não oferecer downgrade silencioso para 2.x, que perderia
    arquivos e agrupamentos. Continuar exportando originais antigos no formato correspondente.

### Banco e arquivos

Separar versão do banco Dexie, versão do envelope, versão do pacote e versão normativa.
Recomenda-se banco v2 aditivo com tabela de arquivos por chave composta localId/fileId e metadados
locais de backup; manter tabelas atuais e registros antigos. Não executar migração semântica de
projetos em upgrade global do banco.

Processar/hashar bytes antes de uma transação curta. Gravar bytes, descritores e vínculos
atomicamente, conferindo revisão. Duplicação cria cópia com arquivos independentes inicialmente;
compartilhamento físico pode vir depois com gestão explícita de referências. Exclusão de projeto
remove somente seus arquivos. Excluir uma evidência não remove bytes ainda referenciados.

Quota, falha de leitura, interrupção e conflito entre abas preservam o último estado consistente.
A fila de autosave persiste metadados; comandos de arquivo coordenam revisão com essa fila.
Exportar deve concluir ou capturar explicitamente as pendências, sem misturar duas revisões.

### Backup .rscflow

Recomenda-se contêiner ZIP versionado com manifesto, projeto JSON e arquivos originais por ID,
sem paths absolutos. Biblioteca e limites serão escolhidos na implementação após avaliar bundle,
licença e memória; não há dependência nova nesta etapa. Manifesto lista versão do pacote, schema do
projeto, referência normativa, tamanhos e hashes. PDFs derivados não substituem originais.

Importar exige validar manifesto, entradas duplicadas, caminhos inseguros, tamanho descompactado,
quantidade de arquivos, hashes e referências antes de publicar a cópia. Para arquivos grandes,
prever staging recuperável e limpeza em falhas, sem manter projeto parcialmente importado visível.
Importações repetidas criam cópias independentes. Pacote final de documentos e backup restaurável
são produtos distintos; JSON simples continua disponível com indicação de que não inclui binários.

## 7. Riscos e tratamento

| Prioridade | Risco                                                          | Tratamento e verificação                                                              |
| ---------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| alta       | catálogo transcrito, pendente, com ambiguidade interna em d.5  | manter indisponibilidade; validar a resolução; não normalizar o valor por inferência  |
| alta       | schema exige planilha informal como oficial                    | corrigir proveniência e testes antes de promover catálogo                             |
| alta       | perda de campos legados ou autoria                             | migração sem perda, cópia original preservada, fixtures com todos os opcionais        |
| alta       | limites multiplicados por agrupamento                          | consolidar pelo critério normativo, testar múltiplos grupos e ocorrências             |
| alta       | bytes/referências inconsistentes por quota ou concorrência     | comandos transacionais, revisão otimista e falhas simuladas                           |
| alta       | referências de páginas incorretas após reordenação             | PageMap derivado do snapshot exato, invalidado por alteração                          |
| alta       | PDFs protegidos, corrompidos, grandes ou imagens incompatíveis | validação local e erros por arquivo; orçamento de memória e cancelamento              |
| média      | importação ZIP abusiva ou incompleta                           | limites explícitos, validação de caminhos e hashes, rollback/staging                  |
| média      | duplicação de formação e ocorrência                            | vínculo explícito e projeção editorial; não deduplicar por heurística                 |
| média      | rascunhos impedidos pela falta de catálogo                     | permitir ocorrências sem enquadramento e metadados sem arquivo                        |
| média      | regressão de navegação e acessibilidade                        | conservar URLs; teclado, anúncios de progresso e alternativas à ordenação por arraste |
| média      | mudança de dataset reinterpreta projeto antigo                 | referência imutável; atualização normativa somente por ação explícita                 |

Limites de tamanho, tipos de arquivo aceitos, ordem editorial padrão e layouts dos formulários
precisam ser definidos nas etapas correspondentes. São decisões técnicas ou dependentes da fonte,
não motivos para inventar exigências normativas. Assinaturas digitais de PDFs de origem não devem
ser anunciadas como preservadas em um PDF recomposto; manter os originais no backup.

## 8. Estratégia de testes

Preservar todas as suítes existentes. Acrescentar testes por incremento, sem substituir casos
legados por fixtures exclusivamente do modelo novo.

| Camada           | Casos novos necessários                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| domínio/migração | 2.0 e 2.1 completos/incompletos; IDs; campos legados; autoria; referências inválidas preservadas; 1.0 opaco; determinismo; rejeição de versão desconhecida   |
| motor            | equivalência Activity→Occurrence nos três níveis; mínimos e arredondamento existentes; quantidade compartilhada; grupo duplicado; nenhum limite multiplicado |
| storage          | upgrade aditivo com banco antigo; bytes + metadados atômicos; conflito; quota; exclusão/duplicação; interrupção; arquivos compartilhados por evidências      |
| backup           | exportar→importar em outro contexto; hashes/bytes idênticos; arquivo ausente; pacote malformado; limite descompactado; rollback; versão incompatível         |
| memorial         | equivalência editorial na migração; geração local; overrides preservados; alteração estruturada não sobrescreve; referências resolvidas sem duplicação       |
| PDF/provas       | múltiplos PDFs e imagens, páginas selecionadas, ordem, rotação, dimensões, falhas, mapa exato, reordenação e invalidação                                     |
| formulários      | campos e disposição conferidos na resolução; valores do mesmo snapshot; páginas corretas; estados indisponíveis explícitos                                   |
| integração/a11y  | grupo/ocorrência, anexar/remover/reordenar por teclado, progresso/cancelamento, erro recuperável, foco e leitores de tela                                    |
| E2E              | criar processo→ocorrências→arquivos→cálculo→saídas→backup→restaurar; migração real do IndexedDB; mobile/tablet/desktop e axe                                 |

O teste arquitetural atual não deve bloquear uma futura leitura local legítima via blob URL por
mera regex. Preferir resolução por bytes e, se necessário, refinar o teste para distinguir origem
local e comunicação remota, mantendo proteção de dados. Testes geométricos do PDF continuam úteis,
mas formulários e comprovantes também precisam de inspeção visual dos artefatos gerados.

## 9. Ordem de implementação e critérios de saída

| Etapa                        | Depende de                                      | Entrega e critério de conclusão                                                                                            |
| ---------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A — proveniência             | esta análise                                    | resolução única oficial; auxiliar opcional; documentação/schema/testes coerentes; catálogo continua pendente até validação |
| B — contratos e migração     | A                                               | novo envelope, grupos, ocorrências e overrides; leitores antigos preservados; migração pura e relatório sem perda          |
| C — repositório e comandos   | B                                               | banco aditivo; comandos tipados; migração em cópia; revisão otimista e autosave preservados                                |
| D — ponte quantitativa       | B                                               | adaptador achata ocorrências para motor atual; resultados equivalentes e rastreáveis; sem duplicar fórmulas                |
| E — fluxo do docente         | C, D                                            | cadastro por critério e ocorrências; timeline derivada; perfil e formação reaproveitados; URLs antigas acessíveis          |
| F — arquivos e backup        | C                                               | StoredFile/FileResolver, anexação real, operações atômicas e restauração .rscflow independente do PDF                      |
| G — comprovantes e páginas   | F                                               | EvidenceBundle e PageMap consistentes com bytes, ordem e revisão                                                           |
| H — memorial e formulários   | D, E, G + conferência normativa dos formulários | modelos derivados únicos, overrides preservados, referências corretas, PDF local                                           |
| I — revisão e pacote final   | F, G, H                                         | prontidão por artefato, snapshot comum, manifesto e exportação real                                                        |
| J — regressão e documentação | todos                                           | matriz completa, compatibilidade, a11y, memória e recuperação verificadas                                                  |

F pode avançar em relação a E após estabilizar C; H não pode preencher páginas antes de G.
O catálogo oficial deve ser validado em trilha própria antes de disponibilizar pontuação oficial
completa, mas sua pendência não impede desenvolvimento com fixtures claramente sintéticas.

Próximo incremento recomendado: A, seguido de B. Não remover Activity dos leitores antigos, não
migrar ao abrir, não adicionar binários a `portableProject`, não reescrever o motor e não apresentar
anexos/formulários como novos cadastros independentes.

## 10. Validação desta análise

Executado em 11/09/2026 sobre a base analisada, sem alterações no código:

| Comando             | Resultado                                                               |
| ------------------- | ----------------------------------------------------------------------- |
| `npm ci`            | passou; 2 vulnerabilidades moderadas e avisos de dependências obsoletas |
| `npm run lint`      | passou                                                                  |
| `npm run typecheck` | passou                                                                  |
| `npm run test:run`  | 26 arquivos, 243 testes passaram                                        |
| `npm run build`     | passou; avisos de anotações do Zod e chunk principal maior que 500 kB   |
| `npm run test:e2e`  | 19 cenários Chromium passaram, incluindo axe e três viewports           |

Os avisos de NO_COLOR/FORCE_COLOR são do processo de teste, não do console da aplicação.
Não foram adicionados testes nesta etapa documental. A bateria estabelece uma referência para
os incrementos futuros; não testa funcionalidades propostas que ainda não existem. Não houve
inspeção visual manual nova dos PDFs nem nova validação integral da resolução nesta análise.

Formatação (`npm run format:check`) e `git diff --check` também passaram.
