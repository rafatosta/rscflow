import { activityProjectView } from '@/domain/project-migration';
import { describe, expect, it } from 'vitest';
import { projectExportSchema, type TypedProjectExport } from '@/domain/project';
import {
  applyTeacherProfile,
  teacherProfileFormSchema,
  teacherProfileIsComplete,
  teacherProfileValues,
} from '@/features/teacher-profile/profile';
import { createDraft } from '@/features/project-shell/project-view';
import { exportProject } from '@/features/local-projects/project-files';

const completeValues = {
  title: 'Memorial docente',
  name: 'Maria da Silva',
  cpf: '529.982.247-25',
  siape: '1234567',
  role: 'Professora EBTT',
  campus: 'Salvador',
  email: 'maria@example.edu.br',
  phone: '(71) 99999-8888',
  currentRsc: 'RSC I',
  schooling: 'Mestrado',
  admissionDate: '2020-02-03',
  effectiveDate: '2026-04-07',
  level: 'rsc-ii' as const,
};

describe('dados do docente', () => {
  it('valida todos os campos e normaliza CPF e telefone ao persistir', () => {
    const project = activityProjectView(createDraft('rsc-i', 'ifba-189-2026'));
    const parsed = teacherProfileFormSchema.parse(completeValues);
    const userData = applyTeacherProfile(project, parsed);
    expect(userData.teacher).toEqual({
      name: 'Maria da Silva',
      cpf: '52998224725',
      siape: '1234567',
      role: 'Professora EBTT',
      campus: 'Salvador',
      email: 'maria@example.edu.br',
      phone: '71999998888',
      currentRsc: 'RSC I',
      schooling: 'Mestrado',
      admissionDate: '2020-02-03',
    });
    expect(userData.request).toEqual({ level: 'rsc-ii', effectiveDate: '2026-04-07' });
    expect(teacherProfileIsComplete({ ...project, userData })).toBe(true);
  });

  it.each([
    ['name', ''],
    ['cpf', '111.111.111-11'],
    ['cpf', '123'],
    ['siape', ''],
    ['campus', ''],
    ['level', ''],
    ['email', 'email-inválido'],
    ['phone', '1234'],
    ['admissionDate', '31/12/2020'],
    ['effectiveDate', '2026-02-30'],
  ] as const)('rejeita %s inválido', (field, value) => {
    expect(teacherProfileFormSchema.safeParse({ ...completeValues, [field]: value }).success).toBe(
      false,
    );
  });

  it('aceita campos opcionais vazios e mantém datas independentes', () => {
    const values = {
      ...completeValues,
      role: '',
      email: '',
      phone: '',
      currentRsc: '',
      schooling: '',
      admissionDate: '',
      effectiveDate: '',
    };
    expect(teacherProfileFormSchema.safeParse(values).success).toBe(true);
  });

  it('lê matrícula legada como SIAPE sem alterar o arquivo durante a leitura', () => {
    const project = activityProjectView(createDraft('rsc-i', 'ifba-189-2026'));
    const legacy = {
      ...project,
      userData: { ...project.userData, teacher: { name: 'Docente', registration: '7654321' } },
    } satisfies TypedProjectExport;
    expect(teacherProfileValues(legacy).siape).toBe('7654321');
    expect(legacy.userData.teacher).toEqual({ name: 'Docente', registration: '7654321' });
  });

  it('não presume RSC pretendido quando o rascunho ainda não contém solicitação', () => {
    const project = activityProjectView(createDraft('rsc-i', 'ifba-189-2026'));
    const withoutRequest = {
      ...project,
      userData: { ...project.userData, request: null },
    } satisfies TypedProjectExport;
    const values = teacherProfileValues(withoutRequest);

    expect(values.level).toBe('');
    expect(teacherProfileIsComplete(withoutRequest)).toBe(false);
    expect(applyTeacherProfile(withoutRequest, values).request).toBeNull();
  });

  it('serializa todos os dados no JSON portátil e os valida no round-trip', () => {
    const project = activityProjectView(createDraft('rsc-i', 'ifba-189-2026'));
    const complete = {
      ...project,
      userData: applyTeacherProfile(project, teacherProfileFormSchema.parse(completeValues)),
    };
    expect(projectExportSchema.parse(JSON.parse(exportProject(complete)))).toEqual(complete);
  });
});
