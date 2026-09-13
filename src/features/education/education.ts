import { z } from 'zod';
import type { Education } from '@/domain/models';
import { educationStatusSchema, educationTypeSchema } from '@/domain/vocabularies';

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} é obrigatório.`).max(200, `${label} está muito longo.`);
const optionalText = z.string().trim().max(500, 'O texto está muito longo.');
const optionalDate = z.union([z.literal(''), z.iso.date('Informe uma data válida.')]);

export type EducationFormValues = {
  type: string;
  title: string;
  institution: string;
  area: string;
  startedAt: string;
  completedAt: string;
  status: string;
  evidenceReference: string;
  notes: string;
};

export const educationFormSchema: z.ZodType<EducationFormValues, EducationFormValues> = z
  .object({
    type: z.union([z.literal(''), educationTypeSchema]).refine((value) => value !== '', {
      message: 'Tipo é obrigatório.',
    }),
    title: requiredText('Curso ou título'),
    institution: requiredText('Instituição'),
    area: optionalText,
    startedAt: optionalDate,
    completedAt: optionalDate,
    status: z.union([z.literal(''), educationStatusSchema]).refine((value) => value !== '', {
      message: 'Situação é obrigatória.',
    }),
    evidenceReference: optionalText,
    notes: z.string().trim().max(2000, 'As observações estão muito longas.'),
  })
  .refine(({ startedAt, completedAt }) => !startedAt || !completedAt || completedAt >= startedAt, {
    path: ['completedAt'],
    message: 'A conclusão não pode ser anterior à data inicial.',
  });

export const emptyEducationForm: EducationFormValues = {
  type: '',
  title: '',
  institution: '',
  area: '',
  startedAt: '',
  completedAt: '',
  status: '',
  evidenceReference: '',
  notes: '',
};

export function educationFormValues(education?: Education): EducationFormValues {
  if (!education) return emptyEducationForm;
  return {
    type: education.type ?? '',
    title: education.title,
    institution: education.institution,
    area: education.area ?? '',
    startedAt: education.startedAt ?? '',
    completedAt: education.completedAt ?? '',
    status: education.status ?? '',
    evidenceReference: education.evidenceReference ?? '',
    notes: education.notes ?? '',
  };
}

function optional(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function fields(values: EducationFormValues) {
  return {
    type: values.type.trim(),
    title: values.title.trim(),
    institution: values.institution.trim(),
    area: optional(values.area),
    startedAt: optional(values.startedAt),
    completedAt: optional(values.completedAt),
    status: values.status.trim(),
    evidenceReference: optional(values.evidenceReference),
    notes: optional(values.notes),
  };
}

export function createEducation(
  values: EducationFormValues,
  id: string = crypto.randomUUID(),
  timestamp = new Date().toISOString(),
): Education {
  const parsed = educationFormSchema.parse(values);
  return { id, ...fields(parsed), createdAt: timestamp, updatedAt: timestamp };
}

export function updateEducation(
  education: Education,
  values: EducationFormValues,
  timestamp = new Date().toISOString(),
): Education {
  const parsed = educationFormSchema.parse(values);
  return {
    id: education.id,
    ...fields(parsed),
    createdAt: education.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function duplicateEducation(
  education: Education,
  id: string = crypto.randomUUID(),
  timestamp = new Date().toISOString(),
): Education {
  return { ...education, id, createdAt: timestamp, updatedAt: timestamp };
}

export function sortEducationChronologically(education: Education[]): Education[] {
  return education
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftDate = left.item.completedAt ?? left.item.startedAt;
      const rightDate = right.item.completedAt ?? right.item.startedAt;
      if (leftDate && rightDate && leftDate !== rightDate) return rightDate.localeCompare(leftDate);
      if (leftDate && !rightDate) return -1;
      if (!leftDate && rightDate) return 1;
      return left.index - right.index;
    })
    .map(({ item }) => item);
}
