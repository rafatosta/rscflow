import { z } from 'zod';
import { rscLevelSchema } from './regulation';

const text = z.string().trim().min(1);
const quantity = z.number().finite().nonnegative();
export const teacherSchema = z
  .object({
    name: text,
    /** Campo legado do formato 2.0; novas edições usam `siape`. */
    registration: z.string().optional(),
    cpf: z.string().optional(),
    siape: z.string().optional(),
    role: z.string().optional(),
    campus: z.string().optional(),
    institution: z.string().optional(),
    employmentStatus: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    currentRsc: z.string().optional(),
    schooling: z.string().optional(),
    admissionDate: z.iso.date().optional(),
  })
  .strict();
export const rscRequestSchema = z
  .object({
    level: rscLevelSchema,
    requestedAt: z.iso.date().optional(),
    effectiveDate: z.iso.date().optional(),
  })
  .strict();
export const educationSchema = z
  .object({
    id: text,
    /** Campos adicionais são opcionais para manter arquivos 2.0/2.1 anteriores válidos. */
    type: z.string().optional(),
    title: text,
    institution: text,
    area: z.string().optional(),
    startedAt: z.iso.date().optional(),
    completedAt: z.iso.date().optional(),
    status: z.string().optional(),
    evidenceReference: z.string().optional(),
    notes: z.string().optional(),
    createdAt: z.iso.datetime().optional(),
    updatedAt: z.iso.datetime().optional(),
  })
  .strict();
export const evidenceSchema = z
  .object({
    id: text,
    type: z.string().optional(),
    title: text,
    identifier: z.string().optional(),
    issuer: z.string().optional(),
    date: z.iso.date().optional(),
    processReference: z.string().optional(),
    notes: z.string().optional(),
    /** Campos legados preservados para leitura dos formatos anteriores. */
    fileName: text.optional(),
    description: z.string().optional(),
  })
  .strict();
export const activitySchema = z
  .object({
    id: text,
    title: text,
    category: z
      .enum(['Ensino', 'Pesquisa', 'Extensão', 'Gestão', 'Produção', 'Formação', 'Outros'])
      .optional(),
    institution: z.string().optional(),
    department: z.string().optional(),
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
    role: z.string().optional(),
    description: z.string().optional(),
    results: z.string().optional(),
    competencies: z.array(text).optional(),
    criterionId: text,
    selectedLevel: rscLevelSchema.optional(),
    quantity,
    evidenceIds: z.array(text),
    generatedText: z.string().optional(),
    editedText: z.string().optional(),
    isManuallyEdited: z.boolean().optional(),
    createdAt: z.iso.datetime().optional(),
    updatedAt: z.iso.datetime().optional(),
  })
  .strict();
export const memorialSchema = z
  .object({
    title: text,
    introduction: z.string(),
    conclusion: z.string(),
    sectionTexts: z
      .object({
        education: z.string().optional(),
        teaching: z.string().optional(),
        production: z.string().optional(),
        community: z.string().optional(),
        management: z.string().optional(),
        awards: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export const scoringResultSchema = z
  .object({
    regulation: z.object({ id: text, version: text }).strict(),
    level: rscLevelSchema,
    total: quantity,
    criteria: z.array(z.object({ criterionId: text, score: quantity }).strict()),
  })
  .strict();
export const rscProjectSchema = z
  .object({
    id: text,
    title: text,
    teacher: teacherSchema,
    request: rscRequestSchema.nullable(),
    education: z.array(educationSchema),
    activities: z.array(activitySchema),
    evidence: z.array(evidenceSchema),
    memorial: memorialSchema.nullable(),
  })
  .strict()
  .superRefine((project, ctx) => {
    for (const key of ['education', 'activities', 'evidence'] as const) {
      const ids = new Set<string>();
      project[key].forEach((item, index) => {
        if (ids.has(item.id))
          ctx.addIssue({ code: 'custom', path: [key, index, 'id'], message: 'ID duplicado.' });
        ids.add(item.id);
      });
    }
    project.activities.forEach((activity, index) => {
      if (
        new Set(activity.evidenceIds).size !== activity.evidenceIds.length ||
        activity.evidenceIds.some((id) => !project.evidence.some((item) => item.id === id))
      )
        ctx.addIssue({
          code: 'custom',
          path: ['activities', index, 'evidenceIds'],
          message: 'Referências de comprovantes duplicadas ou inexistentes.',
        });
    });
  });
export type Teacher = z.infer<typeof teacherSchema>;
export type RscRequest = z.infer<typeof rscRequestSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Memorial = z.infer<typeof memorialSchema>;
export type ScoringResult = z.infer<typeof scoringResultSchema>;
export type RscProject = z.infer<typeof rscProjectSchema>;

/** Rascunho 2.1: ausência de nome/enquadramento é explícita, sem valores fictícios. */
export const draftRscProjectSchema = rscProjectSchema.safeExtend({
  teacher: teacherSchema.extend({ name: z.string() }),
  activities: z.array(activitySchema.extend({ criterionId: z.string() })),
});
