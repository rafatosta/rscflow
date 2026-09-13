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
import * as preparation from '@/features/final-documents/prepare';
import { downloadBytes, downloadPdfBytes } from '@/pdf/download';
import type { OccurrenceProjectExport } from '@/domain/criterion-entry';
import { generateProcessArtifacts } from '@/features/final-documents/generate-all';

vi.mock('@/pdf/download', () => ({ downloadPdfBytes: vi.fn(), downloadBytes: vi.fn() }));
vi.mock('@/features/final-documents/generate-all', () => ({
  generateProcessArtifacts: vi.fn(),
}));

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
  vi.restoreAllMocks();
});

it('gera cada artefato com o projeto atual e revalida comprovantes após alteração', async () => {
  const bytes = new Uint8Array([1, 2]);
  const pageMap = { totalPages: 2, evidences: [] };
  const prepare = vi
    .spyOn(preparation, 'prepareEvidenceArtifacts')
    .mockResolvedValue({ status: 'success', bytes, pageMap });
  const resolver = { getFile: vi.fn() };
  const current = record(true);
  const props = {
    record: current,
    scoring,
    busy: false,
    invalid: '',
    onExportJson: vi.fn(),
    onImport: vi.fn(),
    dataset: datasets[0],
    evidenceProject: current.project as OccurrenceProjectExport,
    resolver,
  };
  const rendered = render(
    <MemoryRouter>
      <FinalExport {...props} />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Gerar comprovantes' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Gerar comprovantes' }));
  await waitFor(() =>
    expect(downloadPdfBytes).toHaveBeenCalledWith(bytes, 'comprovantes-rsc-joana-conceicao.pdf'),
  );
  const updated = record(true);
  if (updated.project.schemaVersion === '1.0') throw new Error('Projeto legado inesperado.');
  updated.project.userData.teacher.name = 'Maria Atualizada';
  rendered.rerender(
    <MemoryRouter>
      <FinalExport
        {...props}
        record={updated}
        evidenceProject={updated.project as OccurrenceProjectExport}
      />
    </MemoryRouter>,
  );
  await waitFor(() => expect(prepare).toHaveBeenCalledWith(updated.project, resolver));
  fireEvent.click(screen.getByRole('button', { name: 'Gerar PDF' }));
  await waitFor(() =>
    expect(downloadMemorialPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        userData: expect.objectContaining({
          teacher: expect.objectContaining({ name: 'Maria Atualizada' }),
        }),
      }),
      pageMap,
    ),
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Gerar formulários' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Gerar formulários' }));
  await waitFor(() =>
    expect(downloadNormativeFormsPdf).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        request: expect.objectContaining({
          fields: expect.arrayContaining([
            { label: 'Nome do(a) docente', value: 'Maria Atualizada' },
          ]),
        }),
      }),
    ),
  );
});

it('só disponibiliza os três downloads quando a geração conjunta termina com sucesso', async () => {
  const pageMap = { totalPages: 2, evidences: [] };
  vi.spyOn(preparation, 'prepareEvidenceArtifacts').mockResolvedValue({
    status: 'success',
    bytes: new Uint8Array([1]),
    pageMap,
  });
  const pdf = (marker: number) => new Uint8Array([37, 80, 68, 70, 45, marker]);
  vi.mocked(generateProcessArtifacts).mockResolvedValue({
    status: 'success',
    statuses: [
      { artifact: 'evidence', status: 'produced' },
      { artifact: 'memorial', status: 'produced' },
      { artifact: 'forms', status: 'produced' },
    ],
    artifacts: {
      evidence: pdf(1),
      memorial: pdf(2),
      forms: pdf(3),
      pageMap,
    },
  });
  const current = record(true);
  const resolver = { getFile: vi.fn() };
  render(
    <MemoryRouter>
      <FinalExport
        record={current}
        scoring={scoring}
        busy={false}
        invalid=""
        onExportJson={vi.fn()}
        onImport={vi.fn()}
        dataset={datasets[0]}
        evidenceProject={current.project as OccurrenceProjectExport}
        resolver={resolver}
      />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Gerar pacote final' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Gerar pacote final' }));
  await waitFor(() => expect(downloadBytes).toHaveBeenCalledOnce());
  expect(downloadBytes).toHaveBeenCalledWith(
    expect.objectContaining({ 0: 0x50, 1: 0x4b }),
    'pacote-final-rsc-joana-conceicao.zip',
    'application/zip',
  );
  expect(screen.getByRole('list', { name: 'Resultado da geração conjunta' })).toHaveTextContent(
    'Comprovantes: produzido',
  );
  expect(generateProcessArtifacts).toHaveBeenCalledWith(
    expect.objectContaining({
      project: expect.objectContaining({
        userData: expect.objectContaining({
          teacher: expect.objectContaining({ name: 'Joana Conceição' }),
        }),
      }),
      evidenceProject: current.project,
      regulation: datasets[0],
      scoring,
      resolver,
    }),
  );
});

