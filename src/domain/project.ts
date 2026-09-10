import { z } from 'zod';

export const projectExportSchema = z.object({
  schemaVersion: z.literal('1.0'),
  applicationVersion: z.string().min(1),
  regulation: z.object({ id: z.string().min(1), version: z.string().min(1) }),
  userData: z.record(z.string(), z.unknown()),
});
export type ProjectExport = z.infer<typeof projectExportSchema>;
