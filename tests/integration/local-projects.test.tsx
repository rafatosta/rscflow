import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LocalProjects } from '@/components/local-projects';
import { DexieProjectRepository, ProjectDatabase } from '@/storage/project-repository';
import { projectExportSchema } from '@/domain/project';
import { currentProjectFixture } from '../fixtures/project';

let repository: DexieProjectRepository;
beforeEach(() => {
  repository = new DexieProjectRepository(new ProjectDatabase(`ui-${crypto.randomUUID()}`));
});
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  await repository.database.delete();
});

it('recupera, edita, salva e reabre o projeto ativo', async () => {
  const record = await repository.create(projectExportSchema.parse(currentProjectFixture));
  await repository.select(record.localId);
  const rendered = render(<LocalProjects repository={repository} />);
  const editor = await screen.findByLabelText('Dados editáveis do projeto (JSON)');
  const data = { ...currentProjectFixture.userData, title: 'Título salvo' };
  fireEvent.change(editor, { target: { value: JSON.stringify(data) } });
  expect(screen.getByText('Salvando…')).toBeInTheDocument();
  await screen.findByText('Salvo localmente');
  expect((await repository.load(record.localId))?.project.userData).toEqual(data);
  rendered.unmount();
  render(<LocalProjects repository={repository} />);
  const reopened = await screen.findByLabelText<HTMLTextAreaElement>(
    'Dados editáveis do projeto (JSON)',
  );
  expect(JSON.parse(reopened.value)).toEqual(data);
});

it('mantém rascunho quando há erro ao salvar e recupera após nova tentativa', async () => {
  const record = await repository.create(projectExportSchema.parse(currentProjectFixture));
  await repository.select(record.localId);
  vi.spyOn(repository, 'update').mockRejectedValueOnce(new Error('quota'));
  render(<LocalProjects repository={repository} />);
  const editor = await screen.findByLabelText('Dados editáveis do projeto (JSON)');
  const data = { ...currentProjectFixture.userData, title: 'Não perdido' };
  fireEvent.change(editor, { target: { value: JSON.stringify(data) } });
  expect(await screen.findByText(/Erro ao salvar:/)).toBeInTheDocument();
  expect(editor).toHaveValue(JSON.stringify(data));
  fireEvent.click(screen.getByRole('button', { name: 'Tentar salvar novamente' }));
  await screen.findByText('Salvo localmente');
  expect((await repository.load(record.localId))?.project.userData).toEqual(data);
});

it('JSON inválido não substitui dados e impede troca silenciosa', async () => {
  const record = await repository.create(projectExportSchema.parse(currentProjectFixture));
  await repository.select(record.localId);
  render(<LocalProjects repository={repository} />);
  fireEvent.change(await screen.findByLabelText('Dados editáveis do projeto (JSON)'), {
    target: { value: '{' },
  });
  expect(screen.getByText(/Dados inválidos/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Duplicar projeto' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Resolva os dados inválidos');
  expect((await repository.load(record.localId))?.project).toEqual(
    projectExportSchema.parse(currentProjectFixture),
  );
  expect(await repository.list()).toHaveLength(1);
});

it('apresenta falha do IndexedDB sem alegar salvamento', async () => {
  vi.spyOn(repository, 'list').mockRejectedValue(new Error('denied'));
  render(<LocalProjects repository={repository} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('armazenamento local');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Atualizar lista' })).not.toBeDisabled(),
  );
  expect(screen.queryByText('Salvo localmente')).not.toBeInTheDocument();
});

it('conclui autosave pendente antes de trocar de projeto', async () => {
  const first = await repository.create(projectExportSchema.parse(currentProjectFixture));
  const secondProject = projectExportSchema.parse(currentProjectFixture);
  if (secondProject.schemaVersion === '2.0') secondProject.userData.title = 'Segundo projeto';
  await repository.create(secondProject);
  await repository.select(first.localId);
  render(<LocalProjects repository={repository} />);
  const editor = await screen.findByLabelText('Dados editáveis do projeto (JSON)');
  const data = { ...currentProjectFixture.userData, title: 'Salvo antes de trocar' };
  fireEvent.change(editor, { target: { value: JSON.stringify(data) } });
  fireEvent.click(screen.getByRole('button', { name: 'Segundo projeto' }));
  await waitFor(() =>
    expect(JSON.parse((editor as HTMLTextAreaElement).value).title).toBe('Segundo projeto'),
  );
  expect((await repository.load(first.localId))?.project.userData).toEqual(data);
});
