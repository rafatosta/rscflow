# Contrato do agente do RSCFlow

Este arquivo é a porta de entrada e o roteador de contexto do projeto.

## Antes de alterar

1. Preserve a solicitação do usuário ou mantenedor como objetivo principal.
2. Leia `docs/ai/task-protocol.md`.
3. Inspecione o estado do Git e preserve mudanças não relacionadas.
4. Identifique as áreas afetadas e consulte somente os documentos indicados em
   `docs/ai/documentation-map.md`.

## Invariantes

- Não invente, complete, ajuste nem reinterprete regra normativa ausente ou ambígua.
- A prioridade das fontes é: instrução atual do mantenedor, resolução oficial, JSON normativo
  validado, documentação e código. A resolução prevalece sobre a planilha auxiliar e o JSON; toda
  divergência deve ser registrada com suas fontes.
- Domínio, regras, persistência, interface, memorial e PDF permanecem separados. Componentes React
  não contêm valores nem critérios normativos.
- Catálogos de produção pendentes continuam indisponíveis para pontuação. Fixtures sintéticas são
  exclusivas de testes; o catálogo E2E só pode ser injetado no modo Vite `e2e`.
- Toda mudança de comportamento exige teste correspondente. Não deixe `TODO`, stub ou
  funcionalidade deliberadamente incompleta.
- Não crie commit sem autorização explícita do mantenedor.

## Conclusão

Siga `docs/development-workflow.md`, atualize documentação e `CHANGELOG.md` quando aplicável e
execute lint, typecheck, testes aplicáveis, build e E2E aplicável. Relate toda validação não
executada. Para commits, consulte `docs/commit-convention.md` e sugira uma mensagem em português no
formato `type(escopo): descrição`.

O contexto do projeto e o roteamento completo estão em `docs/ai/project-context.md` e
`docs/ai/documentation-map.md`. Não leia toda a documentação por padrão.
