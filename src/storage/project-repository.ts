import Dexie, { type Table } from 'dexie';
import type { LocalProject, ProjectRepository } from '@/domain/local-project';
import type { ProjectExport } from '@/domain/project';
import { portableProject } from '@/domain/portable-project';

export class ProjectStorageError extends Error {}
export function storageErrorMessage(error: unknown): string {
  if (error instanceof ProjectStorageError) return error.message;
  return 'Não foi possível acessar o armazenamento local. Verifique o espaço e as permissões do navegador e tente novamente.';
}

export class ProjectDatabase extends Dexie {
  projects!: Table<LocalProject, string>;
  preferences!: Table<{ key: string; localId: string | null }, string>;
  constructor(name = 'rscflow') {
    super(name);
    this.version(1).stores({ projects: 'localId,updatedAt', preferences: 'key' });
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
    const record = await this.load(localId);
    if (!record) throw new ProjectStorageError('Projeto não encontrado.');
    if (record.project.schemaVersion !== '1.0') {
      record.project.userData.id = crypto.randomUUID();
      record.project.userData.title += ' (cópia)';
    }
    return this.create(record.project);
  }

  async delete(localId: string, revision: number): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.projects,
      this.database.preferences,
      async () => {
        await this.requireRevision(localId, revision);
        await this.database.projects.delete(localId);
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
