import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './support/fixtures';

async function create(page: Page, dataset = 'criteria-fixture') {
  await page.goto('/');
  await page.getByLabel('RSC pretendido').selectOption('rsc-i');
  await page.getByLabel('Regulamento / dataset').selectOption(dataset);
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await expect(page).toHaveURL(/\/project\/[^/]+$/);
}
async function profile(page: Page) {
  await page.getByRole('link', { name: 'Dados do docente', exact: true }).click();
  await page.getByLabel(/^Nome completo/).fill('Ana Docente');
  await page.getByLabel(/^CPF/).fill('52998224725');
  await page.getByLabel(/^SIAPE/).fill('1234567');
  await page.getByLabel(/^Campus de lotação/).fill('Salvador');
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
}
async function add(page: Page, quantity: string, file = true) {
  await page
    .getByRole('article', { name: 'Orientação de TCC', exact: true })
    .getByRole('button', { name: 'Adicionar lançamento' })
    .click();
  await page.getByLabel('De', { exact: true }).fill('2024-01-01');
  await page.getByLabel('Até', { exact: true }).fill('2024-12-31');
  await page.getByLabel('Quantidade (orientação)', { exact: true }).fill(quantity);
  await page.getByLabel('Descrição (opcional)', { exact: true }).fill('Orientação concluída');
  if (file)
    await page.getByLabel('Documento comprobatório (opcional)', { exact: true }).setInputFiles({
      name: 'declaracao.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Comprovação local'),
    });
  await page.getByRole('button', { name: 'Salvar lançamento', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Lançamento' })).toHaveCount(0);
}

test('jornada de requisitos, anexo, pontuação, autoria, revisão e transporte JSON', async ({
  page,
}) => {
  await create(page);
  const originalUrl = page.url();
  await expect(page.getByRole('navigation').getByRole('link')).toHaveText([
    'Meus projetos',
    'Visão geral',
    'Dados do docente',
    'Requisitos',
    'Memorial',
    'Revisão',
    'Gerar documentos',
  ]);
  await profile(page);
  await page.getByRole('link', { name: 'Requisitos', exact: true }).click();
  await add(page, '99');
  await expect(page.getByRole('article', { name: 'Orientação de TCC', exact: true })).toContainText(
    'Pontuação do requisito: 10',
  );
  await page.reload();
  await expect(page.getByText('Documentos: declaracao.txt')).toBeVisible();
  await add(page, '2', false);
  await expect(page.getByText('Pendente: sem documento comprobatório.')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Orientação de TCC', exact: true })).toContainText(
    'Pontuação do requisito: 10',
  );
  await page.getByRole('link', { name: 'Memorial', exact: true }).click();
  await page.getByRole('button', { name: 'Preparar memorial com os dados cadastrados' }).click();
  await page
    .getByLabel('Texto da atividade', { exact: true })
    .first()
    .fill('Texto autoral preservado.');
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Requisitos', exact: true }).click();
  await page.getByRole('button', { name: 'Editar lançamento', exact: true }).first().click();
  await page.getByLabel('Descrição (opcional)', { exact: true }).fill('Descrição revisada');
  await page.getByRole('button', { name: 'Salvar lançamento', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Lançamento' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Memorial', exact: true }).click();
  await expect(page.getByLabel('Texto da atividade', { exact: true }).first()).toHaveValue(
    'Texto autoral preservado.',
  );
  await page.getByRole('link', { name: 'Revisão', exact: true }).click();
  await expect(page.getByText('1 de 1 arquivos disponíveis')).toBeVisible();
  const binary = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar declaracao.txt' }).click();
  expect((await binary).suggestedFilename()).toBe('declaracao.txt');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Gerar documentos', exact: true })
    .click();
  const download = page.waitForEvent('download');
  await page.getByRole('main').getByRole('button', { name: 'Exportar JSON', exact: true }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  const json = JSON.parse(buffer.toString());
  expect(json.schemaVersion).toBe('3.0');
  expect(json.userData).not.toHaveProperty('activities');
  expect(json.userData.storedFiles).toHaveLength(1);
  await page
    .getByLabel('Arquivo de projeto JSON')
    .setInputFiles({ name: 'copia.json', mimeType: 'application/json', buffer });
  await page.getByRole('button', { name: 'Importar como novo projeto' }).click();
  await expect(page).toHaveURL(/\/project\/[^/]+$/);
  expect(page.url()).not.toBe(originalUrl);
  await expect(page.getByText('0 de 1 arquivos disponíveis')).toBeVisible();
  await page.getByRole('link', { name: 'Requisitos', exact: true }).click();
  await page.getByRole('button', { name: 'Editar lançamento', exact: true }).first().click();
  await page.getByLabel('Documento comprobatório (opcional)', { exact: true }).setInputFiles({
    name: 'declaracao.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Comprovação local'),
  });
  await page.getByRole('button', { name: 'Salvar lançamento', exact: true }).click();
  await expect(page.getByRole('form', { name: 'Lançamento' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Revisão', exact: true }).click();
  await expect(page.getByText('1 de 1 arquivos disponíveis')).toBeVisible();
});

test('catálogo pendente permite registro provisório, nunca cálculo presumido', async ({ page }) => {
  await create(page, 'ifba-189-2026');
  await page.getByRole('link', { name: 'Requisitos', exact: true }).click();
  await page.getByRole('tab', { name: 'RSC II', exact: true }).click();
  await page.getByLabel('Buscar requisitos').fill('d.5');
  await expect(page.getByText('Conflito normativo pendente de validação humana')).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar lançamento', exact: true }).click();
  await page.getByRole('spinbutton').fill('2');
  await expect(page.getByText(/Pontuação calculada: Indisponível/)).toBeVisible();
  await page.getByRole('button', { name: 'Salvar lançamento', exact: true }).click();
  await expect(page.getByText('Pontuação indisponível', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'RSC III', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'RSC III', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

for (const width of [360, 768, 1440])
  test(`formulário por teclado, bloqueio de navegação e reflow ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await create(page);
    await page.goto(`${page.url()}/requirements`);
    const addButton = page
      .getByRole('article', { name: 'Orientação de TCC', exact: true })
      .getByRole('button', { name: 'Adicionar lançamento' });
    await addButton.click();
    await expect(page.getByLabel('De', { exact: true })).toBeFocused();
    await page.getByLabel('De', { exact: true }).fill('2025-01-01');
    await page.getByLabel('Até', { exact: true }).fill('2024-01-01');
    await page.getByRole('button', { name: 'Salvar lançamento' }).click();
    await expect(page.getByText('A data final não pode anteceder a inicial.')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width >= 1024) {
      await page.getByRole('link', { name: 'Memorial', exact: true }).click();
      await expect(page).toHaveURL(/requirements$/);
      await expect(page.getByText('Salve ou cancele o lançamento antes de navegar.')).toBeVisible();
    }
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(addButton).toBeFocused();
  });
