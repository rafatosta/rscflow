import { activityProjectView } from '@/domain/project-migration';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LocalProject } from '@/domain/local-project';
import type { CalculationResult } from '@/domain/scoring';
import { reviewProject, type ReviewFinding } from '@/features/final-review/review';
import { projectPath } from '@/features/project-shell/routes';
import { Button } from './ui/button';

const severityPresentation = {
  error: {
    label: 'ERROR',
    icon: AlertCircle,
    className: 'border-rose-500 bg-rose-950/30',
    text: 'text-rose-200',
  },
  warning: {
    label: 'WARNING',
    icon: TriangleAlert,
    className: 'border-amber-500 bg-amber-950/20',
    text: 'text-amber-200',
  },
  info: {
    label: 'INFO',
    icon: Info,
    className: 'border-cyan-700 bg-cyan-950/20',
    text: 'text-cyan-200',
  },
} as const;

function Finding({ finding, localId }: { finding: ReviewFinding; localId: string }) {
  const presentation = severityPresentation[finding.severity];
  const Icon = presentation.icon;
  return (
    <li className={`rounded-lg border p-4 ${presentation.className}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 shrink-0 ${presentation.text}`} size={20} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold tracking-wider ${presentation.text}`}>
              {presentation.label}
            </span>
            <h3 className="font-semibold">{finding.label}</h3>
          </div>
          <p className="mt-2 leading-6 text-slate-200">{finding.message}</p>
          <Link
            className="mt-3 inline-block text-sm text-cyan-300 underline"
            to={projectPath(localId, finding.section)}
          >
            Revisar {finding.label.toLowerCase()}
          </Link>
        </div>
      </div>
    </li>
  );
}

export function FinalReview({
  record,
  scoring,
}: {
  record: LocalProject;
  scoring: CalculationResult;
}) {
  if (record.project.schemaVersion === '1.0') return null;
  const review = reviewProject(activityProjectView(record.project), scoring);
  return (
    <div className="space-y-5">
      <section className="panel space-y-4" aria-labelledby="review-summary-title">
        <div className="flex items-start gap-3">
          {review.blocksPdf ? (
            <AlertCircle className="mt-1 shrink-0 text-rose-300" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" />
          )}
          <div>
            <h2 id="review-summary-title" className="text-xl font-semibold">
              {review.blocksPdf ? 'Correções necessárias' : 'Documento pronto para exportação'}
            </h2>
            <p className="mt-2 text-slate-300">
              {review.blocksPdf
                ? 'Resolva os erros para liberar o PDF final. Avisos não bloqueiam a exportação.'
                : 'Você pode prosseguir mesmo com avisos; revise-os conforme os documentos do processo.'}
            </p>
          </div>
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded border border-rose-600 p-3">
            <dt className="text-sm text-rose-200">ERROR</dt>
            <dd className="text-2xl font-semibold">{review.counts.error}</dd>
          </div>
          <div className="rounded border border-amber-600 p-3">
            <dt className="text-sm text-amber-200">WARNING</dt>
            <dd className="text-2xl font-semibold">{review.counts.warning}</dd>
          </div>
          <div className="rounded border border-cyan-700 p-3">
            <dt className="text-sm text-cyan-200">INFO</dt>
            <dd className="text-2xl font-semibold">{review.counts.info}</dd>
          </div>
        </dl>
        <Button asChild>
          <Link to={projectPath(record.localId, 'documents')}>Gerar documentos</Link>
        </Button>
      </section>
      <section aria-labelledby="review-findings-title">
        <h2 id="review-findings-title" className="mb-4 text-xl font-semibold">
          Checklist final
        </h2>
        <ul className="space-y-3">
          {review.findings.map((item) => (
            <Finding key={item.id} finding={item} localId={record.localId} />
          ))}
        </ul>
      </section>
    </div>
  );
}
