import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Activity, Memorial } from '@/domain/models';
import { MemorialSection } from '@/components/memorial-section';
import { regenerateActivityText } from '@/memorial/generator';

afterEach(cleanup);

const activity: Activity = {
  id: 'atividade',
  title: 'Docência em curso técnico',
  category: 'Ensino',
  startDate: '2022-01-01',
  description: 'Aulas e orientação',
  results: 'Turma concluída',
  competencies: ['Didática'],
  criterionId: '',
  quantity: 1,
  evidenceIds: [],
};

function renderEditor(input: Activity = activity) {
  let activities = [input];
  let memorial: Memorial | null = null;
  const save = vi.fn((patch: { memorial: Memorial; activities: Activity[] }) => {
    activities = patch.activities;
    memorial = patch.memorial;
    view.rerender(
      <MemorialSection
        projectTitle="Memorial teste"
        memorial={memorial}
        activities={activities}
        evidences={[]}
        disabled={false}
        onSave={save}
      />,
    );
  });
  const view = render(
    <MemorialSection
      projectTitle="Memorial teste"
      memorial={memorial}
      activities={activities}
      evidences={[]}
      disabled={false}
      onSave={save}
    />,
  );
  return { save, getActivity: () => activities[0], rerender: view.rerender };
}

it('edita seções e texto-base sem sobrescrever a narrativa manual', () => {
  const editor = renderEditor();
  expect(screen.getByLabelText(/Apresentação introdutória/)).toHaveValue(
    'Este Memorial Descritivo reúne os dados de formação e os registros profissionais do projeto Memorial teste.',
  );
  expect(screen.getByRole('heading', { name: 'Atuação docente' })).toBeVisible();
  expect((screen.getByLabelText('Texto da atividade') as HTMLTextAreaElement).value).toContain(
    'Atuação',
  );

  fireEvent.change(screen.getByLabelText('Texto da atividade'), {
    target: { value: 'Minha narrativa autoral.' },
  });
  expect(editor.getActivity()).toMatchObject({
    editedText: 'Minha narrativa autoral.',
    isManuallyEdited: true,
  });
  fireEvent.change(screen.getByLabelText(/Apresentação introdutória/), {
    target: { value: 'Introdução editorial.' },
  });
  expect(editor.save).toHaveBeenCalled();
});

it('avisa sobre dados alterados e respeita manter ou regenerar', () => {
  const generated = regenerateActivityText(activity, []);
  const manual = {
    ...generated,
    editedText: 'Texto que não pode ser perdido.',
    isManuallyEdited: true,
  };
  const editor = renderEditor({ ...manual, results: 'Resultado alterado depois' });

  expect(screen.getByRole('alert')).toHaveTextContent('dados estruturados mudaram');
  fireEvent.click(screen.getByRole('button', { name: 'Manter texto atual' }));
  expect(editor.getActivity().editedText).toBe('Texto que não pode ser perdido.');
  expect(screen.queryByRole('alert')).toBeNull();

  editor.rerender(
    <MemorialSection
      projectTitle="Memorial teste"
      memorial={null}
      activities={[{ ...manual, results: 'Outra alteração' }]}
      evidences={[]}
      disabled={false}
      onSave={(patch) =>
        editor.rerender(
          <MemorialSection
            projectTitle="Memorial teste"
            memorial={patch.memorial}
            activities={patch.activities}
            evidences={[]}
            disabled={false}
            onSave={() => undefined}
          />,
        )
      }
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Regenerar texto' }));
  expect((screen.getByLabelText('Texto da atividade') as HTMLTextAreaElement).value).toContain(
    'Outra alteração',
  );
  expect(screen.getByText('Texto-base')).toBeVisible();
});
