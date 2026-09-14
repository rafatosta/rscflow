import { useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { activityProjectView } from '@/domain/project-migration';
import type { LocalProject } from '@/domain/local-project';
import type { OccurrenceProjectExport } from '@/domain/criterion-entry';
import type { FileResolver } from '@/domain/local-files';
import type { TypedProjectExport } from '@/domain/project';
import type { Regulation } from '@/domain/regulation';
import type { ArtifactReadiness } from '@/features/final-review/review';
import { reviewProject } from '@/features/final-review/review';
import type { EvidencePreparation } from '@/features/final-documents/prepare';
import { prepareEvidenceArtifacts } from '@/features/final-documents/prepare';
import { projectPath } from '@/features/project-shell/routes';
import { projectScoring } from '@/features/project-shell/project-view';
import { buildMemorialDocument } from '@/memorial/preview';
import { A4_PAGE, type MemorialPdfLayout } from '@/pdf/model';
import { evidenceBundlePdfFilename, normativeFormsPdfFilename } from '@/pdf/file-name';
import { Button } from './ui/button';
import {
  DocumentPreview,
  type DocumentPreviewPage,
  type DocumentStatus,
} from './document-preview/document-preview';
import type { LoadedPdfPreview } from './document-preview/pdf-document-pages';

type DocumentId = 'memorial' | 'forms' | 'evidence';
type PdfArtifact = LoadedPdfPreview & { bytes: Uint8Array };

function MemorialPage({
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
      {...(thumbnail ? { 'aria-hidden': true } : { 'aria-label': `Página ${page.number}` })}
    >
      {page.lines.map((line, index) => {
        const width = A4_PAGE.width - A4_PAGE.marginLeft - A4_PAGE.marginRight;
        const left = line.align === 'left' ? line.x : A4_PAGE.marginLeft;
        return (
          <span
            key={`${line.y}-${index}`}
            className="absolute whitespace-pre"
            style={{
              left: `${(left / A4_PAGE.width) * 100}%`,
              top: `${(line.y / A4_PAGE.height) * 100}%`,
              width: `${((line.align === 'left' ? line.width : width) / A4_PAGE.width) * 100}%`,
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

function statusOf(readiness: ArtifactReadiness): DocumentStatus {
  if (readiness.status === 'blocked')
    return {
      label: 'Dados incompletos',
      description: readiness.reasons.join(' '),
      tone: 'destructive',
    };
  if (readiness.status === 'limited' || readiness.status === 'checking')
    return {
      label: readiness.status === 'checking' ? 'Verificando documento' : 'Requer revisão',
      description: readiness.reasons.join(' ') || 'Confira as limitações antes de gerar.',
      tone: 'warning',
    };
  return {
    label: 'Pronto para geração',
    description: 'Não há correções bloqueantes na verificação atual.',
    tone: 'success',
  };
}

export function PdfPreview({
  record,
  evidenceProject,
  resolver,
  dataset,
  onExportJson,
}: {
  record: LocalProject;
  evidenceProject?: OccurrenceProjectExport;
  resolver?: FileResolver;
  dataset?: Regulation;
  onExportJson?: () => void;
}) {
  const project = useMemo(
    () => activityProjectView(record.project as TypedProjectExport),
    [record.project],
  );
  const scoring = useMemo(() => projectScoring(project), [project]);
  const [selected, setSelected] = useState<DocumentId>('memorial');
  const [layout, setLayout] = useState<MemorialPdfLayout>();
  const [pdfs, setPdfs] = useState<Partial<Record<Exclude<DocumentId, 'memorial'>, PdfArtifact>>>(
    {},
  );
  const [evidence, setEvidence] = useState<EvidencePreparation>();
  const [errors, setErrors] = useState<Partial<Record<DocumentId, string>>>({});
  const [generating, setGenerating] = useState<DocumentId>();

  useEffect(() => {
    let active = true;
    const loaded: LoadedPdfPreview[] = [];
    setLayout(undefined);
    setPdfs({});
    setEvidence(undefined);
    setErrors({});
    void (async () => {
      const prepared = await prepareEvidenceArtifacts(evidenceProject, resolver);
      if (!active) return;
      setEvidence(prepared);
      const pageMap = prepared.status === 'success' ? prepared.pageMap : undefined;
      const { createMemorialPdfLayout } = await import('@/pdf/layout');
      const nextLayout = await createMemorialPdfLayout(buildMemorialDocument(project, pageMap));
      if (!active) return;
      setLayout(nextLayout);
      if (prepared.status === 'success') {
        try {
          const { loadPdfPreview } = await import('./document-preview/pdf-document-pages');
          const preview = await loadPdfPreview(prepared.bytes, 'evidence');
          loaded.push(preview);
          if (active)
            setPdfs((value) => ({ ...value, evidence: { ...preview, bytes: prepared.bytes } }));
        } catch {
          if (active)
            setErrors((value) => ({
              ...value,
              evidence: 'Não foi possível montar a prévia dos comprovantes consolidados.',
            }));
        }
      }
      if (dataset && prepared.status !== 'error') {
        try {
          const [{ buildNormativeProcessDocument }, { generateNormativeFormsPdf }] =
            await Promise.all([
              import('@/normative-documents/model'),
              import('@/pdf/normative-forms'),
            ]);
          const bytes = await generateNormativeFormsPdf(
            buildNormativeProcessDocument(project, dataset, scoring, pageMap),
          );
          const { loadPdfPreview } = await import('./document-preview/pdf-document-pages');
          const preview = await loadPdfPreview(bytes, 'forms');
          loaded.push(preview);
          if (active) setPdfs((value) => ({ ...value, forms: { ...preview, bytes } }));
        } catch {
          if (active)
            setErrors((value) => ({
              ...value,
              forms: 'Não foi possível montar a prévia dos formulários normativos.',
            }));
        }
      }
    })().catch(() => {
      if (active)
        setErrors((value) => ({
          ...value,
          memorial: 'Não foi possível montar a prévia do Memorial Descritivo.',
        }));
    });
    return () => {
      active = false;
      loaded.forEach((value) => void value.document.cleanup());
    };
  }, [dataset, evidenceProject, project, resolver, scoring]);

  const review = reviewProject(project, scoring, evidence);
  const memorialPages: DocumentPreviewPage[] =
    layout?.pages.map((page) => ({
      id: `memorial-${page.number}`,
      label: `Página ${page.number}`,
      content: <MemorialPage page={page} />,
      thumbnail: <MemorialPage page={page} thumbnail />,
    })) ?? [];
  const documents = {
    memorial: {
      label: 'Memorial Descritivo',
      title: project.userData.memorial?.title?.trim() || project.userData.title,
      pages: memorialPages,
      readiness: review.artifacts.memorial,
      edit: 'memorial',
      hint: 'Confira o conteúdo, a paginação e as referências antes de gerar o PDF final.',
    },
    forms: {
      label: 'Formulários e anexos normativos',
      title: 'Formulários e anexos normativos',
      pages: pdfs.forms?.pages ?? [],
      readiness: review.artifacts.forms,
      edit: 'review',
      hint: 'Os formulários são derivados do projeto, da pontuação e do mapa dos comprovantes.',
    },
    evidence: {
      label: 'PDF consolidado dos comprovantes',
      title: 'PDF consolidado dos comprovantes',
      pages: pdfs.evidence?.pages ?? [],
      readiness: review.artifacts.evidence,
      edit: 'requirements',
      hint: 'A ordem e os intervalos seguem o mapa produzido pela consolidação dos comprovantes.',
    },
  } as const;
  const current = documents[selected];
  const blocked = current.readiness.status === 'blocked' || current.readiness.status === 'checking';

  async function download() {
    setGenerating(selected);
    setErrors((value) => ({ ...value, [selected]: undefined }));
    try {
      if (selected === 'memorial') {
        const { downloadMemorialPdf } = await import('@/pdf/generator');
        await downloadMemorialPdf(
          project,
          evidence?.status === 'success' ? evidence.pageMap : undefined,
        );
      } else {
        const pdf = pdfs[selected];
        if (!pdf) throw new Error('Documento indisponível.');
        const { downloadPdfBytes } = await import('@/pdf/download');
        downloadPdfBytes(
          pdf.bytes,
          selected === 'forms'
            ? normativeFormsPdfFilename(project)
            : evidenceBundlePdfFilename(project),
        );
      }
    } catch {
      setErrors((value) => ({
        ...value,
        [selected]: `Não foi possível gerar ${current.label.toLocaleLowerCase('pt-BR')}.`,
      }));
    } finally {
      setGenerating(undefined);
    }
  }

  return (
    <section className="space-y-4">
      <nav aria-label="Documento em pré-visualização" className="flex flex-wrap gap-2">
        {(Object.keys(documents) as DocumentId[]).map((id) => (
          <Button
            key={id}
            variant={selected === id ? 'default' : 'outline'}
            aria-pressed={selected === id}
            disabled={id !== 'memorial' && !documents[id].pages.length}
            onClick={() => setSelected(id)}
          >
            {documents[id].label}
          </Button>
        ))}
      </nav>
      {!current.pages.length ? (
        <div className="panel" role="status">
          {errors[selected] ||
            current.readiness.reasons.join(' ') ||
            `Preparando ${current.label.toLocaleLowerCase('pt-BR')}…`}
        </div>
      ) : (
        <DocumentPreview
          key={selected}
          pages={current.pages}
          metadata={{
            title: current.title,
            type: current.label,
            teacher: project.userData.teacher?.name,
            campus: project.userData.teacher?.campus,
            regulation: dataset
              ? `${dataset.metadata.regulation.authority} ${dataset.metadata.regulation.number}/${dataset.metadata.regulation.year}`
              : (project.regulation.version ?? project.regulation.id),
            updatedAt: new Date(record.updatedAt).toLocaleString('pt-BR'),
          }}
          status={statusOf(current.readiness)}
          actions={[
            {
              id: 'generate',
              label: generating === selected ? 'Gerando PDF…' : 'Gerar PDF',
              icon: <Download size={17} aria-hidden="true" />,
              primary: true,
              disabled: Boolean(generating) || blocked,
              onClick: () => void download(),
            },
            {
              id: 'edit',
              label: 'Voltar para edição',
              content: (
                <Button asChild variant="outline" className="w-full">
                  <Link to={projectPath(record.localId, current.edit)}>
                    <Pencil size={17} aria-hidden="true" /> Voltar para edição
                  </Link>
                </Button>
              ),
            },
            {
              id: 'print',
              label: 'Imprimir',
              icon: <Printer size={17} aria-hidden="true" />,
              disabled: blocked,
              onClick: () => window.print(),
            },
            ...(onExportJson
              ? [{ id: 'json', label: 'Exportar JSON', onClick: onExportJson }]
              : []),
          ]}
          notices={
            <>
              {errors[selected] && (
                <p role="alert" className="notice document-status" data-tone="destructive">
                  {errors[selected]}
                </p>
              )}
              {selected === 'memorial' &&
                evidence &&
                evidence.status !== 'success' &&
                evidence.status !== 'empty' && (
                  <p className="notice document-status" data-tone="warning">
                    A prévia foi montada sem referências de páginas. Verifique os comprovantes
                    locais.
                  </p>
                )}
            </>
          }
          hint={current.hint}
        />
      )}
    </section>
  );
}
