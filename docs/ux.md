# Experiência de uso

A tela inicial prioriza criar ou continuar um memorial. Cada cartão mostra título, RSC pretendido, última alteração e preenchimento aproximado, além de continuar, duplicar, exportar e excluir. Exclusão exige confirmação em diálogo; cancelar mantém a cópia. Importações sempre criam uma cópia local separada.

A criação pede somente RSC pretendido e regulamento/dataset. Título inicial é um rótulo de interface editável. Nome do docente e enquadramento podem estar ausentes em rascunhos 2.1. O catálogo pendente é identificado como tal e sua versão normativa permanece null.

## Mapa da jornada

O fluxo principal segue Início → Visão geral → Dados do docente → Formação → Trajetória → Critérios
→ Pontuação → Memorial → Prévia → Revisão → Exportar. A sidebar ou o Sheet permite acesso direto a
qualquer etapa; não há desbloqueio artificial por sequência. Cada correção da revisão volta à rota
responsável, e o autosave compartilhado protege a troca de seção. O mapa completo de URLs está em
`docs/frontend.md`.

## Feedback e autosave

Edições válidas entram em uma fila serial após 500 ms sem digitação. O cabeçalho anuncia o estado em
uma região viva; navegação e operações sobre projetos aguardam uma gravação pendente. Erros de
validação ficam no campo e não substituem a última cópia válida. Erros do IndexedDB preservam o
rascunho e oferecem recuperação explícita. O usuário deve aguardar “Salvo localmente” antes de
fechar a página e usar a exportação JSON para backup e transporte.

## Organização e responsividade

Em desktop (a partir de 1024 px), a sidebar fixa apresenta as seções. Em telas menores, o botão de menu abre um Sheet modal com foco contido, fechamento por Escape e retorno ao acionador. O cabeçalho mantém exportação e estado do autosave acessíveis; em telas estreitas, o estado ocupa uma segunda linha. Formulários e cartões se reorganizam sem exigir rolagem horizontal.

Há link para pular ao conteúdo como primeiro controle da ordem de tabulação. Na abertura inicial ele permanece disponível; depois de uma mudança de rota, o foco segue para o título principal, que acompanha o título da página. A seção ativa usa `aria-current`. Estados de salvamento usam região viva atômica e a área principal anuncia quando está ocupada. Inputs têm rótulos e estados vazios explicam a próxima ação disponível.

Todos os controles interativos apresentam foco visível. Ações principais têm pelo menos 44 px de altura e ações compactas, 40 px. Formulários abertos por “Adicionar” ou “Editar” levam o foco ao primeiro campo. Dialogs e o Sheet contêm o foco enquanto abertos; ao cancelar uma exclusão ou fechar o menu, o foco retorna ao acionador. Textos, ícones e símbolos acompanham estados e severidades para que o significado não dependa somente da cor.

Na seção Dados do docente, nome completo, CPF, SIAPE, campus de lotação e RSC pretendido aparecem como obrigatórios para concluir a etapa. Os demais campos mostram explicitamente “opcional”. Mensagens de CPF, e-mail, telefone e datas aparecem junto ao campo e são anunciáveis por tecnologia assistiva. A digitação não é interrompida por máscaras automáticas.

Formação apresenta um estado vazio que orienta o primeiro cadastro e, depois, cards do registro mais recente para o mais antigo. Em telas estreitas, campos, detalhes e ações passam para uma coluna sem rolagem horizontal. Tipo, curso ou título, instituição e situação são marcados como obrigatórios; os demais campos são identificados como opcionais. Erros ficam associados ao respectivo controle. Exclusão exige confirmação. A edição mantém o ID; a duplicação cria um novo registro com ID próprio.

Trajetória apresenta busca e filtro por categoria antes da timeline. Atividades com datas são agrupadas pelo ano e aparecem da mais recente para a mais antiga; registros sem período ficam no grupo “Sem data”. Quando nenhum item corresponde aos filtros, uma mensagem anuncia o resultado vazio. O cadastro amplo permanece na própria página e se reorganiza em uma coluna em telas estreitas.

