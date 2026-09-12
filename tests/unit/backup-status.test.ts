import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { projectFingerprint } from '@/features/local-projects/backup-status';
import { createDraft, datasets } from '@/features/project-shell/project-view';
import { DexieProjectRepository, ProjectDatabase } from '@/storage/project-repository';

afterEach(() => vi.unstubAllGlobals());
describe('registro de backup JSON', () => {
  it('compara conteúdo com hash estável independente da ordem das chaves', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const project = createDraft('rsc-i', datasets[0].metadata.regulation.id);
    const original = await projectFingerprint(project);
    expect(
      await projectFingerprint({
        ...project,
        userData: { ...project.userData, title: 'Outro título' },
      }),
    ).not.toBe(original);
    const reordered = Object.fromEntries(Object.entries(project).reverse()) as typeof project;
    expect(await projectFingerprint(reordered)).toBe(original);
  });
  it('preserva backup em edições concorrentes, não altera revisão e não herda em cópias', async () => {
    const repository = new DexieProjectRepository(
      new ProjectDatabase(`backup-${crypto.randomUUID()}`),
    );
    try {
      const record = await repository.create(
        createDraft('rsc-i', datasets[0].metadata.regulation.id),
      );
      const lastBackup = { createdAt: '2026-09-12T12:00:00.000Z', fingerprint: 'snapshot-test' };
      await repository.recordBackup(record.localId, lastBackup);
      expect((await repository.load(record.localId))?.revision).toBe(record.revision);
      const edited = await repository.update(record.localId, record.revision, record.project);
      expect(edited.lastBackup).toEqual(lastBackup);
      await repository.recordBackup(record.localId, {
        ...lastBackup,
        createdAt: '2026-09-11T12:00:00.000Z',
      });
      expect((await repository.load(record.localId))?.lastBackup).toEqual(lastBackup);
      expect((await repository.duplicate(record.localId)).lastBackup).toBeUndefined();
      const name = repository.database.name;
      repository.database.close();
      const reopened = new DexieProjectRepository(new ProjectDatabase(name));
      expect((await reopened.load(record.localId))?.lastBackup).toEqual(lastBackup);
      await reopened.database.delete();
    } finally {
      await repository.database.delete();
    }
  });
});
