import type { ProjectExport } from './project';

export type LocalFile = { id: string; blob: Blob };
export interface FileResolver {
  getFile(id: string): Promise<File>;
}
export type ProjectChange = (project: ProjectExport) => Promise<{
  project: ProjectExport;
  files?: LocalFile[];
}>;
export type SaveProjectChange = (change: ProjectChange) => Promise<boolean>;
