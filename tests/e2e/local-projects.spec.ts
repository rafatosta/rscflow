import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { currentProjectFixture } from '../fixtures/project';

test('cria, salva, recarrega, duplica, exclui e transporta JSON para outro navegador', async ({
  page,
  browser,
}) => {
  await page.goto('/');
  await page.getByText('Criar projeto', { exact: true }).click();
  await page.getByLabel('Título do projeto').fill('Meu memorial');
  await page.getByLabel('Nome do docente').fill('Docente de teste');
  await page.getByLabel('Identificador da normativa').fill('referencia-teste');
  await page.getByLabel('Versão normativa do novo projeto').fill('versao-fixada');
  await page.getByRole('button', { name: 'Criar e abrir' }).click();
  const editor = page.getByLabel('Dados editáveis do projeto (JSON)');
  await expect(editor).toBeVisible();
  const data = { ...currentProjectFixture.userData, title: 'Memorial editado' };
  await editor.fill(JSON.stringify(data));
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  await page.reload();
  await expect(editor).toBeVisible();
  expect(JSON.parse(await editor.inputValue())).toEqual(data);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: '/tmp/rscflow-local-projects.png', fullPage: true });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const download = await downloadPromise;
  const json = await readFile((await download.path())!, 'utf8');
  const envelope = JSON.parse(json);
  expect(envelope).toMatchObject({
    schemaVersion: '2.0',
    regulation: { id: 'referencia-teste', version: 'versao-fixada' },
    userData: data,
  });

  await page.getByRole('button', { name: 'Duplicar projeto' }).click();
  await expect(
    page.getByRole('button', { name: 'Memorial editado (cópia)', exact: true }),
  ).toBeVisible();
  expect(JSON.parse(await editor.inputValue()).id).not.toBe(data.id);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Excluir projeto' }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Memorial editado', exact: true })).toBeVisible();

  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await other.goto('/');
    await other
      .getByLabel('Arquivo de projeto JSON')
      .setInputFiles({
        name: 'projeto.json',
        mimeType: 'application/json',
        buffer: Buffer.from(json),
      });
    await other.getByRole('button', { name: 'Importar como novo projeto' }).click();
    const otherEditor = other.getByLabel('Dados editáveis do projeto (JSON)');
    await expect(otherEditor).toBeVisible();
    expect(JSON.parse(await otherEditor.inputValue())).toEqual(data);
    await other.reload();
    await expect(otherEditor).toBeVisible();
    expect(JSON.parse(await otherEditor.inputValue())).toEqual(data);
    await expect(
      other.getByText('Referência preservada: referencia-teste / versao-fixada'),
    ).toBeVisible();
  } finally {
    await otherContext.close();
  }
});

test('importa legado sem migração e rejeita JSON incompatível sem criar projeto', async ({
  page,
}) => {
  await page.goto('/');
  const legacy = {
    schemaVersion: '1.0',
    applicationVersion: 'antiga',
    regulation: { id: 'teste', version: 'antiga' },
    userData: { arbitrary: ['preservado', { value: 2 }] },
  };
  await page
    .getByLabel('Arquivo de projeto JSON')
    .setInputFiles({
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
  await page
    .getByLabel('Arquivo de projeto JSON')
    .setInputFiles({
      name: 'futuro.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...legacy, schemaVersion: '99.0' })),
    });
  await expect(page.getByRole('alert')).toContainText('Versão do esquema');
  await expect(page.getByRole('button', { name: 'Importar como novo projeto' })).toHaveCount(0);
});
