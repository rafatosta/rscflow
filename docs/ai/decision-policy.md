# Política de decisões e divergências

## Autoridade

Uma instrução atual do mantenedor prevalece sobre a documentação local. No domínio normativo, siga
a ordem registrada em `../../AGENTS.md` e o procedimento de `../rsc-regulation.md`. A planilha auxiliar
não decide conflitos com a resolução.

## Classificação

Quando documentação, implementação, testes ou fontes divergirem, classifique o caso antes de agir:

- documentação obsoleta;
- implementação divergente da intenção documentada;
- dívida técnica conhecida;
- decisão ambígua que exige o mantenedor;
- divergência normativa, com fonte e estado de validação explícitos.

Código e testes comprovam o estado implementado, mas não substituem automaticamente uma decisão
documentada. Documentação pode registrar intenção ainda não implementada, mas deve distinguir esse
estado do comportamento vigente.

## Registro permanente

Registre uma decisão quando ela alterar fronteira arquitetural, dependência significativa, contrato
público ou persistente, política de privacidade/compatibilidade ou resolver uma ambiguidade relevante
com autoridade suficiente. Detalhes locais inferíveis do código não exigem registro separado.

Planos concluídos e decisões superadas com valor histórico pertencem a `../maintainers/history/`.
Uma decisão necessária sem fonte autoritativa permanece pendente; não complete a lacuna por
inferência.
