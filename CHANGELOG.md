# Changelog

This project follows Keep a Changelog and Semantic Versioning.

## [Unreleased]

### Fixed

- Arquivos ausentes em Documentos comprobatórios passam a abrir diretamente o seletor nativo e a
  restaurar o anexo no lançamento vinculado imediatamente após a escolha, sem navegação ou passos
  adicionais.

- Projeto demonstrativo e projetos com comprovantes locais indisponíveis voltam a abrir a prévia do
  Memorial; a ausência das referências de páginas é informada sem interromper o documento.

- Troca de tema deixa de alterar dinamicamente o esquema nativo de cores do navegador, removendo o
  gatilho associado à queda observada no renderer do Chrome e preservando tema, recarga e
  preferências persistidas.

### Added

- Publicação estática no GitHub Pages acionada somente por release publicada, com build da tag,
  caminho base do repositório e fallback para acesso direto às rotas da aplicação.

- Jornada E2E integral baseada no projeto demonstrativo, cobrindo dados docentes, formação, três
  níveis RSC, lançamentos, comprovante multipágina, referências documentais, PDFs finais, pacote
  ZIP e restauração do backup, além de arquivos ausentes, inválidos e falha da geração conjunta.

- Projeção consolidada de prontidão compartilhada por Revisão e Gerar documentos, com estados por
  artefato e distinção explícita entre bloqueios, avisos e pontuação provisória.

- Backup restaurável `.rscflow` com projeto versionado, manifesto de integridade e todos os
  comprovantes binários, restaurado em nova cópia por transação atômica sem alterar o JSON portátil.

- Pacote final ZIP determinístico com Memorial, formulários normativos e comprovantes em PDFs
  separados, criado somente a partir do resultado completo da geração conjunta.

- Geração conjunta e transacional do Memorial, formulários normativos e comprovantes consolidados,
  usando uma fotografia do projeto e um único mapa de páginas, com resultado explícito por artefato.

- Etapa Gerar documentos com downloads individuais do Memorial, formulários normativos e PDF
  consolidado dos comprovantes, estados por artefato e validação dos arquivos locais atuais.

- Geração local dos formulários e Anexos II a VII do processo de RSC a partir do catálogo, dos
  dados do projeto, da projeção canônica de pontuação e do mapa de páginas dos comprovantes, com
  estado provisório ou indisponível e informações incompletas explícitos.

- Referências derivadas de páginas dos comprovantes nos respectivos lançamentos do Memorial, com a
  mesma projeção semântica utilizada pela prévia A4 e pelo PDF final.

- Consolidação local dos PDFs de comprovantes por RSC, requisito e lançamento, com suporte a
  múltiplas páginas e arquivos, deduplicação de evidências compartilhadas, mapa de intervalos de
  páginas e diagnósticos de arquivos ausentes, inválidos ou incompatíveis.

- Projeção derivada por requisito na pontuação do projeto, com lançamentos, comprovantes,
  quantidades, limites, valores calculados e estado de validação normativa.

- Projeto demonstrativo inteiramente fictício de RSC III, com formação, lançamentos dos três
  níveis, memorial, descritores e oito comprovantes PDF locais sem validade.

- Vocabulários controlados para escolaridade, tipo de formação e situação da formação, com
  seletores na interface e identificação de valores legados fora das listas.

- Pontuação provisória por requisito e lançamento em catálogo pendente de validação humana, com
  aviso condensado em badge e tooltip; totais do projeto e critérios com conflito normativo
  permanecem indisponíveis.

- Cards de requisitos reorganizados com referência normativa discreta, quatro métricas sem ícones e
  ações de adicionar ou localizar lançamentos, preservando conteúdo e regras existentes.

- Padrões visuais compartilhados para superfícies, títulos, cartões, campos, botões, links, avisos
  e sobreposições, preservando os fluxos e a organização funcional existentes.

- Temas claro, escuro e sincronizado com o sistema, com preferências locais para texto ampliado,
  contraste reforçado e redução de movimentos, sem alterar a estrutura das telas; o painel fecha ao
  perder o foco ou receber uma interação externa.
- Prévia A4 do memorial disponível também como item do menu principal, mantendo o acesso pela
  Revisão.

- Recomendação consultiva de capacidade por etapa integrada ao protocolo de tarefas na atualização
  incremental do ARRP, sem dependência de nomes específicos de modelos.

- Estrutura documental ARRP com `AGENTS.md` como roteador, mapa de contexto sob demanda, protocolo
  de tarefas, política de decisões e reconciliação documental pós-alteração.

