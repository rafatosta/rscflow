import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProjectDocuments } from '@/components/project-documents';
import { createDraft } from '@/features/project-shell/project-view';
import { replaceOccurrenceEvidenceFile } from '@/features/requirements/requirements';

afterEach(cleanup);

it('oferece a edição do lançamento no próprio arquivo ausente', async () => {
  const project = createDraft('rsc-i', 'ifba-189-2026');
  project.userData.criterionEntries = [
    {
      id: 'entry',
      criterionId: 'criterion',
      selectedLevel: 'rsc-i',
      occurrences: [
        {
          id: 'occurrence-file',
          title: 'Atividade demonstrativa',
          quantity: 1,
          evidenceIds: ['evidence'],
          order: 0,
          period: {},
        },
      ],
    },
  ];
  project.userData.evidence = [{ id: 'evidence', title: 'Comprovante', fileIds: ['file'] }];
  project.userData.storedFiles = [
    { id: 'file', name: 'comprovante.pdf', mediaType: 'application/pdf', size: 10 },
  ];
  let saved: Awaited<ReturnType<typeof replaceOccurrenceEvidenceFile>>;
  const save = vi.fn(async (change) => {
    saved = await change(project);
    return true;
  });
  render(
    <ProjectDocuments
      project={project}
      resolver={{ getFile: async () => Promise.reject(new Error('detalhe interno')) }}
      save={save}
    />,
  );

  expect(await screen.findByText('Arquivo local ausente.')).toBeVisible();
  expect(screen.queryByText('detalhe interno')).toBeNull();
  expect(screen.queryByRole('button', { name: /Baixar comprovante/ })).toBeNull();
  const action = screen.getByRole('button', {
    name: 'Editar lançamento Atividade demonstrativa',
  });
  const picker = screen.getByLabelText('Selecionar arquivo para Atividade demonstrativa');
  const open = vi.spyOn(picker, 'click');
  fireEvent.click(action);
  expect(open).toHaveBeenCalledOnce();

  const bytes = new TextEncoder().encode('novo comprovante');
  const replacement = {
    name: 'novo.pdf',
    type: 'application/pdf',
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer,
  } as File;
  fireEvent.change(picker, { target: { files: [replacement] } });
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(saved!.files).toEqual([{ id: expect.any(String), blob: replacement }]);
  expect(saved!.project.userData.storedFiles).toEqual([
    expect.objectContaining({ name: 'novo.pdf', mediaType: 'application/pdf' }),
  ]);
  expect(saved!.project.userData.evidence[0].fileIds).toEqual([
    saved!.project.userData.storedFiles[0].id,
  ]);
  expect(saved!.project.userData.criterionEntries[0].occurrences[0].evidenceIds).toEqual([
    'evidence',
  ]);
});
