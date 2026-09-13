import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { LocalProject } from '@/domain/local-project';
import type { FileResolver, SaveProjectChange } from '@/domain/local-files';
import type { ProjectExport } from '@/domain/project';
import { activityProjectView, migrateProject } from '@/domain/project-migration';
import {
  completion,
  linkedDataset,
  projectScoring,
  levelLabel,
  documentProject,
} from '@/features/project-shell/project-view';
import { projectPath, type Section } from '@/features/project-shell/routes';
import { RequirementsSection } from './requirements-section';
import { EducationSection } from './education-section';
import { TeacherProfileForm } from './teacher-profile-form';
import { MemorialSection } from './memorial-section';
import { FinalReview } from './final-review';
import { FinalExport } from './final-export';
import { PdfPreview } from './pdf-preview';
import { ScoringDashboard } from './scoring-dashboard';
import { ProcessOverview } from './process-overview';
import { ProjectDocuments } from './project-documents';
import { Button } from './ui/button';

type Props = {
  record: LocalProject;
  section: Section;
  draft: string;
  invalid: string;
  busy: boolean;
  edit: (text: string) => void;
  editProject: (project: ProjectExport) => void;
  save: SaveProjectChange;
  resolver?: FileResolver;
  setFormDirty: (dirty: boolean) => void;
  onExport: () => void;
  onImport: (project: ProjectExport) => void;
};

export function ProjectSection(props: Props) {
  const [preview, setPreview] = useState(false);
  const { record, section, busy } = props;
  if (record.project.schemaVersion === '1.0')
    return (
      <section className="panel space-y-4">
        <h2>Projeto experimental antigo</h2>
        <p>
          Este formato não é editável na nova interface. Exporte os dados para consulta e crie um
          novo projeto.
        </p>
        <Button onClick={props.onExport}>Exportar dados antigos</Button>
        <Link to="/" className="block text-link">
          Meus projetos
        </Link>
      </section>
    );
  const project = migrateProject(record.project).project;
  const data = project.userData;
  const view = activityProjectView(project);
  const editorial = documentProject(project);
  const projected = { ...record, project: editorial };
  const update = (patch: Partial<typeof data>) =>
    props.editProject({ ...project, userData: { ...data, ...patch } });
  const scoring = projectScoring(project);
  const dataset = linkedDataset(project);
  if (section === '') {
    const progress = completion(project);
    return (
      <div className="space-y-5">
        <section className="panel space-y-3">
          <h2 className="section-title">{data.title}</h2>
          <p>
            Docente: {data.teacher.name || 'Não informado'} ·{' '}
            {data.request ? levelLabel(data.request.level) : 'RSC não informado'}
          </p>
          <progress
            aria-label="Progresso de preenchimento"
            value={progress.percent}
            max={100}
            className="w-full"
          />
          <p>Em elaboração · {progress.percent}% de preenchimento aproximado</p>
          <p className="text-sm text-slate-300">O preenchimento não representa aprovação do RSC.</p>
          <ul className="space-y-2">
            {progress.items.map((item) => (
              <li key={item.label}>
                <Link className="text-link" to={projectPath(record.localId, item.section)}>
                  {item.complete ? '✓ ' : '○ '}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <ScoringDashboard result={scoring} compact />
        <ProjectDocuments
          project={project}
          localId={record.localId}
          resolver={props.resolver}
          compact
        />
        <ProcessOverview record={record} />
      </div>
    );
  }
  if (section === 'profile')
    return (
      <div className="space-y-5">
        <TeacherProfileForm
          project={view}
          disabled={busy}
          onSave={(next) =>
            update({ title: next.title, teacher: next.teacher, request: next.request })
          }
        />
        <EducationSection
          education={data.education}
          disabled={busy}
          onSave={(education) => update({ education })}
        />
      </div>
    );
  if (section === 'requirements')
    return (
      <RequirementsSection
        project={project}
        dataset={dataset}
        scoring={scoring}
        save={props.save}
        disabled={busy}
        setFormDirty={props.setFormDirty}
      />
    );
  if (section === 'memorial')
    return (
      <MemorialSection
        projectTitle={data.title}
        education={data.education}
        memorial={data.memorial}
        activities={editorial.userData.activities}
        evidences={view.userData.evidence}
        disabled={busy}
        onSave={({ memorial, activities }) => {
          const texts = (id: string) => {
            const item = activities.find((value) => value.id === id);
            return item
              ? {
                  ...(item.generatedText !== undefined
                    ? { generatedText: item.generatedText }
                    : {}),
                  ...(item.editedText !== undefined ? { editedText: item.editedText } : {}),
                  ...(item.isManuallyEdited !== undefined
                    ? { isManuallyEdited: item.isManuallyEdited }
                    : {}),
                }
              : {};
          };
          update({
            memorial,
            criterionEntries: data.criterionEntries.map((entry) => ({
              ...entry,
              occurrences: entry.occurrences.map((item) => ({ ...item, ...texts(item.id) })),
            })),
            unassignedOccurrences: data.unassignedOccurrences.map((item) => ({
              ...item,
              ...texts(item.id),
            })),
          });
        }}
      />
    );
  if (section === 'review')
    return (
      <div className="space-y-5">
        <ScoringDashboard result={scoring} compact />
        <FinalReview record={record} scoring={scoring} />
        <ProjectDocuments project={project} localId={record.localId} resolver={props.resolver} />
        <Button variant="outline" onClick={() => setPreview((value) => !value)}>
          {preview ? 'Fechar prévia' : 'Visualizar prévia'}
        </Button>
        {preview && (
          <PdfPreview record={projected} evidenceProject={project} resolver={props.resolver} />
        )}
      </div>
    );
  if (section === 'preview')
    return <PdfPreview record={projected} evidenceProject={project} resolver={props.resolver} />;
  if (section === 'documents')
    return (
      <div className="space-y-5">
        <FinalExport
          record={projected}
          scoring={scoring}
          busy={busy}
          invalid={props.invalid}
          onExportJson={props.onExport}
          onImport={props.onImport}
          evidenceProject={project}
          resolver={props.resolver}
        />
        <ProjectDocuments project={project} localId={record.localId} resolver={props.resolver} />
        <p className="text-sm text-slate-300">
          O PDF disponível contém o memorial. Formulários do RSC, consolidação dos comprovantes e
          backup completo .rscflow ainda não estão disponíveis. A cópia JSON guarda os dados, sem os
          arquivos anexados.
        </p>
      </div>
    );
  return null;
}
