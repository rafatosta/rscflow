import { describe, expect, it } from 'vitest';
import { reviewProject } from '@/features/final-review/review';
import { createDraft, datasets } from '@/features/project-shell/project-view';

const unavailable = {
  status: 'unavailable' as const,
  issues: [{ code: 'pending-dataset' as const, message: 'Dataset pendente.' }],
};

function completeBase() {
  const project = createDraft('rsc-ii', datasets[0].metadata.regulation.id);
  project.userData.teacher = {
    name: 'Ana Vitória',
    cpf: '52998224725',
    siape: '1234567',
    campus: 'Salvador',
  };
  project.userData.memorial = {
    title: 'Memorial de Ana Vitória',
    introduction: '',
    conclusion: 'Síntese final.',
  };
  return project;
}

describe('revisão final', () => {
  it('classifica as nove áreas e bloqueia o PDF quando faltam elementos estruturais', () => {
    const project = createDraft('rsc-i', datasets[0].metadata.regulation.id);
    project.userData.request = null;
    const review = reviewProject(project, unavailable);

    expect(new Set(review.findings.map((item) => item.area))).toEqual(
      new Set([
        'identification',
        'request',
        'education',
        'trajectory',
        'criteria',
        'documentation',
        'scoring',
        'memorial',
        'conclusion',
      ]),
    );
    expect(review.blocksPdf).toBe(true);
    expect(review.counts.error).toBe(4);
    expect(
      review.findings.filter((item) => item.severity === 'error').map((item) => item.area),
    ).toEqual(['identification', 'request', 'memorial', 'conclusion']);
  });

  it('mantém avisos não bloqueantes e identifica registros sem comprovante', () => {
    const project = completeBase();
    project.userData.activities.push({
      id: 'atividade-sem-documento',
      title: 'Coordenação de laboratório',
      criterionId: '',
      quantity: 1,
      evidenceIds: [],
    });
    const review = reviewProject(project, unavailable);

    expect(review.blocksPdf).toBe(false);
    expect(review.counts.error).toBe(0);
    expect(review.counts.warning).toBeGreaterThan(0);
    expect(review.findings).toContainEqual(
      expect.objectContaining({
        area: 'documentation',
        severity: 'warning',
        message: expect.stringContaining('Isso pode afetar a avaliação do processo.'),
      }),
    );
    expect(review.findings).toContainEqual(
      expect.objectContaining({ area: 'criteria', severity: 'warning' }),
    );
  });
});
