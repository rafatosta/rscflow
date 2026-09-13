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
| `/project/:id/preview`      | Prévia A4 paginada do memorial, acessível pela Revisão e pelo menu principal              |
| `/project/:id/documents`    | PDF do memorial, cópia JSON, importação e documentos locais                               |

Rotas anteriores de formação, trajetória, critérios, pontuação, comprovantes, RSCs separados, prévia, exportação e edição técnica foram removidas. Endereços desconhecidos mostram uma página de recuperação. A hospedagem estática precisa de fallback para `index.html`.

## Requisitos

`RequirementsSection` recebe dataset e resultado calculado, sem importar regras ou JSON diretamente. Busca ignora caixa/acentos; código é referência secundária à descrição. Abas funcionam com setas, Home e End. A hierarquia é nível → diretriz → critério → lançamentos.

O formulário recebe o critério escolhido e pede apenas De, Até, quantidade na unidade do catálogo, descrição e arquivo opcionais. Datas civis não determinam quantidade de meses: não existe regra validada de contagem automática. Nenhum peso, fator, limite, unidade ou valor calculado é editável. O catálogo pendente permite pontuação provisória por requisito e lançamento, com aviso de validação humana pendente. O requisito consolida quantidades antes de aplicar o limite do item; os totais do projeto continuam indisponíveis até validar o catálogo. Critérios com conflito normativo explícito não são calculados.

Salvar prepara ocorrência, evidência e descritor no caso de uso e grava os bytes junto com o projeto. Falhas mantêm o formulário. Sem arquivo, o lançamento permanece com pendência e pode ser editado depois. Documentos já cadastrados podem ser compartilhados. Selecionar novamente o mesmo conteúdo recupera seu vínculo local por hash sem duplicar descritores. Registros importados sem enquadramento podem ser associados a um requisito sem perder sua identidade e texto manual.

## Edição e saídas

Dados do docente, formação e memorial usam autosave. Lançamentos usam confirmação de salvar ou cancelar, com proteção de navegação e fechamento do navegador quando há alterações. A tela permanece montada durante a gravação para preservar nível, busca, foco e rascunho em caso de falha.

A preparação do memorial cria as bases ausentes e preserva narrativas manuais. Alterações estruturadas anunciam texto desatualizado; manter ou regenerar é explícito. A projeção editorial incorpora a descrição humana do critério e não persiste uma segunda coleção de atividades.

Revisão separa ERROR, WARNING e INFO. Apenas erros estruturais bloqueiam o PDF. Prévia e arquivo usam o mesmo layout A4 e processamento local. A prévia memoriza sua projeção para não reiniciar a paginação a cada navegação. A disponibilidade dos anexos verifica tamanho e SHA-256 dos bytes, separadamente da validade dos metadados.

O PDF disponível é o memorial; formulários RSC, PDF consolidado de comprovantes e backup binário `.rscflow` não têm ações simuladas. JSON transporta dados e descritores, sem bytes.

## Acessibilidade

Sidebar em desktop e Sheet com foco contido em telas menores; link de salto, título focável após navegação, labels, erros associados, abas por teclado e estado textual além de cor. Formulários usam uma coluna no mobile. A prévia A4 reduz sua escala sem alterar a paginação. Testes axe e reflow cobrem mobile, tablet e desktop.

O controle Aparência no cabeçalho oferece tema claro, escuro ou sincronizado com o sistema, texto
ampliado, contraste reforçado e redução de movimentos. As escolhas são guardadas no `localStorage`
do navegador e aplicadas antes da montagem da interface; não integram nem alteram os projetos.
O painel fecha quando o foco ou a interação segue para fora do controle.

## Padrões visuais

A interface usa tokens compartilhados de página, superfície, contorno, texto e destaque para que os
temas mantenham a mesma hierarquia. Painéis, cartões internos, títulos de seção, links, campos,
botões, avisos, métricas e superfícies sobrepostas têm classes semânticas comuns em
`src/app/globals.css`. Componentes preservam sua composição funcional e não definem uma paleta
própria para estruturas equivalentes.
