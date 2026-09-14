import { join } from 'node:path';
import { decodePDFRawStream, PDFDocument, PDFRawStream, type PDFObject } from 'pdf-lib';
import { expect, test, type Download, type Page } from './support/fixtures';

const demoDirectory = join(process.cwd(), 'examples/rsc-iii-demonstrativo');
const demoProjectPath = join(demoDirectory, 'processo-rsc-iii-demonstrativo.json');
const proofDirectory = join(demoDirectory, 'comprovantes');
const launches = [
  ['Direção fictícia da Escola Técnica Horizonte', '01-rsc-i-a1-gestao-escolar.pdf'],
  ['Curso FIC fictício de Introdução à Automação', '02-rsc-i-c1-curso-fic.pdf'],
  ['Orientação fictícia de TCC técnico', '03-rsc-ii-a1-orientacao-tcc.pdf'],
  ['Coordenação fictícia de projeto de extensão', '04-rsc-ii-d1-projeto-extensao.pdf'],
  ['Protótipo fictício de bancada didática', '05-rsc-iii-a1-prototipo.pdf'],
  ['Elaboração fictícia de PPC', '06-rsc-iii-b1-ppc.pdf'],
  ['Captação fictícia de recursos internos', '07-rsc-iii-c1-captacao-propria.pdf'],
  ['Captação fictícia em parceria institucional', '08-rsc-iii-d1-captacao-parceria.pdf'],
] as const;

async function downloadBytes(download: Download) {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function storedZipEntries(bytes: Buffer) {
  const entries = new Map<string, Buffer>();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const dataOffset = offset + 30 + nameLength + extraLength;
    const name = bytes.subarray(offset + 30, offset + 30 + nameLength).toString('utf8');
    entries.set(name, bytes.subarray(dataOffset, dataOffset + size));
    offset = dataOffset + size;
    if (offset + 4 > bytes.length) break;
  }
  return entries;
}

function decodedPdfContent(document: PDFDocument) {
  const operators = document.context
    .enumerateIndirectObjects()
    .flatMap(([, object]: [unknown, PDFObject]) =>
      object instanceof PDFRawStream
        ? [Buffer.from(decodePDFRawStream(object).decode()).toString('latin1')]
        : [],
    )
    .join('\n');
  return [...operators.matchAll(/<([0-9A-Fa-f]*)> Tj/g)]
    .map((match) => Buffer.from(match[1], 'hex').toString('latin1'))
    .join(' ');
}

