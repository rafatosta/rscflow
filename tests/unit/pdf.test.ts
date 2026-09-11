import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { createDraft, datasets } from '@/features/project-shell/project-view';
import { buildMemorialDocument } from '@/memorial/preview';
import { generateMemorialPdf, memorialPdfFilename } from '@/pdf/generator';
import { createMemorialPdfLayout } from '@/pdf/layout';
import { A4_PAGE } from '@/pdf/model';

function representativeProject() {
  const project = createDraft('rsc-ii', datasets[0].metadata.regulation.id);
  project.userData.title = 'Memorial de José Coração';
  project.userData.teacher = {
    name: 'José Coração',
    campus: 'Vitória da Conquista',
    role: 'Professor EBTT',
  };
  project.userData.memorial = {
    title: 'Saberes, competências e trajetória',
    introduction: 'Educação pública, inclusão e formação contínua. '.repeat(180),
    conclusion: 'Síntese da contribuição à instituição.',
    sectionTexts: { teaching: `PalavraExtremamenteLonga${'x'.repeat(700)}` },
  };
  return project;
}

describe('PDF local do memorial', () => {
  it('preserva dados, acentos e ordem das seções na paginação', async () => {
    const project = representativeProject();
    const document = buildMemorialDocument(project);
    const layout = await createMemorialPdfLayout(document);
    const text = layout.pages.flatMap((page) => page.lines.map((line) => line.text)).join('\n');

    expect(text).toContain('José Coração');
    expect(text).toContain('Educação pública, inclusão e formação contínua.');
    expect(layout.pages.length).toBeGreaterThan(document.length);
    const firstPageBySection = [...new Set(layout.pages.map((page) => page.sectionId))];
    expect(firstPageBySection).toEqual(document.map((section) => section.id));
  });

  it('mantém linhas extensas dentro das margens e da área vertical', async () => {
    const project = representativeProject();
    project.userData.memorial!.title = 'Título extenso para conferência de capa '.repeat(100);
    const layout = await createMemorialPdfLayout(buildMemorialDocument(project));
    const contentWidth = A4_PAGE.width - A4_PAGE.marginLeft - A4_PAGE.marginRight;
    expect(layout.pages.filter((page) => page.sectionId === 'cover').length).toBeGreaterThan(1);
    for (const page of layout.pages) {
      for (const line of page.lines) {
        expect(line.width).toBeLessThanOrEqual(contentWidth + 0.01);
        expect(line.y).toBeGreaterThanOrEqual(0);
        expect(line.y + line.fontSize).toBeLessThan(A4_PAGE.height);
      }
    }
  });

  it('gera um arquivo PDF válido, não vazio e com todas as páginas calculadas', async () => {
    const project = representativeProject();
    project.userData.memorial!.conclusion += ' 😀';
    const expected = await createMemorialPdfLayout(buildMemorialDocument(project));
    const bytes = await generateMemorialPdf(project);
    const loaded = await PDFDocument.load(bytes);

    expect(new TextDecoder().decode(bytes.slice(0, 8))).toContain('%PDF-');
    expect(bytes.byteLength).toBeGreaterThan(5_000);
    expect(loaded.getPageCount()).toBe(expected.pages.length);
    expect(memorialPdfFilename(project)).toBe('memorial-rsc-jose-coracao.pdf');
  });
});
