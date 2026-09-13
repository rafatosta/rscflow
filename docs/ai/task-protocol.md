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

## Recomendação consultiva de capacidade

Classifique cada etapa pela complexidade antes de executar. As recomendações abaixo orientam
capacidade e esforço, sem exigir um modelo específico ou bloquear o trabalho:

| Classe                   | Escopo típico                                                         | Capacidade e raciocínio recomendados |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------ |
| A — localizada           | texto, estilo ou documentação pontual                                 | leve; esforço baixo                  |
| B — funcional            | formulário, CRUD ou correção delimitada                               | intermediária; esforço baixo/médio   |
| C — transversal          | várias camadas, persistência ou migração de schema                    | avançada; esforço médio              |
| D — arquitetural/ambígua | investigação difícil, decisões estruturais ou requisitos conflitantes | maior capacidade; esforço médio/alto |

Uma migração documental completa normalmente é transversal. Atualizações incrementais e
reconciliações de commits ou diffs devem ser classificadas pelo impacto real, sem presumir a mesma
complexidade da migração inicial.

Se a capacidade atual atender à tarefa ou superar a recomendação, continue. Se estiver abaixo,
informe a limitação e continue quando tecnicamente possível. Impossibilidade técnica real deve ser
explicada. A escolha do modelo pertence ao usuário; não troque modelo nem crie pausas obrigatórias
apenas pela recomendação.

Em tarefas compostas, classifique por etapa e informe a estratégia no início. Quando as etapas
recomendarem capacidades diferentes, apresente a possibilidade de execução contínua ou pausas
planejadas; preserve a execução contínua enquanto o usuário não escolher pausas.

## Ambiguidade

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
