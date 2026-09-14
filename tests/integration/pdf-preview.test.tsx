import { activityProjectView } from '@/domain/project-migration';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import type { LocalProject } from '@/domain/local-project';
import { PdfPreview } from '@/components/pdf-preview';
import { createDraft, datasets } from '@/features/project-shell/project-view';
import { downloadMemorialPdf } from '@/pdf/generator';
import { downloadPdfBytes } from '@/pdf/download';
import { prepareEvidenceArtifacts } from '@/features/final-documents/prepare';

const { mappedPages } = vi.hoisted(() => ({
  mappedPages: { totalPages: 1, evidences: [] },
}));

vi.mock('@/pdf/generator', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/pdf/generator')>();
  return { ...original, downloadMemorialPdf: vi.fn().mockResolvedValue(undefined) };
});
vi.mock('@/features/final-documents/prepare', () => ({
  prepareEvidenceArtifacts: vi.fn().mockResolvedValue({
    status: 'success',
    bytes: new Uint8Array([1]),
    pageMap: mappedPages,
  }),
}));
vi.mock('@/components/document-preview/pdf-document-pages', () => ({
  loadPdfPreview: vi.fn().mockImplementation(async (_bytes: Uint8Array, prefix: string) => ({
    document: { cleanup: vi.fn() },
    pages: [
      {
        id: `${prefix}-1`,
        label: 'Página 1',
        content: <article aria-label="Página 1">PDF {prefix}</article>,
        thumbnail: <span aria-hidden="true">Miniatura {prefix}</span>,
      },
    ],
  })),
}));
vi.mock('@/pdf/download', () => ({ downloadPdfBytes: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('navega pela prévia A4, volta ao editor e inicia o download local', async () => {
  const project = createDraft('rsc-i', datasets[0].metadata.regulation.id);
  project.userData.teacher = {
    name: 'Ana Vitória',
    cpf: '52998224725',
    siape: '1234567',
    campus: 'Salvador',
  };
  project.userData.memorial = {
    title: 'Memorial de Ana Vitória',
    introduction: '',
    conclusion: 'Síntese final.',
  };
  const record: LocalProject = {
    localId: 'local-1',
    revision: 1,
    createdAt: '2026-09-11T12:00:00.000Z',
    updatedAt: '2026-09-11T12:00:00.000Z',
    project,
  };
  render(
    <MemoryRouter>
      <PdfPreview
        record={record}
        evidenceProject={project}
        resolver={{ getFile: vi.fn() }}
        dataset={datasets[0]}
      />
    </MemoryRouter>,
  );

  expect(await screen.findByRole('article', { name: 'Página 1' })).toHaveTextContent('Ana Vitória');
  expect(screen.getByText('Prévia de Documentos')).toBeVisible();
  expect(screen.getByRole('navigation', { name: 'Mapa de páginas' })).toBeVisible();
  expect(screen.getByLabelText('Página atual')).toHaveValue(1);
  expect(screen.getByRole('heading', { name: 'Memorial de Ana Vitória' })).toBeVisible();
  expect(screen.getByRole('link', { name: /Voltar para edição/ })).toHaveAttribute(
    'href',
    '/project/local-1/memorial',
  );

  fireEvent.click(screen.getByRole('button', { name: /Próxima página/ }));
  expect(screen.getByRole('article', { name: 'Página 2' })).toHaveTextContent('Sumário');
  expect(screen.getByLabelText('Página atual')).toHaveValue(2);
  fireEvent.click(screen.getByRole('button', { name: 'Ir para Página 1' }));
  expect(screen.getByRole('article', { name: 'Página 1' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar zoom' }));
  expect(screen.getByText('110%')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Duas páginas' }));
  expect(screen.getByRole('article', { name: 'Página 2' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Gerar PDF' }));
  await waitFor(() =>
    expect(prepareEvidenceArtifacts).toHaveBeenCalledWith(project, expect.anything()),
  );
  expect(downloadMemorialPdf).toHaveBeenCalledWith(activityProjectView(project), mappedPages);

  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Formulários e anexos normativos' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Formulários e anexos normativos' }));
  expect(screen.getByRole('heading', { name: 'Formulários e anexos normativos' })).toBeVisible();
  expect(screen.getByRole('article', { name: 'Página 1' })).toHaveTextContent('PDF forms');
  fireEvent.click(screen.getByRole('button', { name: 'PDF consolidado dos comprovantes' }));
  expect(screen.getByRole('heading', { name: 'PDF consolidado dos comprovantes' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Gerar PDF' }));
  await waitFor(() =>
    expect(downloadPdfBytes).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      'comprovantes-rsc-ana-vitoria.pdf',
    ),
  );
});

it('mantém a prévia disponível quando os comprovantes locais não podem ser consolidados', async () => {
  vi.mocked(prepareEvidenceArtifacts).mockResolvedValueOnce({
    status: 'error',
    issues: [
      {
        code: 'missing-file',
        evidenceId: 'evidence-1',
        fileId: 'file-1',
        message: 'Arquivo ausente.',
      },
    ],
  });
  const project = createDraft('rsc-i', datasets[0].metadata.regulation.id);
  const record: LocalProject = {
    localId: 'local-2',
    revision: 1,
    createdAt: '2026-09-11T12:00:00.000Z',
    updatedAt: '2026-09-11T12:00:00.000Z',
    project,
  };
  render(
    <MemoryRouter>
      <PdfPreview record={record} evidenceProject={project} resolver={{ getFile: vi.fn() }} />
    </MemoryRouter>,
  );

  expect(await screen.findByRole('article', { name: 'Página 1' })).toBeVisible();
  expect(screen.getByText(/prévia foi montada sem referências de páginas/i)).toBeVisible();
  expect(screen.queryByText('Não foi possível montar a pré-visualização do memorial.')).toBeNull();
});
