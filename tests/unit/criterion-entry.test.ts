import { describe, expect, it } from 'vitest';
import { occurrenceProjectExportSchema } from '@/domain/criterion-entry';
import { activityProjectView, migrateProject } from '@/domain/project-migration';
import { draftProjectExportSchema } from '@/domain/project';
import {
  addOccurrence,
  createCriterionEntry,
  editOccurrence,
} from '@/features/criterion-entries/entries';
import { exportProject, importProject } from '@/features/local-projects/project-files';
import { calculateProjectScore } from '@/rules/scoring';
import { buildMemorialDocument } from '@/memorial/preview';
import { DexieProjectRepository, ProjectDatabase } from '@/storage/project-repository';
import { scoringFixture } from '../fixtures/scoring';
import { projectFixture } from '../fixtures/project';

function fixture() {
  const { project, dataset } = scoringFixture();
  project.userData.evidence = [
    { id: 'proof', title: 'Prova compartilhada', fileName: 'original.pdf', description: 'Legado' },
  ];
  project.userData.activities[0] = {
    ...project.userData.activities[0],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    generatedText: 'Base',
    editedText: 'Autoria',
    isManuallyEdited: true,
    evidenceIds: ['proof'],
  };
  project.userData.activities.push({
    ...project.userData.activities[0],
    id: 'second',
    quantity: 1,
  });
  return { project, dataset };
}

describe('domínio de critérios e ocorrências', () => {
  it('migra 2.0 sem perda, mantém ordem, autoria e referências e é idempotente', () => {
    const { project } = fixture();
    const before = structuredClone(project);
    const result = migrateProject(project);
    expect(result.project.userData.criterionEntries[0].occurrences).toHaveLength(2);
    expect(activityProjectView(result.project).userData).toEqual(project.userData);
    expect(migrateProject(result.project).project).toEqual(result.project);
    expect(migrateProject(project).project).toEqual(result.project);
    expect(project).toEqual(before);
    expect(result.project.userData.storedFiles).toEqual([]);
  });
  it('preserva rascunho 2.1 sem critério, sem nível e com versão normativa null', () => {
    const source = draftProjectExportSchema.parse({
      ...fixture().project,
      schemaVersion: '2.1',
      regulation: { id: 'pending', version: null },
    });
    source.userData.activities[0].criterionId = '';
    delete source.userData.activities[1].selectedLevel;
    const result = migrateProject(source);
    expect(result.pendingOccurrenceIds).toEqual(['activity-0', 'activity-1']);
    expect(activityProjectView(result.project)).toEqual(source);
    expect(result.project.regulation.version).toBeNull();
    expect(() => migrateProject(projectFixture)).toThrow(/1.0/);
  });
  it('agrega várias ocorrências pelo critério sem mudar pontuação, tetos ou memorial', () => {
    const { project, dataset } = fixture();
    dataset.levels[0].criteria[0].maxQuantity = 36;
    const migrated = migrateProject(project).project;
    expect(calculateProjectScore(migrated, dataset)).toEqual(
      calculateProjectScore(project, dataset),
    );
    expect(buildMemorialDocument(activityProjectView(migrated))).toEqual(
      buildMemorialDocument(project),
    );
    const score = calculateProjectScore(migrated, dataset);
    if (score.status === 'unavailable') throw new Error('Pontuação indisponível');
    expect(score.criteria[0]).toMatchObject({ submittedQuantity: 37, countedQuantity: 36 });
    expect(score.activities).toHaveLength(4);
  });
  it('cria e edita ocorrências validando identidade, período e evidências', () => {
    const project = migrateProject(fixture().project).project;
    const entry = project.userData.criterionEntries[0];
    const next = addOccurrence(project, entry.id, {
      ...entry.occurrences[0],
      id: 'new',
      quantity: 2,
      order: 4,
    });
    const edited = editOccurrence(next, 'new', { description: 'Descrição editada', quantity: 3 });
    expect(edited.userData.criterionEntries[0].occurrences.at(-1)?.quantity).toBe(3);
    expect(project.userData.criterionEntries[0].occurrences).toHaveLength(2);
    expect(() => addOccurrence(project, entry.id, entry.occurrences[0])).toThrow();
    expect(() => editOccurrence(next, 'new', { evidenceIds: ['missing'] })).toThrow();
    expect(() => editOccurrence(next, 'new', { quantity: -1 })).toThrow();
    expect(() =>
      editOccurrence(next, 'new', { period: { start: '2025-01-01', end: '2024-01-01' } }),
    ).toThrow();
    expect(() => editOccurrence(next, 'missing', {})).toThrow();
    expect(() => createCriterionEntry(project, { ...entry, id: 'duplicate-group' })).toThrow();
  });
  it('compartilha evidências e arquivos por ID sem duplicar descritores no round-trip', () => {
    const project = migrateProject(fixture().project).project;
    project.userData.storedFiles = [
      { id: 'file', name: 'arquivo.pdf', size: 123, mediaType: 'application/pdf' },
    ];
    project.userData.evidence[0].fileIds = ['file'];
    project.userData.evidence.push({ id: 'proof-2', title: 'Outra referência', fileIds: ['file'] });
    const parsed = occurrenceProjectExportSchema.parse(JSON.parse(exportProject(project)));
    expect(parsed).toEqual(project);
    expect(parsed.userData.storedFiles).toHaveLength(1);
    expect(() =>
      occurrenceProjectExportSchema.parse({
        ...project,
        userData: { ...project.userData, storedFiles: [] },
      }),
    ).toThrow();
    project.userData.evidence[0].fileIds.push('file');
    expect(() => occurrenceProjectExportSchema.parse(project)).toThrow();
  });
  it('migra IndexedDB em nova cópia, reabre, duplica e importa sem tocar a origem', async () => {
    const name = `migration-${crypto.randomUUID()}`;
    let repository = new DexieProjectRepository(new ProjectDatabase(name));
    try {
      const source = await repository.create(fixture().project);
      const migration = migrateProject(source.project);
      const migrated = { ...migration, record: await repository.create(migration.project) };
      expect(migrated.record.localId).not.toBe(source.localId);
      expect(await repository.load(source.localId)).toEqual(source);
      repository.database.close();
      repository = new DexieProjectRepository(new ProjectDatabase(name));
      expect((await repository.load(migrated.record.localId))?.project).toEqual(migrated.project);
      const duplicate = await repository.duplicate(migrated.record.localId);
      expect(duplicate.project.schemaVersion).toBe('3.0');
      const imported = await importProject(
        { text: async () => exportProject(migrated.project) },
        repository,
      );
      expect(imported.success).toBe(true);
      if (imported.success) expect(imported.record.project).toEqual(migrated.project);
      expect(await repository.list()).toHaveLength(4);
    } finally {
      await repository.database.delete();
    }
  });
  it('recusa regras normativas copiadas e ocorrências duplicadas em grupos diferentes', () => {
    const project = migrateProject(fixture().project).project;
    project.userData.criterionEntries[1].occurrences.push(
      project.userData.criterionEntries[0].occurrences[0],
    );
    expect(() => occurrenceProjectExportSchema.parse(project)).toThrow();
    const fresh = migrateProject(fixture().project).project;
    expect(() =>
      occurrenceProjectExportSchema.parse({
        ...fresh,
        userData: { ...fresh.userData, factor: 99 },
      }),
    ).toThrow();
  });
});
