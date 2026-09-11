import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';
import type { MemorialDocumentSection } from '@/memorial/preview';
import {
  A4_PAGE,
  type MemorialPdfLayout,
  type PdfPageLayout,
  type PdfTextLine,
  type PdfTextStyle,
} from './model';

export type PdfFonts = { regular: PDFFont; bold: PDFFont };

const BODY_SIZE = 11;
const BODY_LEADING = 16;
const CONTENT_WIDTH = A4_PAGE.width - A4_PAGE.marginLeft - A4_PAGE.marginRight;

function printable(text: string, font: PDFFont): string {
  const normalized = text
    .normalize('NFC')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/\t/g, ' ');
  return [...normalized]
    .map((character) => {
      if (character === '\n' || character === '\r') return character;
      try {
        font.encodeText(character);
        return character;
      } catch {
        return '?';
      }
    })
    .join('');
}

function splitToken(token: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const pieces: string[] = [];
  let piece = '';
  for (const character of token) {
    const candidate = piece + character;
    if (piece && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      pieces.push(piece);
      piece = character;
    } else piece = candidate;
  }
  if (piece) pieces.push(piece);
  return pieces;
}

export function wrapPdfText(
  source: string,
  maxWidth: number,
  font: PDFFont,
  size: number,
): string[] {
  const output: string[] = [];
  for (const rawLine of printable(source, font).split(/\r?\n/)) {
    const words = rawLine.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      output.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const fragments =
        font.widthOfTextAtSize(word, size) > maxWidth
          ? splitToken(word, maxWidth, font, size)
          : [word];
      for (const fragment of fragments) {
        const candidate = line ? `${line} ${fragment}` : fragment;
        if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
          output.push(line);
          line = fragment;
        } else line = candidate;
      }
    }
    if (line) output.push(line);
  }
  return output;
}

function addLine(
  page: PdfPageLayout,
  text: string,
  y: number,
  font: PDFFont,
  fontSize: number,
  style: PdfTextStyle,
  align: PdfTextLine['align'] = 'left',
  x = A4_PAGE.marginLeft,
) {
  page.lines.push({ text, x, y, width: font.widthOfTextAtSize(text, fontSize), fontSize, style, align });
}

function addPage(
  pages: PdfPageLayout[],
  section: MemorialDocumentSection,
  fonts: PdfFonts,
  continuation = false,
) {
  const page: PdfPageLayout = { number: pages.length + 1, sectionId: section.id, lines: [] };
  pages.push(page);
  addLine(page, 'RSCFlow - Memorial Descritivo', 30, fonts.regular, 8.5, 'header');
  const heading = continuation ? `${section.title} (continuação)` : section.title;
  let y = A4_PAGE.contentTop;
  for (const line of wrapPdfText(heading, CONTENT_WIDTH, fonts.bold, 16)) {
    addLine(page, line, y, fonts.bold, 16, 'heading');
    y += 21;
  }
  return { page, cursor: y + 13 };
}

function layoutCover(
  section: MemorialDocumentSection,
  pages: PdfPageLayout[],
  fonts: PdfFonts,
) {
  let page: PdfPageLayout = { number: 1, sectionId: 'cover', lines: [] };
  pages.push(page);
  let y = 205;
  for (const line of wrapPdfText(section.title, CONTENT_WIDTH, fonts.bold, 20)) {
    if (y + 27 > A4_PAGE.contentBottom) {
      page = { number: pages.length + 1, sectionId: 'cover', lines: [] };
      pages.push(page);
      addLine(page, 'RSCFlow - Memorial Descritivo', 30, fonts.regular, 8.5, 'header');
      addLine(page, 'Capa (continuação)', A4_PAGE.contentTop, fonts.bold, 16, 'heading');
      y = 118;
    }
    addLine(page, line, y, fonts.bold, 20, 'cover-title', 'center');
    y += 27;
  }
  y = Math.max(y + 55, 345);
  for (const paragraph of section.paragraphs) {
    for (const line of wrapPdfText(paragraph, CONTENT_WIDTH, fonts.regular, 11)) {
      if (y + 18 > A4_PAGE.contentBottom) {
        page = { number: pages.length + 1, sectionId: 'cover', lines: [] };
        pages.push(page);
        addLine(page, 'RSCFlow - Memorial Descritivo', 30, fonts.regular, 8.5, 'header');
        addLine(page, 'Capa (continuação)', A4_PAGE.contentTop, fonts.bold, 16, 'heading');
        y = 118;
      }
      addLine(page, line, y, fonts.regular, 11, 'cover-detail', 'center');
      y += 18;
    }
  }
}

