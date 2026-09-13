import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './support/fixtures';

const viewports = [
  { name: 'mobile', width: 360, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

async function expectNoSeriousAxeViolations(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious',
    ),
  ).toEqual([]);
}

for (const viewport of viewports) {
  test(`fluxos principais atendem axe e refluem em ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByLabel('RSC pretendido').selectOption('rsc-ii');
    await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
    await expect(page).toHaveURL(/\/project\/[^/]+$/);
    const projectUrl = page.url();

    for (const [path, heading] of [
      ['', 'Visão geral'],
      ['profile', 'Dados do docente'],
      ['requirements', 'Requisitos'],
      ['memorial', 'Memorial'],
      ['review', 'Revisão'],
      ['preview', 'Prévia do memorial'],
      ['documents', 'Gerar documentos'],
    ]) {
      await page.goto(`${projectUrl}${path ? `/${path}` : ''}`);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expectNoSeriousAxeViolations(page);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
  });
}

test('skip link e mudança de rota mantêm uma ordem de foco previsível', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Ir para o conteúdo' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();

  await page.getByLabel('RSC pretendido').selectOption('rsc-i');
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
  const profile = page.getByRole('link', { name: 'Dados do docente', exact: true });
  await profile.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Dados do docente' })).toBeFocused();

  await page.getByRole('link', { name: 'Meus projetos', exact: true }).click();
  const deleteProject = page.getByRole('button', { name: 'Excluir', exact: true }).first();
  await deleteProject.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alertdialog', { name: 'Excluir projeto local?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).press('Enter');
  await expect(deleteProject).toBeFocused();
});

test('preferências visuais são aplicadas e preservadas após recarregar', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Aparência').click();
  await page.getByLabel('Claro').check();
  await page.getByLabel('Tamanho do texto').selectOption('large');
  await page.getByLabel(/Contraste reforçado/).check();
  await page.getByLabel(/Reduzir movimentos/).check();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'large');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.getByRole('heading', { name: 'Meus projetos' }).click();
  await expect(page.getByLabel('Claro')).toBeHidden();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expectNoSeriousAxeViolations(page);
});
