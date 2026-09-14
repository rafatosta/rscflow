# Contexto do RSCFlow

## Propósito e escopo

O RSCFlow é uma aplicação web local para docentes do IFBA organizarem o processo de Reconhecimento
de Saberes e Competências. Mantém projetos e comprovantes no navegador, calcula somente com dados
normativos validados e gera JSON, memorial e PDF localmente. Não possui backend, autenticação,
telemetria nem transmissão de dados pessoais.

O estado funcional e as orientações para usuários pertencem ao `../../README.md`. Instalação e
manutenção começam em `../technical-guide.md`. Arquitetura, domínio, persistência, regulação,
interface e testes têm documentos especializados apontados por `documentation-map.md`.

## Stack observada

- TypeScript, React 19 e Vite 7;
- Zod para schemas, Dexie/IndexedDB para persistência local e pdf-lib para PDF;
- Vitest e Testing Library para testes unitários e de integração;
- Playwright e axe-core para E2E, acessibilidade e responsividade;
- npm e Node.js 22 ou superior, conforme `../../package.json` e CI.

## Fontes de verdade

Para regras normativas, a prioridade é: instrução atual do mantenedor, resolução oficial, JSON
normativo validado, documentação e código. A resolução é a única fonte normativa oficial; a
planilha em `docs/ifba/` é material informal auxiliar. Divergências devem ser registradas e
ambiguidades internas da resolução não podem ser resolvidas por inferência.

Para o estado implementado, código, schemas, testes e configuração são evidências observáveis. A
documentação também registra intenção e decisões; conflitos devem ser classificados antes de
qualquer correção, conforme `decision-policy.md`.

## Restrições permanentes

As fronteiras de camada e a situação do catálogo normativo constam em `../../AGENTS.md`. Detalhes e
procedimentos pertencem a `../architecture.md` e `../rsc-regulation.md`.
