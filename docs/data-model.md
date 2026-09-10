# Modelo de dados

O envelope preserva `schemaVersion`, `applicationVersion`, `regulation: { id, version }` e `userData`.

- `2.0`: contrato atual, com `userData` validado por `rscProjectSchema`. Campos desconhecidos nos modelos tipados são rejeitados para evitar perda silenciosa de dados.
- `1.0`: compatibilidade de leitura por `legacyProjectExportSchema`, preservando integralmente o registro opaco. Não há conversão automática, pois o significado dos campos antigos é desconhecido. Consumidores devem discriminar `schemaVersion` antes de acessar o domínio tipado.

`projectExportSchema` aceita ambas as versões. `currentProjectExportSchema` exige 2.0 para novos produtores. Campos adicionais do envelope e da referência normativa continuam ignorados. A versão normativa declarada não é certificada pela importação. A verificação do arquivo ocorre em memória, sem envio ou limite de tamanho. O botão de importação grava uma nova cópia local após validação; falhas são apresentadas em português.

Os datasets têm versão estrutural 1.0 independente da versão de projeto. A versão normativa permanece null enquanto pendente. Critérios exigem id, code, description, unit, factor, maxQuantity, weight, directiveId e provenance. Diretrizes exigem id, code, title, maxScore e provenance; weight é opcional. Valores numéricos devem ser finitos e não negativos. Ausência normativa não equivale a zero: não cadastrar valores desconhecidos.

## Escolha de enquadramento e política de cálculo

O campo opcional `activities[].selectedLevel` amplia o contrato 2.0 sem migrar arquivos existentes. A ausência permite leitura, mas impede cálculo até uma escolha explícita. IDs únicos evitam reutilização da mesma atividade em níveis distintos; nenhuma escolha é inferida a partir do título ou de comprovantes compartilhados.

`metadata.scoring` é opcional para leitura de datasets anteriores, mas obrigatório e validado para cálculo. Contém mínimos total/no nível pretendido, teto por nível, escopo de limite de quantidade, modo/escopo/precisão de arredondamento e proveniência. Valores e limites podem ser editados em JSON. Modos ou escopos de algoritmo desconhecidos são rejeitados, sem interpretação automática.

## Persistência local e portabilidade

O banco IndexedDB `rscflow`, gerenciado por Dexie, tem versão estrutural 1. `projects` armazena `{ localId, revision, createdAt, updatedAt, project }`; `preferences` guarda o projeto ativo. Esta versão de banco não é a versão do envelope nem a versão normativa.

`localId` é a chave da cópia no navegador. Importações repetidas recebem chaves locais diferentes sem alterar o envelope original. Duplicação de um projeto 2.0 gera também um novo `userData.id` e acrescenta “(cópia)” ao título; demais dados e referências são preservados. Duplicação legada mantém o conteúdo opaco integralmente.

Atualização e exclusão conferem a revisão dentro de transação: uma aba desatualizada não sobrescreve nem recria dados excluídos. A seleção ativa sobrevive à recarga e é removida junto com o projeto excluído. Datas e revisões locais não são exportadas.

Exportação inclui o envelope completo, preservando schemaVersion, applicationVersion, regulation.id/version e todos os dados editáveis. Importação suporta 1.0 e 2.0, sem migração implícita, e rejeita versões desconhecidas. Valores não representáveis em JSON (como undefined, números não finitos e objetos Date em dados legados programáticos) são rejeitados em vez de perdidos silenciosamente. Evidências contêm os metadados definidos no domínio; não há anexação de arquivos binários nesta etapa.

Novos projetos exigem a referência normativa declarada pelo usuário. O catálogo pendente não recebe versão normativa inventada. A tela oferece edição integral de userData em JSON, com validação antes de gravar. JSON inválido permanece na tela e não substitui a última versão válida.

Autosave aguarda 500 ms após a última edição válida. Trocar de projeto, criar, duplicar ou excluir conclui a gravação pendente antes de prosseguir. Salvando/salvo/erro refletem a fila de gravação; erros preservam o rascunho para nova tentativa ou exportação. Em conflito, é possível exportar o rascunho e reabrir explicitamente a versão salva. Exportar não depende do funcionamento do IndexedDB.

O navegador pode remover IndexedDB ao limpar dados ou encerrar sessões privadas. `visibilitychange` tenta antecipar a gravação e `beforeunload` sinaliza alterações pendentes, mas encerramento forçado não garante salvar os últimos instantes de edição. Aguarde “Salvo localmente” antes de recarregar e exporte cópias para transporte/backup. Nenhum dado é enviado a serviços remotos.
