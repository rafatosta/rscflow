import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DocumentPreview } from '@/components/document-preview/document-preview';

afterEach(cleanup);

it('apresenta outro tipo documental com estado único de navegação e ações fornecidas pelo consumidor', () => {
  const exportDocument = vi.fn();
  render(
    <DocumentPreview
      metadata={{ title: 'Relatório de teste', type: 'Relatório', campus: 'Unidade de teste' }}
      status={{
        label: 'Disponível com avisos',
        description: 'Informação incompleta.',
        tone: 'warning',
      }}
      pages={[1, 2, 3].map((number) => ({
        id: `report-${number}`,
        label: `Página ${number}`,
        content: <article aria-label={`Página ${number}`}>Conteúdo {number}</article>,
        thumbnail: <span aria-hidden="true">Miniatura {number}</span>,
      }))}
      actions={[
        { id: 'export', label: 'Exportar relatório', primary: true, onClick: exportDocument },
      ]}
      hint="Orientação específica do relatório."
    />,
  );

  expect(screen.getByRole('heading', { name: 'Relatório de teste' })).toBeVisible();
  expect(screen.getByText('Disponível com avisos')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Ir para Página 3' }));
  expect(screen.getByLabelText('Página atual')).toHaveValue(3);
  expect(screen.getByRole('article', { name: 'Página 3' })).toHaveTextContent('Conteúdo 3');
  expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Ir para Página 3' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  fireEvent.change(screen.getByLabelText('Página atual'), { target: { value: '2' } });
  expect(screen.getByRole('article', { name: 'Página 2' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Duas páginas' }));
  expect(screen.getByRole('button', { name: 'Duas páginas' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('article', { name: 'Página 3' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Diminuir zoom' }));
  expect(screen.getByText('90%')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Ajustar' }));
  expect(screen.getByText('100%')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Exportar relatório' }));
  expect(exportDocument).toHaveBeenCalledOnce();
});
