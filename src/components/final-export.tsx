import { useState } from 'react';
import { activityProjectView } from '@/domain/project-migration';
import { Download, FileJson, FileSearch } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LocalProject } from '@/domain/local-project';
import type { OccurrenceProjectExport } from '@/domain/criterion-entry';
import type { FileResolver } from '@/domain/local-files';
import type { ProjectExport, TypedProjectExport } from '@/domain/project';
import type { CalculationResult } from '@/domain/scoring';
import type { Regulation } from '@/domain/regulation';
import { reviewProject } from '@/features/final-review/review';
import { projectJsonFilename } from '@/features/local-projects/project-files';
import { projectPath } from '@/features/project-shell/routes';
import { memorialPdfFilename, normativeFormsPdfFilename } from '@/pdf/file-name';
import { ProjectImport } from './project-import';
import { Button } from './ui/button';

export function FinalExport({
  record,
  scoring,
  busy,
  invalid,
  onExportJson,
  onImport,
  evidenceProject,
  resolver,
  dataset,
}: {
  record: LocalProject;
  scoring: CalculationResult;
  busy: boolean;
  invalid: string;
  onExportJson: () => void;
  onImport: (project: ProjectExport) => void;
  evidenceProject?: OccurrenceProjectExport;
  resolver?: FileResolver;
  dataset?: Regulation;
}) {
  const project = activityProjectView(record.project as TypedProjectExport);
  const review = reviewProject(project, scoring);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [referenceWarning, setReferenceWarning] = useState('');

  async function generatePdf() {
    setGenerating(true);
    setError('');
    setReferenceWarning('');
    try {
      const { downloadMemorialPdf } = await import('@/pdf/generator');
      let pageMap;
      if (evidenceProject && resolver) {
        try {
          pageMap = await import('@/pdf/evidence-bundle').then(({ createEvidencePageMap }) =>
            createEvidencePageMap(evidenceProject, resolver),
          );
        } catch {
          setReferenceWarning(
            'O Memorial foi gerado sem referências de páginas. Verifique os comprovantes locais.',
          );
        }
      }
      if (pageMap) await downloadMemorialPdf(project, pageMap);
      else await downloadMemorialPdf(project);
    } catch {
      setError('Não foi possível gerar o PDF. Revise os dados e tente novamente.');
    } finally {
      setGenerating(false);
    }
  }

  async function generateForms() {
    if (!dataset) return setError('O catálogo normativo vinculado ao projeto não está disponível.');
    setGenerating(true);
    setError('');
    try {
      let pageMap;
      if (evidenceProject && resolver)
        pageMap = await import('@/pdf/evidence-bundle').then(({ createEvidencePageMap }) =>
          createEvidencePageMap(evidenceProject, resolver),
        );
      const { buildNormativeProcessDocument } = await import('@/normative-documents/model');
      const model = buildNormativeProcessDocument(project, dataset, scoring, pageMap);
      const { downloadNormativeFormsPdf } = await import('@/pdf/normative-forms');
      await downloadNormativeFormsPdf(project, model);
    } catch {
      setError(
        'Não foi possível gerar os formulários. Verifique os dados e os comprovantes locais.',
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel space-y-5">
        <div>
          <h2 className="section-title">Arquivos finais e cópia portátil</h2>
          <p className="mt-2 text-slate-300">
            Os arquivos são preparados neste navegador e não são enviados para nenhum serviço.
          </p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="subpanel">
            <dt className="text-sm text-slate-300">Último autosave</dt>
            <dd className="mt-1">
              <time dateTime={record.updatedAt}>
                {new Date(record.updatedAt).toLocaleString('pt-BR')}
              </time>
            </dd>
          </div>
          <div className="subpanel">
            <dt className="text-sm text-slate-300">Revisão</dt>
            <dd className="mt-1">
              {review.counts.error} erro(s) e {review.counts.warning} aviso(s)
            </dd>
          </div>
        </dl>

        {review.blocksPdf && (
          <div role="alert" className="notice border-rose-500 bg-rose-950/30">
            <p className="font-semibold text-rose-200">PDF final bloqueado</p>
            <p className="mt-1 text-slate-200">
              Corrija os itens ERROR da revisão. O JSON continua disponível como cópia portátil.
            </p>
            <Link
              className="mt-2 inline-block text-link"
              to={projectPath(record.localId, 'review')}
            >
              Ver checklist de revisão
            </Link>
          </div>
        )}
        {!review.blocksPdf && review.counts.warning > 0 && (
          <p className="notice border-amber-500 bg-amber-950/20 text-amber-100">
            Há avisos para conferir, mas eles não impedem a geração do PDF.
          </p>
        )}
        {error && (
          <p role="alert" className="text-rose-200">
            {error}
          </p>
        )}
        {referenceWarning && (
          <p className="notice border-amber-500 bg-amber-950/20 text-amber-100">
            {referenceWarning}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="subpanel p-5">
            <FileSearch className="text-cyan-300" aria-hidden="true" />
            <h3 className="mt-3 subsection-title">Memorial em PDF</h3>
            <p className="mt-2 break-all text-sm text-slate-300">
              Nome sugerido: <code>{memorialPdfFilename(project)}</code>
            </p>
            <Button
              className="mt-4"
              onClick={() => void generatePdf()}
              disabled={review.blocksPdf || Boolean(invalid) || busy || generating}
            >
              <Download className="mr-2" size={17} aria-hidden="true" />
              {generating ? 'Gerando PDF…' : 'Gerar PDF'}
            </Button>
          </article>
          <article className="subpanel p-5">
            <FileSearch className="text-cyan-300" aria-hidden="true" />
            <h3 className="mt-3 subsection-title">Formulários e anexos normativos</h3>
            <p className="mt-2 break-all text-sm text-slate-300">
              Nome sugerido: <code>{normativeFormsPdfFilename(project)}</code>
            </p>
            <Button
              className="mt-4"
              onClick={() => void generateForms()}
              disabled={review.blocksPdf || Boolean(invalid) || busy || generating || !dataset}
            >
              <Download className="mr-2" size={17} aria-hidden="true" />
              {generating ? 'Gerando PDF…' : 'Gerar formulários'}
            </Button>
          </article>
          <article className="subpanel p-5">
            <FileJson className="text-cyan-300" aria-hidden="true" />
            <h3 className="mt-3 subsection-title">Projeto em JSON</h3>
            <p className="mt-2 break-all text-sm text-slate-300">
              Nome sugerido: <code>{projectJsonFilename(project)}</code>
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={onExportJson}
              disabled={Boolean(invalid) || busy}
            >
              <FileJson className="mr-2" size={17} aria-hidden="true" />
              Exportar JSON
            </Button>
          </article>
        </div>
      </section>

      <section className="panel" aria-labelledby="import-another-title">
        <h2 id="import-another-title" className="section-title">
          Importar outra cópia JSON
        </h2>
        <p className="mt-2 text-slate-300">
          A importação cria outro projeto local e preserva este projeto.
        </p>
        <ProjectImport disabled={busy} onImport={onImport} />
      </section>
    </div>
  );
}
