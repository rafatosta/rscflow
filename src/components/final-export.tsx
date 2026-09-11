import { useState } from 'react';
import { Download, FileJson, FileSearch } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LocalProject } from '@/domain/local-project';
import type { ProjectExport, TypedProjectExport } from '@/domain/project';
import type { CalculationResult } from '@/domain/scoring';
import { reviewProject } from '@/features/final-review/review';
import { projectJsonFilename } from '@/features/local-projects/project-files';
import { projectPath } from '@/features/project-shell/routes';
import { memorialPdfFilename } from '@/pdf/file-name';
import { ProjectImport } from './project-import';
import { Button } from './ui/button';

export function FinalExport({
  record,
  scoring,
  busy,
  invalid,
  onExportJson,
  onImport,
}: {
  record: LocalProject;
  scoring: CalculationResult;
  busy: boolean;
  invalid: string;
  onExportJson: () => void;
  onImport: (project: ProjectExport) => void;
}) {
  const project = record.project as TypedProjectExport;
  const review = reviewProject(project, scoring);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function generatePdf() {
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

  return (
    <div className="space-y-6">
      <section className="panel space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Arquivos finais e cópia portátil</h2>
          <p className="mt-2 text-slate-300">
            Os arquivos são preparados neste navegador e não são enviados para nenhum serviço.
          </p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded border border-slate-600 p-4">
            <dt className="text-sm text-slate-300">Último autosave</dt>
            <dd className="mt-1">
              <time dateTime={record.updatedAt}>
                {new Date(record.updatedAt).toLocaleString('pt-BR')}
              </time>
            </dd>
          </div>
          <div className="rounded border border-slate-600 p-4">
            <dt className="text-sm text-slate-300">Revisão</dt>
            <dd className="mt-1">
              {review.counts.error} erro(s) e {review.counts.warning} aviso(s)
            </dd>
          </div>
        </dl>

        {review.blocksPdf && (
          <div role="alert" className="rounded border border-rose-500 bg-rose-950/30 p-4">
            <p className="font-semibold text-rose-200">PDF final bloqueado</p>
            <p className="mt-1 text-slate-200">
              Corrija os itens ERROR da revisão. O JSON continua disponível como cópia portátil.
            </p>
            <Link
              className="mt-2 inline-block text-cyan-300 underline"
              to={projectPath(record.localId, 'review')}
            >
              Ver checklist de revisão
            </Link>
          </div>
        )}
        {!review.blocksPdf && review.counts.warning > 0 && (
          <p className="rounded border border-amber-500 bg-amber-950/20 p-4 text-amber-100">
            Há avisos para conferir, mas eles não impedem a geração do PDF.
          </p>
        )}
        {error && (
          <p role="alert" className="text-rose-200">
            {error}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-lg border border-slate-600 p-5">
            <FileSearch className="text-cyan-300" aria-hidden="true" />
            <h3 className="mt-3 text-lg font-semibold">Memorial em PDF</h3>
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
          <article className="rounded-lg border border-slate-600 p-5">
            <FileJson className="text-cyan-300" aria-hidden="true" />
            <h3 className="mt-3 text-lg font-semibold">Projeto em JSON</h3>
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
        <h2 id="import-another-title" className="text-xl font-semibold">
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
