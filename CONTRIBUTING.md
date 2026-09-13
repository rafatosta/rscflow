# Como contribuir

Leia [AGENTS.md](AGENTS.md) e use o
[mapa de documentação](docs/ai/documentation-map.md) antes de alterar o projeto. O fluxo detalhado
está em [docs/development-workflow.md](docs/development-workflow.md).

1. Confirme o estado da árvore de trabalho e identifique as camadas afetadas.
2. Para regras ou dados normativos, confira as fontes e a proveniência antes de implementar.
3. Faça uma alteração coesa na camada responsável, sem copiar regras para React.
4. Acrescente teste para toda mudança de comportamento e atualize a documentação e o changelog.
5. Execute a bateria completa de qualidade e relate qualquer verificação não executada.

Dados normativos seguem a prioridade: instrução atual do mantenedor, resolução oficial,
JSON validado, documentação e código. A resolução prevalece quando divergir da planilha ou
do JSON; registre a diferença e as fontes. Se a própria resolução for ambígua, não escolha uma
interpretação: mantenha o dado pendente e solicite decisão do mantenedor.

Não adicione backend, transmissão de dados pessoais, regra por código específico de item, valor
normativo em componente, funcionalidade fictícia, `TODO`, `FIXME` ou stub. Dados ausentes não valem
zero. Uma mudança de valor normativo deve ser feita no JSON versionado e acompanhada por
proveniência e regressão baseada na fonte.

Commits seguem Conventional Commits, com descrição e corpo em português e tipos padronizados:
`type(escopo): descrição`. Mantenha mudanças pequenas e focadas. Agentes não criam commits sem
autorização explícita do mantenedor.
