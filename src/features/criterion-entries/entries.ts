import {
  occurrenceProjectExportSchema,
  occurrenceSchema,
  type OccurrenceProjectExport,
  type Occurrence,
  type CriterionEntry,
} from '@/domain/criterion-entry';

export function createCriterionEntry(
  project: OccurrenceProjectExport,
  entry: CriterionEntry,
): OccurrenceProjectExport {
  return occurrenceProjectExportSchema.parse({
    ...project,
    userData: {
      ...project.userData,
      criterionEntries: [...project.userData.criterionEntries, entry],
    },
  });
}

export function addOccurrence(
  project: OccurrenceProjectExport,
  entryId: string,
  occurrence: Occurrence,
): OccurrenceProjectExport {
  return changeEntry(project, entryId, (entry) => ({
    ...entry,
    occurrences: [...entry.occurrences, validatePeriod(occurrence)],
  }));
}

export function editOccurrence(
  project: OccurrenceProjectExport,
  occurrenceId: string,
  patch: Partial<Omit<Occurrence, 'id'>>,
): OccurrenceProjectExport {
  let found = false;
  const edit = <T extends Occurrence>(item: T): T => {
    if (item.id !== occurrenceId) return item;
    found = true;
    return { ...item, ...validatePeriod({ ...item, ...patch, id: item.id }) };
  };
  const next = {
    ...project,
    userData: {
      ...project.userData,
      criterionEntries: project.userData.criterionEntries.map((entry) => ({
        ...entry,
        occurrences: entry.occurrences.map(edit),
      })),
      unassignedOccurrences: project.userData.unassignedOccurrences.map(edit),
    },
  };
  if (!found) throw new Error('Ocorrência não encontrada.');
  return occurrenceProjectExportSchema.parse(next);
}

function validatePeriod(input: Occurrence): Occurrence {
  // Períodos legados permanecem legíveis; novas edições não aceitam intervalos invertidos.
  const { selectedLevel: _level, ...fields } = input as Occurrence & { selectedLevel?: string };
  void _level;
  const item = occurrenceSchema.parse(fields);
  if (item.period.start && item.period.end && item.period.start > item.period.end)
    throw new Error('A data final não pode anteceder a inicial.');
  return item;
}
function changeEntry(
  project: OccurrenceProjectExport,
  entryId: string,
  update: (entry: CriterionEntry) => CriterionEntry,
): OccurrenceProjectExport {
  if (!project.userData.criterionEntries.some((entry) => entry.id === entryId))
    throw new Error('Lançamento não encontrado.');
  return occurrenceProjectExportSchema.parse({
    ...project,
    userData: {
      ...project.userData,
      criterionEntries: project.userData.criterionEntries.map((entry) =>
        entry.id === entryId ? update(entry) : entry,
      ),
    },
  });
}
