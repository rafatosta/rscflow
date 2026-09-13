import { useEffect, useState } from 'react';
import { activityProjectView } from '@/domain/project-migration';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LocalProject } from '@/domain/local-project';
import type { CalculationResult } from '@/domain/scoring';
import type { OccurrenceProjectExport } from '@/domain/criterion-entry';
import type { FileResolver } from '@/domain/local-files';
import {
  finalArtifactLabels,
  reviewProject,
  type ArtifactReadiness,
  type ReviewFinding,
} from '@/features/final-review/review';
import {
  prepareEvidenceArtifacts,
  type EvidencePreparation,
} from '@/features/final-documents/prepare';
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
    <li className={`notice ${presentation.className}`}>
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
            className="mt-3 inline-block text-sm text-link"
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
  evidenceProject,
  resolver,
}: {
  record: LocalProject;
  scoring: CalculationResult;
  evidenceProject?: OccurrenceProjectExport;
  resolver?: FileResolver;
}) {
  const [evidenceState, setEvidenceState] = useState<{
    project: typeof evidenceProject;
    resolver: typeof resolver;
    result: EvidencePreparation;
  }>();
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
  if (record.project.schemaVersion === '1.0') return null;
  const evidence =
    evidenceState &&
    evidenceState.project === evidenceProject &&
    evidenceState.resolver === resolver
      ? evidenceState.result
      : undefined;
  const review = reviewProject(activityProjectView(record.project), scoring, evidence);
  const readinessLabel: Record<ArtifactReadiness['status'], string> = {
    ready: 'Disponível',
    limited: 'Disponível com avisos',
    blocked: 'Bloqueado',
    checking: 'Verificando',
  };
  return (
    <div className="space-y-5">
      <section className="panel space-y-4" aria-labelledby="review-summary-title">
        <div className="flex items-start gap-3">
          {review.blocksPdf || review.counts.error > 0 ? (
            <AlertCircle className="mt-1 shrink-0 text-rose-300" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-1 shrink-0 text-emerald-300" aria-hidden="true" />
          )}
          <div>
            <h2 id="review-summary-title" className="section-title">
              {review.blocksPdf
                ? 'Correções necessárias'
                : review.counts.error > 0
                  ? 'Há pendências em alguns artefatos'
                  : 'Documentos prontos para exportação'}
            </h2>
            <p className="mt-2 text-slate-300">
              {review.blocksPdf
                ? 'Resolva os erros estruturais para liberar o Memorial. Consulte abaixo a situação dos demais artefatos.'
                : review.counts.error > 0
                  ? 'Cada erro bloqueia somente os artefatos que dependem do dado ou arquivo afetado.'
                  : 'Você pode prosseguir com os artefatos disponíveis; avisos e condições provisórias permanecem explícitos.'}
            </p>
          </div>
        </div>
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="metric border-rose-600">
            <dt className="text-sm text-rose-200">ERROR</dt>
            <dd className="text-2xl font-semibold">{review.counts.error}</dd>
          </div>
          <div className="metric border-amber-600">
            <dt className="text-sm text-amber-200">WARNING</dt>
            <dd className="text-2xl font-semibold">{review.counts.warning}</dd>
          </div>
          <div className="metric border-cyan-700">
            <dt className="text-sm text-cyan-200">INFO</dt>
            <dd className="text-2xl font-semibold">{review.counts.info}</dd>
          </div>
        </dl>
        <div>
          <h3 className="subsection-title">Prontidão dos artefatos</h3>
          <dl className="mt-3 grid gap-3 md:grid-cols-2" aria-label="Prontidão dos artefatos">
            {Object.entries(review.artifacts).map(([artifact, readiness]) => (
              <div className="metric" key={artifact}>
                <dt className="text-sm text-slate-300">
                  {finalArtifactLabels[artifact as keyof typeof review.artifacts]}
                </dt>
                <dd className="mt-1 font-semibold">{readinessLabel[readiness.status]}</dd>
                {readiness.reasons.map((reason) => (
                  <dd className="mt-1 text-sm text-slate-300" key={reason}>
                    {reason}
                  </dd>
                ))}
              </div>
            ))}
          </dl>
        </div>
        <Button asChild>
          <Link to={projectPath(record.localId, 'documents')}>Gerar documentos</Link>
        </Button>
      </section>
      <section aria-labelledby="review-findings-title">
        <h2 id="review-findings-title" className="mb-4 section-title">
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
