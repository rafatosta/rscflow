import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('renders the bootstrap screen without detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /ambiente pronto/i })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
