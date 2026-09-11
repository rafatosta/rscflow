import { z } from 'zod';
import type { TypedProjectExport } from '@/domain/project';

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} é obrigatório.`).max(200, `${label} está muito longo.`);
const optionalText = z.string().trim().max(200, 'O texto está muito longo.');
const optionalDate = z.union([z.literal(''), z.iso.date('Informe uma data válida.')]);
const rscSelection = z.union([z.literal(''), z.enum(['rsc-i', 'rsc-ii', 'rsc-iii'])]);

function cpfIsValid(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const check = (length: number) => {
    const sum = digits
      .slice(0, length)
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return (remainder === 10 ? 0 : remainder) === Number(digits[length]);
  };
  return check(9) && check(10);
}

export const teacherProfileFormSchema = z.object({
  title: requiredText('Título do projeto'),
  name: requiredText('Nome completo'),
  cpf: z.string().trim().refine(cpfIsValid, 'Informe um CPF válido com 11 dígitos.'),
  siape: requiredText('SIAPE'),
  role: optionalText,
  campus: requiredText('Campus de lotação'),
  email: z.union([z.literal(''), z.email('Informe um e-mail válido.')]),
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{10,11}$/.test(value.replace(/\D/g, '')), {
      message: 'Informe um telefone com DDD e 10 ou 11 dígitos.',
    }),
  currentRsc: optionalText,
  schooling: optionalText,
  admissionDate: optionalDate,
  effectiveDate: optionalDate,
  level: rscSelection.refine((level) => level !== '', 'Selecione o RSC pretendido.'),
});

export type TeacherProfileForm = z.input<typeof teacherProfileFormSchema>;
export const teacherProfileDraftSchema = z.object({
  title: z.string(),
  name: z.string(),
  cpf: z.string(),
  siape: z.string(),
  role: z.string(),
  campus: z.string(),
  email: z.string(),
  phone: z.string(),
  currentRsc: z.string(),
  schooling: z.string(),
  admissionDate: z.string(),
  effectiveDate: z.string(),
  level: rscSelection,
});

export function teacherProfileValues(project: TypedProjectExport): TeacherProfileForm {
  const { teacher, request } = project.userData;
  return {
    title: project.userData.title,
    name: teacher.name,
    cpf: teacher.cpf ?? '',
    siape: teacher.siape ?? teacher.registration ?? '',
    role: teacher.role ?? '',
    campus: teacher.campus ?? '',
    email: teacher.email ?? '',
    phone: teacher.phone ?? '',
    currentRsc: teacher.currentRsc ?? '',
    schooling: teacher.schooling ?? '',
    admissionDate: teacher.admissionDate ?? '',
    effectiveDate: request?.effectiveDate ?? '',
    level: request?.level ?? '',
  };
}

export function applyTeacherProfile(
  project: TypedProjectExport,
  values: TeacherProfileForm,
): TypedProjectExport['userData'] {
  const optional = (value: string) => (value ? value : undefined);
  return {
    ...project.userData,
    title: values.title,
    teacher: {
      name: values.name,
      cpf: optional(values.cpf.replace(/\D/g, '')),
      siape: optional(values.siape),
      role: optional(values.role),
      campus: optional(values.campus),
      email: optional(values.email),
      phone: optional(values.phone.replace(/\D/g, '')),
      currentRsc: optional(values.currentRsc),
      schooling: optional(values.schooling),
      admissionDate: optional(values.admissionDate),
    },
    request: values.level
      ? {
          ...project.userData.request,
          level: values.level,
          effectiveDate: optional(values.effectiveDate),
        }
      : null,
  };
}

export function teacherProfileIsComplete(project: TypedProjectExport): boolean {
  const values = teacherProfileValues(project);
  return teacherProfileFormSchema.safeParse(values).success;
}
