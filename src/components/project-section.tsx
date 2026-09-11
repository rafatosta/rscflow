import { Link } from 'react-router-dom';
import type { FormEvent } from 'react';
import type { LocalProject } from '@/domain/local-project';
import type { TypedProjectExport } from '@/domain/project';
import {
  completion,
  levelLabel,
  linkedDataset,
  projectScoring,
} from '@/features/project-shell/project-view';
import { projectPath, type Section } from '@/features/project-shell/routes';
import { buildMemorialPreview } from '@/memorial/preview';
import { EducationSection } from './education-section';
import { TeacherProfileForm } from './teacher-profile-form';
import { TrajectorySection } from './trajectory-section';
import { Button } from './ui/button';

type Props = {
  record: LocalProject;
  section: Section;
  draft: string;
  invalid: string;
  busy: boolean;
  edit: (text: string) => void;
  onExport: () => void;
};
function values(event: FormEvent<HTMLFormElement>) {
  return Object.fromEntries(new FormData(event.currentTarget));
}

function JsonEditor({
  draft,
  edit,
  busy,
  invalid,
}: Pick<Props, 'draft' | 'edit' | 'busy' | 'invalid'>) {
  return (
    <div className="space-y-3">
      <label htmlFor="project-data">Dados editáveis do projeto (JSON)</label>
      <textarea
        id="project-data"
        className="field min-h-80 font-mono text-sm"
        value={draft}
        onChange={(event) => edit(event.target.value)}
        disabled={busy}
        aria-invalid={Boolean(invalid)}
        aria-describedby={invalid ? 'data-error' : undefined}
      />
      {invalid && (
        <p id="data-error" role="alert" className="text-rose-200">
          {invalid}
        </p>
      )}
    </div>
  );
}