- Fluxo público reduzido a Visão geral, Dados do docente, Requisitos, Memorial, Revisão e Gerar documentos.
- Lançamentos mínimos por requisito, com abas RSC I/II/III, dados derivados do catálogo, arquivo opcional e registros provisórios para catálogo pendente sem cálculo presumido.
- Persistência local de bytes no Dexie v2, checagem SHA-256, transação atômica, cópia de anexos na duplicação e indicação de arquivos ausentes após importar JSON.
- Memorial com texto inicial determinístico, formação integrada e preservação explícita de narrativa manual.
- Regressões unitárias, de integração e E2E para fluxo simplificado, documento local, pendência normativa, teclado, bloqueio de navegação, responsividade e acessibilidade.

- Catálogos RSC I, II e III transcritos dos Anexos IV–VI, com 137 critérios ainda pendentes de validação humana final.
- Integridade estrutural por nível e conflito normativo do RSC II d.5 registrado como dado, visível na consulta e bloqueado para cálculo.
- Validação normativa desvinculada da planilha auxiliar legada, mantendo o campo nullable por compatibilidade.

- Preenchimento por RSC I/II/III, com busca por descrição, diretrizes, limites, pontuação derivada e CRUD de lançamentos.
- Seção própria de comprovantes e trajetória cronológica derivada, mantendo o cadastro anterior como compatibilidade.
- Visão geral do processo com pendências, referências documentais e histórico local de backup JSON com detecção de alterações.
- Testes de cadastro por RSC, compartilhamento de evidências, backup, teclado, responsividade e acessibilidade.

- Domínio 3.0 com lançamentos por critério, ocorrências, evidências compartilhadas e descritores de arquivos.
- Migração explícita de 2.0/2.1 em nova cópia, sem perda de autoria, quantidades ou referências; legado 1.0 permanece opaco.
- Ponte compatível para formulários, pontuação e memorial, com importação/exportação e autosave de 3.0 e testes de migração/round-trip.

- Relatório do estado atual e plano incremental para critérios, ocorrências, arquivos locais,
  mapas de páginas, saídas derivadas e backup completo, com migração e matriz de testes.
- Registro da orientação da nova bateria: resolução como única fonte normativa oficial e
  planilha informal como material auxiliar; incompatibilidade do schema registrada para correção.

- Documentação consolidada de arquitetura, domínio, schemas, regulação, interface, UX, testes e fluxo de manutenção.
- Matriz automatizada de dependências entre camadas e regressões contra rede, acesso normativo direto pela apresentação e implementações incompletas.
- Procedimento auditável para corrigir JSON normativo conforme a precedência da resolução e registrar divergências.

- Jornada E2E completa da criação ao round-trip JSON e PDF, com catálogo sintético isolado do bundle de produção.
- Regressões de quantidade limitada, teto de diretriz, atividade sem evidência, texto manual, autosave e recuperação após recarga.
- Fixture Playwright que falha diante de erros de página e avisos ou erros inesperados do console.

- Matriz transversal de acessibilidade e responsividade em todas as rotas, cobrindo mobile, tablet e desktop com axe-core e detecção de overflow horizontal.
- Testes de teclado para link de salto, foco após navegação, abertura de formulários e restauração de foco em diálogos.

- Revisão final de identificação, RSC, formação, trajetória, enquadramentos, documentação, pontuação, memorial e conclusão.
- Achados classificados como ERROR, WARNING e INFO, com bloqueio do PDF somente para erros estruturais.
- Tela final com PDF, JSON, importação local, último autosave e nomes de arquivo legíveis.
- Testes de bloqueios, avisos permissivos, round-trip JSON e PDF gerado após a revisão.

- Pré-visualização A4 paginada com capa, sumário numerado, seções, margens e navegação entre páginas.
- Geração integralmente local do PDF no navegador, com download adequado ao fluxo de anexação no SEI.
- Paginação compartilhada entre tela e arquivo, incluindo textos longos, acentos, cabeçalhos e rodapés.
- Testes unitários, de integração e E2E para conteúdo, ordem, geometria, acessibilidade e download real.

- Memorial Descritivo estruturado com capa, identificação, sumário e seções cronológicas compatíveis com o art. 10.
- Gerador local e determinístico de texto-base por atividade, sem backend ou serviço remoto.
- Editor por seções com preservação de texto manual, aviso de dados alterados e regeneração exclusivamente explícita.
- Persistência e transporte JSON de textos gerados/editados, com testes unitários, de integração e E2E.

- Dashboard de pontuação com resultados por nível, total, requisitos 60/36 e detalhamento expansível por diretriz.
- Resumo quantitativo e pendências na visão geral, com estado parcial explícito para dados normativos pendentes.
- Indicadores textuais de teto, itens utilizados e experiências preservadas no memorial, com testes responsivos e de acessibilidade.

