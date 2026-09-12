import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './support/fixtures';

test('migra em cópia, edita o domínio 3.0, recarrega e exporta sem perder referências', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('RSC pretendido').selectOption('rsc-ii');
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await expect(page).toHaveURL(/\/project\/[^/]+$/);
  const originalUrl = page.url();
  await page.getByRole('link', { name: 'Gerar documentos', exact: true }).click();
  await page.getByText('Edição avançada dos dados JSON').click();
  const editor = page.getByLabel('Dados editáveis do projeto (JSON)');
  const data = JSON.parse(await editor.inputValue());
  data.evidence = [{ id: 'proof', title: 'Prova compartilhada', fileName: 'antigo.pdf' }];
  data.activities = ['one', 'two'].map((id, index) => ({
    id,
    title: `Ocorrência ${index + 1}`,
    category: 'Ensino',
    criterionId: 'declarado',
    selectedLevel: 'rsc-ii',
    quantity: 1,
    evidenceIds: ['proof'],
    startDate: `202${index + 4}-01-01`,
    editedText: `Autoria ${index + 1}`,
    isManuallyEdited: true,
  }));
  await editor.fill(JSON.stringify(data));
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Migrar para critérios e ocorrências em nova cópia' })
    .click();
  await expect(page).toHaveURL(/\/project\/[^/]+$/);
  const copyUrl = page.url();
  expect(copyUrl).not.toBe(originalUrl);
  await page.getByRole('link', { name: 'Dados do docente', exact: true }).click();
  await page.getByLabel(/^Nome completo/).fill('Docente migrado');
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/^Nome completo/)).toHaveValue('Docente migrado');
  await page.getByRole('link', { name: 'Cadastro anterior', exact: true }).click();
  await expect(page.getByText('Ocorrência 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Ocorrência 2', { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: 'Gerar documentos', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Migrar para critérios e ocorrências em nova cópia' }),
  ).toHaveCount(0);
  await page.getByText('Edição avançada dos dados JSON').click();
  const next = JSON.parse(await editor.inputValue());
  expect(next.activities).toBeUndefined();
  expect(next.criterionEntries[0].occurrences).toHaveLength(2);
  next.storedFiles = [{ id: 'file', name: 'arquivo.pdf', size: 123, mediaType: 'application/pdf' }];
  next.evidence[0].fileIds = ['file'];
  await editor.fill(JSON.stringify(next));
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Dados do docente', exact: true }).click();
  await page.getByLabel('Título do projeto').fill('Processo migrado');
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Memorial', exact: true }).click();
  await page.getByLabel('Título do memorial').fill('');
  await expect(page.getByText('Dados pendentes de correção', { exact: true })).toBeVisible();
  await page.getByLabel('Título do memorial').fill('Memorial preservado');
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON', exact: true }).click();
  const download = await downloading;
  const exported = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(exported.schemaVersion).toBe('3.0');
  expect(exported.userData.storedFiles).toHaveLength(1);
  expect(exported.userData.evidence[0].fileIds).toEqual(['file']);
  expect(exported.userData.criterionEntries[0].occurrences[0].editedText).toBe('Autoria 1');
  await page.goto(`${originalUrl}/export`);
  await page.getByText('Edição avançada dos dados JSON').click();
  const original = JSON.parse(await editor.inputValue());
  expect(original.activities).toHaveLength(2);
  expect(original.criterionEntries).toBeUndefined();
});
