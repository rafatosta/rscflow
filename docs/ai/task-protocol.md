# Protocolo de tarefas

## Interpretação e execução

1. Preserve o objetivo, o escopo e as restrições expressas pelo usuário ou mantenedor.
2. Classifique a tarefa como localizada ou composta e identifique as áreas afetadas.
3. Selecione o contexto mínimo por `documentation-map.md` e confira o estado observável do
   repositório antes de editar.
4. Decomponha tarefas compostas em unidades verificáveis, respeitando suas dependências.
5. Implemente até concluir o objetivo, sem incorporar melhorias incidentais ao escopo.
6. Siga o fluxo de testes, documentação, changelog e finalização definido em
   `../development-workflow.md`.

Pergunte ao usuário ou mantenedor somente quando uma decisão necessária tiver alternativas materialmente
diferentes e nenhuma fonte autoritativa resolver a dúvida. Em especial, não interprete lacunas ou
ambiguidades da resolução normativa.

## Reconciliação documental de alteração existente

Quando o pedido se referir a um commit, intervalo, pull request ou diff já implementado:

1. fixe a referência Git que delimita a análise;
2. trate o diff e os testes como evidência do que foi implementado, sem presumir intenção permanente;
3. leia apenas a documentação das áreas afetadas;
4. classifique o resultado como: sem impacto documental, correção, complemento, nova decisão com
   evidência suficiente, intenção indefinida ou divergência entre implementação e intenção;
5. atualize somente os documentos realmente afetados e não altere código funcional;
6. prefira uma mudança documental separada para preservar autoria e rastreabilidade.

Uma reconciliação pode concluir legitimamente que nenhuma atualização é necessária. Quando houver
conflito, use `decision-policy.md` e registre a pendência sem inventar uma regra.
