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
      ['rsc-i', 'RSC I'],
      ['rsc-ii', 'RSC II'],
      ['rsc-iii', 'RSC III'],
      ['evidence', 'Comprovantes'],
      ['timeline', 'Trajetória'],
      ['education', 'Formação'],
      ['activities', 'Cadastro anterior'],
      ['criteria', 'Critérios'],
      ['scoring', 'Pontuação'],
      ['memorial', 'Memorial'],
      ['preview', 'Prévia'],
      ['review', 'Revisão'],
      ['export', 'Gerar documentos'],
    ]) {
      await page.goto(`${projectUrl}${path ? `/${path}` : ''}`);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      if (path === 'preview') await expect(page.getByRole('article')).toBeVisible();
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
