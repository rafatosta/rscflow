import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { parseRegulation, loadIfbaRegulation } from '@/data/regulations/load';
import type { RscLevel } from '@/domain/regulation';
import { CriteriaExplorer } from '@/components/criteria-explorer';
import { CriterionCombobox } from '@/components/criterion-combobox';
import fixture from '../fixtures/criteria-regulation.json';

const dataset = parseRegulation(fixture);

afterEach(cleanup);

it('navega por abas, busca e renderiza todos os valores diretamente do dataset', () => {
  const { rerender } = render(<CriteriaExplorer dataset={dataset} initialLevel="rsc-ii" />);
  expect(screen.getByRole('tab', { name: 'RSC II' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('heading', { name: 'b — Gestão e difusão' })).toBeVisible();
  expect(screen.getByText('Pontuação máxima da diretriz: 30')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Buscar no RSC II'), {
    target: { value: 'coordenação curso' },
  });
  expect(screen.getByRole('heading', { name: 'b.1 — Coordenação de curso' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'b.2 — Palestra ministrada' })).toBeNull();

  fireEvent.keyDown(screen.getByRole('tab', { name: 'RSC II' }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'RSC III' })).toHaveFocus();
  fireEvent.change(screen.getByLabelText('Buscar no RSC III'), { target: { value: 'artigo' } });
  expect(screen.getByRole('heading', { name: 'c.1 — Publicação de artigo' })).toBeVisible();

  const changed = structuredClone(dataset);
  changed.levels[2].criteria[0].factor = 9.75;
  changed.levels[2].criteria[0].unit = 'publicação atualizada';
  rerender(<CriteriaExplorer dataset={changed} initialLevel="rsc-iii" />);
  expect(screen.getByText('9.75')).toBeVisible();
  expect(screen.getByText('publicação atualizada')).toBeVisible();
});

it('expõe o catálogo pendente e sinaliza o conflito normativo transcrito', () => {
  render(<CriteriaExplorer dataset={loadIfbaRegulation()} initialLevel="rsc-ii" />);
  expect(screen.getAllByText('Pendente de validação oficial').length).toBeGreaterThan(0);
  fireEvent.change(screen.getByLabelText('Buscar no RSC II'), { target: { value: 'd.5' } });
  expect(
    screen.getByRole('heading', {
      name: /d\.5 — Organização e\/ou execução de visitas técnicas/,
    }),
  ).toBeVisible();
  expect(screen.getByText('Conflito normativo pendente de validação humana')).toBeVisible();
  expect(screen.getByRole('alert')).toHaveTextContent('O Anexo V imprime peso 14');
  expect(screen.getAllByRole('tab')).toHaveLength(3);
});

function ControlledCombobox({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  const [level, setLevel] = useState<RscLevel>();
  return (
    <>
      <CriterionCombobox
        dataset={dataset}
        value={value}
        onSelect={(criterionId, selectedLevel) => {
          setValue(criterionId);
          setLevel(selectedLevel);
        }}
      />
      <output aria-label="Seleção">
        {value}|{level}
      </output>
    </>
  );
}

it('seleciona por busca e teclado em combobox acessível e mostra contexto normativo', () => {
  render(<ControlledCombobox />);
  const combobox = screen.getByRole('combobox', { name: /Critério RSC/ });
  expect(combobox).toHaveAttribute('aria-autocomplete', 'list');
  fireEvent.focus(combobox);
  fireEvent.change(combobox, { target: { value: 'coordenação curso' } });
  expect(screen.getByRole('listbox', { name: 'Resultados de critérios' })).toBeVisible();
  expect(screen.getByRole('option', { name: /b.1 — Coordenação de curso/ })).toBeVisible();
  fireEvent.keyDown(combobox, { key: 'Enter' });
  expect(screen.getByRole('status', { name: 'Seleção' })).toHaveTextContent('rsc-ii-b-1|rsc-ii');
  expect(screen.getByText(/Unidade: curso · Fator: 3/)).toBeVisible();
});

it('sinaliza referência inválida e bloqueia seleção em catálogo pendente', () => {
  const onSelect = vi.fn();
  const { rerender } = render(
    <CriterionCombobox dataset={dataset} value="inexistente" onSelect={onSelect} />,
  );
  expect(screen.getByText('A referência salva não existe no dataset vinculado.')).toBeVisible();
  expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');

  rerender(<CriterionCombobox dataset={loadIfbaRegulation()} value="" onSelect={onSelect} />);
  expect(screen.getByRole('combobox')).toBeDisabled();
  expect(screen.getByText(/A seleção exige um catálogo vinculado e validado/)).toBeVisible();
  expect(onSelect).not.toHaveBeenCalled();
});
