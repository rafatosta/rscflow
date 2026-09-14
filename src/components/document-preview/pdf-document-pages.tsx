import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { DocumentPreviewPage } from './document-preview';
import { PdfCanvasPage } from './pdf-canvas-page';

export type LoadedPdfPreview = {
  document: PDFDocumentProxy;
  pages: DocumentPreviewPage[];
};

export async function loadPdfPreview(bytes: Uint8Array, prefix: string): Promise<LoadedPdfPreview> {
  const [{ getDocument, GlobalWorkerOptions }, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  GlobalWorkerOptions.workerSrc = workerUrl;
  const document = await getDocument({ data: bytes.slice() }).promise;
  const proxies = await Promise.all(
    Array.from({ length: document.numPages }, (_, index) => document.getPage(index + 1)),
  );
  return {
    document,
    pages: proxies.map((page, index) => {
      const label = `Página ${index + 1}`;
      return {
        id: `${prefix}-${index + 1}`,
        label,
        content: <PdfCanvasPage page={page} label={label} thumbnail={false} />,
        thumbnail: <PdfCanvasPage page={page} label={label} thumbnail />,
      };
    }),
  };
}
