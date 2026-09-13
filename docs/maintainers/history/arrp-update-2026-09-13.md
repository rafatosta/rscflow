# Atualização incremental ARRP — 13/09/2026

## Modo e fontes

Migração anterior detectada pelo `AGENTS.md`, `docs/ai/` e pela auditoria de 12/09/2026. O cenário
continua sendo documentação suficiente. A árvore Git estava limpa antes desta atualização.

O ZIP ARRP fornecido identifica a revisão `f6640870e96714a6eba0bd0334a6a9306b2d4040`. A leitura começou
por `MIGRATION.md`, seguida da política de atualização, prompt, checklist, plano, pré-requisitos e
política consultiva de modelos. O pacote foi usado como especificação; o pedido do mantenedor
delimitou a execução documental no RSCFlow, sem alteração funcional.

## Responsabilidades preservadas

- `AGENTS.md` pequeno, com invariantes estáveis e roteamento;
- contexto mínimo e mapa de leitura sob demanda;
- interpretação e decomposição de tarefas;
- política de decisões, divergências e lacunas;
- workflow, testes, changelog e autorização explícita para commits;
- reconciliação documental posterior de commits, intervalos, PRs e diffs;
- públicos documentais identificados e plano antigo preservado como histórico.

A restrição a calcular com catálogos pendentes no bootstrap é uma regra condicional permanente,
não uma declaração de status de uma versão específica. Por isso foi preservada. Não foram movidos
nem renomeados documentos já adequados, e o relatório anterior não foi reescrito.

## Delta aplicado

- recomendação consultiva de capacidade A–D integrada a `../../ai/task-protocol.md`, com
  classificação por etapa e escolha de modelo pertencente ao usuário;
- roteamento dessa responsabilidade acrescentado a `../../ai/documentation-map.md`;
- referência obsoleta a `tests/e2e/criterion-entry.spec.ts` corrigida para
  `../../../tests/e2e/requirements.spec.ts` em `../../development-workflow.md`;
- matriz operacional de `../../testing.md` reconciliada com a árvore atual; a versão anterior foi
  preservada em `testing-before-arrp-update-2026-09-13.md`;
- changelog atualizado e este registro criado.

Nenhuma regra normativa, dependência, schema, teste ou arquivo funcional foi alterado. Não foi
criada uma política específica de nomes de modelos: as classes genéricas satisfazem a
responsabilidade consultiva e evitam um mapeamento temporal sem decisão local do mantenedor.

## Evidências e pendências

Observado: documentos locais, `../../../package.json`, CI e a árvore de testes sustentam o mapa,
os comandos e as responsabilidades existentes. A correção da referência E2E se baseou na suíte
atual de Requisitos e na remoção das suítes antigas já registrada em `../../testing.md`.

As referências legadas a `tests/e2e/full-journey.spec.ts`, `tests/e2e/shell.spec.ts` e testes de
trajetória foram classificadas como documentação obsoleta. A versão integral foi arquivada, e o
documento operacional agora descreve somente as suítes existentes e a transferência de cobertura
para o fluxo simplificado.

As pendências normativas continuam em `../../rsc-regulation.md`. Nenhuma nova interpretação ou
decisão normativa foi inferida. Não há decisão humana necessária para aplicar o delta documental.
