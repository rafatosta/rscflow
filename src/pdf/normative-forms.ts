import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import type { TypedProjectExport } from '@/domain/project';
import type { NormativeProcessDocument, NormativeCriterionRow } from '@/normative-documents/model';
import { normativeFormsPdfFilename } from './file-name';

const PAGE = { width: 595.28, height: 841.89, margin: 36 };
const ink = rgb(0.08, 0.08, 0.08);
const gray = rgb(0.94, 0.94, 0.94);
const border = rgb(0.35, 0.35, 0.35);

function safe(text: string) {
  return text.replace(/[–—]/g, '-').replace(/\u00a0/g, ' ');
}
function formatNumber(value?: number) {
  return value === undefined
    ? ''
    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(value);
}
function levelLabel(level: string) {
  return level.replace('rsc-', 'RSC-').toUpperCase();
}
function wrap(text: string, width: number, font: PDFFont, size: number) {
  const lines: string[] = [];
  for (const paragraph of safe(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

class Writer {
  page!: PDFPage;
  y = 0;
  constructor(
    readonly pdf: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
  ) {
    this.newPage();
  }
  newPage(title?: string) {
    this.page = this.pdf.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - PAGE.margin;
    if (title) this.heading(title, 12);
  }
  text(
    value: string,
    options: { size?: number; bold?: boolean; indent?: number; gap?: number } = {},
  ) {
    const size = options.size ?? 9;
    const font = options.bold ? this.bold : this.regular;
    const x = PAGE.margin + (options.indent ?? 0);
    const lines = wrap(value, PAGE.width - PAGE.margin - x, font, size);
    const needed = lines.length * (size + 2) + (options.gap ?? 3);
    if (this.y - needed < PAGE.margin) this.newPage();
    for (const line of lines) {
      this.page.drawText(line, { x, y: this.y - size, size, font, color: ink });
      this.y -= size + 2;
    }
    this.y -= options.gap ?? 3;
  }
  heading(value: string, size = 11) {
    this.text(value, { size, bold: true, gap: 8 });
  }
  rule() {
    this.page.drawLine({
      start: { x: PAGE.margin, y: this.y },
      end: { x: PAGE.width - PAGE.margin, y: this.y },
      thickness: 0.6,
      color: border,
    });
    this.y -= 6;
  }
  row(cells: { text: string; width: number; bold?: boolean; fill?: boolean }[], size = 7.4) {
    const lineSets = cells.map((cell) =>
      wrap(cell.text, cell.width - 6, cell.bold ? this.bold : this.regular, size),
    );
    const height = Math.max(18, ...lineSets.map((lines) => lines.length * (size + 1) + 6));
    if (this.y - height < PAGE.margin) this.newPage();
    let x = PAGE.margin;
    cells.forEach((cell, index) => {
      if (cell.fill)
        this.page.drawRectangle({ x, y: this.y - height, width: cell.width, height, color: gray });
      this.page.drawRectangle({
        x,
        y: this.y - height,
        width: cell.width,
        height,
        borderWidth: 0.45,
        borderColor: border,
      });
      lineSets[index].forEach((line, lineIndex) =>
        this.page.drawText(line, {
          x: x + 3,
          y: this.y - 4 - size - lineIndex * (size + 1),
          size,
          font: cell.bold ? this.bold : this.regular,
          color: ink,
        }),
      );
      x += cell.width;
    });
    this.y -= height;
  }
}

function references(row: NormativeCriterionRow) {
  return row.proofReferences
    .map((item) =>
      item.startPage === item.endPage
        ? `p. ${item.startPage}`
        : `pp. ${item.startPage}-${item.endPage}`,
    )
    .join('; ');
}

export async function generateNormativeFormsPdf(
  model: NormativeProcessDocument,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const out = new Writer(pdf, regular, bold);
  pdf.setTitle('Formulários e anexos do processo de RSC');
  pdf.setCreator('RSCFlow');
  pdf.setProducer('RSCFlow');

  out.heading('ANEXO II');
  for (const item of model.request.fields)
    out.row(
      [
        { text: item.label, width: 190, bold: true, fill: true },
        { text: item.value ?? '', width: 333 },
      ],
      8,
    );
  out.heading('REQUERIMENTO', 10);
  out.text(
    `Venho requerer, conforme disposto no Art. 18, da Lei nº 12.772, e sob os termos do Regulamento de RSC, aprovado pela Resolução CONSUP nº ${model.regulation.number}, a concessão do RSC, declarando a veracidade da documentação apresentada neste processo, sob as penas da Lei.`,
    { size: 9, gap: 8 },
  );
  out.text(
    `Nível de RSC pretendido:  ${['rsc-i', 'rsc-ii', 'rsc-iii'].map((level) => `${model.request.requestedLevel === level ? '[X]' : '[ ]'} ${levelLabel(level)}`).join('     ')}`,
  );
  out.text('Local e data: __________________________________________');
  out.text('Assinatura do(a) docente: ______________________________');

  out.newPage('ANEXO III');
  out.heading('FORMULÁRIO PARA INDICAR PONTUAÇÃO OBTIDA', 10);
  if (model.validation.status !== 'validated')
    out.text(model.validation.message ?? 'Pontuação provisória, pendente de validação normativa.', {
      bold: true,
    });
  for (const level of model.levels) {
    out.heading(levelLabel(level.level), 9);
    out.row(
      [
        { text: 'DIRETRIZ', width: 278, bold: true, fill: true },
        { text: 'PESO', width: 55, bold: true, fill: true },
        { text: 'PONTUAÇÃO MÁXIMA', width: 75, bold: true, fill: true },
        { text: 'PONTUAÇÃO OBTIDA', width: 70, bold: true, fill: true },
        { text: '% OBTIDO EM RELAÇÃO AO MÁXIMO', width: 45, bold: true, fill: true },
      ],
      6.5,
    );
    for (const directive of level.directives)
      out.row(
        [
          { text: `${directive.code}) ${directive.title}`, width: 278 },
          { text: formatNumber(directive.weight), width: 55 },
          { text: formatNumber(directive.maximumScore), width: 75 },
          { text: formatNumber(directive.obtainedScore), width: 70 },
          {
            text:
              directive.obtainedScore === undefined || !directive.maximumScore
                ? ''
                : `${formatNumber((directive.obtainedScore / directive.maximumScore) * 100)}%`,
            width: 45,
          },
        ],
        7,
      );
    out.row(
      [
        { text: `TOTAL ${levelLabel(level.level)}`, width: 333, bold: true, fill: true },
        {
          text: formatNumber(
            level.directives.reduce((total, item) => total + item.maximumScore, 0),
          ),
          width: 75,
          bold: true,
          fill: true,
        },
        { text: formatNumber(level.obtainedScore), width: 70, bold: true, fill: true },
        { text: '', width: 45, fill: true },
      ],
      7,
    );
  }
  out.text(`PONTUAÇÃO TOTAL CONSOLIDADA: ${formatNumber(model.totalScore)}`, { bold: true });

  const annex = ['IV', 'V', 'VI'];
  model.levels.forEach((level, levelIndex) => {
    out.newPage(`ANEXO ${annex[levelIndex]}`);
    out.heading(
      `QUADRO DE REFERÊNCIA DE CRITÉRIOS PARA O ${levelLabel(level.level)} / FORMULÁRIO DE PONTUAÇÃO`,
      9,
    );
    if (model.validation.status !== 'validated')
      out.text(
        model.validation.message ?? 'Pontuação provisória, pendente de validação normativa.',
        { bold: true },
      );
    for (const directive of level.directives) {
      out.heading(`${directive.code}) ${directive.title}`, 8.5);
      out.row(
        [
          { text: 'CRITÉRIO', width: 226, bold: true, fill: true },
          { text: 'FATOR / UNIDADE', width: 56, bold: true, fill: true },
          { text: 'UN', width: 42, bold: true, fill: true },
          { text: 'QUANTIDADE MÁXIMA / UN', width: 54, bold: true, fill: true },
          { text: 'PESO', width: 38, bold: true, fill: true },
          { text: 'QUANTIDADE COMPROVADA', width: 57, bold: true, fill: true },
          { text: 'PONTUAÇÃO FINAL', width: 50, bold: true, fill: true },
        ],
        6,
      );
      for (const row of directive.criteria)
        out.row(
          [
            { text: `${row.code} ${row.description}`, width: 226 },
            { text: formatNumber(row.factor), width: 56 },
            { text: row.unit, width: 42 },
            { text: formatNumber(row.maximumQuantity), width: 54 },
            { text: formatNumber(row.weight), width: 38 },
            {
              text: [formatNumber(row.provenQuantity), references(row)].filter(Boolean).join('\n'),
              width: 57,
            },
            { text: formatNumber(row.finalScore), width: 50 },
          ],
          6.4,
        );
      out.text(
        `Pontuação máxima da diretriz: ${formatNumber(directive.maximumScore)} pontos. Pontuação obtida: ${formatNumber(directive.obtainedScore)}`,
        { size: 7.5, bold: true },
      );
    }
  });

  out.newPage('ANEXO VII');
  out.heading('QUADRO DE PONTUAÇÃO MÁXIMA DOS ITENS', 10);
  for (const level of model.levels) {
    out.heading(levelLabel(level.level), 9);
    out.row(
      [
        { text: 'DIRETRIZ', width: 385, bold: true, fill: true },
        { text: 'PESO', width: 60, bold: true, fill: true },
        { text: 'PONTUAÇÃO MÁXIMA', width: 78, bold: true, fill: true },
      ],
      7,
    );
    for (const directive of level.directives)
      out.row(
        [
          { text: `${directive.code}) ${directive.title}`, width: 385 },
          { text: formatNumber(directive.weight), width: 60 },
          { text: formatNumber(directive.maximumScore), width: 78 },
        ],
        7,
      );
    out.row(
      [
        { text: `TOTAL ${levelLabel(level.level)}`, width: 385, bold: true, fill: true },
        {
          text: formatNumber(
            level.directives.reduce((total, item) => total + (item.weight ?? 0), 0),
          ),
          width: 60,
          bold: true,
          fill: true,
        },
        {
          text: formatNumber(
            level.directives.reduce((total, item) => total + item.maximumScore, 0),
          ),
          width: 78,
          bold: true,
          fill: true,
        },
      ],
      7,
    );
  }
  out.row(
    [
      { text: 'TOTAL GERAL', width: 445, bold: true, fill: true },
      {
        text: formatNumber(
          model.levels
            .flatMap((level) => level.directives)
            .reduce((total, item) => total + item.maximumScore, 0),
        ),
        width: 78,
        bold: true,
        fill: true,
      },
    ],
    8,
  );
  return pdf.save({ useObjectStreams: false });
}

export async function downloadNormativeFormsPdf(
  project: TypedProjectExport,
  model: NormativeProcessDocument,
) {
  const bytes = await generateNormativeFormsPdf(model);
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = normativeFormsPdfFilename(project);
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
