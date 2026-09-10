import { z } from 'zod';
import { rscLevelSchema } from './regulation';

const text = z.string().trim().min(1);
const quantity = z.number().finite().nonnegative();
export const teacherSchema = z
  .object({ name: text, registration: text.optional(), campus: text.optional() })
  .strict();
export const rscRequestSchema = z
  .object({ level: rscLevelSchema, requestedAt: z.iso.date().optional() })
  .strict();
export const educationSchema = z
  .object({ id: text, title: text, institution: text, completedAt: z.iso.date().optional() })
  .strict();
export const evidenceSchema = z
  .object({ id: text, title: text, fileName: text.optional(), description: z.string().optional() })
  .strict();
export const activitySchema = z
  .object({ id: text, title: text, criterionId: text, quantity, evidenceIds: z.array(text) })
  .strict();
export const memorialSchema = z
  .object({ title: text, introduction: z.string(), conclusion: z.string() })
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
