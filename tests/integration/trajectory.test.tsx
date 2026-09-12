import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { App } from '@/app/App';
import { createDraft } from '@/features/project-shell/project-view';
import { projectPath } from '@/features/project-shell/routes';
import { DexieProjectRepository, ProjectDatabase } from '@/storage/project-repository';

let repository: DexieProjectRepository;
let routers: ReturnType<typeof createMemoryRouter>[];

beforeEach(() => {
  repository = new DexieProjectRepository(new ProjectDatabase(`trajectory-${crypto.randomUUID()}`));
  routers = [];
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  routers.forEach((router) => router.dispose());
  vi.restoreAllMocks();
  await repository.database.delete();
});

async function mountTrajectory() {
  const record = await repository.create(createDraft('rsc-ii', 'ifba-189-2026'));
  const router = createMemoryRouter([{ path: '*', element: <App repository={repository} /> }], {
    initialEntries: [projectPath(record.localId, 'activities')],
  });
  routers.push(router);
  return { record, ...render(<RouterProvider router={router} />) };
}

function fillActivity(title = 'Coordenação de projeto', category = 'Gestão') {
  fireEvent.change(screen.getByLabelText(/^Título da atividade/), { target: { value: title } });
  fireEvent.change(screen.getByLabelText(/^Categoria/), { target: { value: category } });
  fireEvent.change(screen.getByLabelText(/^Quantidade declarada/), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText(/^Instituição/), {
    target: { value: 'Instituto Federal' },
  });
  fireEvent.change(screen.getByLabelText(/^Setor ou departamento/), {
    target: { value: 'Departamento de Ensino' },
  });
  fireEvent.change(screen.getByLabelText(/^Data inicial/), { target: { value: '2022-02-01' } });
  fireEvent.change(screen.getByLabelText(/^Data final/), { target: { value: '2023-12-20' } });
  fireEvent.change(screen.getByLabelText(/^Papel ou função/), {
    target: { value: 'Coordenadora' },
  });
  fireEvent.change(screen.getByLabelText(/^Descrição/), {
    target: { value: 'Coordenação das atividades.' },
  });
  fireEvent.change(screen.getByLabelText(/^Resultados/), {
    target: { value: 'Projeto concluído.' },
  });
  fireEvent.change(screen.getByLabelText(/^Competências/), {
    target: { value: 'Planejamento\nLiderança' },
  });
}

async function addEvidence() {
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar evidência' }));
  fireEvent.change(screen.getByLabelText(/^Tipo de evidência/), { target: { value: 'Portaria' } });
  fireEvent.change(screen.getByLabelText(/^Título da evidência/), {
    target: { value: 'Portaria de coordenação' },
  });
  fireEvent.change(screen.getByLabelText(/^Identificador/), {
    target: { value: 'Portaria 42/2022' },
  });
  fireEvent.change(screen.getByLabelText(/^Emissor/), { target: { value: 'Instituto Federal' } });
  fireEvent.change(screen.getByLabelText(/^Data da evidência/), {
    target: { value: '2022-02-01' },
  });
  fireEvent.change(screen.getByLabelText(/^Referência do processo/), {
    target: { value: 'Processo 123' },
  });
  fireEvent.change(screen.getByLabelText(/^Notas/), {
    target: { value: 'Documento publicado.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar evidência' }));
  await screen.findByText('Salvando…');
  await screen.findByText('Salvo localmente');
}

it('orienta o estado vazio e associa erros de atividade aos controles', async () => {
  await mountTrajectory();
  expect(await screen.findByText('Nenhuma atividade registrada.')).toBeVisible();
  expect(screen.getByText('Nenhuma evidência cadastrada.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar atividade' }));
  const title = screen.getByLabelText(/^Título da atividade/);
  const error = await screen.findByText('Título é obrigatório.');
  expect(title).toHaveAttribute('aria-invalid', 'true');
  expect(title).toHaveAttribute('aria-describedby', error.id);

  fillActivity();
  fireEvent.change(screen.getByLabelText(/^Data final/), { target: { value: '2020-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar atividade' }));
  expect(
    await screen.findByText('A data final não pode ser anterior à data inicial.'),
  ).toHaveAttribute('id', 'activity-endDate-error');

  fireEvent.click(screen.getByRole('button', { name: 'Adicionar evidência' }));
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar evidência' }));
  const evidenceType = screen.getByLabelText(/^Tipo de evidência/);
  const evidenceError = await screen.findByText('Tipo é obrigatório.');
  expect(evidenceType).toHaveAttribute('aria-describedby', evidenceError.id);
});

