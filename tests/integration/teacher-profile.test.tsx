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
  repository = new DexieProjectRepository(new ProjectDatabase(`profile-${crypto.randomUUID()}`));
  routers = [];
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(async () => {
  cleanup();
  routers.forEach((router) => router.dispose());
  vi.restoreAllMocks();
  await repository.database.delete();
});

async function mountProfile() {
  const record = await repository.create(createDraft('rsc-i', 'ifba-189-2026'));
  const router = createMemoryRouter([{ path: '*', element: <App repository={repository} /> }], {
    initialEntries: [projectPath(record.localId, 'profile')],
  });
  routers.push(router);
  return { record, ...render(<RouterProvider router={router} />) };
}

it('mostra erros acessíveis dos campos obrigatórios e formatos inválidos', async () => {
  await mountProfile();
  const name = await screen.findByLabelText(/^Nome completo/);
  fireEvent.change(name, { target: { value: 'A' } });
  fireEvent.change(name, { target: { value: '' } });
  const nameError = await screen.findByText('Nome completo é obrigatório.');
  expect(name).toHaveAttribute('aria-invalid', 'true');
  expect(name).toHaveAttribute('aria-describedby', nameError.id);

  const cpf = screen.getByLabelText(/^CPF/);
  fireEvent.change(cpf, { target: { value: '111.111.111-11' } });
  const cpfError = await screen.findByText('Informe um CPF válido com 11 dígitos.');
  expect(cpf).toHaveAttribute('aria-describedby', cpfError.id);

  const email = screen.getByLabelText(/^E-mail/);
  fireEvent.change(email, { target: { value: 'inválido' } });
  expect(await screen.findByText('Informe um e-mail válido.')).toHaveAttribute('id', 'email-error');
  expect(screen.getAllByText(/Campos com/)[0]).toHaveTextContent('são obrigatórios');
});

it('salva, recarrega e permite editar todos os dados posteriormente', async () => {
  const { record, unmount } = await mountProfile();
  await screen.findByLabelText(/^Nome completo/);
  const fill = (label: RegExp, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fill(/^Título do projeto/, 'Memorial funcional');
  fill(/^Nome completo/, 'Maria da Silva');
  fill(/^CPF/, '529.982.247-25');
  fill(/^SIAPE/, '1234567');
  fill(/^Cargo/, 'Professora EBTT');
  fill(/^Campus de lotação/, 'Salvador');
  fill(/^E-mail/, 'maria@example.edu.br');
  fill(/^Telefone/, '(71) 99999-8888');
  fill(/^RT\/RSC atual/, 'RSC I');
  fill(/^Escolaridade/, 'Mestrado');
  fill(/^Data de ingresso/, '2020-02-03');
  fill(/^Data de vigência/, '2026-04-07');
  fireEvent.change(screen.getByLabelText(/^RSC pretendido/), { target: { value: 'rsc-ii' } });

  await waitFor(async () => {
    const saved = await repository.load(record.localId);
    expect(saved?.project.schemaVersion).toBe('3.0');
    if (saved?.project.schemaVersion !== '3.0') return;
    expect(saved.project.userData.teacher).toMatchObject({
      name: 'Maria da Silva',
      cpf: '52998224725',
      siape: '1234567',
      role: 'Professora EBTT',
      campus: 'Salvador',
      email: 'maria@example.edu.br',
      phone: '71999998888',
      currentRsc: 'RSC I',
      schooling: 'Mestrado',
      admissionDate: '2020-02-03',
    });
    expect(saved.project.userData.request).toMatchObject({
      level: 'rsc-ii',
      effectiveDate: '2026-04-07',
    });
  });

  unmount();
  const router = createMemoryRouter([{ path: '*', element: <App repository={repository} /> }], {
    initialEntries: [projectPath(record.localId, 'profile')],
  });
  routers.push(router);
  render(<RouterProvider router={router} />);
  expect(await screen.findByLabelText(/^Nome completo/)).toHaveValue('Maria da Silva');
  expect(screen.getByLabelText(/^CPF/)).toHaveValue('52998224725');
  fireEvent.change(screen.getByLabelText(/^Cargo/), { target: { value: 'Docente EBTT' } });
  await waitFor(async () => {
    const saved = await repository.load(record.localId);
    if (saved?.project.schemaVersion !== '3.0') return;
    expect(saved.project.userData.teacher.role).toBe('Docente EBTT');
  });
});

it('atualiza a completude da visão geral somente após o núcleo obrigatório', async () => {
  const { record } = await mountProfile();
  await screen.findByLabelText(/^Nome completo/);
  const fill = (label: RegExp, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fill(/^Nome completo/, 'Maria da Silva');
  fill(/^CPF/, '52998224725');
  fill(/^SIAPE/, '1234567');
  fill(/^Campus de lotação/, 'Salvador');
  await screen.findByText('Salvando…');
  await screen.findByText('Salvo localmente');
  fireEvent.click(screen.getByRole('link', { name: 'Visão geral' }));
  await waitFor(() =>
    expect(screen.getByRole('progressbar', { name: 'Progresso de preenchimento' })).toHaveValue(20),
  );
  expect(screen.getByText(/Identificação do docente/)).toHaveTextContent('✓');
  expect((await repository.load(record.localId))?.project).toBeDefined();
});
