import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { App } from '@/app/App';
import { createDraft } from '@/features/project-shell/project-view';
import { projectPath } from '@/features/project-shell/routes';
import { DexieProjectRepository, ProjectDatabase } from '@/storage/project-repository';

let repository: DexieProjectRepository;
let routers: ReturnType<typeof createMemoryRouter>[];

beforeEach(() => {
  repository = new DexieProjectRepository(new ProjectDatabase(`education-${crypto.randomUUID()}`));
  routers = [];
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  routers.forEach((router) => router.dispose());
  vi.restoreAllMocks();
  await repository.database.delete();
});

async function mountEducation() {
  const record = await repository.create(createDraft('rsc-ii', 'ifba-189-2026'));
  const router = createMemoryRouter([{ path: '*', element: <App repository={repository} /> }], {
    initialEntries: [projectPath(record.localId, 'profile')],
  });
  routers.push(router);
  return { record, ...render(<RouterProvider router={router} />) };
}

function fillEducation(title = 'Especialização em Educação') {
  fireEvent.change(screen.getByLabelText(/^Tipo/), { target: { value: 'Pós-graduação' } });
  fireEvent.change(screen.getByLabelText(/^Situação da formação/), {
    target: { value: 'Concluído' },
  });
  fireEvent.change(screen.getByLabelText(/^Curso ou título/), { target: { value: title } });
  fireEvent.change(screen.getByLabelText(/^Instituição da formação/), {
    target: { value: 'Instituto Federal' },
  });
  fireEvent.change(screen.getByLabelText(/^Área/), { target: { value: 'Educação' } });
  fireEvent.change(screen.getByLabelText(/^Data inicial/), { target: { value: '2020-02-01' } });
  fireEvent.change(screen.getByLabelText(/^Data de conclusão/), {
    target: { value: '2021-03-15' },
  });
  fireEvent.change(screen.getByLabelText(/^Referência do documento/), {
    target: { value: 'Diploma, folha 12' },
  });
  fireEvent.change(screen.getByLabelText(/^Observações/), {
    target: { value: 'Curso presencial.' },
  });
}

it('associa erros aos campos e valida o intervalo de datas', async () => {
  await mountEducation();
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar formação' }));
  const type = screen.getByLabelText(/^Tipo/);
  expect(type.tagName).toBe('SELECT');
  expect(screen.getByLabelText(/^Situação da formação/).tagName).toBe('SELECT');
  expect(Array.from((type as HTMLSelectElement).options, (option) => option.text)).toEqual([
    'Selecione',
    'Curso técnico',
    'Graduação',
    'Pós-graduação',
    'Aperfeiçoamento',
    'Capacitação',
    'Mestrado',
    'Doutorado',
    'Pós-doutorado',
  ]);
  const typeError = await screen.findByText('Tipo é obrigatório.');
  expect(type).toHaveAttribute('aria-invalid', 'true');
  expect(type).toHaveAttribute('aria-describedby', typeError.id);

  fillEducation();
  fireEvent.change(screen.getByLabelText(/^Data de conclusão/), {
    target: { value: '2019-01-01' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar formação' }));
  const dateError = await screen.findByText('A conclusão não pode ser anterior à data inicial.');
  expect(screen.getByLabelText(/^Data de conclusão/)).toHaveAttribute(
    'aria-describedby',
    dateError.id,
  );
});

it('cria, persiste, recarrega, edita, duplica e exclui com confirmação', async () => {
  const { record, unmount } = await mountEducation();
  await screen.findByLabelText(/^Tipo/);
  fillEducation();
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar formação' }));
  await screen.findByText('Salvo localmente');

  await waitFor(async () => {
    const saved = await repository.load(record.localId);
    expect(saved?.project.schemaVersion).not.toBe('1.0');
    if (!saved || saved.project.schemaVersion === '1.0') return;
    expect(saved?.project.userData.education).toHaveLength(1);
    expect(saved?.project.userData.education[0]).toMatchObject({
      type: 'Pós-graduação',
      title: 'Especialização em Educação',
      evidenceReference: 'Diploma, folha 12',
      status: 'Concluído',
    });
  });

  fireEvent.click(
    screen.getByRole('button', { name: 'Editar formação Especialização em Educação' }),
  );
  await waitFor(() => expect(screen.getByLabelText(/^Tipo/)).toHaveFocus());
  fireEvent.change(screen.getByLabelText(/^Curso ou título/), {
    target: { value: 'Especialização revisada' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
  await screen.findByText('Salvo localmente');
  fireEvent.click(
    screen.getByRole('button', { name: 'Duplicar formação Especialização revisada' }),
  );
  await waitFor(async () =>
    expect((await repository.load(record.localId))?.project.userData.education).toHaveLength(2),
  );

  const deleteButton = screen.getAllByRole('button', {
    name: 'Excluir formação Especialização revisada',
  })[0];
  deleteButton.focus();
  fireEvent.click(deleteButton);
  expect(screen.getByRole('alertdialog', { name: 'Excluir formação?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  await waitFor(() => expect(deleteButton).toHaveFocus());
  expect(screen.getAllByRole('heading', { name: 'Especialização revisada' })).toHaveLength(2);
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Excluir formação Especialização revisada' })[0],
  );
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
  await waitFor(async () =>
    expect((await repository.load(record.localId))?.project.userData.education).toHaveLength(1),
  );

  unmount();
  const router = createMemoryRouter([{ path: '*', element: <App repository={repository} /> }], {
    initialEntries: [projectPath(record.localId, 'profile')],
  });
  routers.push(router);
  render(<RouterProvider router={router} />);
  expect(await screen.findByRole('heading', { name: 'Especialização revisada' })).toBeVisible();
  expect(screen.getByText('Diploma, folha 12')).toBeVisible();
});
