import { projectExportSchema, type ProjectExport } from './project';

/** Recusa valores que JSON perderia silenciosamente, inclusive em dados legados. */
export function portableProject(input: unknown): ProjectExport {
  const ancestors = new Set<object>();
  function check(value: unknown): void {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (typeof value !== 'object' || ancestors.has(value))
      throw new Error('Dados não portáveis em JSON.');
    if (
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
      throw new Error('Dados não portáveis em JSON.');
    ancestors.add(value);
    for (const item of Array.isArray(value) ? value : Object.values(value)) check(item);
    ancestors.delete(value);
  }
  const result = projectExportSchema.parse(input);
  check(result);
  return result;
}
