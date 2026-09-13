import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RestorableBackupImport } from '@/components/restorable-backup-import';
import { createRestorableBackup } from '@/features/local-projects/restorable-backup';
import { migrateProject } from '@/domain/project-migration';
import { currentProjectFixture } from '../fixtures/project';

afterEach(cleanup);

it('valida e entrega um backup íntegro para restauração explícita', async () => {
  const project = migrateProject(structuredClone(currentProjectFixture)).project;
  const bytes = await createRestorableBackup(project);
  const restore = vi.fn();
  render(<RestorableBackupImport onRestore={restore} />);
  fireEvent.change(screen.getByLabelText('Backup restaurável .rscflow'), {
    target: {
      files: [new File([bytes as BlobPart], 'projeto.rscflow', { type: 'application/zip' })],
    },
  });
  await waitFor(() => expect(screen.getByText('Backup íntegro')).toBeVisible());
  expect(screen.getByText(/Schema 3.0; 0 arquivo/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar como novo projeto' }));
  expect(restore).toHaveBeenCalledWith(expect.objectContaining({ project, files: [] }));
});

it('recusa conteúdo que não seja um backup RSCFlow válido', async () => {
  render(<RestorableBackupImport onRestore={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Backup restaurável .rscflow'), {
    target: { files: [new File(['não é zip'], 'inválido.rscflow')] },
  });
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('backup RSCFlow válido'));
  expect(
    screen.queryByRole('button', { name: 'Restaurar como novo projeto' }),
  ).not.toBeInTheDocument();
});
