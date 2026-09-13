import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import type { TypedProjectExport } from '@/domain/project';
import { buildNormativeProcessDocument } from '@/normative-documents/model';
import { generateNormativeFormsPdf } from '@/pdf/normative-forms';
import { calculateProjectScore } from '@/rules/scoring';
import { scoringFixture } from '../fixtures/scoring';

function fixture() {
  const { dataset } = scoringFixture();
  dataset.metadata.regulation = {
    id: 'ifba-189-2026',
    authority: 'CONSUP/IFBA',
    number: '189',
    year: 2026,
  };
  dataset.levels.forEach((level) => (level.regulationId = 'ifba-189-2026'));
  const criterion = dataset.levels[0].criteria[0];
  const project: TypedProjectExport = {
    schemaVersion: '2.0',
    applicationVersion: 'teste',
    regulation: { id: dataset.metadata.regulation.id, version: 'test-1' },
    userData: {
      id: 'p',
      title: 'Processo',
      teacher: { name: 'Ana Docente', cpf: '123', siape: '456', campus: 'Salvador' },
      request: { level: 'rsc-i', effectiveDate: '2026-09-01' },
      education: [],
      memorial: null,
      evidence: [
        { id: 'proof-a', title: 'Portaria' },
        { id: 'proof-b', title: 'Declaração' },
      ],
      activities: [
        {
          id: 'launch-a',
          title: 'Atividade',
          criterionId: criterion.id,
          selectedLevel: 'rsc-i',
          quantity: 2,
          evidenceIds: ['proof-a', 'proof-b'],
        },
      ],
    },
  };
  const calculation = calculateProjectScore(project, dataset);
  return { dataset, project, calculation, criterion };
}

describe('formulários e anexos normativos', () => {
  it('deriva estrutura, pontuação e referências do mapa existente', () => {
    const { dataset, project, calculation, criterion } = fixture();
    if (calculation.status === 'unavailable') throw new Error(JSON.stringify(calculation.issues));
    const model = buildNormativeProcessDocument(
      project,
      dataset,
      {
        ...calculation,
        validation: { status: 'provisional', message: 'Catálogo pendente de validação humana.' },
      },
      {
        totalPages: 4,
        evidences: [
          {
            evidenceId: 'proof-a',
            startPage: 1,
            endPage: 1,
            files: [],
            links: [{ level: 'rsc-i', criterionId: criterion.id, occurrenceId: 'launch-a' }],
          },
          {
            evidenceId: 'proof-b',
            startPage: 2,
            endPage: 4,
            files: [],
            links: [{ level: 'rsc-i', criterionId: criterion.id, occurrenceId: 'launch-a' }],
          },
        ],
      },
    );
    const row = model.levels[0].directives[0].criteria[0];
    expect(model.levels).toHaveLength(3);
    expect(model.request.requestedLevel).toBe('rsc-i');
    expect(row.provenQuantity).toBe(2);
    expect(row.finalScore).toBe(calculation.requirementProjection[0].consideredScore);
    expect(model.levels[0].obtainedScore).toBe(calculation.levels[0].score);
    expect(model.totalScore).toBe(calculation.total);
    expect(row.proofReferences).toEqual([
      { evidenceId: 'proof-a', startPage: 1, endPage: 1 },
      { evidenceId: 'proof-b', startPage: 2, endPage: 4 },
    ]);
    expect(model.validation.status).toBe('provisional');
  });

  it('preserva ausências e indisponibilidade sem inventar valores', () => {
    const { dataset, project } = fixture();
    project.userData.teacher = { name: '' };
    const model = buildNormativeProcessDocument(project, dataset, {
      status: 'unavailable',
      issues: [{ code: 'missing-request', message: 'Pontuação indisponível.' }],
    });
    expect(model.request.fields.find((item) => item.label === 'CPF')?.value).toBeUndefined();
    expect(model.levels[0].directives[0].obtainedScore).toBeUndefined();
    expect(model.levels[0].directives[0].criteria[0].proofReferences).toEqual([]);
    expect(model.validation.status).toBe('unavailable');
    expect(model.issues).toContain('Nome do(a) docente: não informado.');
  });

  it('gera um PDF válido com os anexos oficiais', async () => {
    const { dataset, project, calculation } = fixture();
    const bytes = await generateNormativeFormsPdf(
      buildNormativeProcessDocument(project, dataset, calculation),
    );
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(6);
    expect(pdf.getTitle()).toBe('Formulários e anexos do processo de RSC');
  });
});
