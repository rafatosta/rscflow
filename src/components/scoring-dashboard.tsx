import type { CalculationResult, CriterionScore } from '@/domain/scoring';
import { levelLabel } from '@/features/project-shell/project-view';

const levels = ['rsc-i', 'rsc-ii', 'rsc-iii'] as const;

function numberLabel(value: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 20 }).format(value);
}

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <p className={met ? 'text-emerald-200' : 'text-amber-200'}>
      <span aria-hidden="true">{met ? '✓' : '○'} </span>
      <span className="sr-only">{met ? 'Atingido: ' : 'Pendente: '}</span>
      {children}
    </p>
  );
}

function LevelCards({ result }: { result: CalculationResult }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {levels.map((level) => {
        const score =
          result.status === 'unavailable'
            ? undefined
            : result.levels.find((item) => item.level === level);
        return (
          <article className="rounded-lg border border-slate-600 p-4" key={level}>
            <h3 className="font-medium text-slate-300">{levelLabel(level)}</h3>
            <p className="mt-2 text-2xl font-semibold">
              {score ? numberLabel(score.score) : '—'} /{' '}
              {score
                ? numberLabel(score.maximumScore)
                : result.policy
                  ? numberLabel(result.policy.maximumLevelScore)
                  : '—'}
            </p>
          </article>
        );
      })}
    </div>
  );
}

function UsedItems({ criteria }: { criteria: CriterionScore[] }) {
  const used = criteria.filter((criterion) => criterion.submittedQuantity > 0);
  if (!used.length) return <p className="mt-3 text-sm text-slate-400">Nenhum item utilizado.</p>;
  return (
    <ul className="mt-3 space-y-2">
      {used.map((criterion) => (
        <li className="rounded border border-slate-700 p-3" key={criterion.criterionId}>
          <p className="font-medium">
            {criterion.code} — {criterion.description}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Quantidade informada: {numberLabel(criterion.submittedQuantity)} {criterion.unit} ·
            considerada: {numberLabel(criterion.countedQuantity)} · pontos:{' '}
            {numberLabel(criterion.score)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function ScoringDashboard({
  result,
  compact = false,
}: {
  result: CalculationResult;
  compact?: boolean;
}) {
  if (result.status === 'unavailable') {
    const partial = result.issues.some(
      (issue) => issue.code === 'pending-dataset' || issue.code === 'pending-policy',
    );
    return (
      <section
        className="panel space-y-4"
        aria-labelledby={compact ? 'score-summary' : 'score-title'}
      >
        <h2 id={compact ? 'score-summary' : 'score-title'} className="text-xl font-semibold">
          {compact ? 'Resumo da pontuação' : 'Resultado quantitativo'}
        </h2>
        <p role="status" className="font-medium text-amber-200">
          <span aria-hidden="true">○ </span>
          {partial ? 'Cálculo parcial' : 'Cálculo indisponível'}
        </p>
        {!compact && (
          <>
            <LevelCards result={result} />
            <div className="rounded-lg border border-slate-600 p-4">
              <h3 className="text-sm text-slate-400">Total geral</h3>
              <p className="mt-1 text-3xl font-semibold">—</p>
            </div>
          </>
        )}
        {result.policy && (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p>Mínimo total: {numberLabel(result.policy.minimumTotal)}</p>
            <p>
              Mínimo no nível pretendido: {numberLabel(result.policy.minimumRequestedLevel)}
              {result.policy.requestedLevel
                ? ` em ${levelLabel(result.policy.requestedLevel)}`
                : ''}
            </p>
          </div>
        )}
        <div>
          <h3 className="font-medium">Pendências</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-slate-300">
            {result.issues.map((issue, index) => (
              <li key={`${issue.code}-${issue.activityId ?? index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
        {!compact && (
          <p className="text-sm text-slate-300">
            Pontuações ausentes não são tratadas como zero. O resultado quantitativo não representa
            concessão de RSC.
          </p>
        )}
      </section>
    );
  }

  const requested = result.levels.find(
    (level) => level.level === result.requirements.requestedLevel,
  )!;
  return (
    <section
      className="panel space-y-5"
      aria-labelledby={compact ? 'score-summary' : 'score-title'}
    >
      <div>
        <h2 id={compact ? 'score-summary' : 'score-title'} className="text-xl font-semibold">
          {compact ? 'Resumo da pontuação' : 'Resultado quantitativo'}
        </h2>
        <p
          role="status"
          className={`mt-2 font-medium ${
            result.status === 'quantitative-requirements-met'
              ? 'text-emerald-200'
              : 'text-amber-200'
          }`}
        >
          <span aria-hidden="true">
            {result.status === 'quantitative-requirements-met' ? '✓ ' : '○ '}
          </span>
          {result.status === 'quantitative-requirements-met'
            ? 'Requisitos quantitativos atingidos'
            : 'Requisitos quantitativos ainda não atingidos'}
        </p>
      </div>

      <LevelCards result={result} />
      <div className="grid gap-4 rounded-lg border border-slate-600 p-4 sm:grid-cols-3">
        <div>
          <h3 className="text-sm text-slate-400">Total geral</h3>
          <p className="mt-1 text-3xl font-semibold">{numberLabel(result.total)}</p>
        </div>
        <Requirement met={result.requirements.totalMet}>
          Mínimo total: {numberLabel(result.policy.minimumTotal)}
        </Requirement>
        <Requirement met={result.requirements.requestedLevelMet}>
          Mínimo em {levelLabel(result.requirements.requestedLevel)}: {numberLabel(requested.score)}{' '}
          / {numberLabel(result.policy.minimumRequestedLevel)}
        </Requirement>
      </div>

      {!compact && (
        <>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Pontuação por diretriz</h3>
            {result.directives.map((directive) => {
              const criteria = result.criteria.filter(
                (criterion) => criterion.directiveId === directive.directiveId,
              );
              return (
                <details
                  className="rounded-lg border border-slate-600 p-4 open:bg-slate-900"
                  key={directive.directiveId}
                >
                  <summary className="cursor-pointer font-medium">
                    {levelLabel(directive.level)} · {directive.title} —{' '}
                    {numberLabel(directive.score)} / {numberLabel(directive.maxScore)}
                  </summary>
                  <div className="mt-4">
                    <progress
                      className="h-3 w-full accent-cyan-400"
                      aria-label={`Progresso de ${directive.title}`}
                      value={directive.score}
                      max={directive.maxScore}
                    />
                    <p className="mt-2 text-sm text-slate-300">
                      Itens utilizados: {directive.itemsUsed} · experiências utilizadas:{' '}
                      {directive.experiencesUsed}
                    </p>
                    {directive.maximumReached && (
                      <p className="mt-2 font-medium text-emerald-200">
                        <span aria-hidden="true">✓ </span>Pontuação máxima da diretriz atingida.
                      </p>
                    )}
                    <UsedItems criteria={criteria} />
                  </div>
                </details>
              );
            })}
          </div>
          <p className="text-sm text-slate-300">
            Experiências acima dos limites continuam no memorial, mesmo quando não aumentam a
            pontuação. O resultado quantitativo não representa concessão de RSC.
          </p>
        </>
      )}
    </section>
  );
}
