import { useEffect, useState } from 'react';
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
import {
  evidenceBundlePdfFilename,
  memorialPdfFilename,
  normativeFormsPdfFilename,
} from '@/pdf/file-name';
import {
  prepareEvidenceArtifacts,
  evidencePreparationMessage,
  type EvidencePreparation,
} from '@/features/final-documents/prepare';
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
  const [generating, setGenerating] = useState<'memorial' | 'forms' | 'evidence' | null>(null);
  const [error, setError] = useState('');
  const [referenceWarning, setReferenceWarning] = useState('');

  const [evidenceState, setEvidenceState] = useState<{
    project: typeof evidenceProject;
    resolver: typeof resolver;
    result: EvidencePreparation;
  }>();
  const evidence =
    evidenceState?.project === evidenceProject && evidenceState?.resolver === resolver
      ? evidenceState?.result
      : undefined;
  useEffect(() => {
    let active = true;
    prepareEvidenceArtifacts(evidenceProject, resolver)
      .then((result) => {
        if (active) setEvidenceState({ project: evidenceProject, resolver, result });
      })
      .catch(() => {
        if (active)
          setEvidenceState({
            project: evidenceProject,
            resolver,
            result: {
              status: 'unavailable',
              message: 'Não foi possível verificar os comprovantes locais.',
            },
          });
      });
    return () => {
      active = false;
    };
  }, [evidenceProject, resolver]);

  async function generateEvidence() {
    setGenerating('evidence');
    setError('');
    try {
      const result = await prepareEvidenceArtifacts(evidenceProject, resolver);
      setEvidenceState({ project: evidenceProject, resolver, result });
      if (result.status !== 'success') {
        setError(evidencePreparationMessage(result));
        return;
      }
      const { downloadPdfBytes } = await import('@/pdf/download');
      downloadPdfBytes(result.bytes, evidenceBundlePdfFilename(project));
    } catch {
      setError('Não foi possível gerar o PDF dos comprovantes. Verifique os arquivos locais.');
    } finally {
      setGenerating(null);
    }
  }

  async function generatePdf() {
    setGenerating('memorial');
    setError('');
    setReferenceWarning('');
    try {
      const { downloadMemorialPdf } = await import('@/pdf/generator');
      let pageMap;
      const prepared = await prepareEvidenceArtifacts(evidenceProject, resolver);
      if (prepared.status === 'success') pageMap = prepared.pageMap;
      else if (project.userData.activities.some((item) => item.evidenceIds.length))
        setReferenceWarning(
          'O Memorial foi gerado sem referências de páginas. Verifique os comprovantes locais.',
        );
      if (pageMap) await downloadMemorialPdf(project, pageMap);
      else await downloadMemorialPdf(project);
    } catch {
      setError('Não foi possível gerar o PDF. Revise os dados e tente novamente.');
    } finally {
      setGenerating(null);
    }
  }

  async function generateForms() {
    if (!dataset) return setError('O catálogo normativo vinculado ao projeto não está disponível.');
    setGenerating('forms');
    setError('');
    try {
      let pageMap;
      const prepared = await prepareEvidenceArtifacts(evidenceProject, resolver);
      if (prepared.status === 'success') pageMap = prepared.pageMap;
      else if (prepared.status === 'error') throw new Error(evidencePreparationMessage(prepared));
      const { buildNormativeProcessDocument } = await import('@/normative-documents/model');
      const model = buildNormativeProcessDocument(project, dataset, scoring, pageMap);
      const { downloadNormativeFormsPdf } = await import('@/pdf/normative-forms');
      await downloadNormativeFormsPdf(project, model);
    } catch {
      setError(
        'Não foi possível gerar os formulários. Verifique os dados e os comprovantes locais.',
      );
    } finally {
      setGenerating(null);
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
            <p className="font-semibold text-rose-200">Memorial bloqueado</p>
            <p className="mt-1 text-slate-200">
              Corrija os itens ERROR da revisão para gerar o Memorial. O JSON e os comprovantes
              independem dessa revisão.
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
            Há avisos para conferir, mas eles não impedem a geração dos artefatos disponíveis.
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
            <h3 className="mt-3 subsection-title">Memorial Descritivo</h3>
            <p className="mt-2 text-sm" role="status">
              {review.blocksPdf
                ? 'Bloqueado: confira as correções na Revisão.'
                : 'Disponível: utiliza o texto e os dados atuais do projeto.'}
            </p>
            <p className="mt-2 text-sm">
              {evidence ? evidencePreparationMessage(evidence) : 'Verificando comprovantes…'}{' '}
              {evidence && evidence.status !== 'success'
                ? 'Referências de páginas podem ficar ausentes no Memorial.'
                : ''}
            </p>
            <p className="mt-2 break-all text-sm text-slate-300">
              Nome sugerido: <code>{memorialPdfFilename(project)}</code>
            </p>
            <Button
              className="mt-4"
              onClick={() => void generatePdf()}
              disabled={review.blocksPdf || Boolean(invalid) || busy || Boolean(generating)}
            >
              <Download className="mr-2" size={17} aria-hidden="true" />
              {generating === 'memorial' ? 'Gerando Memorial…' : 'Gerar PDF'}
            </Button>
          </article>
          <article className="subpanel p-5">
            <FileSearch className="text-cyan-300" aria-hidden="true" />
            <h3 className="mt-3 subsection-title">Formulários e anexos normativos</h3>
            <p className="mt-2 text-sm" role="status">
              {!dataset
                ? 'Bloqueado: catálogo vinculado indisponível.'
                : review.findings.some(
                      (item) =>
                        item.severity === 'error' &&
                        (item.area === 'identification' || item.area === 'request'),
                    )
                  ? 'Bloqueado: confira identificação e nível solicitado.'
                  : evidence?.status === 'error'
                    ? 'Bloqueado: corrija os arquivos dos comprovantes.'
                    : 'Disponível: utiliza os dados e cálculos atuais.'}
            </p>
            <p className="mt-2 text-sm">
              {scoring.status === 'unavailable'
                ? scoring.issues.map((issue) => issue.message).join(' ')
                : scoring.validation.message}{' '}
              Campos não registrados permanecem vazios.
            </p>
            <p className="mt-2 text-sm">
              {evidence ? evidencePreparationMessage(evidence) : 'Verificando comprovantes…'}
              {evidence && evidence.status !== 'success' && evidence.status !== 'error'
                ? ' As referências de páginas permanecerão ausentes.'
                : ''}
            </p>
            <p className="mt-2 break-all text-sm text-slate-300">
              Nome sugerido: <code>{normativeFormsPdfFilename(project)}</code>
            </p>
            <Button
              className="mt-4"
              onClick={() => void generateForms()}
              disabled={
                review.findings.some(
                  (item) =>
                    item.severity === 'error' &&
                    (item.area === 'identification' || item.area === 'request'),
                ) ||
                Boolean(invalid) ||
                busy ||
                Boolean(generating) ||
                !dataset ||
                evidence?.status === 'error'
              }
            >
              <Download className="mr-2" size={17} aria-hidden="true" />
              {generating === 'forms' ? 'Gerando formulários…' : 'Gerar formulários'}
            </Button>
          </article>
          <article className="subpanel p-5">
            <FileSearch className="text-cyan-300" aria-hidden="true" />
            <h3 className="mt-3 subsection-title">PDF consolidado dos comprovantes</h3>
            <p className="mt-2 text-sm" role="status">
              {evidence ? evidencePreparationMessage(evidence) : 'Verificando comprovantes…'}
            </p>
            <p className="mt-2 break-all text-sm text-slate-300">
              Nome sugerido: <code>{evidenceBundlePdfFilename(project)}</code>
            </p>
            <Button
              className="mt-4"
              onClick={() => void generateEvidence()}
              disabled={
                Boolean(invalid) || busy || Boolean(generating) || evidence?.status !== 'success'
              }
            >
              <Download className="mr-2" size={17} aria-hidden="true" />
              {generating === 'evidence' ? 'Gerando comprovantes…' : 'Gerar comprovantes'}
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
