import { Link } from 'react-router-dom';
import type { Activity, Evidence } from '@/domain/models';
import { sortActivitiesChronologically } from '@/features/trajectory/trajectory';
import { projectPath } from '@/features/project-shell/routes';
export function ChronologicalView({
  activities,
  evidences,
  localId,
}: {
  activities: Activity[];
  evidences: Evidence[];
  localId: string;
}) {
  return (
    <section className="panel space-y-4">
      <h2 className="text-xl font-semibold">Trajetória dos lançamentos</h2>
      <p>Visão cronológica derivada. Cadastre e edite lançamentos nas seções RSC.</p>
      {!activities.length && <p>Nenhum lançamento registrado.</p>}
      <ol className="space-y-4">
        {sortActivitiesChronologically(activities).map((item) => (
          <li key={item.id} className="rounded border border-slate-600 p-4 break-words">
            <h3 className="font-semibold">{item.title}</h3>
            <p>
              {item.startDate ?? 'Início não informado'} – {item.endDate ?? 'Fim não informado'}
            </p>
            <p>{item.description}</p>
            <p>
              Comprovantes:{' '}
              {item.evidenceIds
                .map((id) => evidences.find((e) => e.id === id)?.title)
                .filter(Boolean)
                .join(' · ') || 'Nenhum associado'}
            </p>
            <Link
              className="text-cyan-300 underline"
              to={projectPath(localId, item.selectedLevel ?? 'activities')}
            >
              {item.selectedLevel ? 'Ver nível RSC' : 'Revisar lançamento sem nível'}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
