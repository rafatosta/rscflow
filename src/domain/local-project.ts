import type { ProjectExport } from './project';

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
