import type { MemorialDocumentSection } from '@/memorial/preview';

export const A4_PAGE = {
  width: 595.28,
  height: 841.89,
  marginLeft: 56.69,
  marginRight: 56.69,
  contentTop: 70,
  contentBottom: 786,
} as const;

export type PdfTextStyle = 'body' | 'heading' | 'cover-title' | 'cover-detail' | 'header' | 'footer';

export type PdfTextLine = {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  style: PdfTextStyle;
  align: 'left' | 'center' | 'right';
};

export type PdfPageLayout = {
  number: number;
  sectionId: MemorialDocumentSection['id'];
  lines: PdfTextLine[];
};

export type MemorialPdfLayout = { pages: PdfPageLayout[] };
