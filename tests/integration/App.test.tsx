import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '@/app/App';
import { projectFixture } from '../fixtures/project';

afterEach(cleanup);
const select = (text: () => Promise<string>) =>
  fireEvent.change(screen.getByLabelText('Arquivo de projeto JSON'), {
    target: { files: [{ text }] },
  });
const validText = async () => JSON.stringify(projectFixture);

describe('validação de projeto na interface', () => {
  it('apresenta instruções e metadados declarados sem certificação normativa', async () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Verificar arquivo de projeto' }),
    ).toBeInTheDocument();
    select(validText);
    expect(await screen.findByText('Estrutura válida')).toBeInTheDocument();
    for (const text of ['1.0', '0.1.0', 'referencia-de-teste', 'versao-declarada'])
      expect(screen.getByText(text)).toBeInTheDocument();
    expect(
      screen.getByText(/Validade estrutural não significa validação normativa/),
    ).toBeInTheDocument();
  });
  it('limpa o sucesso ao selecionar arquivo inválido e permite tentar novamente', async () => {
    render(<App />);
    select(validText);
    await screen.findByText('Estrutura válida');
    select(async () => '{');
    expect(screen.queryByText('Estrutura válida')).not.toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('JSON válido');
    select(validText);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await screen.findByText('Estrutura válida');
  });
  it('apresenta falha de leitura acessível', async () => {
    render(<App />);
    select(async () => {
      throw new Error('falha');
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível ler o arquivo');
  });
  it('ignora leitura antiga concluída após uma seleção mais recente', async () => {
    render(<App />);
    let finish!: (text: string) => void;
    select(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Lendo arquivo');
    select(async () => '{');
    await screen.findByRole('alert');
    await act(async () => finish(await validText()));
    expect(screen.queryByText('Estrutura válida')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('JSON válido');
  });
  it('limpa a seleção e ignora a leitura pendente', async () => {
    render(<App />);
    let finish!: (text: string) => void;
    select(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    fireEvent.change(screen.getByLabelText('Arquivo de projeto JSON'), { target: { files: [] } });
    await act(async () => finish(await validText()));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
