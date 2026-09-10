import { z } from 'zod';

const text = z.string().trim().min(1);
const id = text.regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/);
const amount = z.number().finite().nonnegative();
export const rscLevelSchema = z.enum(['rsc-i', 'rsc-ii', 'rsc-iii']);
export type RscLevel = z.infer<typeof rscLevelSchema>;
const status = z.enum(['pending-official-validation', 'validated']);
const provenance = z.object({ status, sourceReference: text, validatedBy: text.optional() });
export const scoringPolicySchema = z
  .object({
    minimumTotal: amount,
    minimumRequestedLevel: amount,
    maximumLevelScore: amount,
    quantityLimitScope: z.literal('criterion'),
    rounding: z
      .object({
        mode: z.literal('half-up'),
        scope: z.literal('total'),
        decimalPlaces: z.number().int().min(0).max(10),
      })
      .strict(),
    provenance,
  })
  .strict();
export type ScoringPolicy = z.infer<typeof scoringPolicySchema>;
export const directiveSchema = z
  .object({
    id,
    code: text.regex(/^[a-z]+$/),
    title: text,
    maxScore: amount,
    weight: amount.optional(),
    provenance,
  })
  .strict();
export const criterionSchema = z
  .object({
    id,
    code: text.regex(/^[a-z]+\.[1-9]\d*$/),
    description: text,
    unit: text,
    factor: amount,
    maxQuantity: amount,
    weight: amount,
    directiveId: id,
    provenance,
  })
  .strict();
export type Directive = z.infer<typeof directiveSchema>;
export type Criterion = z.infer<typeof criterionSchema>;
export const regulationLevelSchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    regulationId: id,
    section: rscLevelSchema,
    status,
    directives: z.array(directiveSchema),
    criteria: z.array(criterionSchema),
  })
  .strict()
  .superRefine((level, ctx) => {
    for (const [name, rows] of [
      ['directives', level.directives],
      ['criteria', level.criteria],
    ] as const) {
      for (const key of ['id', 'code'] as const) {
        const seen = new Set<string>();
        rows.forEach((row, index) => {
          if (seen.has(row[key]))
            ctx.addIssue({
              code: 'custom',
              path: [name, index, key],
              message: 'Identificador ou código duplicado.',
            });
          seen.add(row[key]);
        });
      }
    }
    level.criteria.forEach((criterion, index) => {
      const directive = level.directives.find((item) => item.id === criterion.directiveId);
      if (!directive || criterion.code.split('.')[0] !== directive.code)
        ctx.addIssue({
          code: 'custom',
          path: ['criteria', index, 'directiveId'],
          message: 'Diretriz inexistente ou código incompatível.',
        });
    });
    if (
      level.status === 'validated' &&
      (!level.directives.length ||
        !level.criteria.length ||
        [...level.directives, ...level.criteria].some(
          (row) => row.provenance.status !== 'validated' || !row.provenance.validatedBy,
        ))
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Nível validado requer conteúdo e validação identificada.',
      });
  });
export const regulationMetadataSchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    regulation: z
      .object({ id, authority: text, number: text, year: z.number().int().positive() })
      .strict(),
    version: text.nullable(),
    status,
    source: z
      .object({ resolution: text.nullable(), officialScoringSpreadsheet: text.nullable() })
      .strict(),
    notice: text,
    scoring: scoringPolicySchema.optional(),
  })
  .strict();
export const regulationSchema = z
  .object({
    metadata: regulationMetadataSchema,
    levels: z.array(regulationLevelSchema).length(3),
  })
  .superRefine(({ metadata, levels }, ctx) => {
    const ids = new Set<string>();
    const sections = new Set<string>();
    for (const level of levels) {
      if (sections.has(level.section) || level.regulationId !== metadata.regulation.id)
        ctx.addIssue({
          code: 'custom',
          message: 'Nível duplicado ou referência normativa incompatível.',
        });
      sections.add(level.section);
      for (const row of [...level.directives, ...level.criteria]) {
        if (ids.has(row.id)) ctx.addIssue({ code: 'custom', message: 'ID global duplicado.' });
        ids.add(row.id);
      }
    }
    if (
      metadata.status === 'validated' &&
      (!metadata.version ||
        !metadata.source.resolution ||
        !metadata.source.officialScoringSpreadsheet ||
        levels.some((level) => level.status !== 'validated'))
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Regulamento validado requer versão, fontes e níveis validados.',
      });
  });
export type Regulation = z.infer<typeof regulationSchema>;
