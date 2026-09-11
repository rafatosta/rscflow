import { Link } from 'react-router-dom';
import type { LocalProject } from '@/domain/local-project';
import type { TypedProjectExport } from '@/domain/project';
import { completion, linkedDataset, projectScoring } from '@/features/project-shell/project-view';
import { projectPath, type Section } from '@/features/project-shell/routes';
import { buildMemorialDocument } from '@/memorial/preview';
import { CriteriaExplorer } from './criteria-explorer';
import { EducationSection } from './education-section';
import { MemorialSection } from './memorial-section';
import { ScoringDashboard } from './scoring-dashboard';
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
        <ScoringDashboard result={scoring} compact />
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
        dataset={dataset}
        criterionRequired={project.schemaVersion === '2.0'}
        disabled={busy}
        onSave={(patch) => update(patch)}
      />
    );

  if (section === 'criteria')
    return <CriteriaExplorer dataset={dataset} initialLevel={data.request?.level} />;

  if (section === 'scoring') return <ScoringDashboard result={scoring} />;

  if (section === 'memorial')
    return (
      <>
        <MemorialSection
          projectTitle={data.title}
          memorial={data.memorial}
          activities={data.activities}
          evidences={data.evidence}
          disabled={busy}
          onSave={(patch) => update(patch)}
        />
        <Link
          className="mt-5 inline-block text-cyan-300 underline"
          to={projectPath(record.localId, 'preview')}
        >
          Ver prévia do memorial
        </Link>
      </>
    );

  if (section === 'preview')
    return (
      <section className="panel">
        <h2 className="mb-4 text-xl font-semibold">Prévia textual</h2>
        <p className="mb-6 text-sm text-slate-300">
          Montada com os textos, formações e atividades registrados no projeto.
        </p>
        <article className="space-y-8 rounded bg-white p-5 leading-8 text-slate-950">
          {buildMemorialDocument(project).map((documentSection, index) => (
            <section key={documentSection.id} aria-labelledby={`preview-${documentSection.id}`}>
              <h2
                id={`preview-${documentSection.id}`}
                className={index === 0 ? 'text-2xl font-semibold' : 'text-xl font-semibold'}
              >
                {documentSection.title}
              </h2>
              <div className="mt-3 space-y-3 whitespace-pre-wrap break-words">
                {documentSection.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={`${documentSection.id}-${paragraphIndex}`}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
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
