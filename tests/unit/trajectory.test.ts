import { describe, expect, it } from 'vitest';
import { projectExportSchema } from '@/domain/project';
import {
  activityCategories,
  activityFormSchema,
  activityYear,
  createActivity,
  createEvidence,
  duplicateActivity,
  evidenceFormSchema,
  evidenceFormValues,
  filterActivities,
  removeEvidence,
  sortActivitiesChronologically,
  updateActivity,
  updateEvidence,
} from '@/features/trajectory/trajectory';
import { exportProject } from '@/features/local-projects/project-files';
import { createDraft } from '@/features/project-shell/project-view';

const activityValues = {
  title: 'Coordenação de projeto',
  category: 'Gestão' as const,
  institution: 'Instituto Federal',
  department: 'Departamento de Ensino',
  startDate: '2022-02-01',
  endDate: '2023-12-20',
  role: 'Coordenadora',
  description: 'Coordenação das atividades.',
  results: 'Projeto concluído.',
  competencies: 'Planejamento\nLiderança',
  criterionId: '',
  quantity: 2,
  evidenceIds: ['evidence-1'],
};

const evidenceValues = {
  type: 'Portaria',
  title: 'Portaria de coordenação',
  identifier: 'Portaria 42/2022',
  issuer: 'Instituto Federal',
  date: '2022-02-01',
  processReference: 'Processo 123',
  notes: 'Documento publicado.',
};

