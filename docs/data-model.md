# Modelo de dados

O envelope preserva `schemaVersion`, `applicationVersion`, `regulation: { id, version }` e `userData`.

- `2.0`: contrato atual, com `userData` validado por `rscProjectSchema`. Campos desconhecidos nos modelos tipados são rejeitados para evitar perda silenciosa de dados.
- `1.0`: compatibilidade de leitura por `legacyProjectExportSchema`, preservando integralmente o registro opaco. Não há conversão automática, pois o significado dos campos antigos é desconhecido. Consumidores devem discriminar `schemaVersion` antes de acessar o domínio tipado.

`projectExportSchema` aceita ambas as versões. `currentProjectExportSchema` exige 2.0 para novos produtores. Campos adicionais do envelope e da referência normativa continuam ignorados. A versão normativa declarada não é certificada pela importação. A leitura ocorre localmente em memória, sem gravação, envio ou limite de tamanho; falhas são apresentadas em português.

Os datasets têm versão estrutural 1.0 independente da versão de projeto. A versão normativa permanece null enquanto pendente. Critérios exigem id, code, description, unit, factor, maxQuantity, weight, directiveId e provenance. Diretrizes exigem id, code, title, maxScore e provenance; weight é opcional. Valores numéricos devem ser finitos e não negativos. Ausência normativa não equivale a zero: não cadastrar valores desconhecidos.

## Escolha de enquadramento e política de cálculo

O campo opcional `activities[].selectedLevel` amplia o contrato 2.0 sem migrar arquivos existentes. A ausência permite leitura, mas impede cálculo até uma escolha explícita. IDs únicos evitam reutilização da mesma atividade em níveis distintos; nenhuma escolha é inferida a partir do título ou de comprovantes compartilhados.

`metadata.scoring` é opcional para leitura de datasets anteriores, mas obrigatório e validado para cálculo. Contém mínimos total/no nível pretendido, teto por nível, escopo de limite de quantidade, modo/escopo/precisão de arredondamento e proveniência. Valores e limites podem ser editados em JSON. Modos ou escopos de algoritmo desconhecidos são rejeitados, sem interpretação automática.
