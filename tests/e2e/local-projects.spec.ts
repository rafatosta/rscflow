import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { currentProjectFixture } from '../fixtures/project';

test('cria rascunho, salva, recarrega, duplica, exclui e transporta JSON', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.getByLabel('RSC pretendido').selectOption('rsc-i');
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await expect(page).toHaveURL(/\/project\/[^/]+$/);
  const projectUrl = page.url();
  await page.getByRole('link', { name: 'Dados do docente', exact: true }).click();
  await page.getByLabel('Título do projeto').fill('Memorial editado');
  await page.getByLabel(/^Nome completo/).fill('Docente de teste');
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/^Nome completo/)).toHaveValue('Docente de teste');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.getByRole('link', { name: 'Exportar', exact: true }).click();
  await page.getByText('Edição avançada dos dados JSON').click();
  const editor = page.getByLabel('Dados editáveis do projeto (JSON)');
  const data = { ...currentProjectFixture.userData, title: 'Memorial editado' };
  await editor.fill(JSON.stringify(data));
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('main').getByRole('button', { name: 'Exportar JSON', exact: true }).click();
  const download = await downloadPromise;
  const json = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(json)).toMatchObject({
    schemaVersion: '2.1',
    regulation: { id: 'ifba-189-2026', version: null },
    userData: data,
  });

  await page.getByRole('link', { name: 'Meus projetos', exact: true }).click();
  const card = page.getByRole('article', { name: 'Memorial editado', exact: true });
  await expect(card).toContainText('RSC I');
  await expect(card).toContainText('Última alteração:');
  await card.getByRole('button', { name: 'Duplicar', exact: true }).click();
  await expect(page).not.toHaveURL(projectUrl);
  await expect(page.getByRole('banner')).toContainText('Memorial editado (cópia)');
  await page.getByRole('link', { name: 'Meus projetos', exact: true }).click();
  const copyCard = page.getByRole('article', { name: 'Memorial editado (cópia)', exact: true });
  await copyCard.getByRole('button', { name: 'Excluir', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(copyCard).toBeVisible();
  await copyCard.getByRole('button', { name: 'Excluir', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(copyCard).toHaveCount(0);
  await expect(card).toBeVisible();

  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await other.goto('/');
    await other.getByLabel('Arquivo de projeto JSON').setInputFiles({
      name: 'projeto.json',
      mimeType: 'application/json',
      buffer: Buffer.from(json),
    });
    await other.getByRole('button', { name: 'Importar como novo projeto' }).click();
    await expect(other).toHaveURL(/\/project\/[^/]+$/);
    await other.getByRole('link', { name: 'Exportar', exact: true }).click();
    await other.getByText('Edição avançada dos dados JSON').click();
    const otherEditor = other.getByLabel('Dados editáveis do projeto (JSON)');
    expect(JSON.parse(await otherEditor.inputValue())).toEqual(data);
    await other.reload();
    await other.getByText('Edição avançada dos dados JSON').click();
    expect(JSON.parse(await otherEditor.inputValue())).toEqual(data);
  } finally {
    await otherContext.close();
  }
});

test('importa legado e mantém edição sem conversão implícita', async ({ page }) => {
  await page.goto('/');
  const legacy = {
    schemaVersion: '1.0',
    applicationVersion: 'antiga',
    regulation: { id: 'teste', version: 'antiga' },
    userData: { arbitrary: ['preservado', { value: 2 }] },
  };
  await page.getByLabel('Arquivo de projeto JSON').setInputFiles({
    name: 'legado.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await page.getByRole('button', { name: 'Importar como novo projeto' }).click();
  const editor = page.getByLabel('Dados editáveis do projeto (JSON)');
  await expect(editor).toBeVisible();
  expect(JSON.parse(await editor.inputValue())).toEqual(legacy.userData);
  await editor.fill(JSON.stringify({ arbitrary: ['editado'] }));
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  await page.reload();
  await expect(editor).toBeVisible();
  expect(JSON.parse(await editor.inputValue())).toEqual({ arbitrary: ['editado'] });
});
