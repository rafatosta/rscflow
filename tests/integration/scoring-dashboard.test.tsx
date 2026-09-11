import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ScoringDashboard } from '@/components/scoring-dashboard';
import { loadIfbaRegulation } from '@/data/regulations/load';
import { calculateProjectScore } from '@/rules/scoring';
import { scoringFixture } from '../fixtures/scoring';

afterEach(cleanup);

function dashboardResult() {
  const { dataset, project } = scoringFixture();
  const level = dataset.levels[0];
  const provenance = level.criteria[0].provenance;
  level.directives[0] = {
    ...level.directives[0],
    title: 'Ensino sintético',
    maxScore: 30,
  };
  level.directives.push({
    id: 'rsc-i-b',
    code: 'b',
    title: 'Pesquisa sintética',
    maxScore: 20,
    weight: 1,
    provenance,
  });
  level.criteria.push({
    id: 'rsc-i-b-1',
    directiveId: 'rsc-i-b',
    code: 'b.1',
    description: 'Projeto sintético',
    unit: 'projeto',
    factor: 2,
    weight: 1,
    maxQuantity: 10,
    provenance,
  });
  project.userData.activities.push({
    id: 'activity-extra',
    title: 'Projeto de pesquisa',
    criterionId: 'rsc-i-b-1',
    selectedLevel: 'rsc-i',
    quantity: 5,
    evidenceIds: [],
  });
  return calculateProjectScore(project, dataset);
}

it('exibe níveis, total, mínimos e múltiplas diretrizes com detalhes', () => {
  render(<ScoringDashboard result={dashboardResult()} />);

  expect(screen.getByText('Requisitos quantitativos atingidos')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'RSC I' }).nextElementSibling).toHaveTextContent(
    '40 / 100',
  );
  expect(screen.getByRole('heading', { name: 'RSC II' }).nextElementSibling).toHaveTextContent(
    '14 / 100',
  );
  expect(screen.getByRole('heading', { name: 'RSC III' }).nextElementSibling).toHaveTextContent(
    '10 / 100',
  );
  expect(screen.getByText('64')).toBeVisible();
  expect(screen.getByText('Mínimo total: 60')).toBeVisible();
  expect(screen.getByText('Mínimo em RSC I: 40 / 36')).toBeVisible();

  const directives = screen.getAllByRole('group');
  expect(directives).toHaveLength(4);
  const teaching = screen.getByText(/Ensino sintético/).closest('details')!;
  fireEvent.click(within(teaching).getByText(/Ensino sintético/));
  expect(screen.getByText('Pontuação máxima da diretriz atingida.')).toBeVisible();
  expect(
    within(teaching).getByText('Itens utilizados: 1 · experiências utilizadas: 1'),
  ).toBeVisible();
  expect(
    within(teaching).getByText(/Quantidade informada: 36 unidade · considerada: 36/),
  ).toBeVisible();
  expect(
    within(teaching).getByRole('progressbar', { name: 'Progresso de Ensino sintético' }),
  ).toHaveAttribute('max', '30');
  expect(screen.getByText(/Experiências acima dos limites continuam no memorial/)).toBeVisible();
  expect(screen.queryByText(/RSC aprovado/i)).toBeNull();
});

it('distingue requisitos ainda não atingidos por texto e símbolo', () => {
  const { dataset, project } = scoringFixture();
  project.userData.activities[0].quantity = 35;
  render(<ScoringDashboard result={calculateProjectScore(project, dataset)} />);
  expect(screen.getByText('Requisitos quantitativos ainda não atingidos')).toBeVisible();
  expect(screen.getByText('Mínimo total: 60')).toBeVisible();
  expect(screen.getByText('Mínimo em RSC I: 35 / 36')).toBeVisible();
  expect(screen.getAllByText('○', { selector: '[aria-hidden="true"]' }).length).toBeGreaterThan(0);
});

it('mostra cálculo parcial sem transformar ausência normativa em zero', () => {
  const { project } = scoringFixture();
  render(<ScoringDashboard result={calculateProjectScore(project, loadIfbaRegulation())} />);
  expect(screen.getByText('Cálculo parcial')).toBeVisible();
  expect(screen.getByText('Mínimo total: 60')).toBeVisible();
  expect(screen.getByText('Mínimo no nível pretendido: 36')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Total geral' }).nextElementSibling).toHaveTextContent(
    '—',
  );
  for (const level of ['RSC I', 'RSC II', 'RSC III'])
    expect(screen.getByRole('heading', { name: level }).nextElementSibling).toHaveTextContent(
      '— / 100',
    );
  expect(screen.getByText(/Pontuações ausentes não são tratadas como zero/)).toBeVisible();
});
