import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

test('pré-visualiza páginas A4 e baixa o PDF produzido no navegador', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('RSC pretendido').selectOption('rsc-iii');
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await page.getByRole('link', { name: 'Dados do docente', exact: true }).click();
  await page.getByLabel(/^Nome completo/).fill('Lívia Conceição');
  await page.getByLabel(/^Título do projeto/).fill('Memorial de competências docentes');
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Memorial', exact: true }).click();
  await page
    .getByLabel(/Apresentação introdutória/)
    .fill('Educação, ciência e extensão no IFBA. '.repeat(220));
  await page.getByLabel('Texto da conclusão', { exact: true }).fill('Síntese da trajetória acadêmica.');
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ver prévia do memorial' }).click();

  const article = page.getByRole('article', { name: 'Página 1' });
  await expect(article).toContainText('Lívia Conceição');
  await expect(page.getByText(/Página 1 de/)).toBeVisible();
  await page.getByRole('button', { name: 'Próxima página' }).click();
  await expect(page.getByRole('article', { name: 'Página 2' })).toContainText('Sumário');
  await expect(page.getByRole('link', { name: /Voltar para edição/ })).toHaveAttribute(
    'href',
    /\/memorial$/,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Gerar PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('memorial-rsc-livia-conceicao.pdf');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks);
  expect(bytes.byteLength).toBeGreaterThan(5_000);
  expect(bytes.subarray(0, 8).toString()).toContain('%PDF-');
  expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(9);
});
