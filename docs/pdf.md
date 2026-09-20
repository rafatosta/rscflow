# PDFs

O pipeline de documentos usa bibliotecas com responsabilidades isoladas:

- `jspdf` cria os formulários normativos, páginas, textos, fontes e metadados;
- `jspdf-autotable` desenha e pagina as tabelas dos Anexos II a VII;
- `pdfjs-dist` abre os bytes definitivos na prévia e nos testes de compatibilidade.

O modelo intermediário fica em `src/lib/pdf/normative-model.ts`, sem dependência da biblioteca de desenho. O adaptador em `src/lib/pdf/normative-forms-generator.ts` é o único módulo responsável por converter esse modelo em PDF.

Liberation Sans regular e negrito são distribuídas localmente em `src/assets/fonts`, sob a SIL Open Font License 1.1, e incorporadas no arquivo pelo sistema virtual de arquivos do jsPDF. Nenhuma fonte ou biblioteca é carregada por CDN em tempo de execução.

Prévia e download reutilizam o mesmo `PdfArtifact`: o PDF é gerado uma vez e o mesmo `Blob`, com os mesmos bytes, alimenta as duas operações.

Comprovantes permanecem como arquivos separados no pacote ZIP atual. Se a aplicação passar a oferecer um PDF consolidado, a cópia/mesclagem de páginas deverá ficar em `src/lib/pdf/evidence-bundle-generator.ts`, sem reutilizar essa dependência para as tabelas normativas.
