# Data model

Project exports/imports use a versioned envelope:

```ts
{ schemaVersion, applicationVersion, regulation: { id, version }, userData }
```

`schemaVersion` controls the serialized-data contract. `applicationVersion` identifies the producing application. `regulation` pins the dataset used by the project. `userData` is an opaque record until feature-specific schemas are approved.

## Validação local de arquivos

A tela verifica apenas a estrutura do envelope `1.0` usando o contrato de domínio. O caso de uso em `src/features/project-import/validate-project-file.ts` lê o arquivo, interpreta JSON e traduz falhas em mensagens em português. A interface apresenta os metadados e gerencia o estado da seleção, sem regras normativas.

`regulation.id` e `regulation.version` são referências declaradas pelo arquivo. A verificação estrutural não confirma a existência, versão ou validação oficial do dataset. `schemaVersion` não é versão normativa. Não atribuir uma versão normativa ao dataset pendente por inferência.

O contrato existente permanece inalterado: campos adicionais no envelope e em `regulation` são ignorados pelo parser; `userData` permanece opaco. Não há migração, exportação, gravação ou envio do arquivo. O resultado fica em memória até outra seleção ou recarga. O seletor sugere JSON, mas a validação é pelo conteúdo, não pelo nome ou MIME. Não há limite de tamanho nesta etapa; a leitura ocorre integralmente em memória.
