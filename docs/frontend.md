# Frontend

O shell usa React Router com rotas de histórico do navegador. A aplicação é inteiramente local: as URLs identificam cópias no IndexedDB, não recursos de uma API.

| Rota                      | Conteúdo funcional                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `/`                       | Lista, criação, continuar, duplicação, exclusão confirmada, importação e exportação |
| `/project/:id`            | Visão geral, progresso aproximado e regulamento vinculado                           |
| `/project/:id/profile`    | Título, identificação do docente e RSC pretendido                                   |
| `/project/:id/education`  | CRUD cronológico de formação, aperfeiçoamento e titulação                           |
| `/project/:id/activities` | Timeline, CRUD, busca, filtros e evidências da trajetória profissional              |
| `/project/:id/criteria`   | Exploração somente leitura do catálogo normativo por nível, diretriz e critério     |
| `/project/:id/scoring`    | Resultado do motor ou motivos reais de indisponibilidade                            |
| `/project/:id/memorial`   | Editor por seções e narrativas locais das atividades                                |
| `/project/:id/preview`    | Prévia A4 paginada, navegação e geração local do PDF                                 |
| `/project/:id/review`     | Checklist final por severidade, com correções e avisos                              |
| `/project/:id/export`     | PDF final, JSON portátil, último autosave e importação                              |

O parâmetro `id` corresponde ao `localId` da cópia. Acesso direto carrega o projeto correto mesmo se outro estiver selecionado. Endereços inválidos e projetos ausentes mostram recuperação para a tela inicial. Formatos legados mantêm editor JSON e exportação sem conversão silenciosa.

## Componentes e estado

- `app/App.tsx`: composição do shell, rota ativa e proteção de navegação.
- `components/project-home.tsx`: gestão de projetos locais.
- `components/project-section.tsx`: apresentação e formulários das seções.
- `components/criteria-explorer.tsx`: abas, busca e hierarquia somente leitura do catálogo vinculado.
- `components/criterion-combobox.tsx`: pesquisa e seleção acessível de referência normativa na atividade.
- `components/scoring-dashboard.tsx`: resumo e detalhamento responsivo do resultado produzido pelo motor.
- `components/memorial-section.tsx`: editor de seções e controle das narrativas geradas e manuais.
- `components/pdf-preview.tsx`: navegação pela representação A4 e acionamento do download local.
- `components/final-review.tsx`: resumo e achados ERROR, WARNING e INFO por área revisada.
- `components/final-export.tsx`: ações finais, nomes sugeridos, autosave e importação local.
- `components/ui/`: primitives genéricos Button, Sheet (Radix Dialog) e ConfirmDialog (Radix AlertDialog).
- `features/project-shell/`: interpretação de rotas, criação de rascunhos, projeção do progresso e ligação ao motor existente.
- `memorial/generator.ts`: geração determinística, ordenação e estado dos textos das atividades.
- `memorial/preview.ts`: montagem estruturada independente das regras normativas.

O autosave e a sessão de edição são compartilhados entre seções. React Router bloqueia temporariamente uma mudança de rota enquanto o autosave conclui. Dados inválidos ou falhas mantêm a rota e a edição atuais. Voltar/avançar seguem a mesma proteção.

## Dados do docente

A rota de perfil usa React Hook Form com resolver Zod. Labels permanecem visíveis e os erros são ligados aos campos por `aria-describedby` e `aria-invalid`. CPF e telefone aceitam pontuação durante a edição e são persistidos somente com dígitos; não há máscara que reposicione o cursor. Datas usam controles nativos acessíveis com valor ISO.

Cada alteração com estrutura de rascunho válida alimenta o mesmo autosave do projeto. Erros de completude permanecem visíveis sem criar um segundo estado de domínio. Depois da recarga, o formulário é reconstruído exclusivamente a partir do projeto persistido. Os mesmos campos alimentam a montagem do memorial e futuras saídas em PDF.

## Formação, aperfeiçoamento e titulação

A rota de formação usa cards responsivos em ordem cronológica decrescente, considerando primeiro a conclusão e, na ausência dela, a data inicial. Registros sem datas ficam depois dos datados. A ordenação não altera silenciosamente dados importados; operações de criação, edição e duplicação salvam a coleção já ordenada.

O formulário usa React Hook Form e Zod, com labels visíveis, datas nativas e erros associados por `aria-describedby`. Criar, editar, duplicar e excluir atualizam o projeto pelo autosave compartilhado. A exclusão exige confirmação em AlertDialog. O estado do formulário aberto serve apenas à edição corrente; a lista, a prévia e as exportações derivam do projeto persistido.

## Trajetória profissional

A rota de trajetória usa uma composição ampla com timeline em cards, ordenação cronológica decrescente e agrupamento pelo ano da data final ou, quando ausente, da inicial. Busca textual cobre título, categoria, local, função, descrição, resultados e competências. O filtro de categoria usa apenas as sete categorias editoriais definidas para a interface; não cria enquadramento normativo.