- Exploração somente leitura dos critérios por abas RSC, hierarquia normativa e busca textual tolerante a acentos.
- Combobox acessível para vincular atividades a critérios validados, com contexto normativo obtido diretamente do dataset.
- Estados explícitos para catálogo pendente, ausente, vazio ou referência inválida, sem valores ou cálculos presumidos.
- Testes unitários, de integração e E2E para busca, níveis, seleção por teclado, atualização via JSON e catálogo não validado.

- Timeline da trajetória profissional com busca, filtro por categoria, agrupamento anual e CRUD completo de atividades.
- Metadados de atividade para instituição, setor, período, função, descrição, resultados, competências, quantidade, critério e timestamps.
- Gestão de referências de evidências com vínculo a atividades, remoção segura e transporte JSON sem arquivos binários.

- CRUD de formação, aperfeiçoamento e titulação com ordenação cronológica, edição, duplicação e exclusão confirmada.
- Metadados de tipo, área, período, situação, documento comprobatório, observações e timestamps no registro de formação.
- Testes de validação, acessibilidade, responsividade, persistência e transporte JSON das formações.

- Formulário de dados pessoais e funcionais do docente com React Hook Form, validação Zod, erros acessíveis e autosave.
- Campos de CPF, SIAPE, cargo, lotação, contato, RT/RSC atual, escolaridade, ingresso e vigência disponíveis ao memorial.
- Testes de validação, persistência, recarga, edição posterior, completude e serialização do perfil.

- Shell responsivo com sidebar, Sheet Radix, cabeçalho de autosave e rotas por seção do projeto.
- Gestão inicial com cartões, progresso editorial, criação por RSC/dataset e exclusão confirmada.
- Formulários por seção, prévia textual, revisão e visualização do estado real do motor normativo.
- Envelope de rascunho 2.1 com ausências explícitas, preservando importação dos formatos 1.0 e 2.0.
- Testes de rotas diretas, navegação protegida, responsividade e acessibilidade do shell.

- Persistência de múltiplos projetos em IndexedDB/Dexie com CRUD, duplicação e recuperação do projeto ativo.
- Autosave com debounce, fila serial, estados visuais e detecção de conflitos entre abas.
- Importação/exportação JSON portátil dos schemas 1.0 e 2.0, editor validado e proteção de rascunhos em falhas.
- Testes de persistência e autosave com fake-indexeddb e transporte entre contextos de navegador no E2E.

- Motor puro de pontuação com fator/peso, limites compartilhados, consolidação nos três níveis e estados quantitativos explícitos.
- Política normativa em JSON, aritmética decimal exata, arredondamento final e escolha explícita de nível por atividade.
- Testes unitários e regressões com recortes conferidos da resolução, incluindo indisponibilidade do catálogo pendente.

- Contratos de domínio tipados, envelope 2.0 com leitura compatível de 1.0 e validação de referências de comprovantes.
- Carregador genérico e schemas Zod dos três níveis normativos, com testes de integridade; dados oficiais permanecem pendentes.

- Validador local de arquivos JSON de projeto, com metadados declarados e mensagens acessíveis.
- Testes de leitura, rejeição estrutural, seleção concorrente e fluxo E2E com acessibilidade.

### Changed

- Matriz de testes consolidada conforme as suítes vigentes; a versão com referências removidas foi
  preservada como histórico.
- Referência de validação do domínio 3.0 atualizada para o E2E vigente de Requisitos.

- Plano de refatoração de 11/09/2026 arquivado como histórico, separado da documentação vigente.

- README e guia de contribuição alinhados ao estado real do catálogo pendente, aos formatos 1.0/2.0/2.1 e ao fluxo local sem backend.

- Execução E2E em modo Vite dedicado e formatação integral dos arquivos que impediam o job de qualidade.
- Link de salto sem mutação do histórico, eliminando aviso do bloqueador do React Router.

- Foco visível global, alvos de toque ampliados, autosave atômico e semântica de ocupação da área principal.
- Abertura de formulários com foco no primeiro campo e retorno ao acionador ao cancelar exclusões.

- Prevalência da resolução normativa nas divergências com a planilha, conforme decisão do mantenedor; registrados os valores de RSC I/a.3 e g.1 e a ambiguidade interna de RSC II/d.5.

- Convenção de commits com descrição e corpo em português, conforme orientação do mantenedor.
- Documentação dos limites da validação estrutural e das divergências observadas nas fontes pendentes.

## [0.1.0] - 2026-09-10

### Added

- Executable React, TypeScript, Tailwind, shadcn/ui, testing, and CI scaffold.
- Versioned empty envelopes for pending IFBA 189/2026 normative data.
