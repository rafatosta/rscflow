import type { ProjectExport } from './project';
import type { FileResolver, LocalFile } from './local-files';

export type LocalProject = {
  localId: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  project: ProjectExport;
  lastBackup?: { createdAt: string; fingerprint: string };
};
export type SaveState =
  { status: 'saving' } | { status: 'saved' } | { status: 'error'; message: string };

export interface ProjectRepository {
  fileResolver?(localId: string): FileResolver;
  updateWithFiles?(
    localId: string,
    revision: number,
    project: ProjectExport,
    files: LocalFile[],
  ): Promise<LocalProject>;
  create(project: ProjectExport): Promise<LocalProject>;
  load(localId: string): Promise<LocalProject | undefined>;
  list(): Promise<LocalProject[]>;
  update(localId: string, revision: number, project: ProjectExport): Promise<LocalProject>;
  duplicate(localId: string): Promise<LocalProject>;
  delete(localId: string, revision: number): Promise<void>;
  select(localId: string | null): Promise<void>;
  selected(): Promise<LocalProject | undefined>;
  recordBackup?(localId: string, backup: NonNullable<LocalProject['lastBackup']>): Promise<void>;
}
