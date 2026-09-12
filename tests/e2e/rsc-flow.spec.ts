import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './support/fixtures';

for (const width of [360, 768, 1440]) {
  test(`preenchimento por RSC, comprovantes e backup em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByLabel('RSC pretendido').selectOption('rsc-i');
    await page.getByLabel('Regulamento / dataset').selectOption('criteria-fixture');
    await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
    await expect(page).toHaveURL(/\/project\/[^/]+$/);
    let baseUrl = page.url();
    // Exercita também a ponte do formato 3.0 no fluxo novo.
    await page.goto(`${baseUrl}/export`);
    await page
      .getByRole('button', { name: 'Migrar para critérios e ocorrências em nova cópia' })
      .click();
    await expect(page).toHaveURL(/\/project\/[^/]+$/);
    baseUrl = page.url();
    await page.goto(`${baseUrl}/profile`);
    await page.getByLabel(/^Nome completo/).fill('Docente do processo');
    await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
    await page.goto(`${baseUrl}/evidence`);
    await expect(page.getByLabel(/^Título da atividade/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Adicionar evidência' }).click();
    await page.getByLabel(/^Tipo/).fill('Certificado');
    await page.getByLabel(/^Título da evidência/).fill('Documento compartilhado');
    await page.getByRole('button', { name: 'Adicionar evidência', exact: true }).click();
    await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
    await page.goto(`${baseUrl}/rsc-i`);
    await page.getByRole('searchbox', { name: 'Buscar critérios neste nível' }).fill('orientacao');
    const criterion = page.getByRole('article', { name: 'Orientação de TCC', exact: true });
    await expect(criterion).toBeVisible();
    for (const [title, year] of [
      ['João Silva', '2024'],
      ['Maria Santos', '2025'],
    ]) {
      await criterion.getByRole('button', { name: 'Adicionar lançamento' }).click();
      await expect(page.getByLabel(/^Título do lançamento/)).toBeFocused();
      await page.getByLabel(/^Título do lançamento/).fill(title);
      await page.getByLabel(/^Quantidade declarada/).fill('1');
      await page.getByLabel(/^Data inicial/).fill(`${year}-01-01`);
      await page.getByLabel(/^Categoria editorial/).selectOption('Ensino');
      await page.getByRole('checkbox', { name: 'Documento compartilhado' }).check();
      await page.getByRole('button', { name: 'Salvar lançamento', exact: true }).click();
      await expect(criterion.getByText(new RegExp(title)).first()).toBeVisible();
      await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
    }
    await expect(page.getByText('4 / 20 pontos', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('4 / 20 pontos', { exact: true })).toBeVisible();
    await page.getByRole('searchbox').fill('zzzz-inexistente');
    await expect(page.getByText('Nenhum critério corresponde à busca neste nível.')).toBeVisible();
    await page.getByRole('searchbox').fill('');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.goto(`${baseUrl}/timeline`);
    await expect(page.getByRole('button', { name: /Adicionar|Editar lançamento/ })).toHaveCount(0);
    const titles = await page.getByRole('heading', { level: 3 }).allTextContents();
    expect(titles).toEqual(['Maria Santos', 'João Silva']);
    await page.goto(baseUrl);
    await expect(page.getByText(/Último backup JSON: Nenhuma/)).toBeVisible();
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar JSON', exact: true }).click();
    await downloaded;
    await expect(page.getByText('Sem alterações desde o último backup.')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Sem alterações desde o último backup.')).toBeVisible();
    await page.goto(`${baseUrl}/profile`);
    await page.getByLabel('Título do projeto').fill('Processo alterado');
    await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
    await page.goto(baseUrl);
    await expect(page.getByText('Há alterações desde o último backup.')).toBeVisible();
    for (const [label, description] of [
      ['RSC II', 'Coordenação de curso'],
      ['RSC III', 'Publicação de artigo'],
    ]) {
      if (width < 1024) await page.getByRole('button', { name: 'Abrir menu' }).click();
      await page.getByRole('link', { name: label, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible();
      await expect(page.getByRole('article', { name: description, exact: true })).toBeVisible();
    }
  });
}
