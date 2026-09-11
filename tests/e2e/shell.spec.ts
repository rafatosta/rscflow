import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function start(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('RSC pretendido').selectOption('rsc-ii');
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await expect(page).toHaveURL(/\/project\/[^/]+$/);
}

test('todas as seções funcionam por URL, reload e navegação', async ({ page }) => {
  await start(page);
  const url = page.url();
  for (const [path, label] of [
    ['profile', 'Dados do docente'],
    ['education', 'Formação'],
    ['activities', 'Trajetória'],
    ['criteria', 'Critérios'],
    ['scoring', 'Pontuação'],
    ['memorial', 'Memorial'],
    ['preview', 'Prévia'],
    ['review', 'Revisão'],
    ['export', 'Exportar'],
  ]) {
    await page.goto(`${url}/${path}`);
    await expect(page.getByRole('heading', { name: label, exact: true, level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(`${label} — RSCFlow`);
    await expect(page.getByRole('link', { name: label, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.getByText('Carregando projeto…')).toHaveCount(0);
  }
  await page.goto(`${url}/education`);
  await page.getByLabel('Curso ou titulação').fill('Especialização');
  await page.getByLabel('Instituição', { exact: true }).fill('Instituição de teste');
  await page.getByRole('button', { name: 'Adicionar formação' }).click();
  await page.getByRole('link', { name: 'Trajetória', exact: true }).click();
  await page.getByLabel('Descrição da atividade').fill('Atividade de ensino');
  await page.getByLabel('Quantidade declarada').fill('3');
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await page.getByRole('link', { name: 'Memorial', exact: true }).click();
  await page.getByLabel('Introdução', { exact: true }).fill('Minha trajetória docente.');
  await page.getByLabel('Conclusão', { exact: true }).fill('Considerações finais.');
  await page.getByRole('link', { name: 'Ver prévia do memorial' }).click();
  await expect(page.getByRole('article')).toContainText('Especialização — Instituição de teste');
  await expect(page.getByRole('article')).toContainText('Atividade de ensino');
  await expect(page.getByRole('article')).toContainText('Minha trajetória docente.');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: 'Pontuação', exact: true }).click();
  await expect(page.getByText('Cálculo indisponível', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(`${url}/preview`);
  await page.screenshot({ path: '/tmp/rscflow-shell-desktop.png', fullPage: true });
});

test('menu móvel tem foco contido, fecha por Escape e não causa overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  const open = page.getByRole('button', { name: 'Abrir menu' });
  await open.click();
  const menu = page.getByRole('dialog', { name: 'Navegação' });
  await expect(menu).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    expect(await menu.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(open).toBeFocused();
  await open.click();
  await menu.getByRole('link', { name: 'Dados do docente', exact: true }).click();
  await expect(menu).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Dados do docente', exact: true, level: 1 }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByRole('button', { name: 'Exportar JSON' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: '/tmp/rscflow-shell-mobile.png', fullPage: true });
});

test('endereços inexistentes e projetos ausentes oferecem recuperação', async ({ page }) => {
  await page.goto('/nao-existe');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar aos projetos' }).click();
  await expect(page.getByText('Nenhum projeto local', { exact: true })).toBeVisible();
  await page.goto('/project/ausente/profile');
  await expect(
    page.getByRole('heading', { name: 'Projeto não encontrado neste navegador' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Voltar aos projetos' }).click();
  await expect(page).toHaveURL('/');
});
