import { useEffect, useMemo, useState } from 'react';
import { activityProjectView } from '@/domain/project-migration';
import { Download, Pencil, Printer, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LocalProject } from '@/domain/local-project';
import type { OccurrenceProjectExport } from '@/domain/criterion-entry';
import type { EvidencePageMap } from '@/domain/evidence-page-map';
import type { FileResolver } from '@/domain/local-files';
import type { TypedProjectExport } from '@/domain/project';
import { reviewProject } from '@/features/final-review/review';
import { projectPath } from '@/features/project-shell/routes';
import { projectScoring } from '@/features/project-shell/project-view';
import { buildMemorialDocument } from '@/memorial/preview';
import { A4_PAGE, type MemorialPdfLayout } from '@/pdf/model';
import { Button } from './ui/button';
import { DocumentPreview, type DocumentPreviewPage } from './document-preview/document-preview';

function PreviewPage({
  page,
  thumbnail = false,
}: {
  page: MemorialPdfLayout['pages'][number];
  thumbnail?: boolean;
}) {
  const Element = thumbnail ? 'div' : 'article';
  return (
    <Element
      className={`a4-page relative mx-auto overflow-hidden bg-white text-slate-950 ${thumbnail ? '' : 'shadow-2xl'}`}
      {...(!thumbnail ? { 'aria-label': `Página ${page.number}` } : { 'aria-hidden': true })}
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
    </Element>
  );
}

export function PdfPreview({
  record,
  evidenceProject,
  resolver,
  onExportJson,
}: {
  record: LocalProject;
  evidenceProject?: OccurrenceProjectExport;
  resolver?: FileResolver;
  onExportJson?: () => void;
}) {
  const project = useMemo(
    () => activityProjectView(record.project as TypedProjectExport),
    [record.project],
  );
  const review = reviewProject(project, projectScoring(project));
  const [layout, setLayout] = useState<MemorialPdfLayout>();
  const [pageMap, setPageMap] = useState<EvidencePageMap>();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [referenceWarning, setReferenceWarning] = useState('');

  useEffect(() => {
    let active = true;
    setLayout(undefined);
    setPageMap(undefined);
    setError('');
    setReferenceWarning('');
    void Promise.all([
      import('@/pdf/layout'),
      evidenceProject && resolver
        ? import('@/pdf/evidence-bundle').then(({ createEvidencePageMap }) =>
            createEvidencePageMap(evidenceProject, resolver).catch(() => {
              if (active)
                setReferenceWarning(
                  'A prévia foi montada sem referências de páginas. Verifique os comprovantes locais.',
                );
              return undefined;
            }),
          )
        : undefined,
    ])
      .then(([{ createMemorialPdfLayout }, nextPageMap]) => {
        if (active) setPageMap(nextPageMap);
        return createMemorialPdfLayout(buildMemorialDocument(project, nextPageMap));
      })
      .then((nextLayout) => {
        if (active) setLayout(nextLayout);
      })
      .catch(() => {
        if (active) setError('Não foi possível montar a pré-visualização do memorial.');
      });
    return () => {
      active = false;
    };
  }, [evidenceProject, project, resolver]);

  async function generate() {
    setGenerating(true);
    setError('');
    try {
      const { downloadMemorialPdf } = await import('@/pdf/generator');
      if (pageMap) await downloadMemorialPdf(project, pageMap);
      else await downloadMemorialPdf(project);
    } catch {
      setError('Não foi possível gerar o PDF. Revise os dados e tente novamente.');
    } finally {
      setGenerating(false);
    }
  }

  const pages: DocumentPreviewPage[] =
    layout?.pages.map((page) => ({
      id: `${page.sectionId}-${page.number}`,
      label: `Página ${page.number}`,
      content: <PreviewPage page={page} />,
      thumbnail: <PreviewPage page={page} thumbnail />,
    })) ?? [];
  const title = project.userData.memorial?.title?.trim() || project.userData.title;
  const warnings = review.counts.warning;
  const status = review.blocksPdf
    ? {
        label: 'Dados incompletos',
        description: 'Há correções necessárias antes da geração do PDF final.',
        tone: 'destructive' as const,
      }
    : warnings
      ? {
          label: 'Requer revisão',
          description: `${warnings} aviso(s) devem ser conferidos antes da geração.`,
          tone: 'warning' as const,
        }
      : {
          label: 'Pronto para geração',
          description: 'Não há correções bloqueantes ou avisos na verificação atual.',
          tone: 'success' as const,
        };
  return (
    <>
      {!layout ? (
        !error && <p role="status">Preparando páginas…</p>
      ) : (
        <DocumentPreview
          pages={pages}
          metadata={{
            title,
            type: 'Memorial Descritivo',
            teacher: project.userData.teacher?.name,
            campus: project.userData.teacher?.campus,
            regulation: project.regulation.version ?? project.regulation.id,
            updatedAt: new Date(record.updatedAt).toLocaleString('pt-BR'),
          }}
          status={status}
          actions={[
            {
              id: 'generate',
              label: generating ? 'Gerando PDF…' : 'Gerar PDF',
              icon: <Download size={17} aria-hidden="true" />,
              primary: true,
              disabled: generating || review.blocksPdf,
              onClick: () => void generate(),
            },
            {
              id: 'edit',
              label: 'Voltar para edição',
              content: (
                <Button asChild variant="outline" className="w-full">
                  <Link to={projectPath(record.localId, 'memorial')}>
                    <Pencil size={17} aria-hidden="true" /> Voltar para edição
                  </Link>
                </Button>
              ),
            },
            {
              id: 'review',
              label: 'Abrir revisão',
              content: (
                <Button asChild variant="outline" className="w-full">
                  <Link to={projectPath(record.localId, 'review')}>
                    <RotateCcw size={17} aria-hidden="true" /> Abrir revisão
                  </Link>
                </Button>
              ),
            },
            {
              id: 'print',
              label: 'Imprimir',
              icon: <Printer size={17} aria-hidden="true" />,
              disabled: review.blocksPdf,
              onClick: () => window.print(),
            },
            ...(onExportJson
              ? [{ id: 'json', label: 'Exportar JSON', onClick: onExportJson }]
              : []),
          ]}
          notices={
            <>
              {error && (
                <p role="alert" className="notice document-status" data-tone="destructive">
                  {error}
                </p>
              )}
              {referenceWarning && (
                <p className="notice document-status" data-tone="warning">
                  {referenceWarning}
                </p>
              )}
            </>
          }
          hint="Confira o conteúdo, a paginação e os avisos antes de gerar o PDF final."
        />
      )}
      {error && !layout && (
        <p role="alert" className="notice document-status" data-tone="destructive">
          {error}
        </p>
      )}
    </>
  );
}
