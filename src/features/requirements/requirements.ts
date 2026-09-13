import { z } from 'zod';
import type { Criterion, Regulation, RscLevel } from '@/domain/regulation';
import type { ProjectExport } from '@/domain/project';
import {
  occurrenceProjectExportSchema,
  type OccurrenceProjectExport,
  type Occurrence,
} from '@/domain/criterion-entry';
import { migrateProject } from '@/domain/project-migration';
import type { LocalFile } from '@/domain/local-files';
import { sha256 } from '@/storage/local-files';
import { calculateActivity } from '@/rules/scoring';

export const requirementFormSchema = z
  .object({
    start: z.union([z.literal(''), z.iso.date()]),
    end: z.union([z.literal(''), z.iso.date()]),
    quantity: z.number().finite().nonnegative('Informe uma quantidade não negativa.'),
    description: z.string().trim(),
  })
  .refine((value) => !value.start || !value.end || value.end >= value.start, {
    path: ['end'],
    message: 'A data final não pode anteceder a inicial.',
  });
export type RequirementValues = z.infer<typeof requirementFormSchema>;
export function quantityPresentation(criterion: Criterion) {
  return {
    label: `Quantidade (${criterion.unit})`,
    help:
      criterion.unit.toLocaleLowerCase('pt-BR') === 'mês'
        ? 'Informe os meses comprovados. As datas não determinam a contagem normativa automaticamente.'
        : `Informe a quantidade comprovada em ${criterion.unit}.`,
  };
}
export function previewRequirement(dataset: Regulation, criterion: Criterion, quantity: number) {
  if (dataset.metadata.status !== 'validated')
    return 'Indisponível: catálogo pendente de validação.';
  const result = calculateActivity(quantity, criterion);
  return result.status === 'available'
    ? `${result.score.toLocaleString('pt-BR')} pontos (antes dos tetos compartilhados)`
    : result.reason;
}
export function allOccurrences(project: OccurrenceProjectExport) {
  return [
    ...project.userData.criterionEntries.flatMap((entry) => entry.occurrences),
    ...project.userData.unassignedOccurrences,
  ];
}

export async function saveRequirement(
  input: ProjectExport,
  dataset: Regulation,
  criterionId: string,
  level: RscLevel,
  values: RequirementValues,
  occurrenceId?: string,
  file?: File,
  evidenceIds?: string[],
) {
  const fields = requirementFormSchema.parse(values);
  const project = migrateProject(input).project;
  const criterion = dataset.levels
    .find((entry) => entry.section === level)
    ?.criteria.find((item) => item.id === criterionId);
  if (
    !criterion ||
    dataset.metadata.regulation.id !== project.regulation.id ||
    dataset.metadata.version !== project.regulation.version
  )
    throw new Error('O critério não pertence ao regulamento deste projeto.');
  const previous = occurrenceId
    ? allOccurrences(project).find((item) => item.id === occurrenceId)
    : undefined;
  if (occurrenceId && !previous) throw new Error('Lançamento não encontrado.');
  const ids = evidenceIds ?? previous?.evidenceIds ?? [];
  const files: LocalFile[] = [];
  let linked = [...ids];
  if (file) {
    const hash = await sha256(file);
    const existing = project.userData.storedFiles.find(
      (item) => item.sha256 === hash && item.size === file.size,
    );
    const id = existing?.id ?? crypto.randomUUID();
    const existingEvidence = project.userData.evidence.find((item) => item.fileIds?.includes(id));
    const evidenceId = existingEvidence?.id ?? crypto.randomUUID();
    if (!existing)
      project.userData.storedFiles.push({
        id,
        name: file.name,
        mediaType: file.type || 'application/octet-stream',
        size: file.size,
        sha256: hash,
      });
    if (!existingEvidence)
      project.userData.evidence.push({ id: evidenceId, title: file.name, fileIds: [id] });
    files.push({ id, blob: file.slice(0, file.size, file.type) });
    linked = [...new Set([...linked, evidenceId])];
  }
  const now = new Date().toISOString();
  const occurrence: Occurrence = {
    ...previous,
    id: previous?.id ?? crypto.randomUUID(),
    title:
      previous?.title ?? (fields.description || `Registro ${fields.start || now.slice(0, 10)}`),
    quantity: fields.quantity,
    description: fields.description,
    period: {
      ...(fields.start ? { start: fields.start } : {}),
      ...(fields.end ? { end: fields.end } : {}),
    },
    order:
      previous?.order ?? Math.max(-1, ...allOccurrences(project).map((item) => item.order)) + 1,
    evidenceIds: linked,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
  project.userData.criterionEntries = project.userData.criterionEntries.map((entry) => ({
    ...entry,
    occurrences: entry.occurrences.filter((item) => item.id !== occurrence.id),
  }));
  project.userData.unassignedOccurrences = project.userData.unassignedOccurrences.filter(
    (item) => item.id !== occurrence.id,
  );
  let entry = project.userData.criterionEntries.find(
    (item) => item.criterionId === criterionId && item.selectedLevel === level,
  );
  if (!entry) {
    entry = { id: crypto.randomUUID(), criterionId, selectedLevel: level, occurrences: [] };
    project.userData.criterionEntries.push(entry);
  }
  entry.occurrences.push(occurrence);
  return { project: occurrenceProjectExportSchema.parse(project), files };
}
export function removeRequirement(input: ProjectExport, occurrenceId: string) {
  const project = migrateProject(input).project;
  project.userData.criterionEntries = project.userData.criterionEntries.map((entry) => ({
    ...entry,
    occurrences: entry.occurrences.filter((item) => item.id !== occurrenceId),
  }));
  project.userData.unassignedOccurrences = project.userData.unassignedOccurrences.filter(
    (item) => item.id !== occurrenceId,
  );
  return { project: occurrenceProjectExportSchema.parse(project) };
}