it('não baixa resultado parcial quando a geração conjunta falha', async () => {
  const pageMap = { totalPages: 1, evidences: [] };
  vi.spyOn(preparation, 'prepareEvidenceArtifacts').mockResolvedValue({
    status: 'success',
    bytes: new Uint8Array([1]),
    pageMap,
  });
  vi.mocked(generateProcessArtifacts).mockResolvedValue({
    status: 'error',
    statuses: [
      { artifact: 'evidence', status: 'produced' },
      { artifact: 'memorial', status: 'produced' },
      { artifact: 'forms', status: 'failed', message: 'Falha no formulário.' },
    ],
  });
  const current = record(true);
  const resolver = { getFile: vi.fn() };
  render(
    <MemoryRouter>
      <FinalExport
        record={current}
        scoring={scoring}
        busy={false}
        invalid=""
        onExportJson={vi.fn()}
        onImport={vi.fn()}
        dataset={datasets[0]}
        evidenceProject={current.project as OccurrenceProjectExport}
        resolver={resolver}
      />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Gerar pacote final' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Gerar pacote final' }));
  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nenhum conjunto final foi disponibilizado',
    ),
  );
  expect(downloadBytes).not.toHaveBeenCalled();
  expect(screen.getByRole('list', { name: 'Resultado da geração conjunta' })).toHaveTextContent(
    'Formulários: falhou - Falha no formulário.',
  );
});

it('mostra erros de arquivo por artefato e mantém Memorial disponível sem referências', async () => {
  vi.spyOn(preparation, 'prepareEvidenceArtifacts').mockResolvedValue({
    status: 'error',
    issues: [
      { code: 'missing-file', evidenceId: 'e', message: 'Arquivo local ausente: comprovante.pdf' },
    ],
  });
  render(
    <MemoryRouter>
      <FinalExport
        record={record(true)}
        scoring={scoring}
        busy={false}
        invalid=""
        onExportJson={vi.fn()}
        onImport={vi.fn()}
        dataset={datasets[0]}
      />
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Gerar formulários' })).toBeDisabled(),
  );
  expect(screen.getByRole('button', { name: 'Gerar comprovantes' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Gerar PDF' })).toBeEnabled();
  expect(screen.getAllByText(/Arquivo local ausente/).length).toBeGreaterThan(0);
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
    screen.getByText(
      'Há avisos para conferir, mas eles não impedem a geração dos artefatos disponíveis.',
    ),
  ).toBeVisible();
  expect(screen.getByText('memorial-rsc-joana-conceicao.pdf')).toBeVisible();
  expect(screen.getByText('rscflow-processo-rsc-i.json')).toBeVisible();
  expect(screen.getByText(/11\/09\/2026/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Exportar JSON' }));
  expect(exportJson).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Gerar backup .rscflow' }));
  await waitFor(() =>
    expect(downloadBytes).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      'backup-rsc-joana-conceicao.rscflow',
      'application/zip',
    ),
  );
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
  expect(screen.getByRole('alert')).toHaveTextContent('Memorial bloqueado');
});
