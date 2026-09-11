import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import type { TypedProjectExport } from '@/domain/project';
import { buildMemorialDocument } from '@/memorial/preview';
import { memorialPdfFilename } from './file-name';
import { paginateMemorial } from './layout';
import { A4_PAGE, type PdfTextLine } from './model';

function fontFor(line: PdfTextLine, regular: PDFFont, bold: PDFFont) {
  return line.style === 'heading' || line.style === 'cover-title' ? bold : regular;
}

function lineX(line: PdfTextLine) {
  const contentWidth = A4_PAGE.width - A4_PAGE.marginLeft - A4_PAGE.marginRight;
  if (line.align === 'center') return A4_PAGE.marginLeft + (contentWidth - line.width) / 2;
  if (line.align === 'right') return A4_PAGE.width - A4_PAGE.marginRight - line.width;
  return line.x;
}

export async function generateMemorialPdf(project: TypedProjectExport): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.TimesRoman);
  const bold = await document.embedFont(StandardFonts.TimesRomanBold);
  const layout = paginateMemorial(buildMemorialDocument(project), { regular, bold });

  document.setTitle(project.userData.memorial?.title || project.userData.title);
  document.setAuthor(project.userData.teacher.name || 'Docente');
  document.setSubject('Memorial Descritivo para Reconhecimento de Saberes e Competências');
  document.setCreator('RSCFlow');
  document.setProducer('RSCFlow');

  for (const pageLayout of layout.pages) {
    const page = document.addPage([A4_PAGE.width, A4_PAGE.height]);
    for (const line of pageLayout.lines) {
      page.drawText(line.text, {
        x: lineX(line),
        y: A4_PAGE.height - line.y - line.fontSize,
        size: line.fontSize,
        font: fontFor(line, regular, bold),
        color: line.style === 'header' || line.style === 'footer' ? rgb(0.32, 0.36, 0.42) : rgb(0.08, 0.1, 0.14),
      });
    }
  }
  return document.save({ useObjectStreams: false });
}

export async function downloadMemorialPdf(project: TypedProjectExport): Promise<void> {
  const bytes = await generateMemorialPdf(project);
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = memorialPdfFilename(project);
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
