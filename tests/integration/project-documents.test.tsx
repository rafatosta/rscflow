import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import { ProjectDocuments } from '@/components/project-documents';
import { createDraft } from '@/features/project-shell/project-view';

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
  render(
    <MemoryRouter>
      <ProjectDocuments
        project={project}
        localId="local-1"
        resolver={{ getFile: async () => Promise.reject(new Error('detalhe interno')) }}
      />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Arquivo local ausente.')).toBeVisible();
  expect(screen.queryByText('detalhe interno')).toBeNull();
  expect(screen.queryByRole('button', { name: /Baixar comprovante/ })).toBeNull();
  expect(
    screen.getByRole('link', { name: 'Editar lançamento Atividade demonstrativa' }),
  ).toHaveAttribute('href', '/project/local-1/requirements?edit=occurrence-file');
});
