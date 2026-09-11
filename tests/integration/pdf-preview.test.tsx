import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import type { LocalProject } from '@/domain/local-project';
import { PdfPreview } from '@/components/pdf-preview';
import { createDraft, datasets } from '@/features/project-shell/project-view';
import { downloadMemorialPdf } from '@/pdf/generator';

vi.mock('@/pdf/generator', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/pdf/generator')>();
  return { ...original, downloadMemorialPdf: vi.fn().mockResolvedValue(undefined) };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('navega pela prévia A4, volta ao editor e inicia o download local', async () => {
  const project = createDraft('rsc-i', datasets[0].metadata.regulation.id);
  project.userData.teacher.name = 'Ana Vitória';
  const record: LocalProject = {
    localId: 'local-1',
    revision: 1,
    createdAt: '2026-09-11T12:00:00.000Z',
    updatedAt: '2026-09-11T12:00:00.000Z',
    project,
  };
  render(
    <MemoryRouter>
      <PdfPreview record={record} />
    </MemoryRouter>,
  );

  expect(await screen.findByRole('article', { name: 'Página 1' })).toHaveTextContent('Ana Vitória');
  expect(screen.getByText(/Página 1 de/)).toBeVisible();
  expect(screen.getByRole('link', { name: /Voltar para edição/ })).toHaveAttribute(
    'href',
    '/project/local-1/memorial',
  );

  fireEvent.click(screen.getByRole('button', { name: /Próxima página/ }));
  expect(screen.getByRole('article', { name: 'Página 2' })).toHaveTextContent('Sumário');
  fireEvent.click(screen.getByRole('button', { name: 'Gerar PDF' }));
  await waitFor(() => expect(downloadMemorialPdf).toHaveBeenCalledWith(project));
});
