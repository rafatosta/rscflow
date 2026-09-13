import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LocalProject } from '@/domain/local-project';
import { activityProjectView } from '@/domain/project-migration';
import { projectFingerprint } from '@/features/local-projects/backup-status';
import { projectPath } from '@/features/project-shell/routes';
export function ProcessOverview({ record }: { record: LocalProject }) {
  const [changed, setChanged] = useState<boolean>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setChanged(undefined);
    setFailed(false);
    if (record.lastBackup)
      void projectFingerprint(record.project)
        .then((hash) => {
          if (active) setChanged(hash !== record.lastBackup?.fingerprint);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
    };
  }, [record.project, record.lastBackup]);
  if (record.project.schemaVersion === '1.0') return null;
  const data = activityProjectView(record.project).userData;
  const withoutCriterion = data.activities.filter(
    (item) => !item.criterionId || !item.selectedLevel,
  ).length;
  const withoutEvidence = data.activities.filter((item) => !item.evidenceIds.length).length;
  return (
    <section className="panel space-y-4">
      <h2 className="text-xl font-semibold">Comprovantes e backup</h2>
      <p>Comprovantes cadastrados: {data.evidence.length} referência(s).</p>
      <p>
        Pendências: {withoutCriterion} lançamento(s) sem enquadramento completo; {withoutEvidence}{' '}
        sem comprovante associado.
      </p>
      <Link className="text-cyan-300 underline" to={projectPath(record.localId, 'review')}>
        Conferir documentos na revisão
      </Link>
      <p>
        Último backup JSON:{' '}
        {record.lastBackup ? (
          <time dateTime={record.lastBackup.createdAt}>
            {new Date(record.lastBackup.createdAt).toLocaleString('pt-BR')}
          </time>
        ) : (
          'Nenhuma cópia gerada neste navegador.'
        )}
      </p>
      <p role="status">
        {!record.lastBackup
          ? 'Gere uma cópia JSON para proteger os dados do processo.'
          : failed
            ? 'Não foi possível comparar as alterações com o backup.'
            : changed === undefined
              ? 'Conferindo alterações desde o backup…'
              : changed
                ? 'Há alterações desde o último backup.'
                : 'Sem alterações desde o último backup.'}
      </p>
      <p className="text-sm text-slate-300">
        O registro indica a geração do download, não confirma a gravação do arquivo. O JSON não
        inclui comprovantes binários.
      </p>
    </section>
  );
}
