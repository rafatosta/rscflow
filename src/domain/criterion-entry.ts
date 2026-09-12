import { z } from 'zod';
import {
  activitySchema,
  educationSchema,
  evidenceSchema,
  memorialSchema,
  rscRequestSchema,
  teacherSchema,
} from './models';
import { rscLevelSchema } from './regulation';

const id = z.string().trim().min(1);
/** Descritor portátil; bytes não integram o JSON de projeto. */
export const storedFileSchema = z
  .object({
    id,
    name: id,
    mediaType: id,
    size: z.number().int().nonnegative().safe(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
export type StoredFile = z.infer<typeof storedFileSchema>;
export const occurrenceSchema = activitySchema
  .omit({
    criterionId: true,
    selectedLevel: true,
    startDate: true,
    endDate: true,
  })
  .extend({
    order: z.number().int().nonnegative().safe(),
    period: z.object({ start: z.iso.date().optional(), end: z.iso.date().optional() }).strict(),
  })
  .strict();
export type Occurrence = z.infer<typeof occurrenceSchema>;
export const criterionEntrySchema = z
  .object({
    id,
    criterionId: id,
    // Uma referência antiga pode não conter a escolha explícita do nível.
    selectedLevel: rscLevelSchema.optional(),
    occurrences: z.array(occurrenceSchema),
  })
  .strict();
export type CriterionEntry = z.infer<typeof criterionEntrySchema>;
export const occurrenceEvidenceSchema = evidenceSchema.extend({ fileIds: z.array(id) }).strict();
export type OccurrenceEvidence = z.infer<typeof occurrenceEvidenceSchema>;
export const unassignedOccurrenceSchema = occurrenceSchema.extend({
  selectedLevel: rscLevelSchema.optional(),
});

export const occurrenceProjectSchema = z
  .object({
    id,
    title: id,
    teacher: teacherSchema.extend({ name: z.string() }),
    request: rscRequestSchema.nullable(),
    education: z.array(educationSchema),
    criterionEntries: z.array(criterionEntrySchema),
    unassignedOccurrences: z.array(unassignedOccurrenceSchema),
    evidence: z.array(occurrenceEvidenceSchema),
    storedFiles: z.array(storedFileSchema),
    memorial: memorialSchema.nullable(),
  })
  .strict()
  .superRefine((project, ctx) => {
    const unique = (values: string[], path: (string | number)[]) => {
      if (new Set(values).size !== values.length)
        ctx.addIssue({ code: 'custom', path, message: 'Identificadores duplicados.' });
    };
    for (const key of ['education', 'criterionEntries', 'evidence', 'storedFiles'] as const)
      unique(
        project[key].map((item) => item.id),
        [key],
      );
    unique(
      project.criterionEntries.map((entry) =>
        JSON.stringify([entry.criterionId, entry.selectedLevel ?? null]),
      ),
      ['criterionEntries'],
    );
    const occurrences = [
      ...project.criterionEntries.flatMap((entry) => entry.occurrences),
      ...project.unassignedOccurrences,
    ];
    unique(
      occurrences.map((item) => item.id),
      ['criterionEntries'],
    );
    for (const occurrence of occurrences) {
      unique(occurrence.evidenceIds, ['criterionEntries', occurrence.id, 'evidenceIds']);
      if (occurrence.evidenceIds.some((id) => !project.evidence.some((item) => item.id === id)))
        ctx.addIssue({
          code: 'custom',
          path: ['criterionEntries', occurrence.id, 'evidenceIds'],
          message: 'Comprovante inexistente.',
        });
    }
    for (const evidence of project.evidence) {
      unique(evidence.fileIds, ['evidence', evidence.id, 'fileIds']);
      if (evidence.fileIds.some((id) => !project.storedFiles.some((item) => item.id === id)))
        ctx.addIssue({
          code: 'custom',
          path: ['evidence', evidence.id, 'fileIds'],
          message: 'Arquivo inexistente.',
        });
    }
  });
export type OccurrenceProject = z.infer<typeof occurrenceProjectSchema>;
export const occurrenceProjectExportSchema = z
  .object({
    schemaVersion: z.literal('3.0'),
    applicationVersion: id,
    regulation: z.object({ id, version: id.nullable() }).strict(),
    userData: occurrenceProjectSchema,
  })
  .strict();
export type OccurrenceProjectExport = z.infer<typeof occurrenceProjectExportSchema>;
