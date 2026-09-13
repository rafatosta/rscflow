import type { TypedProjectExport } from '@/domain/project';
import { readableFileStem } from '@/utils/file-name';

export function memorialPdfFilename(project: TypedProjectExport): string {
  const base = readableFileStem(project.userData.teacher.name || project.userData.title, 'docente');
  return `memorial-rsc-${base}.pdf`;
}

export function normativeFormsPdfFilename(project: TypedProjectExport): string {
  const base = readableFileStem(project.userData.teacher.name || project.userData.title, 'docente');
  return `formularios-anexos-rsc-${base}.pdf`;
}

export function evidenceBundlePdfFilename(project: TypedProjectExport): string {
  const base = readableFileStem(project.userData.teacher.name || project.userData.title, 'docente');
  return `comprovantes-rsc-${base}.pdf`;
}

export function finalPackageFilename(project: TypedProjectExport): string {
  const base = readableFileStem(project.userData.teacher.name || project.userData.title, 'docente');
  return `pacote-final-rsc-${base}.zip`;
}
