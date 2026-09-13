import Dexie, { type Table } from 'dexie';
import type { LocalProject, ProjectRepository } from '@/domain/local-project';
import type { ProjectExport } from '@/domain/project';
import { portableProject } from '@/domain/portable-project';
import type { LocalFile } from '@/domain/local-files';
import { verifiedFile } from './local-files';

export class ProjectStorageError extends Error {}
export function storageErrorMessage(error: unknown): string {
  if (error instanceof ProjectStorageError) return error.message;
  return 'Não foi possível acessar o armazenamento local. Verifique o espaço e as permissões do navegador e tente novamente.';
}

export class ProjectDatabase extends Dexie {
  projects!: Table<LocalProject, string>;
  files!: Table<LocalFile & { localId: string }, [string, string]>;
  preferences!: Table<{ key: string; localId: string | null }, string>;
  constructor(name = 'rscflow') {
    super(name);
    this.version(1).stores({ projects: 'localId,updatedAt', preferences: 'key' });
    this.version(2).stores({ files: '[localId+id],localId' });
  }
}

export class DexieProjectRepository implements ProjectRepository {
  constructor(readonly database = new ProjectDatabase()) {}

  async create(input: ProjectExport): Promise<LocalProject> {
    const project = portableProject(input);
    const now = new Date().toISOString();
    const record = {
      localId: crypto.randomUUID(),
      revision: 1,
      createdAt: now,
      updatedAt: now,
      project,
    };
    await this.database.projects.add(record);
    return record;
  }

  async load(localId: string): Promise<LocalProject | undefined> {
    const record = await this.database.projects.get(localId);
    return record ? { ...record, project: portableProject(record.project) } : undefined;
  }

  async list(): Promise<LocalProject[]> {
    const records = await this.database.projects.orderBy('updatedAt').reverse().toArray();
    return records.map((record) => ({ ...record, project: portableProject(record.project) }));
  }

  async update(localId: string, revision: number, input: ProjectExport): Promise<LocalProject> {
    const project = portableProject(input);
    return this.database.transaction('rw', this.database.projects, async () => {
      const record = await this.requireRevision(localId, revision);
      const next = {
        ...record,
        project,
        revision: revision + 1,
        updatedAt: new Date().toISOString(),
      };
      await this.database.projects.put(next);
      return next;
    });
  }

  async duplicate(localId: string): Promise<LocalProject> {
    return this.database.transaction(
      'rw',
      this.database.projects,
      this.database.files,
      async () => {
        const record = await this.load(localId);
        if (!record) throw new ProjectStorageError('Projeto não encontrado.');
        if (record.project.schemaVersion !== '1.0') {
          record.project.userData.id = crypto.randomUUID();
          record.project.userData.title += ' (cópia)';
        }
        const copy = await this.create(record.project);
        const files = await this.database.files.where('localId').equals(localId).toArray();
        await this.database.files.bulkPut(
          files.map((file) => ({ ...file, localId: copy.localId })),
        );
        return copy;
      },
    );
  }

  async delete(localId: string, revision: number): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.projects,
      this.database.preferences,
      this.database.files,
      async () => {
        await this.requireRevision(localId, revision);
        await this.database.projects.delete(localId);
        await this.database.files.where('localId').equals(localId).delete();
        const active = await this.database.preferences.get('active-project');
        if (active?.localId === localId) await this.database.preferences.delete('active-project');
      },
    );
  }

  async select(localId: string | null): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.projects,
      this.database.preferences,
      async () => {
        if (localId && !(await this.database.projects.get(localId)))
          throw new ProjectStorageError('Projeto não encontrado.');
        await this.database.preferences.put({ key: 'active-project', localId });
      },
    );
  }

  async selected(): Promise<LocalProject | undefined> {
    const active = await this.database.preferences.get('active-project');
    return active?.localId ? this.load(active.localId) : undefined;
  }

  async recordBackup(
    localId: string,
    backup: NonNullable<LocalProject['lastBackup']>,
  ): Promise<void> {
    await this.database.transaction('rw', this.database.projects, async () => {
      const record = await this.database.projects.get(localId);
      if (!record) throw new ProjectStorageError('Projeto não encontrado.');
      if (record.lastBackup && record.lastBackup.createdAt > backup.createdAt) return;
      await this.database.projects.put({ ...record, lastBackup: backup });
    });
  }

  fileResolver(localId: string) {
    return {
      getFile: async (id: string) => {
        const record = await this.load(localId);
        const descriptor =
          record?.project.schemaVersion === '3.0'
            ? record.project.userData.storedFiles.find((file) => file.id === id)
            : undefined;
        return verifiedFile(descriptor, (await this.database.files.get([localId, id]))?.blob);
      },
    };
  }

  async updateWithFiles(
    localId: string,
    revision: number,
    project: ProjectExport,
    files: LocalFile[],
  ) {
    return this.database.transaction(
      'rw',
      this.database.projects,
      this.database.files,
      async () => {
        const next = await this.update(localId, revision, project);
        if (next.project.schemaVersion !== '3.0')
          throw new ProjectStorageError('Formato de projeto incompatível com arquivos.');
        const ids = new Set(next.project.userData.storedFiles.map((file) => file.id));
        if (files.some((file) => !ids.has(file.id)))
          throw new ProjectStorageError('Arquivo sem referência no projeto.');
        await this.database.files.bulkPut(files.map((file) => ({ ...file, localId })));
        return next;
      },
    );
  }

  private async requireRevision(localId: string, revision: number): Promise<LocalProject> {
    const record = await this.database.projects.get(localId);
    if (!record)
      throw new ProjectStorageError(
        'O projeto foi excluído. Exporte seus dados para preservá-los.',
      );
    if (record.revision !== revision)
      throw new ProjectStorageError(
        'Este projeto mudou em outra aba. Exporte suas alterações antes de reabrir a versão local.',
      );
    return record;
  }
}
