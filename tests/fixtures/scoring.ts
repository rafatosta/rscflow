import { loadIfbaRegulation } from '@/data/regulations/load';
import type { Regulation } from '@/domain/regulation';
import type { CurrentProjectExport } from '@/domain/project';

/** Dataset sintético completo apenas para exercitar o algoritmo. Não é o catálogo IFBA. */
export function scoringFixture(): { dataset: Regulation; project: CurrentProjectExport } {
  const source = loadIfbaRegulation();
  const provenance = {
    status: 'validated' as const,
    sourceReference: 'Fixture sintética',
    validatedBy: 'teste',
  };
  const dataset: Regulation = {
    metadata: {
      ...source.metadata,
      regulation: { id: 'synthetic', authority: 'Teste', number: '0', year: 2026 },
      version: 'test-1',
      status: 'validated',
      source: { resolution: 'fixture', officialScoringSpreadsheet: 'fixture' },
    },
    levels: source.levels.map((level) => ({
      ...level,
      regulationId: 'synthetic',
      status: 'validated',
      directives: [
        {
          id: `${level.section}-a`,
          code: 'a',
          title: 'Diretriz sintética',
          maxScore: 100,
          weight: 2,
          provenance,
        },
      ],
      criteria: [
        {
          id: `${level.section}-a-1`,
          directiveId: `${level.section}-a`,
          code: 'a.1',
          description: 'Critério sintético',
          unit: 'unidade',
          factor: 1,
          weight: 1,
          maxQuantity: 100,
          provenance,
        },
      ],
    })),
  };
  const project: CurrentProjectExport = {
    schemaVersion: '2.0',
    applicationVersion: 'teste',
    regulation: { id: 'synthetic', version: 'test-1' },
    userData: {
      id: 'p',
      title: 'Teste',
      teacher: { name: 'Teste' },
      request: { level: 'rsc-i' },
      education: [],
      evidence: [],
      memorial: null,
      activities: dataset.levels.map((level, index) => ({
        id: `activity-${index}`,
        title: 'Teste',
        criterionId: level.criteria[0].id,
        selectedLevel: level.section,
        quantity: [36, 14, 10][index],
        evidenceIds: [],
      })),
    },
  };
  return { dataset, project };
}
