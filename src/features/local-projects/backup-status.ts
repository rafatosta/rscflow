import type { ProjectExport } from '@/domain/project';
import { portableProject } from '@/domain/portable-project';
/** Ordenação estável: uma reordenação das chaves JSON não é uma alteração do processo. */
export async function projectFingerprint(project: ProjectExport): Promise<string> {
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, item]) => [key, canonical(item)]),
          )
        : value;
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(portableProject(project))));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
