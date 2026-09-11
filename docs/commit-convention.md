# Convenção de commits

Use Conventional Commits com tipo padronizado e descrição em português:

```text
type(escopo): descrição no imperativo
```

Tipos usuais: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build` e `ci`. O escopo identifica
a camada ou o módulo, como `rules`, `storage`, `memorial`, `pdf` ou `docs`. A primeira linha deve ser
curta e descrever o resultado. No corpo, também em português, explique a motivação, decisões
normativas relevantes e validações quando isso ajudar a revisão. Marque ruptura com `!` e um rodapé
`BREAKING CHANGE:` quando aplicável.

Exemplos:

- `feat(import): adiciona validação local de projetos`
- `fix(rules): aplica arredondamento somente ao total final`
- `docs(arquitetura): consolida contratos de manutenção`

Não misture mudanças independentes no mesmo commit. A decisão do mantenedor de 10/09/2026 substitui
a orientação anterior em inglês. Agentes sugerem a mensagem ao final e nunca criam o commit sem
autorização explícita do mantenedor.
