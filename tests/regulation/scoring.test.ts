import { expect, it } from 'vitest';
import { loadIfbaRegulation } from '@/data/regulations/load';
import { calculateActivity, calculateProjectScore, roundFinalScore } from '@/rules/scoring';
import excerpts from './fixtures/resolution-excerpts.json';
import { scoringFixture } from '../fixtures/scoring';

it('fixa parâmetros dos arts. 12, 15 e 17 sem obtê-los da planilha', () => {
  expect(loadIfbaRegulation().metadata.scoring).toMatchObject({
    minimumTotal: 60,
    minimumRequestedLevel: 36,
    maximumLevelScore: 100,
    rounding: { mode: 'half-up', scope: 'total', decimalPlaces: 0 },
  });
});
it.each([
  [0, 24, 9.84],
  [1, 6, 10],
  [2, 12, 9.84],
  [3, 2, 28],
])('regressão do recorte %s com quantidade %s', (index, quantity, score) => {
  expect(calculateActivity(quantity, excerpts.criteria[index])).toMatchObject({
    status: 'available',
    score,
  });
});
it('preserva fator e unidade da resolução nos itens divergentes', () => {
  expect(excerpts.criteria[0].factor).toBe(0.41);
  expect(excerpts.criteria[1].unit).toBe('certame');
});
it('arredonda apenas resultado final conforme art. 15 §2 VI', () => {
  expect(roundFinalScore(9.84, loadIfbaRegulation().metadata.scoring)).toEqual({
    status: 'available',
    score: 10,
  });
});
it('não trata recortes ou política conferida como catálogo completo', () => {
  const data = loadIfbaRegulation();
  expect(data.metadata.status).toBe('pending-official-validation');
  expect(calculateProjectScore(scoringFixture().project, data).status).toBe('unavailable');
});
