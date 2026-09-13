import { activityProjectView } from '@/domain/project-migration';
import { describe, expect, it } from 'vitest';
import { reviewProject } from '@/features/final-review/review';
import { createDraft, datasets } from '@/features/project-shell/project-view';
import { calculateProjectScore } from '@/rules/scoring';
import { scoringFixture } from '../fixtures/scoring';

const unavailable = {
  status: 'unavailable' as const,
  issues: [{ code: 'pending-dataset' as const, message: 'Dataset pendente.' }],
};

function completeBase() {
  const project = activityProjectView(createDraft('rsc-ii', datasets[0].metadata.regulation.id));
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
    const project = activityProjectView(createDraft('rsc-i', datasets[0].metadata.regulation.id));
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
    expect(review.artifacts.memorial.status).toBe('ready');
    expect(review.artifacts.forms.status).toBe('limited');
    expect(review.artifacts.json.status).toBe('ready');
  });

  it('mantém pontuação calculável como provisória e limita os artefatos relacionados', () => {
    const fixture = scoringFixture();
    const calculated = calculateProjectScore(fixture.project, fixture.dataset);
    expect(calculated.status).not.toBe('unavailable');
    if (calculated.status === 'unavailable') return;
    const provisional = {
      ...calculated,
      validation: {
        status: 'provisional' as const,
        message: 'Catálogo pendente de validação humana.',
      },
    };
    const review = reviewProject(completeBase(), provisional, {
      status: 'success',
      bytes: new Uint8Array([1]),
      pageMap: { totalPages: 1, evidences: [] },
    });

    expect(review.findings).toContainEqual(
      expect.objectContaining({ label: 'Pontuação provisória', severity: 'warning' }),
    );
    expect(review.artifacts.memorial.status).toBe('ready');
    expect(review.artifacts.forms).toEqual(
      expect.objectContaining({
        status: 'limited',
        reasons: expect.arrayContaining([expect.stringContaining('Pontuação provisória')]),
      }),
    );
    expect(review.artifacts.package.status).toBe('limited');
  });

  it('expõe conflito normativo como cálculo indisponível sem ocultar artefatos possíveis', () => {
    const review = reviewProject(
      completeBase(),
      {
        status: 'unavailable',
        issues: [{ code: 'normative-conflict', message: 'Conflito registrado no requisito d.5.' }],
      },
      { status: 'success', bytes: new Uint8Array([1]), pageMap: { totalPages: 1, evidences: [] } },
    );

    expect(review.findings).toContainEqual(
      expect.objectContaining({ label: 'Conflito normativo', severity: 'warning' }),
    );
    expect(review.artifacts.forms.status).toBe('limited');
    expect(review.artifacts.evidence.status).toBe('ready');
  });

  it('bloqueia somente os artefatos que dependem de comprovantes locais inválidos', () => {
    const review = reviewProject(completeBase(), unavailable, {
      status: 'error',
      issues: [
        {
          code: 'missing-file',
          evidenceId: 'evidence-1',
          message: 'Arquivo local ausente: comprovante.pdf',
        },
      ],
    });

    expect(review.artifacts.memorial.status).toBe('limited');
    expect(review.artifacts.forms.status).toBe('blocked');
    expect(review.artifacts.evidence.status).toBe('blocked');
    expect(review.artifacts.package.status).toBe('blocked');
    expect(review.artifacts.backup.status).toBe('blocked');
    expect(review.artifacts.json.status).toBe('ready');
  });
});