async function importDemo(page: Page) {
  await page.goto('/');
  await page.getByLabel('Arquivo de projeto JSON').setInputFiles(demoProjectPath);
  await expect(page.getByText('Estrutura válida', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Importar como novo projeto' }).click();
  await expect(page).toHaveURL(/\/project\/[^/]+$/);
  return page.url();
}

async function attachDemoProofs(page: Page) {
  await page.getByRole('link', { name: 'Revisão', exact: true }).click();
  await expect(page.getByText('0 de 8 arquivos disponíveis')).toBeVisible();
  for (let index = 0; index < launches.length; index += 1) {
    const [title, filename] = launches[index];
    await page
      .getByLabel(`Selecionar arquivo para ${title}`)
      .setInputFiles(join(proofDirectory, filename));
    await expect(page.getByText(`${index + 1} de 8 arquivos disponíveis`)).toBeVisible();
  }
}

async function downloadFrom(page: Page, button: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('main').getByRole('button', { name: button, exact: true }).click();
  return pending;
}

test('percorre o processo demonstrativo e mantém os dados consistentes em todos os artefatos', async ({
  page,
}) => {
  const originalUrl = await importDemo(page);

  await page.getByRole('link', { name: 'Dados do docente', exact: true }).click();
  await expect(page.getByLabel(/^Nome completo/)).toHaveValue('Marina Duarte');
  await expect(page.getByLabel(/^Campus de lotação/)).toHaveValue('Campus Salvador');
  await expect(page.getByText('Bacharelado em Engenharia de Controle e Automação')).toBeVisible();
  await expect(page.getByText('Mestrado em Educação Profissional e Tecnológica')).toBeVisible();
  await expect(page.getByText('Doutorado em Sistemas de Automação')).toBeVisible();

  await page.getByRole('link', { name: 'Requisitos', exact: true }).click();
  for (const level of ['RSC I', 'RSC II', 'RSC III'])
    await expect(page.getByRole('tab', { name: level, exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'RSC I', exact: true }).click();
  await expect(page.getByText(/· 12 mês$/)).toBeVisible();
  await page.getByRole('tab', { name: 'RSC II', exact: true }).click();
  await expect(page.getByText(/· 2 Orientação concluída$/)).toBeVisible();
  await page.getByRole('tab', { name: 'RSC III', exact: true }).click();
  await expect(page.getByText(/A pontuação dos requisitos é provisória/)).toBeVisible();

  await attachDemoProofs(page);
  await expect(page.getByText('8 de 8 arquivos disponíveis')).toBeVisible();
  await expect(
    page.getByText('Pontuação provisória, ainda não validada por conferência humana.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Prontidão dos artefatos')).toContainText('Disponível com avisos');

  await page.getByRole('link', { name: 'Memorial', exact: true }).click();
  await expect(page.getByLabel('Título do memorial')).toHaveValue(
    'Memorial descritivo - demonstração fictícia de RSC III',
  );
  await expect(page.getByLabel('Texto da conclusão', { exact: true })).toContainText('fictícios');

  await page.getByRole('link', { name: 'Prévia de documentos', exact: true }).click();
  await expect(page.getByText('Prévia de Documentos')).toBeVisible();
  const totalPreviewPages = Number(await page.getByLabel('Página atual').getAttribute('max'));
  let previewText = '';
  for (let current = 1; current <= totalPreviewPages; current += 1) {
    previewText += ` ${await page.getByRole('article', { name: `Página ${current}` }).textContent()}`;
    if (current < totalPreviewPages)
      await page.getByRole('button', { name: 'Próxima página' }).click();
  }
  expect(previewText).toContain('Gestão escolar fictícia - RSC I a.1 (pp. 1-2)');
  expect(previewText).toContain('Curso FIC fictício - RSC I c.1 (p. 3)');

  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Gerar documentos', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Gerar pacote final' })).toBeEnabled();

  const evidenceDownload = await downloadFrom(page, 'Gerar comprovantes');
  expect(evidenceDownload.suggestedFilename()).toBe('comprovantes-rsc-marina-duarte.pdf');
  const evidenceBytes = await downloadBytes(evidenceDownload);
  expect((await PDFDocument.load(evidenceBytes)).getPageCount()).toBe(9);

  const formsDownload = await downloadFrom(page, 'Gerar formulários');
  const formsBytes = await downloadBytes(formsDownload);
  const forms = await PDFDocument.load(formsBytes);
  expect(forms.getTitle()).toBe('Formulários e anexos do processo de RSC');
  const formsContent = decodedPdfContent(forms);
  expect(formsContent).toContain('pp. 1-2');
  expect(formsContent).toContain('p. 3');

  const memorialDownload = await downloadFrom(page, 'Gerar PDF');
  const memorial = await PDFDocument.load(await downloadBytes(memorialDownload));
  expect(memorial.getTitle()).toBe('Memorial descritivo - demonstração fictícia de RSC III');

  const packageDownload = await downloadFrom(page, 'Gerar pacote final');
  expect(packageDownload.suggestedFilename()).toBe('pacote-final-rsc-marina-duarte.zip');
  const packageEntries = storedZipEntries(await downloadBytes(packageDownload));
  expect([...packageEntries.keys()]).toEqual([
    'memorial-rsc-marina-duarte.pdf',
    'formularios-anexos-rsc-marina-duarte.pdf',
    'comprovantes-rsc-marina-duarte.pdf',
  ]);
  expect(
    (
      await PDFDocument.load(packageEntries.get('comprovantes-rsc-marina-duarte.pdf')!)
    ).getPageCount(),
  ).toBe(9);
  expect(
    (await PDFDocument.load(packageEntries.get('memorial-rsc-marina-duarte.pdf')!)).getTitle(),
  ).toBe('Memorial descritivo - demonstração fictícia de RSC III');
  expect(
    decodedPdfContent(
      await PDFDocument.load(packageEntries.get('formularios-anexos-rsc-marina-duarte.pdf')!),
    ),
  ).toContain('pp. 1-2');

  const backupDownload = await downloadFrom(page, 'Gerar backup .rscflow');
  const backupBytes = await downloadBytes(backupDownload);
  const backupEntries = storedZipEntries(backupBytes);
  const manifest = JSON.parse(backupEntries.get('manifest.json')!.toString('utf8'));
  const backedUpProject = JSON.parse(backupEntries.get('project.json')!.toString('utf8'));
  expect(manifest).toMatchObject({ format: 'rscflow-backup', files: expect.any(Array) });
  expect(manifest.files).toHaveLength(8);
  expect(backedUpProject.userData.teacher.name).toBe('Marina Duarte');
  expect(backedUpProject.userData.criterionEntries).toHaveLength(8);

  await page.getByLabel('Backup restaurável .rscflow').setInputFiles({
    name: backupDownload.suggestedFilename(),
    mimeType: 'application/zip',
    buffer: backupBytes,
  });
  await expect(page.getByText('Backup íntegro')).toBeVisible();
  await expect(page.getByText('Schema 3.0; 8 arquivo(s) binário(s).')).toBeVisible();
  await page.getByRole('button', { name: 'Restaurar como novo projeto' }).click();
  await expect(page).toHaveURL(/\/project\/[^/]+$/);
  expect(page.url()).not.toBe(originalUrl);
  await page.getByRole('link', { name: 'Revisão', exact: true }).click();
  await expect(page.getByText('8 de 8 arquivos disponíveis')).toBeVisible();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Gerar documentos', exact: true })
    .click();
  const restoredJson = await downloadFrom(page, 'Exportar JSON');
  expect(JSON.parse((await downloadBytes(restoredJson)).toString('utf8'))).toEqual(backedUpProject);
  await expect(page.getByRole('button', { name: 'Gerar comprovantes' })).toBeEnabled();
  const restoredEvidence = await downloadFrom(page, 'Gerar comprovantes');
  expect((await PDFDocument.load(await downloadBytes(restoredEvidence))).getPageCount()).toBe(9);
});

