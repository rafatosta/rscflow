import { activityProjectView } from '@/domain/project-migration';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import type { LocalProject } from '@/domain/local-project';
import { FinalExport } from '@/components/final-export';
import { FinalReview } from '@/components/final-review';
import { createDraft, datasets } from '@/features/project-shell/project-view';
import { downloadMemorialPdf } from '@/pdf/generator';
import { downloadNormativeFormsPdf } from '@/pdf/normative-forms';

vi.mock('@/pdf/generator', () => ({ downloadMemorialPdf: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/pdf/normative-forms', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/pdf/normative-forms')>();
  return { ...original, downloadNormativeFormsPdf: vi.fn().mockResolvedValue(undefined) };
});

const scoring = {
  status: 'unavailable' as const,
  issues: [{ code: 'pending-dataset' as const, message: 'Dataset pendente.' }],
};

function record(complete: boolean): LocalProject {
  const project = createDraft('rsc-i', datasets[0].metadata.regulation.id);
  if (complete) {
    project.userData.teacher = {
      name: 'Joana Conceição',
      cpf: '52998224725',
      siape: '7654321',
      campus: 'Salvador',
    };
    project.userData.memorial = {
      title: 'Memorial final',
      introduction: '',
      conclusion: 'Conclusão preenchida.',
    };
  }
  return {
    localId: 'local-1',
    revision: 2,
    createdAt: '2026-09-11T12:00:00.000Z',
    updatedAt: '2026-09-11T15:30:00.000Z',
    project,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('mostra erros, avisos e informações com links para correção', () => {
  render(
    <MemoryRouter>
      <FinalReview record={record(false)} scoring={scoring} />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Correções necessárias' })).toBeVisible();
  expect(screen.getAllByText('ERROR').length).toBeGreaterThan(1);
  expect(screen.getAllByText('WARNING').length).toBeGreaterThan(1);
  expect(screen.getAllByText('INFO').length).toBeGreaterThan(1);
  expect(screen.getByRole('link', { name: 'Revisar identificação' })).toHaveAttribute(
    'href',
    '/project/local-1/profile',
  );
});

it('permite PDF com warnings, exporta JSON e mostra autosave e nomes sugeridos', async () => {
  const current = record(true);
  const exportJson = vi.fn();
  render(
    <MemoryRouter>
      <FinalExport
        record={current}
        scoring={scoring}
        busy={false}
        invalid=""
        onExportJson={exportJson}
        onImport={vi.fn()}
        dataset={datasets[0]}
      />
    </MemoryRouter>,
  );

  expect(
    screen.getByText('Há avisos para conferir, mas eles não impedem a geração do PDF.'),
  ).toBeVisible();
  expect(screen.getByText('memorial-rsc-joana-conceicao.pdf')).toBeVisible();
  expect(screen.getByText('rscflow-processo-rsc-i.json')).toBeVisible();
  expect(screen.getByText(/11\/09\/2026/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Exportar JSON' }));
  expect(exportJson).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Gerar PDF' }));
  await waitFor(() =>
    expect(downloadMemorialPdf).toHaveBeenCalledWith(
      activityProjectView(
        current.project as Exclude<typeof current.project, { schemaVersion: '1.0' }>,
      ),
    ),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Gerar formulários' }));
  await waitFor(() => expect(downloadNormativeFormsPdf).toHaveBeenCalledOnce());
});

it('bloqueia somente o PDF quando há erros de revisão', () => {
  render(
    <MemoryRouter>
      <FinalExport
        record={record(false)}
        scoring={scoring}
        busy={false}
        invalid=""
        onExportJson={vi.fn()}
        onImport={vi.fn()}
      />
    </MemoryRouter>,
  );
  expect(screen.getByRole('button', { name: 'Gerar PDF' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Exportar JSON' })).toBeEnabled();
  expect(screen.getByRole('alert')).toHaveTextContent('PDF final bloqueado');
});
