import type { ProjectRepository } from '@/domain/local-project';
import { currentProjectExportSchema, type ProjectExport } from '@/domain/project';
import { portableProject } from '@/domain/portable-project';
import { validateProjectFile } from '@/features/project-import/validate-project-file';
import { readableFileStem } from '@/utils/file-name';
import packageMetadata from '../../../package.json';

export function createProject(
  title: string,
  teacherName: string,
  regulation: { id: string; version: string },
): ProjectExport {
  return currentProjectExportSchema.parse({
    schemaVersion: '2.0',
    applicationVersion: packageMetadata.version,
    regulation,
    userData: {
      id: crypto.randomUUID(),
      title,
      teacher: { name: teacherName },
      request: null,
      education: [],
      activities: [],
      evidence: [],
      memorial: null,
    },
  });
}

export function exportProject(project: ProjectExport): string {
  return JSON.stringify(portableProject(project), null, 2);
}

export function projectJsonFilename(project: ProjectExport): string {
  const title = project.schemaVersion === '1.0' ? 'projeto-legado' : project.userData.title;
  return `rscflow-${readableFileStem(title, 'projeto')}.json`;
}

export async function importProject(file: Pick<File, 'text'>, repository: ProjectRepository) {
  const result = await validateProjectFile(file);
  if (!result.success) return result;
  const record = await repository.create(portableProject(result.project));
  return { success: true as const, record };
}

export function downloadProject(project: ProjectExport): void {
  const blob = new Blob([exportProject(project)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = projectJsonFilename(project);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
