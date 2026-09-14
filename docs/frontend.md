# Frontend

O shell React Router oferece sete seções, com a sessão local acima das rotas. As URLs identificam cópias no IndexedDB, não recursos de uma API.

| Rota                        | Conteúdo                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `/`                         | Projetos, criação, continuar, duplicar, excluir, importar e exportar JSON                 |
| `/project/:id`              | Docente, RSC, progresso editorial, pontuação, documentos, pendências e último backup JSON |
| `/project/:id/profile`      | Dados pessoais/funcionais, instituição, requerimento e formação                           |
| `/project/:id/requirements` | Abas RSC I/II/III, busca, diretrizes, critérios e lançamentos com arquivo opcional        |
| `/project/:id/memorial`     | Texto determinístico, formação e narrativas cronológicas editáveis                        |
| `/project/:id/review`       | Checklist por severidade, pontuação, disponibilidade dos arquivos e ação de prévia A4     |
| `/project/:id/preview`      | Prévia genérica de documentos; inicialmente apresenta o Memorial Descritivo               |
| `/project/:id/documents`    | Memorial, formulários/anexos normativos, comprovantes consolidados e cópia JSON           |

Rotas anteriores de formação, trajetória, critérios, pontuação, comprovantes, RSCs separados, prévia, exportação e edição técnica foram removidas. Endereços desconhecidos mostram uma página de recuperação. A hospedagem estática precisa de fallback para `index.html`.

## Requisitos

`RequirementsSection` recebe dataset e resultado calculado, sem importar regras ou JSON diretamente. Busca ignora caixa/acentos; código é referência secundária à descrição. Abas funcionam com setas, Home e End. A hierarquia é nível → diretriz → critério → lançamentos.

O formulário recebe o critério escolhido e pede apenas De, Até, quantidade na unidade do catálogo, descrição e arquivo opcionais. Datas civis não determinam quantidade de meses: não existe regra validada de contagem automática. Nenhum peso, fator, limite, unidade ou valor calculado é editável. O catálogo pendente permite pontuação provisória por requisito e lançamento, com aviso de validação humana pendente. O requisito consolida quantidades antes de aplicar o limite do item; os totais do projeto continuam indisponíveis até validar o catálogo. Critérios com conflito normativo explícito não são calculados.

Nos cartões de requisitos pendentes, um badge “Não validado” no topo direito substitui a repetição
dos avisos de pontuação provisória e validação oficial. O tooltip associado aparece por mouse ou
foco do teclado; conflitos normativos específicos continuam descritos no corpo do cartão.

Cada cartão organiza título, contexto e referência normativa discreta no cabeçalho, junto do estado
de validação. Pontuação do requisito, valor por unidade, peso e máximo considerado formam quatro
métricas resumidas. Lançamentos permanecem visíveis no corpo; “Adicionar lançamento” e “Ver
lançamentos” encerram o cartão, e a ação secundária leva o foco à lista quando ela existe.

Salvar prepara ocorrência, evidência e descritor no caso de uso e grava os bytes junto com o projeto. Falhas mantêm o formulário. Sem arquivo, o lançamento permanece com pendência e pode ser editado depois. Documentos já cadastrados podem ser compartilhados. Selecionar novamente o mesmo conteúdo recupera seu vínculo local por hash sem duplicar descritores. Registros importados sem enquadramento podem ser associados a um requisito sem perder sua identidade e texto manual.

## Edição e saídas

Dados do docente, formação e memorial usam autosave. Lançamentos usam confirmação de salvar ou cancelar, com proteção de navegação e fechamento do navegador quando há alterações. A tela permanece montada durante a gravação para preservar nível, busca, foco e rascunho em caso de falha.

Escolaridade, tipo de formação e situação da formação usam seletores alimentados pelos vocabulários
do domínio. Valores desconhecidos de arquivos antigos são exibidos como legados, sem oferecer texto
livre nem promover esses valores à lista controlada.

A preparação do memorial cria as bases ausentes e preserva narrativas manuais. Alterações estruturadas anunciam texto desatualizado; manter ou regenerar é explícito. A projeção editorial incorpora a descrição humana do critério e não persiste uma segunda coleção de atividades.

