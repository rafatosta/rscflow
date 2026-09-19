import { z } from "zod"

const provenanceSchema = z.object({
  status: z.string(),
  sourceReference: z.string(),
  validatedBy: z.string().optional(),
  issue: z.object({ type: z.string(), description: z.string() }).optional(),
})

const directiveSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  maxScore: z.number(),
  weight: z.number(),
  provenance: provenanceSchema,
})

const criterionSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  unit: z.string(),
  factor: z.number(),
  maxQuantity: z.number(),
  weight: z.number(),
  directiveId: z.string(),
  provenance: provenanceSchema,
})

const levelSchema = z.object({
  schemaVersion: z.string(),
  regulationId: z.string(),
  section: z.enum(["rsc-i", "rsc-ii", "rsc-iii"]),
  status: z.string(),
  directives: z.array(directiveSchema),
  criteria: z.array(criterionSchema),
})

export const regulationSchema = z.object({
  metadata: z.object({
    schemaVersion: z.string(),
    regulation: z.object({ id: z.string(), authority: z.string(), number: z.string(), year: z.number() }),
    status: z.string(),
    source: z.object({ resolution: z.string(), officialScoringSpreadsheet: z.string().nullable() }),
    notice: z.string(),
    version: z.string().nullable(),
    scoring: z.object({
      minimumTotal: z.number(),
      minimumRequestedLevel: z.number(),
      maximumLevelScore: z.number(),
      quantityLimitScope: z.string(),
      rounding: z.object({ mode: z.string(), scope: z.string(), decimalPlaces: z.number() }),
      provenance: provenanceSchema,
    }),
  }),
  levels: z.array(levelSchema).length(3),
})

export type Regulation = z.infer<typeof regulationSchema>
export type RegulationLevel = z.infer<typeof levelSchema>
export type RegulationCriterion = z.infer<typeof criterionSchema>
