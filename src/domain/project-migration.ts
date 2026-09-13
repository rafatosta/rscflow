import { draftProjectExportSchema, projectExportSchema, type TypedProjectExport } from './project';
import {
  occurrenceProjectExportSchema,
  type CriterionEntry,
  type OccurrenceProjectExport,
} from './criterion-entry';

/** Projeção transitória: não é downgrade/exportação e não altera o projeto original. */
export function activityProjectView(
  project: TypedProjectExport | OccurrenceProjectExport,
): TypedProjectExport {
  if (project.schemaVersion !== '3.0') return project;
  const {
    criterionEntries,
    unassignedOccurrences,
    storedFiles: _files,
    ...data
  } = project.userData;
  void _files;
  const activities = [
    ...criterionEntries.flatMap((entry) =>
      entry.occurrences.map((occurrence) => ({
        ...occurrence,
        criterionId: entry.criterionId,
        ...(entry.selectedLevel ? { selectedLevel: entry.selectedLevel } : {}),
      })),
    ),
    ...unassignedOccurrences.map((occurrence) => ({ ...occurrence, criterionId: '' })),
  ]
    .sort((a, b) => a.order - b.order)
    .map(({ period, order: _order, ...occurrence }) => {
      void _order;
      return {
        ...occurrence,
        ...(period.start !== undefined ? { startDate: period.start } : {}),
        ...(period.end !== undefined ? { endDate: period.end } : {}),
      };
    });
  return draftProjectExportSchema.parse({
    ...project,
    schemaVersion: '2.1',
    userData: {
      ...data,
      activities,
      evidence: data.evidence.map(({ fileIds: _ids, ...item }) => {
        void _ids;
        return item;
      }),
    },
  });
}

export function migrateProject(input: unknown): {
  project: OccurrenceProjectExport;
  sourceVersion: string;
  pendingOccurrenceIds: string[];
} {
  const source = projectExportSchema.parse(input);
  if (source.schemaVersion === '1.0')
    throw new Error(
      'Projetos 1.0 exigem mapeamento explícito; os dados legados não foram alterados.',
    );
  if (source.schemaVersion === '3.0')
    return {
      project: source,
      sourceVersion: '3.0',
      pendingOccurrenceIds: pendingIds(source),
    };
  const { activities, ...data } = source.userData;
  const entries: CriterionEntry[] = [];
  const unassigned: OccurrenceProjectExport['userData']['unassignedOccurrences'] = [];
  activities.forEach(({ criterionId, selectedLevel, startDate, endDate, ...activity }, order) => {
    const occurrence = {
      ...activity,
      order,
      period: {
        ...(startDate !== undefined ? { start: startDate } : {}),
        ...(endDate !== undefined ? { end: endDate } : {}),
      },
    };
    if (!criterionId) {
      unassigned.push({ ...occurrence, ...(selectedLevel ? { selectedLevel } : {}) });
      return;
    }
    let entry = entries.find(
      (item) => item.criterionId === criterionId && item.selectedLevel === selectedLevel,
    );
    if (!entry) {
      entry = {
        id: `entry-${entries.length + 1}`,
        criterionId,
        ...(selectedLevel ? { selectedLevel } : {}),
        occurrences: [],
      };
      entries.push(entry);
    }
    entry.occurrences.push(occurrence);
  });
  const project = occurrenceProjectExportSchema.parse({
    ...source,
    schemaVersion: '3.0',
    userData: {
      ...data,
      criterionEntries: entries,
      unassignedOccurrences: unassigned,
      evidence: data.evidence.map((item) => ({ ...item, fileIds: [] })),
      storedFiles: [],
    },
  });
  return {
    project,
    sourceVersion: source.schemaVersion,
    pendingOccurrenceIds: pendingIds(project),
  };
}
function pendingIds(project: OccurrenceProjectExport): string[] {
  return [
    ...project.userData.unassignedOccurrences.map((item) => item.id),
    ...project.userData.criterionEntries
      .filter((item) => !item.selectedLevel)
      .flatMap((item) => item.occurrences.map((occurrence) => occurrence.id)),
  ];
}
