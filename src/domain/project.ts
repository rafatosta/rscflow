import { z } from 'zod';
import { rscProjectSchema, draftRscProjectSchema } from './models';
export * from './models';

const envelope = {
  applicationVersion: z.string().min(1),
  regulation: z.object({ id: z.string().min(1), version: z.string().min(1) }),
};
export const legacyProjectExportSchema = z.object({
  ...envelope,
  schemaVersion: z.literal('1.0'),
  userData: z.record(z.string(), z.unknown()),
});
export const currentProjectExportSchema = z.object({
  ...envelope,
  schemaVersion: z.literal('2.0'),
  userData: rscProjectSchema,
});
export const draftProjectExportSchema = z.object({
  ...envelope,
  schemaVersion: z.literal('2.1'),
  regulation: z.object({ id: z.string().min(1), version: z.string().min(1).nullable() }),
  userData: draftRscProjectSchema,
});
export const projectExportSchema = z.discriminatedUnion('schemaVersion', [
  legacyProjectExportSchema,
  currentProjectExportSchema,
  draftProjectExportSchema,
]);
export type ProjectExport = z.infer<typeof projectExportSchema>;
export type CurrentProjectExport = z.infer<typeof currentProjectExportSchema>;

export type TypedProjectExport =
  z.infer<typeof currentProjectExportSchema> | z.infer<typeof draftProjectExportSchema>;
