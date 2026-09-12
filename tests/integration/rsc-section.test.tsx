import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
afterEach(cleanup);
import { RscSection } from '@/components/rsc-section';
import { scoringFixture } from '../fixtures/scoring';
import { calculateProjectScore } from '@/rules/scoring';
import type { Activity } from '@/domain/models';

it('adiciona, edita e exclui lançamentos mantendo critério, comprovantes e pontuação derivada', async () => {
  const { project, dataset } = scoringFixture();
  project.userData.evidence = [{ id: 'proof', title: 'Prova compartilhada' }];
  function Harness() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const next = { ...project, userData: { ...project.userData, activities } };
    return (
      <RscSection
        level="rsc-i"
        dataset={dataset}
        scoring={calculateProjectScore(next, dataset)}
        activities={activities}
        evidences={project.userData.evidence}
        disabled={false}
        onSave={setActivities}
      />
    );
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar lançamento' }));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar lançamento' }));
  fireEvent.change(screen.getByLabelText(/^Título do lançamento/), {
    target: { value: 'Orientação' },
  });
  fireEvent.change(screen.getByLabelText(/^Quantidade declarada/), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText(/^Categoria editorial/), { target: { value: 'Ensino' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Prova compartilhada' }));
  fireEvent.click(screen.getByRole('button', { name: 'Salvar lançamento' }));
  await screen.findByText('2 / 100 pontos');
  expect(screen.getByText('Comprovantes: Prova compartilhada')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Editar lançamento Orientação' }));
  fireEvent.change(screen.getByLabelText(/^Quantidade declarada/), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar lançamento' }));
  await screen.findByText('3 / 100 pontos');
  fireEvent.click(screen.getByRole('button', { name: 'Excluir lançamento Orientação' }));
  fireEvent.click(
    within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirmar exclusão' }),
  );
  await screen.findByText('Nenhum lançamento neste critério.');
});

it('explica indisponibilidade quantitativa e não cria critérios para catálogo pendente', () => {
  const { project, dataset } = scoringFixture();
  const props = {
    level: 'rsc-i' as const,
    dataset,
    scoring: {
      status: 'unavailable' as const,
      issues: [{ code: 'invalid-project' as const, message: 'Complete os dados do projeto.' }],
    },
    activities: project.userData.activities,
    evidences: [],
    disabled: false,
    onSave: () => {},
  };
  const view = render(<RscSection {...props} />);
  expect(screen.getByText('Pontuação indisponível: Complete os dados do projeto.')).toBeVisible();
  view.rerender(
    <RscSection
      {...props}
      dataset={{
        ...dataset,
        metadata: { ...dataset.metadata, status: 'pending-official-validation' },
      }}
    />,
  );
  expect(screen.getByText(/Catálogo normativo pendente ou indisponível/)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Adicionar lançamento' })).not.toBeInTheDocument();
});
