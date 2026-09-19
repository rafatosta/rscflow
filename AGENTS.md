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
- Use os tokens semânticos do tema shadcn (`background`, `foreground`, `primary`, `secondary`, `muted`, `border`, `destructive` e derivados) para cores e estados visuais. Não use paletas fixas do Tailwind, como `slate-*`, `indigo-*`, `blue-*` ou `red-*`, em componentes da aplicação.
- Prefira as variantes padrão dos componentes shadcn/ui. Use `className` apenas para estrutura e layout (dimensões, espaçamento, grade e posicionamento), sem sobrescrever cores, bordas, fundos, hover ou foco definidos pelo componente.
- Para alertas, indicadores, badges, progresso e elementos similares, adicione e componha o componente oficial shadcn/ui correspondente em vez de recriá-lo com elementos HTML e classes de cor.
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
