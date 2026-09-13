import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import type { OccurrenceProjectExport } from '@/domain/criterion-entry';
import { createEvidenceBundle, createEvidenceBundlePlan } from '@/pdf/evidence-bundle';

async function pdf(pages: number) {
  const document = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) document.addPage([100 + index, 200]);
  const bytes = await document.save();
  return { arrayBuffer: async () => bytes.buffer } as File;
}

function fixture(): OccurrenceProjectExport {
  const occurrence = (id: string, order: number, evidenceIds: string[]) => ({
    id,
    title: id,
    quantity: 1,
    evidenceIds,
    order,
    period: {},
  });
  return {
    schemaVersion: '3.0',
    applicationVersion: 'test',
    regulation: { id: 'test', version: '1' },
    userData: {
      id: 'project',
      title: 'Projeto',
      teacher: { name: 'Docente' },
      request: { level: 'rsc-iii' },
      education: [],
      criterionEntries: [
        {
          id: 'entry-10',
          criterionId: 'rsc-i-a-10',
          selectedLevel: 'rsc-i',
          occurrences: [occurrence('launch-2', 2, ['shared'])],
        },
        {
          id: 'entry-2',
          criterionId: 'rsc-i-a-2',
          selectedLevel: 'rsc-i',
          occurrences: [
            occurrence('launch-b', 2, ['second']),
            occurrence('launch-a', 1, ['first', 'shared']),
          ],
        },
      ],
      unassignedOccurrences: [],
      evidence: [
        { id: 'shared', title: 'Compartilhado', fileIds: ['shared-file'] },
        { id: 'second', title: 'Segundo', fileIds: ['second-a', 'second-b'] },
        { id: 'first', title: 'Primeiro', fileIds: ['first-file'] },
      ],
      storedFiles: [
        { id: 'second-b', name: 'b.pdf', mediaType: 'application/pdf', size: 1 },
        { id: 'shared-file', name: 'shared.pdf', mediaType: 'application/pdf', size: 1 },
        { id: 'first-file', name: 'first.pdf', mediaType: 'application/pdf', size: 1 },
        { id: 'second-a', name: 'a.pdf', mediaType: 'application/pdf', size: 1 },
      ],
      memorial: null,
    },
  };
}

describe('consolidação dos comprovantes', () => {
  it('ordena por RSC, requisito e lançamento, preserva arquivos e mapeia páginas', async () => {
    const project = fixture();
    const pages = new Map([
      ['first-file', await pdf(2)],
      ['shared-file', await pdf(1)],
      ['second-a', await pdf(1)],
      ['second-b', await pdf(3)],
    ]);
    const result = await createEvidenceBundle(project, {
      getFile: async (id) => pages.get(id)!,
    });

    expect(result.status).toBe('success');
    if (result.status !== 'success') return;
    expect((await PDFDocument.load(result.bytes)).getPageCount()).toBe(7);
    expect(result.pageMap).toEqual({
      totalPages: 7,
      evidences: [
        {
          evidenceId: 'first',
          startPage: 1,
          endPage: 2,
          files: [{ fileId: 'first-file', startPage: 1, endPage: 2 }],
          links: [{ level: 'rsc-i', criterionId: 'rsc-i-a-2', occurrenceId: 'launch-a' }],
        },
        {
          evidenceId: 'shared',
          startPage: 3,
          endPage: 3,
          files: [{ fileId: 'shared-file', startPage: 3, endPage: 3 }],
          links: [
            { level: 'rsc-i', criterionId: 'rsc-i-a-2', occurrenceId: 'launch-a' },
            { level: 'rsc-i', criterionId: 'rsc-i-a-10', occurrenceId: 'launch-2' },
          ],
        },
        {
          evidenceId: 'second',
          startPage: 4,
          endPage: 7,
          files: [
            { fileId: 'second-a', startPage: 4, endPage: 4 },
            { fileId: 'second-b', startPage: 5, endPage: 7 },
          ],
          links: [{ level: 'rsc-i', criterionId: 'rsc-i-a-2', occurrenceId: 'launch-b' }],
        },
      ],
    });
  });

  it('expõe o plano usado pelo PDF e pelo mapa sem depender dos bytes', () => {
    expect(
      createEvidenceBundlePlan(fixture()).map(({ evidenceId, files, links }) => ({
        evidenceId,
        fileIds: files.map((file) => file.id),
        links,
      })),
    ).toEqual([
      {
        evidenceId: 'first',
        fileIds: ['first-file'],
        links: [{ level: 'rsc-i', criterionId: 'rsc-i-a-2', occurrenceId: 'launch-a' }],
      },
      {
        evidenceId: 'shared',
        fileIds: ['shared-file'],
        links: [
          { level: 'rsc-i', criterionId: 'rsc-i-a-2', occurrenceId: 'launch-a' },
          { level: 'rsc-i', criterionId: 'rsc-i-a-10', occurrenceId: 'launch-2' },
        ],
      },
      {
        evidenceId: 'second',
        fileIds: ['second-a', 'second-b'],
        links: [{ level: 'rsc-i', criterionId: 'rsc-i-a-2', occurrenceId: 'launch-b' }],
      },
    ]);
  });

  it('retorna todos os arquivos ausentes, inválidos ou não PDF sem saída parcial', async () => {
    const project = fixture();
    project.userData.evidence = [
      { id: 'first', title: 'Primeiro', fileIds: ['missing', 'bad', 'image'] },
    ];
    project.userData.criterionEntries = [
      {
        id: 'entry',
        criterionId: 'rsc-iii-a-1',
        selectedLevel: 'rsc-iii',
        occurrences: [
          { id: 'launch', title: 'L', quantity: 1, evidenceIds: ['first'], order: 0, period: {} },
        ],
      },
    ];
    project.userData.storedFiles = [
      { id: 'missing', name: 'missing.pdf', mediaType: 'application/pdf', size: 1 },
      { id: 'bad', name: 'bad.pdf', mediaType: 'application/pdf', size: 3 },
      { id: 'image', name: 'image.png', mediaType: 'image/png', size: 1 },
    ];
    const result = await createEvidenceBundle(project, {
      getFile: async (id) => {
        if (id === 'missing') throw new Error('Arquivo ausente neste navegador.');
        return new File(['bad'], 'bad.pdf', { type: 'application/pdf' });
      },
    });

    expect(result).toMatchObject({
      status: 'error',
      issues: [
        { code: 'missing-file', evidenceId: 'first', fileId: 'missing' },
        { code: 'invalid-file', evidenceId: 'first', fileId: 'bad' },
        { code: 'unsupported-file', evidenceId: 'first', fileId: 'image' },
      ],
    });
    expect(result).not.toHaveProperty('bytes');
  });

  it('recusa comprovante associado sem arquivo', async () => {
    const project = fixture();
    project.userData.criterionEntries = [project.userData.criterionEntries[1]];
    project.userData.criterionEntries[0].occurrences = [
      project.userData.criterionEntries[0].occurrences[1],
    ];
    project.userData.criterionEntries[0].occurrences[0].evidenceIds = ['first'];
    project.userData.evidence = [{ id: 'first', title: 'Primeiro', fileIds: [] }];
    project.userData.storedFiles = [];
    const result = await createEvidenceBundle(project, {
      getFile: async () => {
        throw new Error('não deve resolver arquivos');
      },
    });

    expect(result).toMatchObject({
      status: 'error',
      issues: [{ code: 'missing-file', evidenceId: 'first' }],
    });
  });
});
