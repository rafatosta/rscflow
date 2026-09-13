import { useEffect, useMemo, useState } from 'react';
import { activityProjectView } from '@/domain/project-migration';
import { ChevronLeft, ChevronRight, Download, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LocalProject } from '@/domain/local-project';
import type { TypedProjectExport } from '@/domain/project';
import { reviewProject } from '@/features/final-review/review';
import { projectPath } from '@/features/project-shell/routes';
import { projectScoring } from '@/features/project-shell/project-view';
import { buildMemorialDocument } from '@/memorial/preview';
import { A4_PAGE, type MemorialPdfLayout } from '@/pdf/model';
import { Button } from './ui/button';

function PreviewPage({ page }: { page: MemorialPdfLayout['pages'][number] }) {
  return (
    <article
      className="a4-page relative mx-auto overflow-hidden bg-white text-slate-950 shadow-2xl"
      aria-label={`Página ${page.number}`}
    >
      {page.lines.map((line, index) => {
        const contentWidth = A4_PAGE.width - A4_PAGE.marginLeft - A4_PAGE.marginRight;
        const left =
          line.align === 'left'
            ? line.x
            : line.align === 'center'
              ? A4_PAGE.marginLeft
              : A4_PAGE.width - A4_PAGE.marginRight - contentWidth;
        return (
          <span
            key={`${line.y}-${index}`}
            className="absolute whitespace-pre"
            style={{
              left: `${(left / A4_PAGE.width) * 100}%`,
              top: `${(line.y / A4_PAGE.height) * 100}%`,
              width:
                line.align === 'left'
                  ? `${(line.width / A4_PAGE.width) * 100}%`
                  : `${(contentWidth / A4_PAGE.width) * 100}%`,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: `${(line.fontSize / A4_PAGE.width) * 100}cqw`,
              fontWeight: line.style === 'heading' || line.style === 'cover-title' ? 700 : 400,
              lineHeight: 1,
              textAlign: line.align,
            }}
          >
            {line.text}
          </span>
        );
      })}
    </article>
  );
}

export function PdfPreview({ record }: { record: LocalProject }) {
  const project = useMemo(
    () => activityProjectView(record.project as TypedProjectExport),
    [record.project],
  );
  const review = reviewProject(project, projectScoring(project));
  const [layout, setLayout] = useState<MemorialPdfLayout>();
  const [pageIndex, setPageIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLayout(undefined);
    setPageIndex(0);
    setError('');
    void import('@/pdf/layout')
      .then(({ createMemorialPdfLayout }) =>
        createMemorialPdfLayout(buildMemorialDocument(project)),
      )
      .then((nextLayout) => {
        if (active) setLayout(nextLayout);
      })
      .catch(() => {
        if (active) setError('Não foi possível montar a pré-visualização do memorial.');
      });
    return () => {
      active = false;
    };
  }, [project]);

  async function generate() {
    setGenerating(true);
    setError('');
    try {
      const { downloadMemorialPdf } = await import('@/pdf/generator');
      await downloadMemorialPdf(project);
    } catch {
      setError('Não foi possível gerar o PDF. Revise os dados e tente novamente.');
    } finally {
      setGenerating(false);
    }
  }

  const page = layout?.pages[pageIndex];
  return (
    <section className="space-y-5">
      <div className="panel space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Pré-visualização A4</h2>
          <p className="mt-2 text-sm text-slate-300">
            Confira capa, sumário, seções e paginação antes de baixar o arquivo para o SEI.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to={projectPath(record.localId, 'memorial')}>
              <Pencil className="mr-2" size={17} aria-hidden="true" />
              Voltar para edição
            </Link>
          </Button>
          <Button
            onClick={() => void generate()}
            disabled={!layout || generating || review.blocksPdf}
          >
            <Download className="mr-2" size={17} aria-hidden="true" />
            {generating ? 'Gerando PDF…' : 'Gerar PDF'}
          </Button>
        </div>
        {review.blocksPdf && (
          <p className="rounded border border-rose-500 p-3 text-rose-200">
            Corrija os itens ERROR antes de gerar o PDF final.{' '}
            <Link className="text-cyan-300 underline" to={projectPath(record.localId, 'review')}>
              Abrir revisão
            </Link>
          </p>
        )}
        {error && (
          <p role="alert" className="text-rose-200">
            {error}
          </p>
        )}
      </div>

      {!page ? (
        !error && <p role="status">Preparando páginas…</p>
      ) : (
        <>
          <nav
            aria-label="Navegação entre páginas da pré-visualização"
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              variant="outline"
              onClick={() => setPageIndex((current) => current - 1)}
              disabled={pageIndex === 0}
            >
              <ChevronLeft size={18} aria-hidden="true" />
              Página anterior
            </Button>
            <span role="status" aria-live="polite" className="min-w-28 text-center text-sm">
              Página {pageIndex + 1} de {layout.pages.length}
            </span>
            <Button
              variant="outline"
              onClick={() => setPageIndex((current) => current + 1)}
              disabled={pageIndex === layout.pages.length - 1}
            >
              Próxima página
              <ChevronRight size={18} aria-hidden="true" />
            </Button>
          </nav>
          <div className="rounded-xl bg-slate-800 p-2 sm:p-5">
            <PreviewPage page={page} />
          </div>
        </>
      )}
    </section>
  );
}