test('distingue comprovante ausente de arquivo inválido no projeto demonstrativo', async ({
  page,
}) => {
  await importDemo(page);
  await page.getByRole('link', { name: 'Revisão', exact: true }).click();
  await expect(page.getByText('0 de 8 arquivos disponíveis')).toBeVisible();
  await expect(page.getByLabel('Prontidão dos artefatos')).toContainText('Bloqueado');

  await page.getByLabel(`Selecionar arquivo para ${launches[0][0]}`).setInputFiles({
    name: 'conteudo-invalido.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('não é PDF'),
  });
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Gerar documentos', exact: true })
    .click();
  await expect(page.getByText(/No PDF header found/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gerar comprovantes' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Gerar pacote final' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Gerar PDF' })).toBeEnabled();
});

test('não disponibiliza pacote parcial quando os comprovantes mudam durante a geração conjunta', async ({
  page,
}) => {
  await importDemo(page);
  await attachDemoProofs(page);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Gerar documentos', exact: true })
    .click();
  const packageButton = page.getByRole('button', { name: 'Gerar pacote final' });
  await expect(packageButton).toBeEnabled();
  const localId = new URL(page.url()).pathname.split('/')[2];
  await page.evaluate(
    async ({ localId }) => {
      const request = indexedDB.open('rscflow');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const transaction = database.transaction('files', 'readwrite');
      const store = transaction.objectStore('files');
      const key = [localId, 'file-rsc-i-a-1'];
      const entry = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const get = store.get(key);
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => reject(get.error);
      });
      store.put({ ...entry, blob: new Blob(['arquivo alterado'], { type: 'application/pdf' }) });
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    },
    { localId },
  );

  const unexpectedDownload = page.waitForEvent('download', { timeout: 1_000 }).then(
    () => true,
    () => false,
  );
  await packageButton.click();
  await expect(page.getByRole('alert')).toContainText('Nenhum conjunto final foi disponibilizado');
  await expect(page.getByRole('list', { name: 'Resultado da geração conjunta' })).toContainText(
    'Comprovantes: falhou',
  );
  await expect(page.getByRole('list', { name: 'Resultado da geração conjunta' })).toContainText(
    'Memorial: não iniciado',
  );
  expect(await unexpectedDownload).toBe(false);
});