function layoutSection(
  section: MemorialDocumentSection,
  pages: PdfPageLayout[],
  fonts: PdfFonts,
) {
  let { page, cursor } = addPage(pages, section, fonts);
  for (const paragraph of section.paragraphs) {
    const lines = wrapPdfText(paragraph, CONTENT_WIDTH, fonts.regular, BODY_SIZE);
    if (cursor + Math.min(lines.length, 2) * BODY_LEADING > A4_PAGE.contentBottom) {
      ({ page, cursor } = addPage(pages, section, fonts, true));
    }
    for (const line of lines) {
      if (cursor + BODY_LEADING > A4_PAGE.contentBottom) {
        ({ page, cursor } = addPage(pages, section, fonts, true));
      }
      addLine(page, line, cursor, fonts.regular, BODY_SIZE, 'body');
      cursor += BODY_LEADING;
    }
    cursor += 10;
  }
}

export function paginateMemorial(
  sections: MemorialDocumentSection[],
  fonts: PdfFonts,
): MemorialPdfLayout {
  if (!sections.length || sections[0]?.id !== 'cover')
    throw new Error('O memorial precisa começar pela capa.');
  const pages: PdfPageLayout[] = [];
  layoutCover(sections[0], pages, fonts);

  const summary = sections.find((section) => section.id === 'summary');
  if (!summary) throw new Error('O memorial precisa conter um sumário.');
  const summaryPage = addPage(pages, summary, fonts).page;
  const contentSections = sections.filter(
    (section) => section.id !== 'cover' && section.id !== 'summary',
  );
  const starts = new Map<string, number>();
  for (const section of contentSections) {
    starts.set(section.id, pages.length + 1);
    layoutSection(section, pages, fonts);
  }

  let summaryY = 118;
  for (const section of contentSections) {
    const number = starts.get(section.id)!;
    const suffix = ` ${number}`;
    const available = CONTENT_WIDTH - fonts.regular.widthOfTextAtSize(suffix, BODY_SIZE) - 12;
    const titleLines = wrapPdfText(section.title, available, fonts.regular, BODY_SIZE);
    for (const [index, titleLine] of titleLines.entries()) {
      addLine(summaryPage, titleLine, summaryY, fonts.regular, BODY_SIZE, 'body');
      if (index === titleLines.length - 1)
        addLine(
          summaryPage,
          String(number),
          summaryY,
          fonts.regular,
          BODY_SIZE,
          'body',
          'right',
        );
      summaryY += 24;
    }
  }

  for (const page of pages) {
    if (page.number === 1) continue;
    addLine(
      page,
      `Página ${page.number} de ${pages.length}`,
      811,
      fonts.regular,
      8.5,
      'footer',
      'center',
    );
  }
  return { pages };
}

export async function createMemorialPdfLayout(
  sections: MemorialDocumentSection[],
): Promise<MemorialPdfLayout> {
  const document = await PDFDocument.create();
  const fonts = {
    regular: await document.embedFont(StandardFonts.TimesRoman),
    bold: await document.embedFont(StandardFonts.TimesRomanBold),
  };
  return paginateMemorial(sections, fonts);
}
