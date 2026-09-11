import { z } from 'zod';
import type { Activity, Evidence } from '@/domain/models';
import { rscLevelSchema } from '@/domain/regulation';

export const activityCategories = [
  'Ensino',
  'Pesquisa',
  'Extensão',
  'Gestão',
  'Produção',
  'Formação',
  'Outros',
] as const;

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} é obrigatório.`).max(200, `${label} está muito longo.`);
const optionalText = z.string().trim().max(500, 'O texto está muito longo.');
const longText = z.string().trim().max(4000, 'O texto está muito longo.');
const optionalDate = z.union([z.literal(''), z.iso.date('Informe uma data válida.')]);
const categorySelection = z.union([z.literal(''), z.enum(activityCategories)]);

const activityFields = z.object({
  title: requiredText('Título'),
  category: categorySelection.refine((category) => category !== '', 'Categoria é obrigatória.'),
  institution: optionalText,
  department: optionalText,
  startDate: optionalDate,
  endDate: optionalDate,
  role: optionalText,
  description: longText,
  results: longText,
  competencies: longText,
  criterionId: z.string().trim().max(200, 'A referência de critério está muito longa.'),
  selectedLevel: z.union([z.literal(''), rscLevelSchema]).default(''),
  quantity: z
    .number({ error: 'Informe uma quantidade válida.' })
    .finite('Informe uma quantidade válida.')
    .nonnegative('A quantidade não pode ser negativa.'),
  evidenceIds: z.array(z.string()).default([]),
});

export function activityFormSchema(criterionRequired = false) {
  return activityFields.superRefine((values, context) => {
    if (values.startDate && values.endDate && values.endDate < values.startDate)
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'A data final não pode ser anterior à data inicial.',
      });
    if (criterionRequired && !values.criterionId)
      context.addIssue({
        code: 'custom',
        path: ['criterionId'],
        message: 'A referência de critério é obrigatória neste formato de projeto.',
      });
    if (new Set(values.evidenceIds).size !== values.evidenceIds.length)
      context.addIssue({
        code: 'custom',
        path: ['evidenceIds'],
        message: 'Há evidências repetidas na atividade.',
      });
  });
}

export type ActivityFormValues = z.input<typeof activityFields>;

export const emptyActivityForm: ActivityFormValues = {
  title: '',
  category: '',
  institution: '',
  department: '',
  startDate: '',
  endDate: '',
  role: '',
  description: '',
  results: '',
  competencies: '',
  criterionId: '',
  selectedLevel: '',
  quantity: 0,
  evidenceIds: [],
};

export const evidenceFormSchema = z.object({
  type: requiredText('Tipo'),
  title: requiredText('Título'),
  identifier: optionalText,
  issuer: optionalText,
  date: optionalDate,
  processReference: optionalText,
  notes: longText,
});

export type EvidenceFormValues = z.input<typeof evidenceFormSchema>;

export const emptyEvidenceForm: EvidenceFormValues = {
  type: '',
  title: '',
  identifier: '',
  issuer: '',
  date: '',
  processReference: '',
  notes: '',
};

function optional(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

export function activityFormValues(activity?: Activity): ActivityFormValues {
  if (!activity) return emptyActivityForm;
  return {
    title: activity.title,
    category: activity.category ?? '',
    institution: activity.institution ?? '',
    department: activity.department ?? '',
    startDate: activity.startDate ?? '',
    endDate: activity.endDate ?? '',
    role: activity.role ?? '',
    description: activity.description ?? '',
    results: activity.results ?? '',
    competencies: activity.competencies?.join('\n') ?? '',
    criterionId: activity.criterionId,
    selectedLevel: activity.selectedLevel ?? '',
    quantity: activity.quantity,
    evidenceIds: activity.evidenceIds,
  };
}

function activityData(values: ActivityFormValues, criterionRequired: boolean) {
  const parsed = activityFormSchema(criterionRequired).parse(values);
  return {
    title: parsed.title.trim(),
    category: parsed.category,
    institution: optional(parsed.institution),
    department: optional(parsed.department),
    startDate: optional(parsed.startDate),
    endDate: optional(parsed.endDate),
    role: optional(parsed.role),
    description: optional(parsed.description),
    results: optional(parsed.results),
    competencies: parsed.competencies
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean),
    criterionId: parsed.criterionId.trim(),
    ...(parsed.selectedLevel ? { selectedLevel: parsed.selectedLevel } : {}),
    quantity: parsed.quantity,
    evidenceIds: parsed.evidenceIds,
  };
}

export function createActivity(
  values: ActivityFormValues,
  criterionRequired = false,
  id: string = crypto.randomUUID(),
  timestamp = new Date().toISOString(),
): Activity {
  return {
    id,
    ...activityData(values, criterionRequired),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateActivity(
  activity: Activity,
  values: ActivityFormValues,
  criterionRequired = false,
  timestamp = new Date().toISOString(),
): Activity {
  const data = activityData(values, criterionRequired);
  return {
    id: activity.id,
    ...data,
    ...(values.selectedLevel === undefined && activity.selectedLevel
      ? { selectedLevel: activity.selectedLevel }
      : {}),
    ...(activity.generatedText !== undefined ? { generatedText: activity.generatedText } : {}),
    ...(activity.editedText !== undefined ? { editedText: activity.editedText } : {}),
    ...(activity.isManuallyEdited !== undefined
      ? { isManuallyEdited: activity.isManuallyEdited }
      : {}),
    createdAt: activity.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function duplicateActivity(
  activity: Activity,
  id: string = crypto.randomUUID(),
  timestamp = new Date().toISOString(),
): Activity {
  return { ...activity, id, createdAt: timestamp, updatedAt: timestamp };
}

export function evidenceFormValues(evidence?: Evidence): EvidenceFormValues {
  if (!evidence) return emptyEvidenceForm;
  return {
    type: evidence.type ?? '',
    title: evidence.title,
    identifier: evidence.identifier ?? '',
    issuer: evidence.issuer ?? '',
    date: evidence.date ?? '',
    processReference: evidence.processReference ?? '',
    notes: evidence.notes ?? evidence.description ?? '',
  };
}

function evidenceData(values: EvidenceFormValues) {
  const parsed = evidenceFormSchema.parse(values);
  return {
    type: parsed.type.trim(),
    title: parsed.title.trim(),
    identifier: optional(parsed.identifier),
    issuer: optional(parsed.issuer),
    date: optional(parsed.date),
    processReference: optional(parsed.processReference),
    notes: optional(parsed.notes),
  };
}

export function createEvidence(
  values: EvidenceFormValues,
  id: string = crypto.randomUUID(),
): Evidence {
  return { id, ...evidenceData(values) };
}

export function updateEvidence(evidence: Evidence, values: EvidenceFormValues): Evidence {
  return { id: evidence.id, ...evidenceData(values) };
}

export function sortActivitiesChronologically(activities: Activity[]): Activity[] {
  return activities
    .map((activity, index) => ({ activity, index }))
    .sort((left, right) => {
      const leftDate = left.activity.endDate ?? left.activity.startDate;
      const rightDate = right.activity.endDate ?? right.activity.startDate;
      if (leftDate && rightDate && leftDate !== rightDate) return rightDate.localeCompare(leftDate);
      if (leftDate && !rightDate) return -1;
      if (!leftDate && rightDate) return 1;
      return left.index - right.index;
    })
    .map(({ activity }) => activity);
}

export function filterActivities(
  activities: Activity[],
  search: string,
  category: '' | (typeof activityCategories)[number],
): Activity[] {
  const query = search.trim().toLocaleLowerCase('pt-BR');
  return sortActivitiesChronologically(activities).filter((activity) => {
    if (category && activity.category !== category) return false;
    if (!query) return true;
    return [
      activity.title,
      activity.category,
      activity.institution,
      activity.department,
      activity.role,
      activity.description,
      activity.results,
      ...(activity.competencies ?? []),
    ].some((value) => value?.toLocaleLowerCase('pt-BR').includes(query));
  });
}

export function activityYear(activity: Activity): string {
  return (activity.endDate ?? activity.startDate)?.slice(0, 4) ?? 'Sem data';
}

export function removeEvidence(
  evidenceId: string,
  activities: Activity[],
  evidences: Evidence[],
  timestamp = new Date().toISOString(),
): { activities: Activity[]; evidence: Evidence[] } {
  return {
    activities: activities.map((activity) =>
      activity.evidenceIds.includes(evidenceId)
        ? {
            ...activity,
            evidenceIds: activity.evidenceIds.filter((id) => id !== evidenceId),
            updatedAt: timestamp,
          }
        : activity,
    ),
    evidence: evidences.filter((evidence) => evidence.id !== evidenceId),
  };
}
