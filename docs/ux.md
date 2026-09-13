# Experiência de uso

A interface do RSCFlow abstrai anexos, entidades internas e estruturas técnicas. O usuário preenche requisitos e lançamentos. Pontuação, formulários, Memorial e documentos são projeções do mesmo conjunto de dados. As saídas ainda não implementadas não recebem botões de geração fictícia.

Como o projeto ainda não possui versão pública, compatibilidades de formulário e migrações pré-release podem ser removidas quando não tiverem valor arquitetural.

O fluxo é Projetos → Visão geral → Dados do docente → Requisitos → Memorial → Revisão → Gerar documentos. Formação integra Dados do docente; pontuação aparece como resultado e documentos são anexados dentro dos lançamentos. Prévia é uma ação da Revisão.

## Preenchimento

Crie um projeto escolhendo nível pretendido e regulamento. A visão geral mostra identificação, progresso aproximado, pontuação disponível, documentos e pendências. Progresso de cadastro não significa elegibilidade ou concessão de RSC.

Preencha dados pessoais/funcionais, instituição, requerimento e formação. No núcleo Requisitos, escolha RSC I, II ou III, busque a descrição humana e adicione um lançamento no critério correspondente. O critério não é solicitado novamente. Informe período quando conhecido e quantidade comprovada na unidade exibida. Não há categoria, título obrigatório, fator, peso, limite ou código para preencher.

Anexe um arquivo no mesmo formulário ou salve sem ele e resolva a pendência depois. A opção secundária de documentos existentes permite compartilhamento. Se substituir a comprovação por outro conteúdo, desmarque a referência anterior. Excluir um lançamento preserva documentos compartilhados.

O catálogo de produção está transcrito, mas pendente de validação humana. O registro é provisório; pontos não são presumidos. Divergências internas, inclusive o peso literal 14 de d.5 no RSC II, continuam visíveis e bloqueiam cálculo. Datas não geram contagem normativa de meses por inferência.

## Memorial e revisão

Prepare o memorial com os dados cadastrados. Formação e lançamentos alimentam a narrativa cronológica; introdução e conclusão têm texto inicial editável. Edições manuais são preservadas. Quando uma origem muda, confira a indicação e escolha manter ou regenerar o texto.

A revisão reúne identificação, enquadramento, documentação, resultado quantitativo, memorial e conclusão, com links para corrigir. ERROR bloqueia PDF; WARNING pede conferência; INFO descreve conteúdo encontrado. Arquivo ausente ou inválido é indicado pela verificação local, sem confundir referência declarada com documento disponível.

Abra a prévia A4 na revisão e gere o PDF do memorial em Gerar documentos. A geração de formulários RSC, consolidação de anexos e backup completo `.rscflow` pertence a etapas posteriores e permanece indisponível.

## Dados locais e recuperação

Autosave funciona em dados do docente, formação e memorial. No lançamento, use Salvar ou Cancelar antes de navegar. Falha de gravação preserva o rascunho; conflito entre abas exige conferir a versão salva. Fechar à força pode perder alterações ainda não gravadas.

IndexedDB guarda projetos e anexos neste navegador. Limpar os dados do site pode removê-los. JSON é uma cópia dos dados, sem bytes; depois de importar, anexe novamente o mesmo arquivo para recuperar a disponibilidade. O hash evita duplicação do descritor. A marca do último backup informa que o download foi iniciado, sem garantir gravação no disco.

O menu Aparência permite acompanhar o tema do sistema ou escolher claro/escuro, ampliar o texto,
reforçar o contraste e reduzir movimentos. Essas preferências pertencem ao navegador e não são
incluídas no JSON do processo.

Novos projetos usam 3.0. Leitores portáteis antigos permanecem úteis; ao editar 2.0/2.1, o projeto é convertido para 3.0 no mesmo registro. O formato opaco 1.0 pode ser exportado para consulta, sem formulário experimental. Nenhum dado local é apagado nesta refatoração.
