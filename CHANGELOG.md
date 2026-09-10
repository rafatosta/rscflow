# Changelog

This project follows Keep a Changelog and Semantic Versioning.

## [Unreleased]

### Added

- Persistência de múltiplos projetos em IndexedDB/Dexie com CRUD, duplicação e recuperação do projeto ativo.
- Autosave com debounce, fila serial, estados visuais e detecção de conflitos entre abas.
- Importação/exportação JSON portátil dos schemas 1.0 e 2.0, editor validado e proteção de rascunhos em falhas.
- Testes de persistência e autosave com fake-indexeddb e transporte entre contextos de navegador no E2E.

- Motor puro de pontuação com fator/peso, limites compartilhados, consolidação nos três níveis e estados quantitativos explícitos.
- Política normativa em JSON, aritmética decimal exata, arredondamento final e escolha explícita de nível por atividade.
- Testes unitários e regressões com recortes conferidos da resolução, incluindo indisponibilidade do catálogo pendente.

- Contratos de domínio tipados, envelope 2.0 com leitura compatível de 1.0 e validação de referências de comprovantes.
- Carregador genérico e schemas Zod dos três níveis normativos, com testes de integridade; dados oficiais permanecem pendentes.

- Validador local de arquivos JSON de projeto, com metadados declarados e mensagens acessíveis.
- Testes de leitura, rejeição estrutural, seleção concorrente e fluxo E2E com acessibilidade.

### Changed

- Prevalência da resolução normativa nas divergências com a planilha, conforme decisão do mantenedor; registrados os valores de RSC I/a.3 e g.1 e a ambiguidade interna de RSC II/d.5.

- Convenção de commits com descrição e corpo em português, conforme orientação do mantenedor.
- Documentação dos limites da validação estrutural e das divergências observadas nas fontes pendentes.

## [0.1.0] - 2026-09-10

### Added

- Executable React, TypeScript, Tailwind, shadcn/ui, testing, and CI scaffold.
- Versioned empty envelopes for pending IFBA 189/2026 normative data.
