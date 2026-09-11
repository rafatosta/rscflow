import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { App } from '@/app/App';
import { DexieProjectRepository, ProjectDatabase } from '@/storage/project-repository';
import { projectExportSchema } from '@/domain/project';
import { projectPath } from '@/features/project-shell/routes';
import { currentProjectFixture } from '../fixtures/project';

let repository: DexieProjectRepository;
let routers: ReturnType<typeof createMemoryRouter>[];
beforeEach(() => {
  repository = new DexieProjectRepository(new ProjectDatabase(`ui-${crypto.randomUUID()}`));
  routers = [];
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(async () => {
  cleanup();
  routers.forEach((router) => router.dispose());
  vi.restoreAllMocks();
  await repository.database.delete();
});
function mount(path: string) {
  const router = createMemoryRouter([{ path: '*', element: <App repository={repository} /> }], {
    initialEntries: [path],
  });
  routers.push(router);
  return { ...render(<RouterProvider router={router} />), router };
}

it('recupera por URL, edita, salva e reabre o projeto', async () => {
  const record = await repository.create(projectExportSchema.parse(currentProjectFixture));
  const rendered = mount(projectPath(record.localId, 'profile'));
  fireEvent.change(await screen.findByLabelText('Nome do docente'), {
    target: { value: 'Nome salvo' },
  });
  expect(screen.getByText('Salvando…')).toBeInTheDocument();
  await screen.findByText('Salvo localmente');
  const saved = await repository.load(record.localId);
  expect(saved?.project.userData.teacher).toEqual({ name: 'Nome salvo' });
  rendered.unmount();
  mount(projectPath(record.localId, 'profile'));
  expect(await screen.findByLabelText('Nome do docente')).toHaveValue('Nome salvo');
});

it('mantém rascunho quando há erro ao salvar e recupera após nova tentativa', async () => {
  const record = await repository.create(projectExportSchema.parse(currentProjectFixture));
  vi.spyOn(repository, 'update').mockRejectedValueOnce(new Error('quota'));
  mount(projectPath(record.localId, 'profile'));
  const editor = await screen.findByLabelText('Nome do docente');
  fireEvent.change(editor, { target: { value: 'Não perdido' } });
  expect(await screen.findByText('Erro ao salvar')).toBeInTheDocument();
  expect(editor).toHaveValue('Não perdido');
  fireEvent.click(screen.getByRole('button', { name: 'Tentar salvar novamente' }));
  await screen.findByText('Salvo localmente');
  expect((await repository.load(record.localId))?.project.userData.teacher).toEqual({
    name: 'Não perdido',
  });
});

it('JSON inválido impede mudança de rota sem substituir dados', async () => {
  const record = await repository.create(projectExportSchema.parse(currentProjectFixture));
  const { router } = mount(projectPath(record.localId, 'export'));
  const editor = await screen.findByLabelText('Dados editáveis do projeto (JSON)');
  fireEvent.change(editor, { target: { value: '{' } });
  fireEvent.click(screen.getByRole('link', { name: 'Meus projetos' }));
  await waitFor(() =>
    expect(screen.getByText('Corrija os dados antes de navegar.')).toBeInTheDocument(),
  );
  expect(router.state.location.pathname).toBe(projectPath(record.localId, 'export'));
  expect((await repository.load(record.localId))?.project).toEqual(
    projectExportSchema.parse(currentProjectFixture),
  );
  expect(editor).toHaveValue('{');
});

it('apresenta falha do IndexedDB sem alegar salvamento', async () => {
  vi.spyOn(repository, 'list').mockRejectedValue(new Error('denied'));
  mount('/');
  expect(await screen.findByRole('alert')).toHaveTextContent('armazenamento local');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Atualizar lista' })).not.toBeDisabled(),
  );
  expect(screen.queryByText('Salvo localmente')).not.toBeInTheDocument();
});

it('conclui autosave antes de mudar de seção', async () => {
  const record = await repository.create(projectExportSchema.parse(currentProjectFixture));
  const { router } = mount(projectPath(record.localId, 'profile'));
  fireEvent.change(await screen.findByLabelText('Nome do docente'), {
    target: { value: 'Salvo antes de navegar' },
  });
  fireEvent.click(screen.getByRole('link', { name: 'Formação' }));
  await waitFor(() =>
    expect(router.state.location.pathname).toBe(projectPath(record.localId, 'education')),
  );
  expect((await repository.load(record.localId))?.project.userData.teacher).toEqual({
    name: 'Salvo antes de navegar',
  });
});
