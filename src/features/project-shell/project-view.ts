import { activityProjectView } from '@/domain/project-migration';
import { type ProjectExport } from '@/domain/project';
import { occurrenceProjectExportSchema } from '@/domain/criterion-entry';
import { loadRegulations } from '@/data/regulations/load';
import { rscLevelSchema, type RscLevel } from '@/domain/regulation';
import { calculateProjectScore } from '@/rules/scoring';
import { teacherProfileIsComplete } from '@/features/teacher-profile/profile';
import packageMetadata from '../../../package.json';

export const levels = rscLevelSchema.options;
export const levelLabel = (level: RscLevel) => level.toUpperCase().replace('RSC-', 'RSC ');
export const datasets = loadRegulations();
export function createDraft(level: RscLevel, datasetId: string) {
  const dataset = datasets.find((item) => item.metadata.regulation.id === datasetId);
  if (!dataset) throw new Error('Dataset não encontrado.');
  return occurrenceProjectExportSchema.parse({
    schemaVersion: '3.0',
    applicationVersion: packageMetadata.version,
    regulation: { id: datasetId, version: dataset.metadata.version },
    userData: {
      id: crypto.randomUUID(),
      title: `Processo ${levelLabel(rscLevelSchema.parse(level))}`,
      teacher: { name: '' },
      request: { level },
      education: [],
      criterionEntries: [],
      unassignedOccurrences: [],
      storedFiles: [],
      evidence: [],
      memorial: null,
    },
  });
}
export function projectTitle(project: ProjectExport) {
  return project.schemaVersion === '1.0' ? 'Projeto legado' : project.userData.title;
}
export function completion(project: ProjectExport) {
  if (project.schemaVersion === '1.0') return { percent: 0, items: [] };
  const view = activityProjectView(project);
  const data = view.userData;
  const items = [
    {
      label: 'Identificação do docente',
      section: 'profile',
      complete: teacherProfileIsComplete(view),
    },
    { label: 'Formação registrada', section: 'profile', complete: data.education.length > 0 },
    {
      label: 'Lançamentos registrados',
      section: 'requirements',
      complete: data.activities.length > 0,
    },
    {
      label: 'Lançamentos com enquadramento',
      section: 'requirements',
      complete:
        data.activities.length > 0 &&
        data.activities.every((item) => item.criterionId && item.selectedLevel),
    },
    {
      label: 'Texto do memorial',
      section: 'memorial',
      complete: Boolean(data.memorial?.conclusion.trim()),
    },
  ];
  return {
    percent: Math.round((items.filter((item) => item.complete).length / items.length) * 100),
    items,
  };
}
export function linkedDataset(project: ProjectExport) {
  return datasets.find(
    (item) =>
      item.metadata.regulation.id === project.regulation.id &&
      item.metadata.version === project.regulation.version,
  );
}
export function projectScoring(project: ProjectExport) {
  const dataset = linkedDataset(project);
  if (!dataset)
    return {
      status: 'unavailable' as const,
      issues: [
        {
          code: 'regulation-mismatch' as const,
          message: 'A versão normativa vinculada não está disponível neste navegador.',
        },
      ],
    };
  // 2.1 não migra o arquivo; adapta somente a entrada do cálculo, quando completa.
  const input = project.schemaVersion === '2.1' ? { ...project, schemaVersion: '2.0' } : project;
  return calculateProjectScore(input, dataset);
}

/** Projeção editorial: descrições atuais do catálogo sem duplicá-las no projeto persistido. */
export function documentProject(project: Exclude<ProjectExport, { schemaVersion: '1.0' }>) {
  const view = activityProjectView(project);
  const dataset = linkedDataset(project);
  return {
    ...view,
    userData: {
      ...view.userData,
      activities: view.userData.activities.map((item) => {
        const criterion = dataset?.levels
          .flatMap((level) => level.criteria)
          .find((criterion) => criterion.id === item.criterionId);
        return criterion ? { ...item, title: `${criterion.description} — ${item.title}` } : item;
      }),
    },
  };
}
