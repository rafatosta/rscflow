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

/** Aplica edições dos formulários existentes sem descartar arquivos ou identidade dos grupos. */
export function applyActivityProjectEdits(
  original: OccurrenceProjectExport,
  view: TypedProjectExport,
): OccurrenceProjectExport {
  const next = migrateProject(view).project;
  const used = new Set(original.userData.criterionEntries.map((entry) => entry.id));
  let serial = 1;
  for (const entry of next.userData.criterionEntries) {
    const previous = original.userData.criterionEntries.find(
      (item) =>
        item.criterionId === entry.criterionId && item.selectedLevel === entry.selectedLevel,
    );
    if (previous) entry.id = previous.id;
    else {
      while (used.has(`entry-${serial}`)) serial++;
      entry.id = `entry-${serial++}`;
      used.add(entry.id);
    }
  }
  // Grupos vazios também são dados do domínio, não descartados por uma projeção de atividades.
  for (const entry of original.userData.criterionEntries) {
    if (
      !entry.occurrences.length &&
      !next.userData.criterionEntries.some((item) => item.id === entry.id)
    )
      next.userData.criterionEntries.push(entry);
  }
  next.userData.storedFiles = original.userData.storedFiles;
  next.userData.evidence = next.userData.evidence.map((item) => ({
    ...original.userData.evidence.find((previous) => previous.id === item.id),
    ...item,
    fileIds: original.userData.evidence.find((previous) => previous.id === item.id)?.fileIds ?? [],
  }));
  return occurrenceProjectExportSchema.parse(next);
}
