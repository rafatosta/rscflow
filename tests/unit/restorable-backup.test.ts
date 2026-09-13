import { describe, expect, it } from 'vitest';
import { migrateProject } from '@/domain/project-migration';
import {
  createRestorableBackup,
  restoreRestorableBackup,
} from '@/features/local-projects/restorable-backup';
import { ProjectDatabase, DexieProjectRepository } from '@/storage/project-repository';
import { currentProjectFixture } from '../fixtures/project';

async function fixture() {
  const project = migrateProject(structuredClone(currentProjectFixture)).project;
  const content = new TextEncoder().encode('conteúdo integral do comprovante');
  const blob = new Blob([content], { type: 'application/pdf' });
  const digest = await crypto.subtle.digest('SHA-256', content);
  const sha256 = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const descriptor = {
    id: 'arquivo-1',
    name: 'comprovante.pdf',
    mediaType: 'application/pdf',
    size: blob.size,
    sha256,
  };
  project.userData.storedFiles = [descriptor];
  project.userData.evidence[0].fileIds = [descriptor.id];
  return { project, blob };
}

function text(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('backup restaurável .rscflow', () => {
  it('exporta e restaura integralmente projeto, vínculos, descritores e bytes', async () => {
    const { project, blob } = await fixture();
    const bytes = await createRestorableBackup(project, {
      getFile: async () => new File([blob], 'comprovante.pdf', { type: blob.type }),
    });
    const restored = await restoreRestorableBackup(new File([bytes as BlobPart], 'backup.rscflow'));
    expect(restored.project).toEqual(project);
    expect(restored.files).toHaveLength(1);
    expect(await text(restored.files[0].blob)).toBe('conteúdo integral do comprovante');
    expect(restored.project.schemaVersion).toBe('3.0');
    if (restored.project.schemaVersion !== '3.0') throw new Error('Schema inesperado.');
    expect(restored.project.regulation).toEqual(project.regulation);
    expect(restored.project.userData.criterionEntries[0].occurrences[0].evidenceIds).toEqual([
      'e1',
    ]);
    expect(restored.project.userData.evidence[0].fileIds).toEqual(['arquivo-1']);
  });

  it('reconstrói projeto e arquivos atomicamente no repositório', async () => {
    const database = new ProjectDatabase(`backup-${crypto.randomUUID()}`);
    const repository = new DexieProjectRepository(database);
    const { project, blob } = await fixture();
    const backup = await createRestorableBackup(project, {
      getFile: async () => new File([blob], 'comprovante.pdf', { type: blob.type }),
    });
    const restored = await restoreRestorableBackup(
      new File([backup as BlobPart], 'backup.rscflow'),
    );
    await expect(
      repository.createWithFiles(restored.project, [
        { id: 'arquivo-1', blob: new File(['alterado'], 'comprovante.pdf') },
      ]),
    ).rejects.toThrow(/alterado/);
    expect(await database.projects.count()).toBe(0);
    expect(await database.files.count()).toBe(0);
    const record = await repository.createWithFiles(restored.project, restored.files);
    expect((await repository.load(record.localId))?.project).toEqual(project);
    const all = await database.files.toArray();
    expect(all).toHaveLength(1);
    const stored = all[0];
    expect(stored).toMatchObject({ id: 'arquivo-1', localId: record.localId });
    await database.delete();
  });

  it('rejeita arquivo inválido, backup truncado e bytes divergentes', async () => {
    await expect(
      restoreRestorableBackup(new File([new Uint8Array([1, 2, 3])], 'inválido.rscflow')),
    ).rejects.toThrow(/backup RSCFlow válido/);
    const { project, blob } = await fixture();
    const backup = await createRestorableBackup(project, {
      getFile: async () => new File([blob], 'comprovante.pdf', { type: blob.type }),
    });
    await expect(
      restoreRestorableBackup(new File([backup.slice(0, 100) as BlobPart], 'truncado.rscflow')),
    ).rejects.toThrow();
    await expect(
      createRestorableBackup(project, {
        getFile: async () => new File(['alterado'], 'comprovante.pdf', { type: blob.type }),
      }),
    ).rejects.toThrow(/integridade/);
  });
});
