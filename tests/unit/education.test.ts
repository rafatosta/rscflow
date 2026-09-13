import { describe, expect, it } from 'vitest';
import { projectExportSchema } from '@/domain/project';
import {
  createEducation,
  duplicateEducation,
  educationFormSchema,
  sortEducationChronologically,
  updateEducation,
} from '@/features/education/education';
import { exportProject } from '@/features/local-projects/project-files';
import { createDraft } from '@/features/project-shell/project-view';

const values = {
  type: 'Pós-graduação',
  title: 'Especialização em Educação',
  institution: 'Instituto Federal',
  area: 'Educação',
  startedAt: '2020-02-01',
  completedAt: '2021-03-15',
  status: 'Concluído',
  evidenceReference: 'Diploma, folha 12',
  notes: 'Curso presencial.',
};

describe('formação acadêmica', () => {
  it('valida, normaliza e registra timestamps na criação e edição', () => {
    const created = createEducation(values, 'education-1', '2026-09-11T10:00:00.000Z');
    expect(created).toEqual({
      id: 'education-1',
      ...values,
      createdAt: '2026-09-11T10:00:00.000Z',
      updatedAt: '2026-09-11T10:00:00.000Z',
    });
    const updated = updateEducation(
      created,
      { ...values, title: 'Especialização revisada' },
      '2026-09-11T11:00:00.000Z',
    );
    expect(updated.id).toBe(created.id);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBe('2026-09-11T11:00:00.000Z');
    expect(updated.title).toBe('Especialização revisada');
  });

  it.each([
    ['type', ''],
    ['title', ''],
    ['institution', ''],
    ['status', ''],
    ['type', 'Tipo livre'],
    ['status', 'Situação livre'],
    ['startedAt', '10/02/2020'],
    ['completedAt', '2021-02-30'],
  ] as const)('rejeita %s inválido', (field, value) => {
    expect(educationFormSchema.safeParse({ ...values, [field]: value }).success).toBe(false);
  });

  it('rejeita conclusão anterior ao início', () => {
    const result = educationFormSchema.safeParse({
      ...values,
      startedAt: '2022-01-01',
      completedAt: '2021-12-31',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(['completedAt']);
  });

  it('duplica com nova identidade e novos timestamps', () => {
    const created = createEducation(values, 'original', '2026-09-11T10:00:00.000Z');
    const copy = duplicateEducation(created, 'copy', '2026-09-11T12:00:00.000Z');
    expect(copy).toEqual({
      ...created,
      id: 'copy',
      createdAt: '2026-09-11T12:00:00.000Z',
      updatedAt: '2026-09-11T12:00:00.000Z',
    });
  });

  it('ordena por conclusão ou início, do mais recente para o mais antigo, sem mutar a entrada', () => {
    const undated = { id: 'none', title: 'Sem data', institution: 'A' };
    const older = { id: 'old', title: 'Antiga', institution: 'B', completedAt: '2020-01-01' };
    const current = { id: 'new', title: 'Atual', institution: 'C', startedAt: '2024-01-01' };
    const input = [undated, older, current];
    expect(sortEducationChronologically(input).map(({ id }) => id)).toEqual(['new', 'old', 'none']);
    expect(input.map(({ id }) => id)).toEqual(['none', 'old', 'new']);
  });

  it('mantém compatibilidade com registros antigos e faz round-trip JSON dos novos campos', () => {
    const project = createDraft('rsc-ii', 'ifba-189-2026');
    project.userData.education = [
      { id: 'legacy', title: 'Graduação', institution: 'Universidade' },
      createEducation(values, 'new', '2026-09-11T10:00:00.000Z'),
    ];
    expect(projectExportSchema.parse(JSON.parse(exportProject(project)))).toEqual(project);
  });
});
