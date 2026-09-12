import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './support/fixtures';

async function start(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('RSC pretendido').selectOption('rsc-ii');
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click();
  await expect(page).toHaveURL(/\/project\/[^/]+$/);
}

async function collectPreviewText(page: import('@playwright/test').Page) {
  const next = page.getByRole('button', { name: 'Próxima página' });
  let content = '';
  for (;;) {
    content += `\n${await page.getByRole('article').innerText()}`;
    if (await next.isDisabled()) return content;
    await next.click();
  }
}

test('todas as seções funcionam por URL, reload e navegação', async ({ page }) => {
  await start(page);
  const url = page.url();
  for (const [path, label] of [
    ['profile', 'Dados do docente'],
    ['education', 'Formação'],
    ['activities', 'Cadastro anterior'],
    ['criteria', 'Critérios'],
    ['scoring', 'Pontuação'],
    ['memorial', 'Memorial'],
    ['preview', 'Prévia'],
    ['review', 'Revisão'],
    ['export', 'Gerar documentos'],
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
  await page.getByRole('link', { name: 'Cadastro anterior', exact: true }).click();
  await page.getByLabel(/^Título da atividade/).fill('Atividade de ensino');
  await page.getByLabel(/^Categoria/).selectOption('Ensino');
  await page.getByLabel(/^Quantidade declarada/).fill('3');
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await page.getByRole('link', { name: 'Memorial', exact: true }).click();
  await page.getByLabel(/Apresentação introdutória/).fill('Minha trajetória docente.');
  await page.getByLabel('Texto da conclusão', { exact: true }).fill('Considerações finais.');
  await page.getByRole('link', { name: 'Ver prévia do memorial' }).click();
  const previewText = await collectPreviewText(page);
  expect(previewText).toContain('Especialização - Instituição de teste');
  expect(previewText).toContain('Atividade de ensino');
  expect(previewText).toContain('Minha trajetória docente.');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: 'Pontuação', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Resultado quantitativo' }).getByRole('status'),
  ).toContainText('Cálculo parcial');
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

test('trajetória organiza períodos, filtros e evidências sem anexar arquivos', async ({ page }) => {
  await start(page);
  await page.getByRole('link', { name: 'Cadastro anterior', exact: true }).click();
  const waitForSave = async () => {
    await expect(page.getByText('Salvando…', { exact: true })).toBeVisible();
    await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  };

  await expect(page.getByText('Nenhuma atividade registrada.')).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar evidência' }).click();
  await page.getByLabel(/^Tipo de evidência/).fill('Portaria');
  await page.getByLabel(/^Título da evidência/).fill('Portaria de coordenação');
  await page.getByLabel(/^Identificador/).fill('Portaria 42/2022');
  await page.getByLabel(/^Emissor/).fill('Instituto Federal');
  await page.getByLabel(/^Data da evidência/).fill('2022-02-01');
  await page.getByLabel(/^Referência do processo/).fill('Processo 123');
  await page.getByLabel(/^Notas/).fill('Documento publicado.');
  await page.getByRole('button', { name: 'Adicionar evidência' }).click();
  await waitForSave();

  await page.getByLabel(/^Título da atividade/).fill('Coordenação de projeto');
  await page.getByLabel(/^Categoria/).selectOption('Gestão');
  await page.getByLabel(/^Quantidade declarada/).fill('2');
  await page.getByLabel(/^Instituição/).fill('Instituto Federal');
  await page.getByLabel(/^Setor ou departamento/).fill('Departamento de Ensino');
  await page.getByLabel(/^Data inicial/).fill('2022-02-01');
  await page.getByLabel(/^Data final/).fill('2023-12-20');
  await page.getByLabel(/^Papel ou função/).fill('Coordenadora');
  await page.getByLabel(/^Descrição/).fill('Coordenação das atividades.');
  await page.getByLabel(/^Resultados/).fill('Projeto concluído.');
  await page.getByLabel(/^Competências/).fill('Planejamento\nLiderança');
  await page.getByRole('checkbox', { name: /Portaria de coordenação/ }).check();
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await waitForSave();

  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await page.getByLabel(/^Título da atividade/).fill('Docência de graduação');
  await page.getByLabel(/^Categoria/).selectOption('Ensino');
  await page.getByLabel(/^Quantidade declarada/).fill('1');
  await page.getByLabel(/^Data inicial/).fill('2025-01-10');
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await waitForSave();

  const activities = page.getByRole('list', { name: 'Atividades' });
  await expect(activities.getByRole('heading', { name: '2025' })).toBeVisible();
  await expect(activities.getByRole('heading', { name: '2023' })).toBeVisible();
  await expect(activities.getByRole('article').nth(0)).toContainText('Docência de graduação');
  await page.getByLabel('Buscar atividades').fill('coordenação');
  await expect(activities.getByRole('heading', { name: 'Coordenação de projeto' })).toBeVisible();
  await expect(activities.getByRole('heading', { name: 'Docência de graduação' })).toHaveCount(0);
  await page.getByLabel('Buscar atividades').clear();
  await page.getByLabel('Filtrar por categoria').selectOption('Ensino');
  await expect(activities.getByRole('heading', { name: 'Docência de graduação' })).toBeVisible();
  await expect(activities.getByRole('heading', { name: 'Coordenação de projeto' })).toHaveCount(0);
  await page.getByLabel('Filtrar por categoria').selectOption('');
  await page.reload();
  await expect(activities.getByRole('heading', { name: 'Coordenação de projeto' })).toBeVisible();
  await expect(activities).toContainText('Portaria de coordenação');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: '/tmp/rscflow-trajectory-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page
    .getByRole('dialog', { name: 'Navegação' })
    .getByRole('link', { name: 'Prévia' })
    .click();
  const previewText = await collectPreviewText(page);
  expect(previewText).toContain('Coordenação das atividades.');
  expect(previewText).toContain('Comprovação: Portaria de coordenação');
});

test('memorial gera, preserva e regenera narrativas localmente', async ({ page }) => {
  await start(page);
  const waitForSave = async () => {
    await expect(page.getByText('Salvando…', { exact: true })).toBeVisible();
    await expect(page.getByText('Salvo localmente', { exact: true })).toBeVisible();
  };
  await page.getByRole('link', { name: 'Cadastro anterior', exact: true }).click();
  await page.getByLabel(/^Título da atividade/).fill('Docência no curso técnico');
  await page.getByLabel(/^Categoria/).selectOption('Ensino');
  await page.getByLabel(/^Quantidade declarada/).fill('1');
  await page.getByLabel(/^Data inicial/).fill('2022-01-10');
  await page.getByLabel(/^Resultados/).fill('Primeiro resultado');
  await page.getByRole('button', { name: 'Adicionar atividade' }).click();
  await waitForSave();

  await page.getByRole('link', { name: 'Memorial', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Atuação docente' })).toBeVisible();
  await page.getByRole('button', { name: 'Gerar textos-base ausentes' }).click();
  await waitForSave();
  const narrative = page.getByLabel('Texto da atividade');
  await narrative.fill('Narrativa autoral preservada.');
  await waitForSave();

  await page.getByRole('link', { name: 'Cadastro anterior', exact: true }).click();
  await page.getByRole('button', { name: 'Editar atividade Docência no curso técnico' }).click();
  await page.getByLabel(/^Resultados/).fill('Resultado estruturado alterado');
  await page.getByRole('button', { name: 'Salvar atividade' }).click();
  await waitForSave();
  await page.getByRole('link', { name: 'Memorial', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('dados estruturados mudaram');
  await expect(narrative).toHaveValue('Narrativa autoral preservada.');
  await page.getByRole('button', { name: 'Manter texto atual' }).click();
  await waitForSave();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Texto da atividade')).toHaveValue('Narrativa autoral preservada.');

  await page.getByRole('link', { name: 'Cadastro anterior', exact: true }).click();
  await page.getByRole('button', { name: 'Editar atividade Docência no curso técnico' }).click();
  await page.getByLabel(/^Resultados/).fill('Resultado final para regeneração');
  await page.getByRole('button', { name: 'Salvar atividade' }).click();
  await waitForSave();
  await page.getByRole('link', { name: 'Memorial', exact: true }).click();
  await page.getByRole('button', { name: 'Regenerar texto' }).click();
  await waitForSave();
  await expect(page.getByLabel('Texto da atividade')).toHaveValue(
    /Resultado final para regeneração/,
  );
  await page.getByRole('link', { name: 'Ver prévia do memorial' }).click();
  const previewText = await collectPreviewText(page);
  expect(previewText).toContain('Sumário');
  expect(previewText).toContain('Atuação docente');
  expect(previewText).toContain('Resultado final para regeneração');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: '/tmp/rscflow-memorial-preview-mobile.png', fullPage: true });
});

test('critérios mostram o catálogo pendente sem presumir opções normativas', async ({ page }) => {
  await start(page);
  await page.getByRole('link', { name: 'Critérios', exact: true }).click();

  await expect(page.getByRole('tab', { name: 'RSC II', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText('Pendente de validação oficial')).toBeVisible();
  await expect(page.getByText(/ainda não contém critérios transcritos/)).toBeVisible();
  await expect(page.getByLabel('Buscar no RSC II')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: '/tmp/rscflow-criteria-pending.png', fullPage: true });

  await page.getByRole('link', { name: 'Cadastro anterior', exact: true }).click();
  await expect(page.getByRole('combobox', { name: /Critério RSC/ })).toBeDisabled();
  await expect(page.getByText(/A seleção exige um catálogo vinculado e validado/)).toBeVisible();
});

test('dashboard resume a pontuação e mantém o estado parcial acessível e responsivo', async ({
  page,
}) => {
  await start(page);
  const summary = page.getByRole('region', { name: 'Resumo da pontuação' });
  await expect(summary.getByRole('heading', { name: 'Resumo da pontuação' })).toBeVisible();
  await expect(summary.getByRole('status')).toContainText('Cálculo parcial');
  await expect(summary.getByRole('heading', { name: 'Pendências' })).toBeVisible();

  await page.getByRole('link', { name: 'Pontuação', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resultado quantitativo' })).toBeVisible();
  await expect(page.getByText('Mínimo total: 60')).toBeVisible();
  await expect(page.getByText('Mínimo no nível pretendido: 36')).toBeVisible();
  for (const level of ['RSC I', 'RSC II', 'RSC III'])
    await expect(
      page.getByRole('heading', { name: level, exact: true }).locator('..'),
    ).toContainText('— / 100');
  await expect(page.getByText(/Pontuações ausentes não são tratadas como zero/)).toBeVisible();
  await expect(page.getByText(/RSC aprovado/i)).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: '/tmp/rscflow-scoring-mobile.png', fullPage: true });
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
