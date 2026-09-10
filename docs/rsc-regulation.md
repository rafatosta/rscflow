# RSC regulation data

`ifba-189-2026` is reserved for data derived from Resolução CONSUP/IFBA nº 189/2026 and the official scoring spreadsheet supplied by the maintainer.

Its `metadata.json` and `rsc-i.json`, `rsc-ii.json`, and `rsc-iii.json` files are valid empty envelopes with `pending-official-validation` status. Empty criteria arrays do not express that no criteria exist; they express that none have been entered or validated. No agent may populate them by inference.

If the resolution, official spreadsheet, and validated JSON disagree, halt the corresponding rule change and request a human decision.

## Pendências observadas em 10/09/2026

A resolução e a planilha estão disponíveis em `docs/ifba/`. A leitura das 25 páginas do PDF e das quatro abas do ODS não constitui validação normativa nem autoriza preencher os JSONs.

Exemplos de divergências que exigem decisão humana antes de implementar regras (lista não exaustiva):

- RSC I/a.3: fator `0,41` no Anexo IV do PDF (página 17 do arquivo), versus valor armazenado `0,415` em `RSC I!C7` da planilha.
- RSC I/g.1: unidade “certame” no Anexo IV do PDF (página 19), versus “mês” em `RSC I!D64` da planilha.

Não foi escolhida interpretação nem corrigida qualquer fonte. Os dados normativos continuam com `pending-official-validation`. O validador de arquivos de projeto verifica somente o envelope e independe dessas divergências.
