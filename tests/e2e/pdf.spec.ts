import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

test('pré-visualiza páginas A4 e baixa o PDF produzido no navegador', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('RSC pretendido').selectOption('rsc-iii');
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await page.getByRole('link', { name: 'Revisão', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Correções necessárias' })).toBeVisible();
  await page.getByRole('link', { name: 'Exportar', exact: true }).click();
  await expect(page.getByRole('main').getByRole('button', { name: 'Gerar PDF' })).toBeDisabled();
  await expect(
    page.getByRole('main').getByRole('button', { name: 'Exportar JSON' }),
  ).toBeEnabled();
  await page.getByRole('link', { name: 'Dados do docente', exact: true }).click();
  await page.getByLabel(/^Nome completo/).fill('Lívia Conceição');
  await page.getByLabel(/^Título do projeto/).fill('Memorial de competências docentes');
  await page.getByLabel(/^CPF/).fill('529.982.247-25');
  await page.getByLabel(/^SIAPE/).fill('1234567');
  await page.getByLabel(/^Campus de lotação/).fill('Salvador');
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Memorial', exact: true }).click();
  await page
    .getByLabel(/Apresentação introdutória/)
    .fill('Educação, ciência e extensão no IFBA. '.repeat(220));
  await page.getByLabel('Texto da conclusão', { exact: true }).fill('Síntese da trajetória acadêmica.');
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Revisão', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Documento pronto para exportação' })).toBeVisible();
  await expect(page.getByText(/Nenhuma formação foi registrada/)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: 'Ir para exportação' }).click();
  await expect(page.getByText('Há avisos para conferir, mas eles não impedem a geração do PDF.')).toBeVisible();
  await expect(page.getByText('memorial-rsc-livia-conceicao.pdf')).toBeVisible();
  await expect(page.getByText('rscflow-memorial-de-competencias-docentes.json')).toBeVisible();
  await expect(page.getByLabel('Arquivo de projeto JSON')).toBeVisible();
  const jsonDownloadPromise = page.waitForEvent('download');
  await page.getByRole('main').getByRole('button', { name: 'Exportar JSON' }).click();
  const jsonDownload = await jsonDownloadPromise;
  expect(jsonDownload.suggestedFilename()).toBe('rscflow-memorial-de-competencias-docentes.json');
  const jsonStream = await jsonDownload.createReadStream();
  const jsonChunks: Buffer[] = [];
  for await (const chunk of jsonStream) jsonChunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(jsonChunks).toString())).toMatchObject({
    userData: {
      teacher: { name: 'Lívia Conceição', cpf: '52998224725' },
      memorial: { conclusion: 'Síntese da trajetória acadêmica.' },
    },
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('link', { name: 'Prévia', exact: true }).click();

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
