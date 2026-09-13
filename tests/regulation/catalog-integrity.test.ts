import { describe, expect, it } from 'vitest';
import { loadIfbaRegulation } from '@/data/regulations/load';
import { calculateActivity, calculateProjectScore } from '@/rules/scoring';
import { scoringFixture } from '../fixtures/scoring';

const expected = {
  'rsc-i': { directives: [...'abcdefgh'], criteria: 48 },
  'rsc-ii': { directives: [...'abcdefg'], criteria: 36 },
  'rsc-iii': { directives: [...'abcdefg'], criteria: 53 },
} as const;

describe('integridade da transcrição pendente dos Anexos IV, V e VI', () => {
  it('carrega conteúdo estruturalmente válido, completo por nível e ainda pendente', () => {
    const dataset = loadIfbaRegulation();
    expect(dataset.metadata.status).toBe('pending-official-validation');
    expect(dataset.metadata.version).toBeNull();
    for (const level of dataset.levels) {
      const definition = expected[level.section];
      expect(level.status).toBe('pending-official-validation');
      expect(level.directives.map((directive) => directive.code)).toEqual(definition.directives);
      expect(level.criteria).toHaveLength(definition.criteria);
      expect(level.directives.reduce((sum, directive) => sum + directive.maxScore, 0)).toBe(100);
      expect(level.directives.reduce((sum, directive) => sum + (directive.weight ?? 0), 0)).toBe(
        10,
      );
    }
  });

  it('mantém IDs e códigos únicos e todos os critérios vinculados à sua diretriz', () => {
    const dataset = loadIfbaRegulation();
    const globalIds = dataset.levels.flatMap((level) => [
      ...level.directives.map((directive) => directive.id),
      ...level.criteria.map((criterion) => criterion.id),
    ]);
    expect(new Set(globalIds).size).toBe(globalIds.length);
    for (const level of dataset.levels) {
      const codes = level.criteria.map((criterion) => criterion.code);
      expect(new Set(codes).size).toBe(codes.length);
      const directiveIds = new Set(level.directives.map((directive) => directive.id));
      for (const criterion of level.criteria) {
        expect(directiveIds.has(criterion.directiveId)).toBe(true);
        expect(criterion.factor).toBeGreaterThanOrEqual(0);
        expect(criterion.maxQuantity).toBeGreaterThanOrEqual(0);
        expect(criterion.weight).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('preserva literalmente e bloqueia o conflito interno do RSC II d.5', () => {
    const dataset = loadIfbaRegulation();
    const criterion = dataset.levels[1].criteria.find((item) => item.id === 'rsc-ii-d-5');
    expect(criterion).toMatchObject({
      code: 'd.5',
      weight: 14,
      provenance: {
        status: 'pending-official-validation',
        issue: { type: 'normative-conflict' },
      },
    });
    expect(calculateActivity(1, criterion)).toMatchObject({
      status: 'unavailable',
      reason: 'Critério pendente de validação.',
    });
    expect(
      calculateActivity(1, {
        ...criterion,
        provenance: {
          ...criterion?.provenance,
          status: 'validated',
          validatedBy: 'Pessoa de teste',
        },
      }),
    ).toMatchObject({ status: 'unavailable' });
    const { dataset: projectDataset, project } = scoringFixture();
    const directive = dataset.levels[1].directives.find(
      (item) => item.id === criterion!.directiveId,
    );
    projectDataset.metadata.status = 'pending-official-validation';
    projectDataset.levels[1].status = 'pending-official-validation';
    projectDataset.levels[1].directives[0] = structuredClone(directive!);
    projectDataset.levels[1].criteria[0] = {
      ...structuredClone(criterion!),
      directiveId: directive!.id,
    };
    project.userData.activities[1] = {
      ...project.userData.activities[1],
      criterionId: criterion!.id,
      selectedLevel: 'rsc-ii',
    };
    expect(calculateProjectScore(project, projectDataset)).toMatchObject({
      status: 'unavailable',
      issues: [{ code: 'normative-conflict' }],
    });
  });
});
