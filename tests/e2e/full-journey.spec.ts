import { PDFDocument } from 'pdf-lib';
import { expect, test, type Download, type Page } from './support/fixtures';

async function waitForAutosave(page: Page) {
  await expect(page.getByText('Salvando…', { exact: true })).toBeVisible();
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
}

async function downloadBytes(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function chooseCriterion(page: Page, query: string, option: RegExp) {
  const combobox = page.getByRole('combobox', { name: /Critério RSC/ });
  await combobox.fill(query);
  await page.getByRole('option', { name: option }).click();
}

test('percorre elaboração, cálculo, revisão e exportações em um projeto completo', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Nenhum projeto local')).toBeVisible();
  await page.getByLabel('RSC pretendido').selectOption('rsc-i');
  await page.getByLabel('Regulamento / dataset').selectOption('criteria-fixture');
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await expect(page).toHaveURL(/\/project\/[^/]+$/);

  await page.getByRole('link', { name: 'Dados do docente', exact: true }).click();
  await page.getByLabel(/^Título do projeto/).fill('Memorial E2E completo');
  await page.getByLabel(/^Nome completo/).fill('Ana Teste da Silva');
  await page.getByLabel(/^CPF/).fill('52998224725');
  await page.getByLabel(/^SIAPE/).fill('1234567');
  await page.getByLabel(/^Campus de lotação/).fill('Salvador');
  await waitForAutosave(page);

  await page.getByRole('link', { name: 'Formação', exact: true }).click();
  await page.getByLabel(/^Tipo/).fill('Especialização');
  await page.getByLabel(/^Situação/).fill('Concluída');
  await page.getByLabel(/^Curso ou título/).fill('Educação profissional');
  await page.getByLabel(/^Instituição/).fill('Instituição de teste');
  await page.getByLabel(/^Referência do documento/).fill('Diploma 10');
  await page.getByRole('button', { name: 'Adicionar formação' }).click();
  await waitForAutosave(page);

  await page.getByRole('link', { name: 'Cadastro anterior', exact: true }).click();
  await page.getByLabel(/^Título da atividade/).fill('Orientações acima do limite');
  await page.getByLabel(/^Categoria/).selectOption('Ensino');
  await page.getByLabel(/^Quantidade declarada/).fill('99');
  await chooseCriterion(page, 'orientação', /a\.1 — Orientação de TCC/);
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await waitForAutosave(page);
  await expect(
    page.getByRole('article').filter({ hasText: 'Orientações acima do limite' }),
  ).toContainText('EvidênciasNenhuma');

  await page.getByRole('button', { name: 'Adicionar evidência' }).click();
  await page.getByLabel(/^Tipo de evidência/).fill('Declaração');
  await page.getByLabel(/^Título da evidência/).fill('Declaração institucional');
  await page.getByLabel(/^Identificador/).fill('DOC-2026-1');
  await page.getByRole('button', { name: 'Adicionar evidência' }).click();
  await waitForAutosave(page);

  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await page.getByLabel(/^Título da atividade/).fill('Comissões acima do limite');
  await page.getByLabel(/^Categoria/).selectOption('Gestão');
  await page.getByLabel(/^Quantidade declarada/).fill('20');
  await chooseCriterion(page, 'comissão', /a\.2 — Participação em comissão/);
  await page.getByRole('checkbox', { name: /Declaração institucional/ }).check();
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await waitForAutosave(page);

  const projectUrl = new URL(page.url()).pathname.replace(/\/activities$/, '');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Orientações acima do limite' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comissões acima do limite' })).toBeVisible();

  await page.getByRole('link', { name: 'Pontuação', exact: true }).click();
  const result = page.getByRole('region', { name: 'Resultado quantitativo' });
  await expect(result.getByRole('status')).toContainText('Requisitos quantitativos atingidos');
  await result.getByText(/RSC I · Ensino e orientação/).click();
  await expect(result.getByText('Quantidade informada: 99 orientação')).toContainText(
    'considerada: 5',
  );
  await expect(result.getByText('Pontuação máxima da diretriz atingida.')).toBeVisible();

  await page.getByRole('link', { name: 'Memorial', exact: true }).click();
  await page.getByLabel(/Apresentação introdutória/).fill('Apresentação do memorial completo.');
  await page.getByLabel('Texto da conclusão', { exact: true }).fill('Conclusão conferida.');
  await page.getByRole('button', { name: 'Gerar textos-base ausentes' }).click();
  await waitForAutosave(page);
  const manualText = page.getByLabel('Texto da atividade').first();
  await manualText.fill('Narrativa manual que deve sobreviver à recarga.');
  await waitForAutosave(page);
  await page.reload();
  await expect(page.getByLabel('Texto da atividade').first()).toHaveValue(
    'Narrativa manual que deve sobreviver à recarga.',
  );

  await page.getByRole('link', { name: 'Revisão', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Documento pronto para exportação' }),
  ).toBeVisible();
  await expect(page.getByText(/Orientações acima do limite.*não possui documento/)).toBeVisible();

  await page.getByRole('link', { name: 'Gerar documentos', exact: true }).click();
  const jsonDownloadPromise = page.waitForEvent('download');
  await page
    .getByRole('article')
    .filter({ hasText: 'Projeto em JSON' })
    .getByRole('button', { name: 'Exportar JSON' })
    .click();
  const jsonDownload = await jsonDownloadPromise;
  const json = await downloadBytes(jsonDownload);
  expect(JSON.parse(json.toString()).userData.title).toBe('Memorial E2E completo');

  await page.getByLabel('Arquivo de projeto JSON').setInputFiles({
    name: jsonDownload.suggestedFilename(),
    mimeType: 'application/json',
    buffer: json,
  });
  await expect(page.getByText('Estrutura válida', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Importar como novo projeto' }).click();
  await expect(page).not.toHaveURL(new RegExp(`${projectUrl}(?:/export)?$`));
  await expect(page.getByRole('heading', { name: 'Visão geral', level: 1 })).toBeVisible();

  await page.getByRole('link', { name: 'Gerar documentos', exact: true }).click();
  const pdfDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Gerar PDF' }).click();
  const pdf = await downloadBytes(await pdfDownloadPromise);
  expect(pdf.subarray(0, 8).toString()).toContain('%PDF-');
  expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(1);
});
