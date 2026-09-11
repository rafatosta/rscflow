import { expect, test as base } from '@playwright/test';

export { expect };
export type { Browser, BrowserContext, Download, Page } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, run) => {
    const unexpected: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        unexpected.push(`console.${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => unexpected.push(`pageerror: ${error.message}`));

    await run(page);

    expect(unexpected, 'O navegador emitiu erros ou avisos inesperados.').toEqual([]);
  },
});
