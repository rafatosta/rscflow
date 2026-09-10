import { expect, it } from 'vitest';
import {
  projectExportSchema,
  currentProjectExportSchema,
  scoringResultSchema,
} from '@/domain/project';
import { validateProjectFile } from '@/features/project-import/validate-project-file';
import { currentProjectFixture } from '../fixtures/project';

it('valida e importa envelope tipado 2.0', async () => {
  expect(currentProjectExportSchema.parse(currentProjectFixture)).toEqual(currentProjectFixture);
  expect(
    await validateProjectFile({ text: async () => JSON.stringify(currentProjectFixture) }),
  ).toEqual({ success: true, project: currentProjectFixture });
});
it.each([
  { teacher: {} },
  { request: { level: 'iv' } },
  { education: [{ id: '1' }] },
  { activities: [{ ...currentProjectFixture.userData.activities[0], quantity: -1 }] },
  { activities: [{ ...currentProjectFixture.userData.activities[0], evidenceIds: ['ausente'] }] },
  { activities: [{ ...currentProjectFixture.userData.activities[0], evidenceIds: ['e1', 'e1'] }] },
  {
    evidence: [
      currentProjectFixture.userData.evidence[0],
      currentProjectFixture.userData.evidence[0],
    ],
  },
  { memorial: {} },
  { unknown: true },
])('rejeita dados tipados inválidos %j', (patch) => {
  expect(
    projectExportSchema.safeParse({
      ...currentProjectFixture,
      userData: { ...currentProjectFixture.userData, ...patch },
    }).success,
  ).toBe(false);
});
it('valida contrato de resultado sem calcular pontuação', () => {
  const result = {
    regulation: { id: 'teste', version: 'teste' },
    level: 'rsc-i',
    total: 0,
    criteria: [],
  };
  expect(scoringResultSchema.safeParse(result).success).toBe(true);
  expect(scoringResultSchema.safeParse({ ...result, total: -1 }).success).toBe(false);
});