O formulário de atividade usa React Hook Form e Zod, datas nativas, quantidade não negativa e associação por checkboxes às evidências existentes. Em rascunhos 2.1 a referência de critério pode ficar vazia; projetos 2.0 exigem o identificador já previsto pelo contrato. Quando o catálogo vinculado está validado, um combobox pesquisa código, descrição, unidade e diretriz em todos os níveis e mostra o contexto normativo da opção. A atividade persiste a referência, o nível explicitamente escolhido e a quantidade; fator, unidade, peso, limites e descrições continuam exclusivamente no dataset. Edição preserva ID e criação; duplicação gera novo ID e timestamps.

A mesma página gerencia metadados de evidências. Exclusões usam AlertDialog; ao excluir uma evidência, o caso de uso limpa todos os vínculos correspondentes antes do autosave. O estado de busca, filtros e formulários é transitório. Atividades e evidências persistidas continuam sendo a única fonte para lista, memorial, revisão e exportação.

## Exploração de critérios

A rota de critérios abre no nível pretendido pelo projeto e oferece abas RSC I, RSC II e RSC III com navegação por setas, Home e End. A busca ignora diferenças de caixa e acentuação e filtra o nível ativo por código, descrição, unidade ou texto da diretriz. Os resultados preservam a hierarquia nível–diretriz–critério e exibem fator, unidade, quantidade máxima, peso, teto da diretriz e proveniência lidos do objeto normativo carregado.

A tela não edita dados nem executa pontuação. O componente recebe o dataset como entrada, por isso uma alteração de fator ou unidade no JSON aparece sem mudança na implementação. Dataset ausente, pendente ou sem critérios mantém seu estado explícito e não produz opções presumidas no formulário de atividade.

## Dashboard de pontuação

A visão geral inclui um resumo do resultado e suas pendências. A rota de pontuação apresenta os três níveis, total geral, mínimos total e do nível pretendido e o estado textual dos requisitos quantitativos. Cada diretriz usa um elemento expansível com título, pontos, máximo, barra de progresso, quantidade de critérios e experiências utilizados e detalhes das quantidades informada e considerada.

O componente recebe exclusivamente `CalculationResult`. Títulos, tetos, limites, contagens e indicador de teto atingido integram a saída do motor; o JSX não recalcula pontuação nem contém constantes normativas. Experiências acima dos limites continuam armazenadas e disponíveis ao memorial.

Quando catálogo ou política normativa estão pendentes, o dashboard usa “Cálculo parcial”, lista os motivos e omite os valores ainda incalculáveis com um travessão. Limites de uma política já validada podem ser exibidos, mas a ausência de catálogo nunca é convertida em pontuação zero.

## Memorial Descritivo

O editor apresenta título, introdução editorial, seis seções de conteúdo e conclusão. Cada seção aceita texto complementar e reúne as atividades correspondentes em ordem cronológica. Um comando gera somente bases ausentes; edições manuais são persistidas imediatamente e nunca são substituídas por mudanças posteriores nos cadastros.

Quando os dados usados pela última geração mudam, o card anuncia a desatualização e oferece “Manter texto atual” e “Regenerar texto”. Manter atualiza a referência de geração sem alterar a narrativa autoral. Regenerar é a única ação que substitui o texto editado pela nova base. A prévia usa a versão editada, ou a base determinística quando ainda não houve edição, e monta capa/identificação, sumário e todas as seções previstas.

## Prévia A4 e geração do PDF

A edição permanece em `/memorial`; `/preview` apresenta uma página A4 por vez, com comandos para
avançar, retornar, voltar ao editor e gerar o arquivo. A escala visual se adapta à largura da tela
sem alterar as proporções da página. O sumário recebe os números calculados depois da paginação,
e cada seção começa em página própria. Parágrafos podem continuar em novas páginas, sempre dentro
das margens e com indicação de continuação.

O botão “Gerar PDF” executa a montagem em memória e baixa um `application/pdf` com nome derivado do
docente. O arquivo contém capa, sumário, cabeçalhos, rodapés e numeração. Todo o processamento ocorre
no navegador e nenhum dado do memorial sai do dispositivo.

## Revisão e exportação final

A revisão deriva do projeto atual e da saída já calculada pelo motor. Ela cobre identificação, RSC
pretendido, formação, trajetória, enquadramentos, documentação indicada, pontuação, memorial e
conclusão. Cada achado mostra uma severidade textual e um link para a seção correspondente. ERROR
indica ausência que torna o memorial final incompleto; WARNING pede conferência e permite continuar;
INFO confirma o conteúdo encontrado. Pontuação pendente ou requisitos quantitativos ainda não
atingidos são avisos e nunca são reinterpretados como aprovação ou reprovação.

A tela de exportação bloqueia o PDF apenas enquanto houver ERROR. O JSON permanece disponível como
cópia portátil de qualquer projeto estruturalmente válido. A tela mostra o horário do último
autosave, nomes de arquivo derivados do docente e do título, acesso ao checklist e importação de
outra cópia como projeto local separado. A edição avançada do JSON continua disponível.

## Publicação estática

O servidor de arquivos deve encaminhar URLs desconhecidas para `index.html` (fallback de SPA) para permitir recarga direta de `/project/...`. Vite já faz isso em desenvolvimento. Isso não requer backend de dados. Os arquivos exportados são baixados por Blob; não há chamadas remotas para projetos.