export function ProjectSection(props: Props) {
  const { record, section, edit, busy, onExport } = props;
  if (record.project.schemaVersion === '1.0')
    return (
      <div className="panel space-y-5">
        <h2 className="text-xl font-semibold">Projeto no formato legado</h2>
        <p>
          Os dados originais são preservados sem conversão automática. Você pode editá-los e
          exportá-los neste formato.
        </p>
        <JsonEditor {...props} />
        <Button onClick={onExport} disabled={Boolean(props.invalid)}>
          Exportar JSON
        </Button>
      </div>
    );
  const project: TypedProjectExport = record.project;
  const data = project.userData;
  const update = (patch: Partial<typeof data>) => edit(JSON.stringify({ ...data, ...patch }));
  const progress = completion(project);
  const dataset = linkedDataset(project);
  const scoring = projectScoring(project);

  if (section === '')
    return (
      <div className="space-y-6">
        <section className="panel">
          <h2 className="text-xl font-semibold">Seu memorial, etapa por etapa</h2>
          <p className="mt-3 text-slate-300">
            {progress.percent}% de preenchimento aproximado. Este indicador organiza o trabalho; não
            representa pontuação ou elegibilidade.
          </p>
          <progress
            aria-label="Progresso de preenchimento"
            className="my-4 h-3 w-full accent-cyan-400"
            value={progress.percent}
            max={100}
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {progress.items.map((item) => (
              <li key={item.section}>
                <Link
                  className="block rounded border border-slate-600 p-3 hover:bg-slate-800"
                  to={projectPath(record.localId, item.section)}
                >
                  {item.complete ? '✓ ' : '○ '}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2 className="text-xl font-semibold">Regulamento vinculado</h2>
          <p className="mt-3 break-words">
            {project.regulation.id} / {project.regulation.version ?? 'versão normativa pendente'}
          </p>
          <p className="mt-3 text-amber-200">
            {scoring.status === 'unavailable'
              ? scoring.issues.map((issue) => issue.message).join(' ')
              : 'Dataset disponível para avaliação quantitativa.'}
          </p>
        </section>
      </div>
    );

  if (section === 'profile')
    return (
      <TeacherProfileForm
        project={project}
        disabled={busy}
        onSave={(userData) => edit(JSON.stringify(userData))}
      />
    );

  if (section === 'education')
    return (
      <EducationSection
        education={data.education}
        disabled={busy}
        onSave={(education) => update({ education })}
      />
    );

  if (section === 'activities')
    return (
      <TrajectorySection
        activities={data.activities}
        evidences={data.evidence}
        criterionRequired={project.schemaVersion === '2.0'}
        disabled={busy}
        onSave={(patch) => update(patch)}
      />
    );

  if (section === 'criteria')
    return (
      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Enquadramento das atividades</h2>
        {!dataset || dataset.metadata.status !== 'validated' ? (
          <p className="text-amber-200">
            O catálogo vinculado não está disponível para enquadramento validado. Os vínculos
            existentes são preservados; nenhuma opção normativa será inventada.
          </p>
        ) : (
          <p>Escolha um único critério e nível por atividade.</p>
        )}
        {!data.activities.length && (
          <p>
            Nenhuma atividade para enquadrar.{' '}
            <Link
              className="text-cyan-300 underline"
              to={projectPath(record.localId, 'activities')}
            >
              Registrar trajetória
            </Link>
          </p>
        )}
        {data.activities.map((activity) => (
          <div className="rounded border border-slate-600 p-4" key={activity.id}>
            <h3 className="font-medium">{activity.title}</h3>
            <p className="my-2 break-words text-sm text-slate-300">
              Vínculo atual: {activity.criterionId || 'não definido'} ·{' '}
              {activity.selectedLevel ? levelLabel(activity.selectedLevel) : 'nível não escolhido'}
            </p>
            {dataset?.metadata.status === 'validated' && (
              <label className="block">
                Critério de {activity.title}
                <select
                  className="field"
                  disabled={busy}
                  value={activity.criterionId}
                  onChange={(event) => {
                    const criterionId = event.target.value;
                    const level = dataset.levels.find((entry) =>
                      entry.criteria.some((criterion) => criterion.id === criterionId),
                    );
                    if (level)
                      update({
                        activities: data.activities.map((item) =>
                          item.id === activity.id
                            ? { ...item, criterionId, selectedLevel: level.section }
                            : item,
                        ),
                      });
                  }}
                >
                  <option value="">Selecione</option>
                  {dataset.levels.map((level) => (
                    <optgroup key={level.section} label={levelLabel(level.section)}>
                      {level.criteria.map((criterion) => (
                        <option key={criterion.id} value={criterion.id}>
                          {criterion.code} — {criterion.description} ({criterion.unit})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            )}
          </div>
        ))}
      </section>
    );

  if (section === 'scoring')
    return (
      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Resultado quantitativo</h2>
        {scoring.status === 'unavailable' ? (
          <>
            <p className="text-amber-200">Cálculo indisponível</p>
            <ul className="list-inside list-disc">
              {scoring.issues.map((issue, index) => (
                <li key={index}>{issue.message}</li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p>
              {scoring.status === 'quantitative-requirements-met'
                ? 'Requisitos quantitativos atingidos'
                : 'Requisitos quantitativos ainda não atingidos'}
            </p>
            <ul>
              {scoring.levels.map((level) => (
                <li key={level.level}>
                  {levelLabel(level.level)}: {level.score}
                </li>
              ))}
            </ul>
            <p>Total: {scoring.total}</p>
          </>
        )}
        <p className="text-sm text-slate-300">
          O resultado quantitativo não representa concessão de RSC.
        </p>
      </section>
    );

  if (section === 'memorial')
    return (
      <section className="panel">
        <h2 className="mb-4 text-xl font-semibold">Texto do memorial</h2>
        <form
          className="space-y-4"
          onSubmit={(event) => event.preventDefault()}
          onChange={(event) => {
            const form = values(event);
            update({
              memorial: {
                title: String(form.title),
                introduction: String(form.introduction),
                conclusion: String(form.conclusion),
              },
            });
          }}
        >
          <label className="block">
            Título do memorial
            <input
              className="field"
              name="title"
              defaultValue={data.memorial?.title ?? data.title}
              disabled={busy}
              required
            />
          </label>
          <label className="block">
            Introdução
            <textarea
              className="field min-h-40"
              name="introduction"
              defaultValue={data.memorial?.introduction ?? ''}
              disabled={busy}
            />
          </label>
          <label className="block">
            Conclusão
            <textarea
              className="field min-h-40"
              name="conclusion"
              defaultValue={data.memorial?.conclusion ?? ''}
              disabled={busy}
            />
          </label>
        </form>
        <Link
          className="mt-5 inline-block text-cyan-300 underline"
          to={projectPath(record.localId, 'preview')}
        >
          Ver prévia do memorial
        </Link>
      </section>
    );

  if (section === 'preview')
    return (
      <section className="panel">
        <h2 className="mb-4 text-xl font-semibold">Prévia textual</h2>
        <p className="mb-6 text-sm text-slate-300">
          Montada com os textos, formações e atividades registrados no projeto.
        </p>
        <article className="whitespace-pre-wrap break-words rounded bg-white p-5 leading-8 text-slate-950">
          {buildMemorialPreview(project)}
        </article>
      </section>
    );

  if (section === 'review')
    return (
      <section className="panel space-y-4">
        <h2 className="text-xl font-semibold">Revisão do preenchimento</h2>
        <p className="text-slate-300">
          Esta lista ajuda a organizar o memorial e não substitui a análise normativa.
        </p>
        <ul className="space-y-3">
          {progress.items.map((item) => (
            <li key={item.section}>
              <Link
                className="text-cyan-300 underline"
                to={projectPath(record.localId, item.section)}
              >
                {item.complete ? 'Preenchido' : 'A revisar'}: {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <p>Comprovantes registrados: {data.evidence.length}</p>
        <p className="text-amber-200">
          {scoring.status === 'unavailable'
            ? 'A avaliação quantitativa permanece indisponível.'
            : 'Consulte o resultado quantitativo em Pontuação.'}
        </p>
      </section>
    );

  return (
    <section className="panel space-y-5">
      <h2 className="text-xl font-semibold">Cópia portátil do projeto</h2>
      <p>
        O JSON inclui todos os dados editáveis e a referência normativa vinculada. Importe-o em
        outro navegador para continuar o trabalho.
      </p>
      <Button onClick={onExport} disabled={Boolean(props.invalid)}>
        Exportar JSON
      </Button>
      <details>
        <summary className="cursor-pointer font-medium">Edição avançada dos dados JSON</summary>
        <div className="mt-4">
          <JsonEditor {...props} />
        </div>
      </details>
    </section>
  );
}
