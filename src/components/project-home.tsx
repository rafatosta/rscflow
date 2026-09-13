import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { LocalProject } from '@/domain/local-project';
import type { ProjectExport } from '@/domain/project';
import {
  completion,
  createDraft,
  datasets,
  levelLabel,
  levels,
  projectTitle,
} from '@/features/project-shell/project-view';
import { projectPath } from '@/features/project-shell/routes';
import type { RscLevel } from '@/domain/regulation';
import { ProjectImport } from './project-import';
import { Button } from './ui/button';

export function ProjectHome({
  projects,
  active,
  busy,
  onCreate,
  onDuplicate,
  onDelete,
  onExport,
  onRefresh,
}: {
  projects: LocalProject[];
  active?: LocalProject;
  busy: boolean;
  onCreate: (project: ProjectExport) => void;
  onDuplicate: (record: LocalProject) => void;
  onDelete: (record: LocalProject) => void;
  onExport: (record: LocalProject) => void;
  onRefresh: () => void;
}) {
  const [error, setError] = useState('');
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      onCreate(createDraft(String(form.get('level')) as RscLevel, String(form.get('dataset'))));
    } catch {
      setError('Selecione um nível RSC e um dataset disponível.');
    }
  }
  return (
    <div className="space-y-8">
      <p className="max-w-2xl leading-7 text-slate-300">
        Organize seu processo de RSC e continue de onde parou. Os dados ficam neste navegador;
        exporte uma cópia para guardar ou levar a outro computador.
      </p>
      <section aria-label="Novo projeto" className="panel">
        <h2 className="mb-4 section-title">Novo projeto</h2>
        <form
          onSubmit={create}
          className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_2fr_auto]"
        >
          <label>
            RSC pretendido
            <select name="level" className="field" required disabled={busy}>
              <option value="">Selecione</option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {levelLabel(level)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Regulamento / dataset
            <select name="dataset" className="field" required disabled={busy}>
              {datasets.map(({ metadata }) => (
                <option key={metadata.regulation.id} value={metadata.regulation.id}>
                  {metadata.regulation.authority} {metadata.regulation.number}/
                  {metadata.regulation.year}
                  {metadata.status !== 'validated' ? ' — catálogo pendente' : ''}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={busy}>
            Criar projeto
          </Button>
        </form>
        <p className="mt-3 text-sm text-amber-200">
          Você pode começar o processo com o catálogo pendente. A pontuação depende da validação
          normativa.
        </p>
        {error && <p role="alert">{error}</p>}
      </section>
      <section aria-label="Projetos locais" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Projetos locais</h2>
          <Button variant="outline" disabled={busy} onClick={onRefresh}>
            Atualizar lista
          </Button>
        </div>
        {active && (
          <Link className="text-link" to={projectPath(active.localId)}>
            Continuar último projeto
          </Link>
        )}
        {!projects.length && !busy && (
          <div className="panel">
            <h3 className="font-semibold">Nenhum projeto local</h3>
            <p className="mt-2 text-slate-300">
              Crie seu primeiro projeto acima ou importe um arquivo JSON abaixo.
            </p>
          </div>
        )}
        <div className="grid gap-4 xl:grid-cols-2">
          {projects.map((record) => {
            const progress = completion(record.project);
            return (
              <article
                key={record.localId}
                className="panel min-w-0"
                aria-label={projectTitle(record.project)}
              >
                <h3 className="break-words subsection-title">{projectTitle(record.project)}</h3>
                <p className="mt-2 text-sm text-cyan-200">
                  {record.project.schemaVersion === '1.0'
                    ? 'Formato legado'
                    : record.project.userData.request
                      ? levelLabel(record.project.userData.request.level)
                      : 'RSC não informado'}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  Última alteração:{' '}
                  <time dateTime={record.updatedAt}>
                    {new Date(record.updatedAt).toLocaleString('pt-BR')}
                  </time>
                </p>
                <div className="my-4">
                  <label className="text-sm" htmlFor={`progress-${record.localId}`}>
                    Preenchimento aproximado: {progress.percent}%
                  </label>
                  <progress
                    className="mt-2 block h-2 w-full accent-cyan-400"
                    id={`progress-${record.localId}`}
                    max={100}
                    value={progress.percent}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to={projectPath(record.localId)}>Continuar</Link>
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => onDuplicate(record)}>
                    Duplicar
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => onExport(record)}>
                    Exportar JSON
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => onDelete(record)}>
                    Excluir
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="panel" aria-label="Importar projeto">
        <h2 className="section-title">Verificar arquivo de projeto</h2>
        <ProjectImport disabled={busy} onImport={onCreate} />
      </section>
    </div>
  );
}
