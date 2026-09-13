import { File as NodeFile, Blob as NodeBlob } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRegulation, loadIfbaRegulation } from '@/data/regulations/load';
import { createDraft } from '@/features/project-shell/project-view';
import {
  allOccurrences,
  quantityPresentation,
  previewRequirement,
  saveRequirement,
  removeRequirement,
  requirementFormSchema,
} from '@/features/requirements/requirements';
import { occurrenceProjectExportSchema } from '@/domain/criterion-entry';
import { DexieProjectRepository, ProjectDatabase } from '@/storage/project-repository';
import { activityProjectView } from '@/domain/project-migration';
import { calculateProjectScore } from '@/rules/scoring';
import fixture from '../fixtures/criteria-regulation.json';

const dataset = parseRegulation(fixture);
const criterion = dataset.levels[0].criteria[0];
const values = {
  start: '2024-01-01',
  end: '2024-12-31',
  quantity: 2,
  description: 'Experiência de teste',
};
function project() {
  const draft = createDraft('rsc-i', 'ifba-189-2026');
  draft.userData.teacher.name = 'Docente teste';
  return {
    ...draft,
    regulation: { id: dataset.metadata.regulation.id, version: dataset.metadata.version },
  };
}
const databases: ProjectDatabase[] = [];
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('File', NodeFile);
  vi.stubGlobal('Blob', NodeBlob);
});
afterEach(async () => {
  await Promise.all(databases.map((db) => db.delete()));
  databases.length = 0;
  vi.unstubAllGlobals();
});
describe('lançamentos por requisitos', () => {
  it('deriva unidade e pontuação do JSON sem presumir meses ou quantidade unitária', () => {
    const changed = { ...criterion, unit: 'evento', factor: 2.5, weight: 2, maxQuantity: 3 };
    expect(quantityPresentation(changed).label).toBe('Quantidade (evento)');
    expect(previewRequirement(dataset, changed, 2)).toContain('10 pontos');
    expect(previewRequirement(dataset, { ...changed, factor: 3 }, 2)).toContain('12 pontos');
    expect(quantityPresentation({ ...changed, unit: 'mês' }).help).toContain('não determinam');
    expect(requirementFormSchema.safeParse({ ...values, end: '2023-01-01' }).success).toBe(false);
    expect(requirementFormSchema.safeParse({ ...values, quantity: -1 }).success).toBe(false);
  });
  it('permite dados provisórios e bloqueia pontuação em catálogo pendente ou conflitante', async () => {
    const pending = loadIfbaRegulation();
    const conflict = pending.levels[1].criteria.find((item) => item.id === 'rsc-ii-d-5')!;
    const next = await saveRequirement(
      createDraft('rsc-ii', pending.metadata.regulation.id),
      pending,
      conflict.id,
      'rsc-ii',
      values,
    );
    expect(allOccurrences(next.project)).toHaveLength(1);
    expect(previewRequirement(pending, conflict, 2)).toContain('Indisponível');
    expect(calculateProjectScore(next.project, pending).status).toBe('unavailable');
    expect(next.project.userData.criterionEntries[0]).not.toHaveProperty('weight');
  });
  it('salva o arquivo no mesmo fluxo e preserva IDs, autoria, ordem e comprovante compartilhado', async () => {
    const initial = project();
    const original = structuredClone(initial);
    const created = await saveRequirement(
      initial,
      dataset,
      criterion.id,
      'rsc-i',
      values,
      undefined,
      new File(['documento'], 'teste.txt', { type: 'text/plain' }),
    );
    expect(initial).toEqual(original);
    const occurrence = allOccurrences(created.project)[0];
    expect(occurrence.evidenceIds).toHaveLength(1);
    expect(created.project.userData.storedFiles[0]).toMatchObject({ name: 'teste.txt', size: 9 });
    expect(created.files).toHaveLength(1);
    expect(occurrence).not.toHaveProperty('factor');
    occurrence.editedText = 'Texto de autoria';
    occurrence.isManuallyEdited = true;
    const second = await saveRequirement(
      created.project,
      dataset,
      criterion.id,
      'rsc-i',
      values,
      undefined,
      undefined,
      occurrence.evidenceIds,
    );
    const edited = await saveRequirement(
      second.project,
      dataset,
      criterion.id,
      'rsc-i',
      { ...values, quantity: 99 },
      occurrence.id,
    );
    expect(allOccurrences(edited.project)[0]).toMatchObject({
      id: allOccurrences(second.project)[1].id,
    });
    const updated = allOccurrences(edited.project).find((item) => item.id === occurrence.id)!;
    expect(updated).toMatchObject({
      editedText: 'Texto de autoria',
      order: occurrence.order,
      isManuallyEdited: true,
      quantity: 99,
    });
    const view = activityProjectView(edited.project);
    expect(view.userData.activities[0].id).toBe(occurrence.id);
    expect(calculateProjectScore(edited.project, dataset).status).not.toBe('unavailable');
    const removed = removeRequirement(edited.project, occurrence.id);
    expect(allOccurrences(removed.project)).toHaveLength(1);
    expect(removed.project.userData.evidence).toHaveLength(1);
    expect(removed.project.userData.storedFiles).toHaveLength(1);
    expect(occurrenceProjectExportSchema.safeParse(removed.project).success).toBe(true);
  });
  it('arquivos persistem atomicamente, sobrevivem à duplicação e faltam em importação JSON', async () => {
    const database = new ProjectDatabase(`requirements-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = new DexieProjectRepository(database);
    const original = await repository.create(project());
    const changed = await saveRequirement(
      original.project,
      dataset,
      criterion.id,
      'rsc-i',
      values,
      undefined,
      new File(['documento'], 'teste.txt', { type: 'text/plain' }),
    );
    const saved = await repository.updateWithFiles(
      original.localId,
      original.revision,
      changed.project,
      changed.files,
    );
    const id = changed.project.userData.storedFiles[0].id;
    expect(await (await repository.fileResolver(saved.localId).getFile(id)).text()).toBe(
      'documento',
    );
    const copy = await repository.duplicate(saved.localId);
    await repository.delete(saved.localId, saved.revision);
    expect(await (await repository.fileResolver(copy.localId).getFile(id)).text()).toBe(
      'documento',
    );
    const imported = await repository.create(copy.project);
    await expect(repository.fileResolver(imported.localId).getFile(id)).rejects.toThrow('ausente');
    await expect(
      repository.updateWithFiles(
        original.localId,
        original.revision,
        changed.project,
        changed.files,
      ),
    ).rejects.toThrow('excluído');
    const record = await repository.create(project());
    vi.spyOn(database.files, 'bulkPut').mockRejectedValueOnce(new Error('Quota'));
    await expect(
      repository.updateWithFiles(record.localId, record.revision, changed.project, changed.files),
    ).rejects.toThrow('Quota');
    expect(await repository.load(record.localId)).toEqual(record);
  });
  it('recusa vínculo de critério e evidência inexistente', async () => {
    await expect(saveRequirement(project(), dataset, 'missing', 'rsc-i', values)).rejects.toThrow();
    await expect(
      saveRequirement(project(), dataset, criterion.id, 'rsc-ii', values),
    ).rejects.toThrow();
    await expect(
      saveRequirement(project(), dataset, criterion.id, 'rsc-i', values, undefined, undefined, [
        'missing',
      ]),
    ).rejects.toThrow();
  });
});
