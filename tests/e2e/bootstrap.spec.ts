import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { projectFixture } from '../fixtures/project';

test('valida arquivos localmente e mantém estados acessíveis', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Verificar arquivo de projeto' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const input = page.getByLabel('Arquivo de projeto JSON');
  await input.focus();
  await expect(input).toBeFocused();
  await input.setInputFiles({
    name: 'projeto.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(projectFixture)),
  });
  await expect(page.getByText('Estrutura válida', { exact: true })).toBeVisible();
  await expect(page.getByText('referencia-de-teste', { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Validade estrutural não significa validação normativa/),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await input.setInputFiles({
    name: 'invalido.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  });
  await expect(page.getByRole('alert')).toContainText('JSON válido');
  await expect(page.getByText('Estrutura válida', { exact: true })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await input.setInputFiles({
    name: 'incompativel.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...projectFixture, schemaVersion: '2.0' })),
  });
  await expect(page.getByRole('alert')).toContainText('Versão do esquema ausente ou incompatível');
});
