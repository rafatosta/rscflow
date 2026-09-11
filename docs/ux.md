# Experiência de uso

A tela inicial prioriza criar ou continuar um memorial. Cada cartão mostra título, RSC pretendido, última alteração e preenchimento aproximado, além de continuar, duplicar, exportar e excluir. Exclusão exige confirmação em diálogo; cancelar mantém a cópia. Importações sempre criam uma cópia local separada.

A criação pede somente RSC pretendido e regulamento/dataset. Título inicial é um rótulo de interface editável. Nome do docente e enquadramento podem estar ausentes em rascunhos 2.1. O catálogo pendente é identificado como tal e sua versão normativa permanece null.

## Organização e responsividade

Em desktop (a partir de 1024 px), a sidebar fixa apresenta as seções. Em telas menores, o botão de menu abre um Sheet modal com foco contido, fechamento por Escape e retorno ao acionador. O cabeçalho mantém exportação e estado do autosave acessíveis; em telas estreitas, o estado ocupa uma segunda linha. Formulários e cartões se reorganizam sem exigir rolagem horizontal.

Há link para pular ao conteúdo, título de página atualizado, foco no título após navegação e indicação `aria-current` da seção ativa. Estados de salvamento usam região viva. Inputs têm rótulos e estados vazios explicam a próxima ação disponível.

Na seção Dados do docente, nome completo, CPF, SIAPE, campus de lotação e RSC pretendido aparecem como obrigatórios para concluir a etapa. Os demais campos mostram explicitamente “opcional”. Mensagens de CPF, e-mail, telefone e datas aparecem junto ao campo e são anunciáveis por tecnologia assistiva. A digitação não é interrompida por máscaras automáticas.

Formação apresenta um estado vazio que orienta o primeiro cadastro e, depois, cards do registro mais recente para o mais antigo. Em telas estreitas, campos, detalhes e ações passam para uma coluna sem rolagem horizontal. Tipo, curso ou título, instituição e situação são marcados como obrigatórios; os demais campos são identificados como opcionais. Erros ficam associados ao respectivo controle. Exclusão exige confirmação. A edição mantém o ID; a duplicação cria um novo registro com ID próprio.

Trajetória apresenta busca e filtro por categoria antes da timeline. Atividades com datas são agrupadas pelo ano e aparecem da mais recente para a mais antiga; registros sem período ficam no grupo “Sem data”. Quando nenhum item corresponde aos filtros, uma mensagem anuncia o resultado vazio. O cadastro amplo permanece na própria página e se reorganiza em uma coluna em telas estreitas.

Atividades mostram quantidade, período, local, função, textos, competências, critério declarado e evidências vinculadas. A tela informa que o critério não é inferido pela categoria. Em catálogo validado, o critério é localizado por termos comuns, código, unidade ou diretriz; a opção expõe nível e contexto antes da escolha. O combobox anuncia expansão, lista e opção ativa, aceita setas, Enter e Escape e permite limpar a escolha. Em catálogo pendente, permanece desabilitado com o motivo visível. Evidências são cadastradas como metadados, com tipo e título obrigatórios, e vinculadas por checkboxes. Exclusões exigem confirmação; a confirmação de uma evidência também explica que seus vínculos serão removidos.

Critérios organiza o catálogo em abas RSC I, RSC II e RSC III, abertas inicialmente no nível pretendido. Setas laterais, Home e End movem o foco e ativam as abas. A busca tolera caixa e acentuação, para que termos como “comissão”, “coordenação”, “curso”, “palestra”, “artigo”, “projeto”, “estágio” e “TCC” encontrem as descrições disponíveis sem memorização de códigos. Cada resultado permanece sob sua diretriz e expõe os valores e a proveniência do JSON. A página é somente leitura.

## Limites transparentes

O progresso é uma aproximação editorial: cinco grupos com o mesmo peso (identificação, formação, trajetória, enquadramento e texto). Não representa pontuação, elegibilidade ou aprovação. Revisão apenas ajuda a localizar campos ainda não preenchidos.

Critérios e pontuação mostram o estado real do dataset vinculado. O catálogo pendente não gera opções normativas fictícias nem pontuação zero apresentada como resultado. A prévia é textual, não um PDF oficial; a exportação disponível é JSON. Referências de comprovantes contêm metadados, sem anexos binários.

A edição avançada JSON permite preservar e alterar todos os campos dos contratos existentes. Arquivos 1.0 não são reinterpretados em formulários tipados. A continuidade em outro navegador exige exportar/importar a cópia, pois os dados são locais.
