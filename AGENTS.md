# Projeto: rscflow

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Base UI (primitivos do shadcn/ui)

## Estrutura

Use a estrutura existente do projeto. Como referência:
```text
src/
├── components/    # componentes próprios do projeto
├── components/ui/ # componentes shadcn/ui
├── assets/        # imagens e arquivos estáticos
└── index.css      # estilos globais
```

## Regras de interface

- Use Base UI como biblioteca de primitivos para componentes shadcn/ui. Não adicione ou use Radix UI em novos componentes.
- Para todo elemento de interface, procure primeiro um componente oficial do shadcn/ui.
- Se ele não estiver instalado, adicione-o pela CLI do shadcn/ui.
- Não recrie componentes existentes do shadcn/ui e não crie um design system paralelo.
- Crie um componente próprio somente quando não houver equivalente no shadcn/ui ou quando for necessária uma composição específica e reutilizável.
- Componentes próprios devem ser formados prioritariamente pela combinação de componentes oficiais do shadcn/ui.
- Se não existir componente shadcn/ui aplicável, use HTML semântico e Tailwind CSS, mantendo os padrões visuais já configurados: cores, tipografia, espaçamentos, bordas, raios e estados.
- Ao implementar uma página a partir de mockup ou imagem, reutilize os componentes existentes e preserve a consistência visual do projeto.
- Mantenha a alteração limitada ao pedido. Não crie RFC, documentação extra ou arquitetura nova sem solicitação.

## Commits

Use Conventional Commits em português:
```text
tipo(escopo): descrição curta
```

Exemplo:
```text
feat(perfil): cria página de configurações
```
