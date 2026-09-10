import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DexieProjectRepository, ProjectDatabase } from '@/storage/project-repository';
import {
  createProject,
  exportProject,
  importProject,
} from '@/features/local-projects/project-files';
import { ProjectAutosave } from '@/features/local-projects/autosave';
import { portableProject } from '@/domain/portable-project';
import { currentProjectFixture, projectFixture } from '../fixtures/project';
import { projectExportSchema } from '@/domain/project';

let repository: DexieProjectRepository;
beforeEach(() => {
  repository = new DexieProjectRepository(new ProjectDatabase(`test-${crypto.randomUUID()}`));
});
afterEach(async () => {
  await repository.database.delete();
});
const fixture = () => projectExportSchema.parse(currentProjectFixture);

describe('persistência local', () => {
  it('cria, lista, carrega e atualiza sem alterar versões e referência normativa', async () => {
    const project = fixture();
    const record = await repository.create(project);
    expect(await repository.load(record.localId)).toEqual(record);
    expect(await repository.list()).toEqual([record]);
    if (project.schemaVersion === '2.0') project.userData.title = 'Editado';
    const next = await repository.update(record.localId, record.revision, project);
    expect(next.revision).toBe(2);
    expect(next.createdAt).toBe(record.createdAt);
    expect(next.project.regulation).toEqual(currentProjectFixture.regulation);
    expect((await repository.load(record.localId))?.project).toEqual(project);
    expect(record.project).toEqual(currentProjectFixture);
  });
  it('preserva múltiplas importações com o mesmo ID de projeto', async () => {
    const a = await repository.create(fixture());
    const b = await repository.create(fixture());
    expect(a.localId).not.toBe(b.localId);
    expect(a.project).toEqual(b.project);
    expect(await repository.list()).toHaveLength(2);
  });
  it('recupera projeto selecionado após fechar e reabrir IndexedDB', async () => {
    const record = await repository.create(fixture());
    await repository.select(record.localId);
    const name = repository.database.name;
    repository.database.close();
    repository = new DexieProjectRepository(new ProjectDatabase(name));
    expect(await repository.selected()).toEqual(record);
  });
  it('duplica com novo ID e sem mutar o original', async () => {
    const original = await repository.create(fixture());
    const copy = await repository.duplicate(original.localId);
    expect(copy.localId).not.toBe(original.localId);
    if (copy.project.schemaVersion === '2.0' && original.project.schemaVersion === '2.0') {
      expect(copy.project.userData.id).not.toBe(original.project.userData.id);
      expect(copy.project.userData.title).toBe('Memorial (cópia)');
      expect(copy.project.userData.activities).toEqual(original.project.userData.activities);
    }
    expect(copy.project.regulation).toEqual(original.project.regulation);
    expect(await repository.load(original.localId)).toEqual(original);
  });
  it('duplica legado sem reinterpretar campos', async () => {
    const original = await repository.create(projectExportSchema.parse(projectFixture));
    const copy = await repository.duplicate(original.localId);
    expect(copy.project).toEqual(original.project);
  });
  it('exclui apenas projeto escolhido e limpa seleção', async () => {
    const a = await repository.create(fixture());
    const b = await repository.create(fixture());
    await repository.select(a.localId);
    await repository.delete(a.localId, a.revision);
    expect(await repository.load(a.localId)).toBeUndefined();
    expect(await repository.selected()).toBeUndefined();
    expect(await repository.load(b.localId)).toEqual(b);
    await expect(repository.update(a.localId, a.revision, a.project)).rejects.toThrow('excluído');
  });
  it('impede sobrescrita e exclusão por revisão antiga', async () => {
    const a = await repository.create(fixture());
    await repository.update(a.localId, 1, a.project);
    await expect(repository.update(a.localId, 1, a.project)).rejects.toThrow('outra aba');
    await expect(repository.delete(a.localId, 1)).rejects.toThrow('outra aba');
    expect((await repository.load(a.localId))?.revision).toBe(2);
  });
  it('serializa concorrência entre conexões do banco', async () => {
    const other = new DexieProjectRepository(new ProjectDatabase(repository.database.name));
    try {
      const record = await repository.create(fixture());
      const outcomes = await Promise.allSettled([
        repository.update(record.localId, 1, record.project),
        other.update(record.localId, 1, record.project),
      ]);
      expect(outcomes.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
      expect(outcomes.filter((item) => item.status === 'rejected')).toHaveLength(1);
    } finally {
      other.database.close();
    }
  });
  it.each([projectFixture, currentProjectFixture])(
    'round-trip portátil do schema $schemaVersion',
    async (input) => {
      const project = projectExportSchema.parse(input);
      const json = exportProject(project);
      const imported = await importProject({ text: async () => json }, repository);
      expect(imported.success).toBe(true);
      if (imported.success) {
        expect(imported.record.project).toEqual(project);
        expect(exportProject((await repository.load(imported.record.localId))!.project)).toBe(json);
      }
    },
  );
  it.each([
    '{',
    JSON.stringify({ ...projectFixture, schemaVersion: '99.0' }),
    JSON.stringify({ ...currentProjectFixture, userData: {} }),
  ])('rejeita importação inválida sem gravar %s', async (text) => {
    expect((await importProject({ text: async () => text }, repository)).success).toBe(false);
    expect(await repository.list()).toEqual([]);
  });
  it('recusa valores legados que perderiam dados no JSON', () => {
    for (const value of [undefined, Infinity, NaN, new Date(), 1n, () => 1]) {
      expect(() => portableProject({ ...projectFixture, userData: { value } })).toThrow();
    }
  });
  it('cria projeto com versão da aplicação e referência explícita', () => {
    const project = createProject('Título', 'Docente', { id: 'teste', version: 'declarada' });
    expect(project.schemaVersion).toBe('2.0');
    expect(project.applicationVersion).toBeTruthy();
    expect(project.regulation).toEqual({ id: 'teste', version: 'declarada' });
    expect(() => createProject('', '', { id: '', version: '' })).toThrow();
  });
  it('autosave persiste a última edição e sobrevive à reabertura', async () => {
    const record = await repository.create(fixture());
    const states: string[] = [];
    const update = vi.spyOn(repository, 'update');
    const autosave = new ProjectAutosave(
      repository,
      record,
      (state) => states.push(state.status),
      20,
    );
    const next = fixture();
    if (next.schemaVersion === '2.0') next.userData.title = 'Última edição';
    autosave.schedule(record.project);
    autosave.schedule(next);
    await vi.waitFor(() => expect(states.at(-1)).toBe('saved'));
    expect(update).toHaveBeenCalledTimes(1);
    expect((await repository.load(record.localId))?.project).toEqual(next);
    expect(autosave.dirty).toBe(false);
    autosave.dispose();
  });
  it('mantém edição pendente em falha e permite tentar novamente', async () => {
    const record = await repository.create(fixture());
    const states: string[] = [];
    const update = vi
      .spyOn(repository, 'update')
      .mockRejectedValueOnce(new Error('QuotaExceededError'));
    const autosave = new ProjectAutosave(
      repository,
      record,
      (state) => states.push(state.status),
      10000,
    );
    autosave.schedule(record.project);
    expect(await autosave.flush()).toBe(false);
    expect(autosave.dirty).toBe(true);
    expect(states.at(-1)).toBe('error');
    expect(await autosave.flush()).toBe(true);
    expect(update).toHaveBeenCalledTimes(2);
    expect(states.at(-1)).toBe('saved');
    autosave.dispose();
  });
  it('não perde edição recebida durante gravação em andamento', async () => {
    const record = await repository.create(fixture());
    const actualUpdate = repository.update.bind(repository);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(repository, 'update').mockImplementationOnce(async (...args) => {
      await gate;
      return actualUpdate(...args);
    });
    const states: string[] = [];
    const autosave = new ProjectAutosave(
      repository,
      record,
      (state) => states.push(state.status),
      10000,
    );
    autosave.schedule(record.project);
    const flushing = autosave.flush();
    const next = fixture();
    if (next.schemaVersion === '2.0') next.userData.title = 'Durante gravação';
    autosave.schedule(next);
    release();
    expect(await flushing).toBe(true);
    expect((await repository.load(record.localId))?.project).toEqual(next);
    expect(states.filter((state) => state === 'saved')).toHaveLength(1);
    autosave.dispose();
  });
});

it('descarta edição pendente sem gravá-la ao reabrir versão salva', async () => {
  const record = await repository.create(fixture());
  const update = vi.spyOn(repository, 'update');
  const autosave = new ProjectAutosave(repository, record, () => {}, 10000);
  const next = fixture();
  if (next.schemaVersion === '2.0') next.userData.title = 'Descartar';
  autosave.schedule(next);
  await autosave.discardPending();
  expect(update).not.toHaveBeenCalled();
  expect(autosave.dirty).toBe(false);
  expect((await repository.load(record.localId))?.project).toEqual(record.project);
  autosave.dispose();
});