Atividades mostram quantidade, período, local, função, textos, competências, critério declarado e evidências vinculadas. A tela informa que o critério não é inferido pela categoria. Em catálogo validado, o critério é localizado por termos comuns, código, unidade ou diretriz; a opção expõe nível e contexto antes da escolha. O combobox anuncia expansão, lista e opção ativa, aceita setas, Enter e Escape e permite limpar a escolha. Em catálogo pendente, permanece desabilitado com o motivo visível. Evidências são cadastradas como metadados, com tipo e título obrigatórios, e vinculadas por checkboxes. Exclusões exigem confirmação; a confirmação de uma evidência também explica que seus vínculos serão removidos.

Critérios organiza o catálogo em abas RSC I, RSC II e RSC III, abertas inicialmente no nível pretendido. Setas laterais, Home e End movem o foco e ativam as abas. A busca tolera caixa e acentuação, para que termos como “comissão”, “coordenação”, “curso”, “palestra”, “artigo”, “projeto”, “estágio” e “TCC” encontrem as descrições disponíveis sem memorização de códigos. Cada resultado permanece sob sua diretriz e expõe os valores e a proveniência do JSON. A página é somente leitura.

Pontuação apresenta o resultado em cartões que passam de três colunas para uma coluna em telas estreitas. Os estados usam texto e símbolos além de cor: “Requisitos quantitativos atingidos”, “Requisitos quantitativos ainda não atingidos” ou “Cálculo parcial”. As diretrizes permanecem recolhidas até a pessoa abrir os detalhes; ao atingir o teto, a mensagem “Pontuação máxima da diretriz atingida.” explica por que experiências adicionais não aumentam os pontos. A visão geral repete um resumo compacto e lista pendências com acesso à seção completa pela navegação.

Memorial apresenta um editor por seções, com a apresentação introdutória identificada como opção editorial. Atividades aparecem do passado para o presente na seção correspondente à categoria declarada. O texto-base e o texto editável ficam visíveis no mesmo card, com estado “Texto-base” ou “Editado manualmente”. Toda geração ocorre no navegador e pode ser usada sem conexão.

Depois de uma edição manual, mudanças na atividade ou em suas evidências mostram um alerta sem substituir o texto. “Manter texto atual” conserva a escrita autoral; “Regenerar texto” confirma a substituição pela nova base. A prévia mostra capa, identificação, sumário e todas as seções, inclusive estados vazios claros, sem rotular a introdução como exigência normativa.

Revisão organiza o checklist final nas categorias ERROR, WARNING e INFO, sempre com texto e ícone,
sem depender apenas de cor. Identificação essencial, RSC pretendido, memorial iniciado e conclusão
podem gerar erros que bloqueiam o PDF. Ausência de formação, trajetória, enquadramento, referência
documental ou pontuação disponível gera aviso e permite prosseguir. Cada item leva diretamente à
seção em que pode ser conferido.

Exportar apresenta o horário do último autosave, o estado resumido da revisão e nomes legíveis para
PDF e JSON. O PDF fica indisponível enquanto houver erro; o JSON continua acessível para backup do
projeto válido. A mesma tela permite validar e importar outra cópia JSON como novo projeto local,
sem substituir a cópia aberta.

Os fluxos principais são verificados em 360 × 800 px, 768 × 1024 px e 1440 × 900 px. Sidebar,
cartões, grades, formulários, ações e prévia refluem nesses tamanhos sem criar rolagem horizontal na
página. Conteúdo textual longo pode quebrar dentro do próprio cartão e a prévia A4 reduz sua escala
visual sem alterar o documento produzido.

## Limites transparentes

O progresso é uma aproximação editorial: cinco grupos com o mesmo peso (identificação, formação, trajetória, enquadramento e texto). Não representa pontuação, elegibilidade ou aprovação. A revisão informa completude e riscos documentais, sem substituir a análise do processo.

Critérios e pontuação mostram o estado real do dataset vinculado. O catálogo pendente não gera opções normativas fictícias nem pontuação zero apresentada como resultado. “Cálculo parcial” descreve a indisponibilidade dos dados necessários e não apresenta um subtotal como definitivo. Nenhuma mensagem usa “RSC aprovado”; o dashboard se limita aos requisitos quantitativos. A prévia A4 representa o PDF produzido localmente, sem convertê-lo em documento oficial ou assinado. Referências de comprovantes contêm metadados, sem anexos binários.

A edição avançada JSON permite preservar e alterar todos os campos dos contratos existentes. Arquivos 1.0 não são reinterpretados em formulários tipados. A continuidade em outro navegador exige exportar/importar a cópia, pois os dados são locais.
