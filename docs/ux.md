# Experiência de uso

A tela inicial prioriza criar ou continuar um memorial. Cada cartão mostra título, RSC pretendido, última alteração e preenchimento aproximado, além de continuar, duplicar, exportar e excluir. Exclusão exige confirmação em diálogo; cancelar mantém a cópia. Importações sempre criam uma cópia local separada.

A criação pede somente RSC pretendido e regulamento/dataset. Título inicial é um rótulo de interface editável. Nome do docente e enquadramento podem estar ausentes em rascunhos 2.1. O catálogo pendente é identificado como tal e sua versão normativa permanece null.

## Organização e responsividade

Em desktop (a partir de 1024 px), a sidebar fixa apresenta as seções. Em telas menores, o botão de menu abre um Sheet modal com foco contido, fechamento por Escape e retorno ao acionador. O cabeçalho mantém exportação e estado do autosave acessíveis; em telas estreitas, o estado ocupa uma segunda linha. Formulários e cartões se reorganizam sem exigir rolagem horizontal.

Há link para pular ao conteúdo, título de página atualizado, foco no título após navegação e indicação `aria-current` da seção ativa. Estados de salvamento usam região viva. Inputs têm rótulos e estados vazios explicam a próxima ação disponível.

## Limites transparentes

O progresso é uma aproximação editorial: cinco grupos com o mesmo peso (identificação, formação, trajetória, enquadramento e texto). Não representa pontuação, elegibilidade ou aprovação. Revisão apenas ajuda a localizar campos ainda não preenchidos.

Critérios e pontuação mostram o estado real do dataset vinculado. O catálogo pendente não gera opções normativas fictícias nem pontuação zero apresentada como resultado. A prévia é textual, não um PDF oficial; a exportação disponível é JSON. Referências de comprovantes contêm metadados, sem anexos binários.

A edição avançada JSON permite preservar e alterar todos os campos dos contratos existentes. Arquivos 1.0 não são reinterpretados em formulários tipados. A continuidade em outro navegador exige exportar/importar a cópia, pois os dados são locais.