Revisão separa ERROR, WARNING e INFO e apresenta a prontidão de cada artefato. Erros estruturais
bloqueiam o Memorial; arquivos ausentes ou inválidos bloqueiam somente as saídas que dependem dos
bytes íntegros. Cálculo indisponível, catálogo provisório e ausência de comprovantes aparecem como
limitações explícitas nos documentos que ainda podem ser gerados. A mesma projeção controla os
cartões de Gerar documentos. Prévia e arquivo usam o mesmo layout A4 e processamento local.

A Prévia de Documentos compõe mapa de páginas, visualizador e painel contextual genéricos. O
Memorial fornece páginas, metadados, estado e ações por um adaptador, preservando a mesma projeção
A4 do arquivo final. Formulários normativos e comprovantes consolidados fornecem os bytes já
produzidos por seus geradores e podem ser selecionados na mesma página. Página selecionada, zoom e modo de visualização possuem estado único; em telas
menores, mapa e contexto tornam-se áreas recolhíveis. A prévia memoriza sua projeção para não
reiniciar a paginação a cada navegação. A disponibilidade dos anexos verifica tamanho e SHA-256 dos
bytes, separadamente da validade dos metadados.

Em Documentos comprobatórios, cada arquivo local ausente oferece no próprio item ações para os
lançamentos que o referenciam. A ação abre diretamente o seletor nativo e, após a escolha, substitui
a referência da evidência e grava os bytes na transação existente, sem navegar ou exigir outra
confirmação. Evidências compartilhadas preservam todos os lançamentos vinculados.

O Memorial e os formulários normativos dos Anexos II a VII são gerados localmente. Os formulários
consomem os dados do docente, o enquadramento, a projeção do motor e o mapa derivado da consolidação;
campos não registrados permanecem vazios e são expostos como diagnósticos na projeção. A condição
provisória ou indisponível da pontuação é apresentada no documento. O PDF consolidado dos comprovantes tem download individual, com validação prévia de arquivos
ausentes, inválidos ou incompatíveis e aviso quando não há comprovantes vinculados. Apenas o
Memorial depende da conclusão e da estrutura editorial; formulários dependem da identificação
e do nível solicitado. Estados e limitações aparecem no cartão de cada artefato. O backup
restaurável `.rscflow` preserva dados e bytes, enquanto o JSON portátil continua transportando
somente dados e descritores.

A ação “Gerar pacote final” usa uma única fotografia do projeto, consolida os comprovantes antes dos
documentos que contêm referências e disponibiliza um ZIP somente após o sucesso integral. O pacote
mantém Memorial, formulários e comprovantes como PDFs independentes com nomes estáveis. Uma falha
mantém o pacote indisponível e apresenta separadamente quais etapas produziram bytes, quais falharam
e quais não foram iniciadas.

## Acessibilidade

Sidebar em desktop e Sheet com foco contido em telas menores; link de salto, título focável após navegação, labels, erros associados, abas por teclado e estado textual além de cor. Formulários usam uma coluna no mobile. A prévia A4 reduz sua escala sem alterar a paginação. Testes axe e reflow cobrem mobile, tablet e desktop.

O controle Aparência no cabeçalho oferece tema claro, escuro ou sincronizado com o sistema, texto
ampliado, contraste reforçado e redução de movimentos. As escolhas são guardadas no `localStorage`
do navegador e aplicadas antes da montagem da interface; não integram nem alteram os projetos.
O painel fecha quando o foco ou a interação segue para fora do controle. A troca de tema atualiza
somente os tokens visuais da aplicação, sem solicitar ao renderer uma mudança dinâmica do esquema
nativo de cores.

## Padrões visuais

O conteúdo das páginas ocupa toda a largura disponível ao lado da navegação, sem largura máxima,
com recuos laterais mínimos de 0,75 rem no contêiner principal, em mobile, tablet e desktop.

A interface usa tokens compartilhados de página, superfície, contorno, texto e destaque para que os
temas mantenham a mesma hierarquia. Painéis, cartões internos, títulos de seção, links, campos,
botões, avisos, métricas e superfícies sobrepostas têm classes semânticas comuns em
`src/app/globals.css`. Componentes preservam sua composição funcional e não definem uma paleta
própria para estruturas equivalentes.
