import { RscSection } from './rsc-section';
import { ChronologicalView } from './chronological-view';
import { ProcessOverview } from './process-overview';
import {
  activityProjectView,
  applyActivityProjectEdits,
  migrateProject,
} from '@/domain/project-migration';
import { draftProjectExportSchema } from '@/domain/project';
import { Link } from 'react-router-dom';
import type { LocalProject } from '@/domain/local-project';
import type { ProjectExport, TypedProjectExport } from '@/domain/project';
import { completion, linkedDataset, projectScoring } from '@/features/project-shell/project-view';
import { projectPath, type Section } from '@/features/project-shell/routes';
import { CriteriaExplorer } from './criteria-explorer';
import { EducationSection } from './education-section';
import { FinalExport } from './final-export';
import { FinalReview } from './final-review';
import { MemorialSection } from './memorial-section';
import { PdfPreview } from './pdf-preview';
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
  onImport: (project: ProjectExport) => void;
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

function ActivityProjectSection(props: Props & { sourceProps?: Props }) {
  const { record, section, edit, busy, onExport } = props;
  if (record.project.schemaVersion === '1.0')
    return (
      <div className="panel space-y-5">
        <h2 className="text-xl font-semibold">Projeto no formato legado</h2>
        <p>
          Os dados originais são preservados sem conversão automática. Você pode editá-los e
          exportá-los neste formato.
        </p>
        <JsonEditor {...(props.sourceProps ?? props)} />
        <Button onClick={onExport} disabled={Boolean(props.invalid)}>
          Exportar JSON
        </Button>
      </div>
    );
  const project = record.project as TypedProjectExport;
  const data = project.userData;
  const update = (patch: Partial<typeof data>) => edit(JSON.stringify({ ...data, ...patch }));
  const progress = completion(project);
  const dataset = linkedDataset(project);
  const scoring = projectScoring(project);

  if (section === '')
    return (
      <div className="space-y-6">
        <section className="panel">
          <h2 className="text-xl font-semibold">Seu processo de RSC</h2>
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
              <li key={item.label}>
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
        <ProcessOverview record={props.sourceProps?.record ?? record} />
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

  if (section === 'rsc-i' || section === 'rsc-ii' || section === 'rsc-iii')
    return (
      <RscSection
        level={section}
        dataset={dataset}
        scoring={scoring}
        activities={data.activities}
        evidences={data.evidence}
        disabled={busy}
        onSave={(activities) => update({ activities })}
      />
    );
  if (section === 'timeline')
    return (
      <ChronologicalView
        activities={data.activities}
        evidences={data.evidence}
        localId={record.localId}
      />
    );
  if (section === 'evidence')
    return (
      <TrajectorySection
        evidenceOnly
        activities={data.activities}
        evidences={data.evidence}
        criterionRequired={false}
        disabled={busy}
        onSave={(patch) => update(patch)}
      />
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

  if (section === 'preview') return <PdfPreview record={record} />;

  if (section === 'review') return <FinalReview record={record} scoring={scoring} />;

  if (section === 'export')
    return (
      <>
        {!props.sourceProps && (
          <Button
            disabled={busy || Boolean(props.invalid)}
            onClick={() => props.onImport(migrateProject(project).project)}
          >
            Migrar para critérios e ocorrências em nova cópia
          </Button>
        )}
        {!props.sourceProps && (
          <p className="my-3 text-sm text-slate-300">
            A cópia original será preservada. Referências incompletas e textos manuais serão
            mantidos.
          </p>
        )}
        <FinalExport
          record={record}
          scoring={scoring}
          busy={busy}
          invalid={props.invalid}
          onExportJson={onExport}
          onImport={props.onImport}
        />
        <section className="panel mt-6">
          <details>
            <summary className="cursor-pointer font-medium">Edição avançada dos dados JSON</summary>
            <div className="mt-4">
              <JsonEditor {...(props.sourceProps ?? props)} />
            </div>
          </details>
        </section>
      </>
    );

  return null;
}

export function ProjectSection(props: Props) {
  if (props.record.project.schemaVersion !== '3.0') return <ActivityProjectSection {...props} />;
  const original = props.record.project;
  const view = activityProjectView(original);
  return (
    <ActivityProjectSection
      {...props}
      sourceProps={props}
      record={{ ...props.record, project: view }}
      edit={(text) => {
        const edited = draftProjectExportSchema.safeParse({ ...view, userData: JSON.parse(text) });
        if (!edited.success) {
          props.edit(text);
          return;
        }
        props.edit(JSON.stringify(applyActivityProjectEdits(original, edited.data).userData));
      }}
    />
  );
}
