# Fluxo de desenvolvimento

Todo agente ou desenvolvedor segue esta sequência:

1. Leia `AGENTS.md`, inspecione a árvore de trabalho e leia os documentos ligados à mudança.
2. Delimite as camadas afetadas. Se houver regra ou dado normativo, confira a resolução e a
   proveniência antes de editar.
3. Implemente na camada responsável. Valores normativos ficam nos JSONs; regras determinísticas em
   `rules`; persistência em `storage`; casos de uso em `features`; React apenas compõe e apresenta.
4. Acrescente ou ajuste o teste correspondente a toda mudança de comportamento. Use fixture
   sintética para comportamento genérico e recorte citado para regressão normativa.
5. Atualize documentação e `CHANGELOG.md` quando o comportamento, contrato, arquitetura, fonte ou
   procedimento mudar.
6. Execute a mesma bateria do CI, confira o diff e relate resultados e limitações.
7. Sugira um Conventional Commit em português. Não crie o commit sem autorização explícita.

## Alterações normativas

A prioridade é instrução atual do mantenedor, resolução oficial, planilha oficial, JSON validado,
documentação e código. A resolução prevalece sobre divergências com a planilha ou o JSON e a
divergência deve ser documentada. Uma ambiguidade interna da resolução permanece pendente; não se
infere seu significado. O procedimento de edição e validação está em `docs/rsc-regulation.md`.

Uma correção de valor dentro do contrato existente deve exigir somente edição do JSON, proveniência,
teste regulatório e documentação. Se for necessário alterar TypeScript para reconhecer o código de
um item, a solução viola a arquitetura. Mudanças no formato do dataset ou do projeto exigem schema,
compatibilidade documentada e testes de importação/exportação.

## Validação local

Antes de solicitar revisão, execute:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run test:e2e
git diff --check
```

O Playwright inicia o Vite com `--mode e2e`. Esse modo troca apenas o carregador de datasets por uma
implementação de suporte que acrescenta a fixture sintética de
`tests/fixtures/criteria-regulation.json`. Builds comuns usam somente `src/data/regulations/`. O
servidor E2E não reutiliza outra instância local.

Todos os Playwright falham diante de exceção de página, `console.error` ou `console.warning`
inesperado. Investigue a causa em vez de criar uma exceção sem justificativa externa documentada.
`tests/unit/architecture.test.ts` protege dependências de camada, ausência de rede e ausência de
marcadores de funcionalidade incompleta.

Ao concluir, informe cada comando executado, quantidade de testes quando disponível e warnings que
não representem falha. Use `npm run format` para formatar o repositório inteiro ou Prettier nos
arquivos alterados. Revise `git diff` e `git diff --check` antes de sugerir a mensagem descrita em
`docs/commit-convention.md`.