describe('trajetória profissional', () => {
  it('mantém as categorias de UI declaradas no requisito', () => {
    expect(activityCategories).toEqual([
      'Ensino',
      'Pesquisa',
      'Extensão',
      'Gestão',
      'Produção',
      'Formação',
      'Outros',
    ]);
  });

  it('cria atividade completa com competências e timestamps', () => {
    const activity = createActivity(
      activityValues,
      false,
      'activity-1',
      '2026-09-11T10:00:00.000Z',
    );
    expect(activity).toMatchObject({
      id: 'activity-1',
      title: 'Coordenação de projeto',
      category: 'Gestão',
      competencies: ['Planejamento', 'Liderança'],
      criterionId: '',
      quantity: 2,
      evidenceIds: ['evidence-1'],
      createdAt: '2026-09-11T10:00:00.000Z',
      updatedAt: '2026-09-11T10:00:00.000Z',
    });
  });

  it.each([
    ['title', ''],
    ['category', ''],
    ['quantity', -1],
    ['startDate', '01/02/2022'],
    ['endDate', '2023-02-30'],
  ] as const)('rejeita %s inválido', (field, value) => {
    expect(activityFormSchema().safeParse({ ...activityValues, [field]: value }).success).toBe(
      false,
    );
  });

  it('valida períodos, referências repetidas e critério obrigatório apenas no formato 2.0', () => {
    expect(
      activityFormSchema().safeParse({
        ...activityValues,
        startDate: '2024-01-01',
        endDate: '2023-01-01',
      }).success,
    ).toBe(false);
    expect(
      activityFormSchema().safeParse({
        ...activityValues,
        evidenceIds: ['evidence-1', 'evidence-1'],
      }).success,
    ).toBe(false);
    expect(activityFormSchema(true).safeParse(activityValues).success).toBe(false);
    expect(
      activityFormSchema(true).safeParse({ ...activityValues, criterionId: 'criterion-1' }).success,
    ).toBe(true);
  });

  it('edita sem perder ID, criação ou nível selecionado e duplica com identidade nova', () => {
    const original = {
      ...createActivity(activityValues, false, 'original', '2026-09-11T10:00:00.000Z'),
      selectedLevel: 'rsc-ii' as const,
    };
    const updated = updateActivity(
      original,
      { ...activityValues, title: 'Título revisado' },
      false,
      '2026-09-11T11:00:00.000Z',
    );
    expect(updated).toMatchObject({
      id: 'original',
      title: 'Título revisado',
      selectedLevel: 'rsc-ii',
      createdAt: '2026-09-11T10:00:00.000Z',
      updatedAt: '2026-09-11T11:00:00.000Z',
    });
    expect(
      updateActivity(original, { ...activityValues, selectedLevel: '' }).selectedLevel,
    ).toBeUndefined();
    const copy = duplicateActivity(original, 'copy', '2026-09-11T12:00:00.000Z');
    expect(copy.id).toBe('copy');
    expect(copy.createdAt).toBe('2026-09-11T12:00:00.000Z');
    expect(copy.evidenceIds).toEqual(original.evidenceIds);
  });

  it('ordena, agrupa por ano, busca em texto e filtra por categoria sem mutar a entrada', () => {
    const management = createActivity(activityValues, false, 'management');
    const teaching = createActivity(
      {
        ...activityValues,
        title: 'Docência de graduação',
        category: 'Ensino',
        institution: 'Universidade',
        startDate: '2024-01-01',
        endDate: '',
      },
      false,
      'teaching',
    );
    const undated = createActivity(
      { ...activityValues, title: 'Sem período', startDate: '', endDate: '' },
      false,
      'undated',
    );
    const input = [undated, management, teaching];
    expect(sortActivitiesChronologically(input).map(({ id }) => id)).toEqual([
      'teaching',
      'management',
      'undated',
    ]);
    expect(activityYear(teaching)).toBe('2024');
    expect(activityYear(undated)).toBe('Sem data');
    expect(filterActivities(input, 'universidade', '').map(({ id }) => id)).toEqual(['teaching']);
    expect(filterActivities(input, '', 'Gestão').map(({ id }) => id)).toEqual([
      'management',
      'undated',
    ]);
    expect(input.map(({ id }) => id)).toEqual(['undated', 'management', 'teaching']);
  });

  it('cria e edita todos os metadados de evidência, incluindo leitura do campo legado', () => {
    expect(evidenceFormSchema.safeParse(evidenceValues).success).toBe(true);
    const evidence = createEvidence(evidenceValues, 'evidence-1');
    expect(evidence).toEqual({ id: 'evidence-1', ...evidenceValues });
    expect(
      updateEvidence(evidence, { ...evidenceValues, title: 'Portaria revisada' }),
    ).toMatchObject({
      id: 'evidence-1',
      title: 'Portaria revisada',
    });
    expect(
      evidenceFormValues({ id: 'legacy', title: 'Ata', description: 'Descrição antiga' }).notes,
    ).toBe('Descrição antiga');
  });

  it.each([
    ['type', ''],
    ['title', ''],
    ['date', '01/02/2022'],
    ['date', '2022-02-30'],
  ] as const)('rejeita %s inválido na evidência', (field, value) => {
    expect(evidenceFormSchema.safeParse({ ...evidenceValues, [field]: value }).success).toBe(false);
  });

  it('remove a evidência e todos os vínculos sem alterar outras referências', () => {
    const activities = [
      createActivity({ ...activityValues, evidenceIds: ['evidence-1', 'evidence-2'] }, false, 'a'),
    ];
    const evidences = [
      createEvidence(evidenceValues, 'evidence-1'),
      createEvidence({ ...evidenceValues, title: 'Outra' }, 'evidence-2'),
    ];
    expect(
      removeEvidence('evidence-1', activities, evidences, '2026-09-11T13:00:00.000Z'),
    ).toMatchObject({
      activities: [{ evidenceIds: ['evidence-2'], updatedAt: '2026-09-11T13:00:00.000Z' }],
      evidence: [{ id: 'evidence-2' }],
    });
  });

  it('faz round-trip JSON dos campos estendidos e preserva registros antigos', () => {
    const project = createDraft('rsc-ii', 'ifba-189-2026');
    project.userData.evidence = [createEvidence(evidenceValues, 'evidence-1')];
    project.userData.activities = [
      createActivity(activityValues, false, 'activity-1', '2026-09-11T10:00:00.000Z'),
      { id: 'legacy', title: 'Atividade antiga', criterionId: '', quantity: 1, evidenceIds: [] },
    ];
    expect(projectExportSchema.parse(JSON.parse(exportProject(project)))).toEqual(project);
  });
});
