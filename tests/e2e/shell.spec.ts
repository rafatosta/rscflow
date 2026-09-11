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
  await page.getByLabel(/^Tipo/).fill('Pós-graduação');
  await page.getByLabel(/^Situação/).fill('Concluído');
  await page.getByLabel(/^Curso ou título/).fill('Especialização');
  await page.getByLabel(/^Instituição/).fill('Instituição de teste');
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

test('dados do docente validam, salvam e alimentam visão geral e memorial', async ({ page }) => {
  await start(page);
  await page.getByRole('link', { name: 'Dados do docente', exact: true }).click();

  const name = page.getByLabel(/^Nome completo/);
  await name.fill('A');
  await name.clear();
  await expect(page.getByText('Nome completo é obrigatório.')).toBeVisible();
  await page.getByLabel(/^CPF/).fill('111.111.111-11');
  await expect(page.getByText('Informe um CPF válido com 11 dígitos.')).toBeVisible();

  await page.getByLabel(/^Título do projeto/).fill('Memorial de Maria');
  await name.fill('Maria da Silva');
  await page.getByLabel(/^CPF/).fill('529.982.247-25');
  await page.getByLabel(/^SIAPE/).fill('1234567');
  await page.getByLabel(/^Cargo/).fill('Professora EBTT');
  await page.getByLabel(/^Campus de lotação/).fill('Salvador');
  await page.getByLabel(/^E-mail/).fill('maria@example.edu.br');
  await page.getByLabel(/^Telefone/).fill('(71) 99999-8888');
  await page.getByLabel(/^RT\/RSC atual/).fill('RSC I');
  await page.getByLabel(/^Escolaridade/).fill('Mestrado');
  await page.getByLabel(/^Data de ingresso/).fill('2020-02-03');
  await page.getByLabel(/^Data de vigência/).fill('2026-04-07');
  await expect(page.getByText('Salvando…', { exact: true })).toBeVisible();
  await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByLabel(/^Data de vigência/).blur();
  await page
    .getByRole('heading', { name: 'Dados do docente', exact: true, level: 1 })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/rscflow-teacher-profile.png' });

  await page.reload();
  await expect(page.getByLabel(/^Nome completo/)).toHaveValue('Maria da Silva');
  await expect(page.getByLabel(/^CPF/)).toHaveValue('52998224725');
  await expect(page.getByLabel(/^Telefone/)).toHaveValue('71999998888');
  await page.getByRole('link', { name: 'Visão geral', exact: true }).click();
  await expect(
    page.getByRole('progressbar', { name: 'Progresso de preenchimento' }),
  ).toHaveAttribute('value', '20');
  await expect(page.getByText(/Identificação do docente/)).toContainText('✓');
  await page.getByRole('link', { name: 'Prévia', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Maria da Silva');
  await expect(page.getByRole('article')).toContainText('CPF: 52998224725');
  await expect(page.getByRole('article')).toContainText('SIAPE: 1234567');
  await expect(page.getByRole('article')).toContainText('RSC pretendido: RSC II');
});

test('formações oferecem CRUD cronológico, responsivo e acessível', async ({ page }) => {
  await start(page);
  await page.getByRole('link', { name: 'Formação', exact: true }).click();
  const waitForSave = async () => {
    await expect(page.getByText('Salvando…', { exact: true })).toBeVisible();
    await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  };

  await page.getByRole('button', { name: 'Adicionar formação' }).click();
  const type = page.getByLabel(/^Tipo/);
  await expect(page.getByText('Tipo é obrigatório.')).toBeVisible();
  await expect(type).toHaveAttribute('aria-describedby', 'education-type-error');

  const fill = async (title: string, completion: string) => {
    await page.getByLabel(/^Tipo/).fill('Curso');
    await page.getByLabel(/^Situação/).fill('Concluído');
    await page.getByLabel(/^Curso ou título/).fill(title);
    await page.getByLabel(/^Instituição/).fill('Instituto Federal');
    await page.getByLabel(/^Área/).fill('Educação');
    await page.getByLabel(/^Data inicial/).fill('2019-01-10');
    await page.getByLabel(/^Data de conclusão/).fill(completion);
    await page.getByLabel(/^Referência do documento/).fill(`Diploma de ${title}`);
    await page.getByLabel(/^Observações/).fill('Registro conferido pelo docente.');
    await page.getByRole('button', { name: 'Adicionar formação' }).click();
    await waitForSave();
  };

  await fill('Formação antiga', '2020-01-10');
  await page.getByRole('button', { name: 'Adicionar formação' }).click();
  await fill('Formação recente', '2024-05-20');
  const cards = page.locator('ol article');
  await expect(cards.nth(0)).toContainText('Formação recente');
  await expect(cards.nth(1)).toContainText('Formação antiga');

  await page.getByRole('button', { name: 'Editar formação Formação antiga' }).click();
  await page.getByLabel(/^Curso ou título/).fill('Formação antiga revisada');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await waitForSave();
  await page.getByRole('button', { name: 'Duplicar formação Formação recente' }).click();
  await waitForSave();
  await expect(page.getByRole('heading', { name: 'Formação recente' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Excluir formação Formação antiga revisada' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Excluir formação?' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await waitForSave();
  await expect(page.getByRole('heading', { name: 'Formação antiga revisada' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Formação recente' })).toHaveCount(2);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: '/tmp/rscflow-education-mobile.png', fullPage: true });
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
