import { describe, expect, it } from 'vitest';
import { calculateActivity, calculateProjectScore, roundFinalScore } from '@/rules/scoring';
import { loadIfbaRegulation } from '@/data/regulations/load';
import { scoringFixture } from '../fixtures/scoring';

function successful(result: ReturnType<typeof calculateProjectScore>) {
  if (result.status === 'unavailable') throw new Error(JSON.stringify(result.issues));
  return result;
}

describe('motor de pontuação', () => {
  it('consolida níveis, total e mínimos sem aplicar peso de diretriz novamente', () => {
    const { dataset, project } = scoringFixture();
    const result = successful(calculateProjectScore(project, dataset));
    expect(result.levels.map((level) => level.score)).toEqual([36, 14, 10]);
    expect(result.total).toBe(60);
    expect(result.status).toBe('quantitative-requirements-met');
  });
  it.each([
    [35, 15, 10, false, true],
    [36, 13, 10, true, false],
    [36, 14, 10, true, true],
    [35.99, 14.01, 10, false, true],
    [36, 13.49, 10, true, false],
    [36, 13.5, 10, true, true],
  ])('avalia limites %s/%s/%s', (a, b, c, levelMet, totalMet) => {
    const { dataset, project } = scoringFixture();
    project.userData.activities.forEach((activity, i) => {
      activity.quantity = [a, b, c][i];
    });
    const result = successful(calculateProjectScore(project, dataset));
    expect(result.requirements).toMatchObject({ totalMet, requestedLevelMet: levelMet });
    expect(result.status).toBe(
      levelMet && totalMet ? 'quantitative-requirements-met' : 'quantitative-requirements-not-met',
    );
  });
  it('avalia o nível escolhido pelo requerente', () => {
    const { dataset, project } = scoringFixture();
    project.userData.request = { level: 'rsc-ii' };
    const result = successful(calculateProjectScore(project, dataset));
    expect(result.requirements.requestedLevelMet).toBe(false);
  });
  it('calcula fator × quantidade × peso e limita quantidade', () => {
    const criterion = scoringFixture().dataset.levels[0].criteria[0];
    Object.assign(criterion, { factor: 0.41, weight: 2, maxQuantity: 12 });
    expect(calculateActivity(20, criterion)).toEqual({
      status: 'available',
      countedQuantity: 12,
      score: 9.84,
    });
  });
  it('compartilha limite entre atividades do mesmo critério', () => {
    const { dataset, project } = scoringFixture();
    dataset.levels[0].criteria[0].maxQuantity = 40;
    project.userData.activities.push({ ...project.userData.activities[0], id: 'extra' });
    const result = successful(calculateProjectScore(project, dataset));
    expect(result.criteria[0]).toMatchObject({
      submittedQuantity: 72,
      countedQuantity: 40,
      score: 40,
    });
    expect(
      result.activities.filter((item) => item.level === 'rsc-i').map((item) => item.score),
    ).toEqual([36, 36]);
    expect(result.total).toBe(64);
  });
  it('limita diretriz após somar critérios distintos', () => {
    const { dataset, project } = scoringFixture();
    const level = dataset.levels[0];
    level.criteria.push({ ...level.criteria[0], id: 'extra', code: 'a.2' });
    level.directives[0].maxScore = 40;
    project.userData.activities.push({
      ...project.userData.activities[0],
      id: 'extra',
      criterionId: 'extra',
    });
    const result = successful(calculateProjectScore(project, dataset));
    expect(result.directives[0]).toMatchObject({ uncappedScore: 72, score: 40 });
    expect(result.total).toBe(64);
  });
  it('aplica teto por nível e respeita mudanças nos parâmetros JSON', () => {
    const { dataset, project } = scoringFixture();
    dataset.metadata.scoring!.maximumLevelScore = 30;
    dataset.metadata.scoring!.minimumTotal = 50;
    dataset.metadata.scoring!.minimumRequestedLevel = 30;
    const result = successful(calculateProjectScore(project, dataset));
    expect(result.levels[0]).toMatchObject({ uncappedScore: 36, score: 30 });
    expect(result.total).toBe(54);
    expect(result.status).toBe('quantitative-requirements-met');
  });
  it('não arredonda itens ou níveis antes do total e soma decimais exatamente', () => {
    const { dataset, project } = scoringFixture();
    project.userData.activities.forEach((activity, index) => {
      activity.quantity = [0.1, 0.2, 0.2][index];
    });
    const result = successful(calculateProjectScore(project, dataset));
    expect(result.rawTotal).toBe(0.5);
    expect(result.total).toBe(1);
    expect(result.levels.map((level) => level.score)).toEqual([0.1, 0.2, 0.2]);
  });
  it('arredonda com precisão configurada no dataset', () => {
    const policy = scoringFixture().dataset.metadata.scoring!;
    policy.rounding.decimalPlaces = 2;
    expect(roundFinalScore(1.005, policy)).toEqual({ status: 'available', score: 1.01 });
  });
  it.each([
    [0.49, 0],
    [0.5, 1],
    [0.99, 1],
    [59.49, 59],
    [59.5, 60],
    [60, 60],
  ])('arredonda %s para %s', (value, score) => {
    expect(roundFinalScore(value, scoringFixture().dataset.metadata.scoring)).toEqual({
      status: 'available',
      score,
    });
  });
  it('retorna zeros para projeto vazio validado', () => {
    const { dataset, project } = scoringFixture();
    project.userData.activities = [];
    const result = successful(calculateProjectScore(project, dataset));
    expect(result.total).toBe(0);
    expect(result.status).toBe('quantitative-requirements-not-met');
  });
  it('não altera entrada e é independente da ordem das atividades', () => {
    const { dataset, project } = scoringFixture();
    const before = JSON.stringify({ dataset, project });
    const first = calculateProjectScore(project, dataset);
    expect(JSON.stringify({ dataset, project })).toBe(before);
    project.userData.activities.reverse();
    expect(calculateProjectScore(project, dataset)).toEqual(first);
  });
  it('recalcula após editar fatores, pesos e limites do dataset', () => {
    const { dataset, project } = scoringFixture();
    Object.assign(dataset.levels[0].criteria[0], { factor: 2, weight: 2, maxQuantity: 10 });
    expect(successful(calculateProjectScore(project, dataset)).levels[0].score).toBe(40);
  });
  it('bloqueia versão normativa divergente e projeto legado', () => {
    const { dataset, project } = scoringFixture();
    project.regulation.version = 'outra';
    expect(calculateProjectScore(project, dataset)).toMatchObject({
      status: 'unavailable',
      issues: [{ code: 'regulation-mismatch' }],
    });
    expect(calculateProjectScore({ ...project, schemaVersion: '1.0' }, dataset).status).toBe(
      'unavailable',
    );
  });
  it('bloqueia falta de requerimento e escolhas ausentes, desconhecidas ou incompatíveis', () => {
    const { dataset, project } = scoringFixture();
    for (const patch of [
      { selectedLevel: undefined },
      { selectedLevel: 'rsc-ii' },
      { criterionId: 'inexistente' },
    ]) {
      const input = structuredClone(project);
      Object.assign(input.userData.activities[0], patch);
      expect(calculateProjectScore(input, dataset)).toMatchObject({
        status: 'unavailable',
        issues: [{ code: 'invalid-selection' }],
      });
    }
    project.userData.request = null;
    expect(calculateProjectScore(project, dataset)).toMatchObject({
      status: 'unavailable',
      issues: [{ code: 'missing-request' }],
    });
  });
  it('não permite contabilizar a mesma atividade em múltiplos níveis', () => {
    const { dataset, project } = scoringFixture();
    project.userData.activities.push({
      ...project.userData.activities[0],
      selectedLevel: 'rsc-ii',
      criterionId: dataset.levels[1].criteria[0].id,
    });
    expect(calculateProjectScore(project, dataset)).toMatchObject({
      status: 'unavailable',
      issues: [{ code: 'invalid-project' }],
    });
  });
  it('mudança de enquadramento move a pontuação para um único nível', () => {
    const { dataset, project } = scoringFixture();
    Object.assign(project.userData.activities[0], {
      selectedLevel: 'rsc-iii',
      criterionId: dataset.levels[2].criteria[0].id,
    });
    const result = successful(calculateProjectScore(project, dataset));
    expect(result.levels.map((level) => level.score)).toEqual([0, 14, 46]);
    expect(result.total).toBe(60);
  });
  it('bloqueia dataset pendente sem oferecer total enganoso', () => {
    const result = calculateProjectScore(scoringFixture().project, loadIfbaRegulation());
    expect(result).toMatchObject({ status: 'unavailable', issues: [{ code: 'pending-dataset' }] });
    expect(result).not.toHaveProperty('total');
  });
  it('bloqueia política ausente ou pendente', () => {
    const { dataset, project } = scoringFixture();
    dataset.metadata.scoring!.provenance.status = 'pending-official-validation';
    expect(calculateProjectScore(project, dataset)).toMatchObject({
      status: 'unavailable',
      issues: [{ code: 'pending-policy' }],
    });
    delete dataset.metadata.scoring;
    expect(calculateProjectScore(project, dataset).status).toBe('unavailable');
    expect(roundFinalScore(1, undefined).status).toBe('unavailable');
  });
  it.each([
    { factor: -1 },
    { maxQuantity: -1 },
    { weight: NaN },
    { code: '?' },
    { directiveId: 'ausente' },
    { provenance: { status: 'pending-official-validation', sourceReference: 'teste' } },
  ])('bloqueia critério inválido/pendente %j', (patch) => {
    const { dataset, project } = scoringFixture();
    Object.assign(dataset.levels[0].criteria[0], patch);
    expect(calculateProjectScore(project, dataset).status).toBe('unavailable');
  });
  it.each([-1, NaN, Infinity])('bloqueia quantidade %s', (quantity) => {
    const { dataset, project } = scoringFixture();
    project.userData.activities[0].quantity = quantity;
    expect(calculateProjectScore(project, dataset).status).toBe('unavailable');
    expect(calculateActivity(quantity, dataset.levels[0].criteria[0]).status).toBe('unavailable');
  });
  it('trata overflow e underflow explicitamente', () => {
    const { dataset, project } = scoringFixture();
    Object.assign(dataset.levels[0].criteria[0], { factor: 1e308, weight: 1e308 });
    expect(calculateProjectScore(project, dataset)).toMatchObject({
      status: 'unavailable',
      issues: [{ code: 'numeric-range' }],
    });
    expect(calculateActivity(1, dataset.levels[0].criteria[0]).status).toBe('unavailable');
    Object.assign(dataset.levels[0].criteria[0], { factor: 1e-300, weight: 1e-300 });
    expect(calculateActivity(1, dataset.levels[0].criteria[0]).status).toBe('unavailable');
  });
  it('aceita fatores zero e notação exponencial sem arredondamento intermediário', () => {
    const criterion = scoringFixture().dataset.levels[0].criteria[0];
    criterion.factor = 0;
    expect(calculateActivity(1, criterion)).toMatchObject({ score: 0 });
    criterion.factor = 1e-7;
    expect(calculateActivity(10, criterion)).toMatchObject({ score: 0.000001 });
    criterion.factor = 1e21;
    expect(calculateActivity(1, criterion)).toMatchObject({ score: 1e21 });
  });
});