it('persiste CRUD de atividades e evidências, vínculos e edição posterior', async () => {
  const { record, unmount } = await mountTrajectory();
  await screen.findByLabelText(/^Título da atividade/);
  await addEvidence();
  fillActivity();
  fireEvent.click(screen.getByRole('checkbox', { name: /Portaria de coordenação/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar atividade' }));
  await screen.findByText('Salvando…');
  await screen.findByText('Salvo localmente');

  await waitFor(async () => {
    const saved = await repository.load(record.localId);
    if (!saved || saved.project.schemaVersion !== '2.1') throw new Error('Formato inesperado.');
    expect(saved.project.userData.activities).toHaveLength(1);
    expect(saved.project.userData.evidence).toHaveLength(1);
    expect(saved.project.userData.activities[0]).toMatchObject({
      category: 'Gestão',
      competencies: ['Planejamento', 'Liderança'],
      evidenceIds: [saved.project.userData.evidence[0].id],
    });
  });

  fireEvent.click(screen.getByRole('button', { name: 'Editar atividade Coordenação de projeto' }));
  await waitFor(() => expect(screen.getByLabelText(/^Título da atividade/)).toHaveFocus());
  fireEvent.change(screen.getByLabelText(/^Título da atividade/), {
    target: { value: 'Coordenação revisada' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar atividade' }));
  await screen.findByText('Salvando…');
  await screen.findByText('Salvo localmente');
  fireEvent.click(screen.getByRole('button', { name: 'Duplicar atividade Coordenação revisada' }));
  await screen.findByText('Salvando…');
  await screen.findByText('Salvo localmente');
  expect(screen.getAllByRole('heading', { name: 'Coordenação revisada' })).toHaveLength(2);

  fireEvent.click(screen.getByRole('button', { name: 'Editar evidência Portaria de coordenação' }));
  await waitFor(() => expect(screen.getByLabelText(/^Tipo de evidência/)).toHaveFocus());
  fireEvent.change(screen.getByLabelText(/^Título da evidência/), {
    target: { value: 'Portaria revisada' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar evidência' }));
  await screen.findByText('Salvando…');
  await screen.findByText('Salvo localmente');
  expect(screen.getAllByText('Portaria revisada').length).toBeGreaterThan(1);

  fireEvent.click(screen.getByRole('button', { name: 'Excluir evidência Portaria revisada' }));
  expect(screen.getByRole('alertdialog', { name: 'Excluir evidência?' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Excluir evidência Portaria revisada' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
  await screen.findByText('Salvando…');
  await screen.findByText('Salvo localmente');

  await waitFor(async () => {
    const saved = await repository.load(record.localId);
    if (!saved || saved.project.schemaVersion !== '2.1') throw new Error('Formato inesperado.');
    expect(saved.project.userData.evidence).toEqual([]);
    expect(saved.project.userData.activities.every(({ evidenceIds }) => !evidenceIds.length)).toBe(
      true,
    );
  });

  fireEvent.click(
    screen.getAllByRole('button', { name: 'Excluir atividade Coordenação revisada' })[0],
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
  await screen.findByText('Salvando…');
  await screen.findByText('Salvo localmente');
  unmount();
  const router = createMemoryRouter([{ path: '*', element: <App repository={repository} /> }], {
    initialEntries: [projectPath(record.localId, 'activities')],
  });
  routers.push(router);
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole('heading', { name: 'Coordenação revisada' })).toBeVisible();
  expect(screen.getByText('Nenhuma evidência cadastrada.')).toBeVisible();
}, 10_000);

it('busca e filtra a lista cronológica pela interface', async () => {
  await mountTrajectory();
  await screen.findByLabelText(/^Título da atividade/);
  fillActivity('Atividade de gestão', 'Gestão');
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar atividade' }));
  await screen.findByText('Salvando…');
  await screen.findByText('Salvo localmente');
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar atividade' }));
  fillActivity('Projeto de pesquisa', 'Pesquisa');
  fireEvent.change(screen.getByLabelText(/^Data final/), { target: { value: '2025-05-10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar atividade' }));
  await screen.findByText('Salvando…');
  await screen.findByText('Salvo localmente');

  const list = screen.getByRole('list', { name: 'Atividades' });
  expect(within(list).getAllByRole('article')[0]).toHaveTextContent('Projeto de pesquisa');
  fireEvent.change(screen.getByLabelText('Buscar atividades'), { target: { value: 'gestão' } });
  expect(within(list).getByRole('heading', { name: 'Atividade de gestão' })).toBeVisible();
  expect(within(list).queryByRole('heading', { name: 'Projeto de pesquisa' })).toBeNull();
  fireEvent.change(screen.getByLabelText('Buscar atividades'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Filtrar por categoria'), {
    target: { value: 'Pesquisa' },
  });
  expect(within(list).getByRole('heading', { name: 'Projeto de pesquisa' })).toBeVisible();
  expect(within(list).queryByRole('heading', { name: 'Atividade de gestão' })).toBeNull();
});
