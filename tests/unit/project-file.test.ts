import { describe, expect, it } from 'vitest';
import { validateProjectFile } from '@/features/project-import/validate-project-file';
import { projectFixture } from '../fixtures/project';

const file = (value: unknown) => ({ text: async () => JSON.stringify(value) });

describe('validação estrutural de arquivo', () => {
  it('aceita referência desconhecida e preserva os dados opacos', async () => {
    expect(await validateProjectFile(file(projectFixture))).toEqual({
      success: true,
      project: projectFixture,
    });
  });
  it('trata falha de leitura', async () => {
    expect(
      await validateProjectFile({
        text: async () => {
          throw new Error('falha');
        },
      }),
    ).toEqual({
      success: false,
      errors: ['Não foi possível ler o arquivo. Selecione-o novamente.'],
    });
  });
  it.each(['', '{', '<html>'])('rejeita JSON inválido: %s', async (text) => {
    expect(await validateProjectFile({ text: async () => text })).toEqual({
      success: false,
      errors: ['O arquivo não contém JSON válido. Verifique seu conteúdo.'],
    });
  });
  it.each([null, [], 'texto', 42])('rejeita raiz inválida: %j', async (value) => {
    expect(await validateProjectFile(file(value))).toEqual({
      success: false,
      errors: ['O conteúdo deve ser um objeto de projeto.'],
    });
  });
  it.each([
    [{ schemaVersion: '2.0' }, 'Versão do esquema'],
    [{ schemaVersion: undefined }, 'Versão do esquema'],
    [{ applicationVersion: '' }, 'applicationVersion'],
    [{ applicationVersion: 1 }, 'applicationVersion'],
    [{ regulation: undefined }, 'Referência normativa'],
    [{ regulation: { id: '', version: 'teste' } }, 'regulation.id'],
    [{ regulation: { id: 'teste' } }, 'regulation.version'],
    [{ userData: [] }, 'Dados do usuário'],
    [{ userData: undefined }, 'Dados do usuário'],
  ])('informa o campo inválido: %j', async (patch, message) => {
    const result = await validateProjectFile(file({ ...projectFixture, ...patch }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.join(' ')).toContain(message);
  });
});
