import { createHash } from 'node:crypto';
import { Blob as NodeBlob } from 'node:buffer';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { occurrenceProjectExportSchema } from '@/domain/criterion-entry';
import { loadIfbaRegulation } from '@/data/regulations/load';
import { importProject } from '@/features/local-projects/project-files';
import { calculateProjectScore, calculateRequirementScore } from '@/rules/scoring';
import { DexieProjectRepository, ProjectDatabase } from '@/storage/project-repository';

const directory = join(process.cwd(), 'examples/rsc-iii-demonstrativo');
const project = occurrenceProjectExportSchema.parse(
  JSON.parse(readFileSync(join(directory, 'processo-rsc-iii-demonstrativo.json'), 'utf8')),
);
let database: ProjectDatabase | undefined;

afterEach(async () => {
  await database?.delete();
  database = undefined;
});

it('mantém o demonstrativo RSC III fictício vinculado ao catálogo e aos comprovantes locais', () => {
  expect(project.userData.request?.level).toBe('rsc-iii');
  expect(project.userData.education).toHaveLength(3);
  expect(project.userData.criterionEntries).toHaveLength(8);
  expect(project.userData.storedFiles).toHaveLength(8);
  expect(project.userData.memorial?.conclusion).toMatch(/fictícios/i);

  const regulation = loadIfbaRegulation();
  const score = calculateProjectScore(project, regulation);
  expect(score.status).not.toBe('unavailable');
  if (score.status !== 'unavailable') {
    expect(score.validation.status).toBe('provisional');
    expect(score.requirementProjection.filter((item) => item.launches.length)).toHaveLength(8);
  }
  for (const entry of project.userData.criterionEntries) {
    const criterion = regulation.levels
      .find((level) => level.section === entry.selectedLevel)
      ?.criteria.find((item) => item.id === entry.criterionId);
    expect(criterion).toBeDefined();
    expect(
      calculateRequirementScore(
        entry.occurrences.map(({ quantity }) => quantity),
        criterion,
      ).status,
    ).toBe('available');
    expect(entry.occurrences).toHaveLength(1);
    expect(entry.occurrences[0].evidenceIds).toHaveLength(1);
  }

  for (const descriptor of project.userData.storedFiles) {
    const bytes = readFileSync(join(directory, 'comprovantes', descriptor.name));
    expect(statSync(join(directory, 'comprovantes', descriptor.name)).size).toBe(descriptor.size);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(descriptor.sha256);
  }
});

it('restaura os comprovantes do demonstrativo na transação local existente', async () => {
  database = new ProjectDatabase('rscflow-demo-rsc-iii-test');
  const repository = new DexieProjectRepository(database);
  const imported = await importProject(
    {
      text: async () =>
        readFileSync(join(directory, 'processo-rsc-iii-demonstrativo.json'), 'utf8'),
    },
    repository,
  );
  expect(imported.success).toBe(true);
  if (!imported.success) {
    throw new Error(imported.errors.join(' '));
  }

  const files = project.userData.storedFiles.map((descriptor) => {
    const bytes = readFileSync(join(directory, 'comprovantes', descriptor.name));
    return {
      id: descriptor.id,
      blob: new NodeBlob([bytes], { type: descriptor.mediaType }) as unknown as Blob,
    };
  });
  const restored = await repository.updateWithFiles(
    imported.record.localId,
    imported.record.revision,
    project,
    files,
  );

  expect(restored.revision).toBe(2);
  await expect(
    repository.fileResolver(restored.localId).getFile('file-rsc-iii-a-1'),
  ).resolves.toBeInstanceOf(File);
});
