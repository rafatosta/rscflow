import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RequirementsSection } from '@/components/requirements-section';
import { parseRegulation, loadIfbaRegulation } from '@/data/regulations/load';
import { createDraft } from '@/features/project-shell/project-view';
import fixture from '../fixtures/criteria-regulation.json';

afterEach(cleanup);
const unavailable = {
  status: 'unavailable' as const,
  issues: [{ code: 'pending-dataset' as const, message: 'Pendente' }],
};
it('formulário mínimo deriva contexto, muda unidade e oferece arquivo no mesmo fluxo', async () => {
  const dataset = parseRegulation(fixture);
  const first = dataset.levels[0].criteria[0];
  const save = vi.fn().mockResolvedValue(true);
  const dirty = vi.fn();
  const project = createDraft('rsc-i', 'ifba-189-2026');
  render(
    <RequirementsSection
      project={project}
      dataset={dataset}
      scoring={unavailable}
      disabled={false}
      save={save}
      setFormDirty={dirty}
    />,
  );
  const article = screen.getByRole('article', { name: first.description });
  expect(within(article).getByRole('button', { name: 'Ver lançamentos' })).toBeDisabled();
  expect(within(article).getByText(first.provenance.sourceReference)).toBeVisible();
  expect(within(article).queryByText('Referência normativa')).toBeNull();
  fireEvent.click(within(article).getByRole('button', { name: 'Adicionar lançamento' }));
  const form = screen.getByRole('form', { name: 'Lançamento' });
  await waitFor(() => expect(screen.getByLabelText('De')).toHaveFocus());
  expect(within(form).getByText(first.description)).toBeVisible();
  expect(screen.getByLabelText(`Quantidade (${first.unit})`)).toBeVisible();
  expect(screen.getByLabelText('Documento comprobatório (opcional)')).toHaveAttribute(
    'type',
    'file',
  );
  expect(screen.queryByLabelText(/Categoria|Título do lançamento|Critério RSC|Peso/)).toBeNull();
  fireEvent.change(screen.getByLabelText('De'), { target: { value: '2025-01-01' } });
  fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2024-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar lançamento' }));
  expect(dirty).toHaveBeenCalledWith(true);
  await screen.findByText('A data final não pode anteceder a inicial.');
  expect(save).not.toHaveBeenCalled();
});
it('consulta todos os níveis e apresenta conflito como dado do catálogo', () => {
  const dataset = loadIfbaRegulation();
  render(
    <RequirementsSection
      project={createDraft('rsc-i', 'ifba-189-2026')}
      dataset={dataset}
      scoring={unavailable}
      disabled={false}
      save={vi.fn()}
      setFormDirty={vi.fn()}
    />,
  );
  fireEvent.keyDown(screen.getByRole('tab', { name: /^RSC I$/ }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: /^RSC II$/ })).toHaveFocus();
  expect(screen.getByRole('tab', { name: /^RSC II$/ })).toHaveAttribute('aria-selected', 'true');
  fireEvent.change(screen.getByLabelText('Buscar requisitos'), { target: { value: 'd.5' } });
  expect(screen.getByText('Conflito normativo pendente de validação humana')).toBeVisible();
  expect(screen.getByText(/O Anexo V imprime peso 14/)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Adicionar lançamento' })).toBeEnabled();
});
