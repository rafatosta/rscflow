import type { Activity, Education, Evidence } from '@/domain/models';

export const memorialSections = [
  { id: 'education', title: 'Itinerário de formação, aperfeiçoamento e titulação' },
  { id: 'teaching', title: 'Atuação docente' },
  { id: 'production', title: 'Produção acadêmica, técnico-científica, literária e/ou artística' },
  { id: 'community', title: 'Prestação de serviços à comunidade' },
  { id: 'management', title: 'Gestão e administração' },
  { id: 'awards', title: 'Títulos, prêmios e aprovações em concursos' },
] as const;

export type MemorialSectionId = (typeof memorialSections)[number]['id'];

function period(start?: string, end?: string): string | undefined {
  if (!start && !end) return undefined;
  return `${start ?? 'início não informado'} a ${end ?? 'em andamento'}`;
}

function levelLabel(level?: Activity['selectedLevel']): string | undefined {
  return level?.toUpperCase().replace('RSC-', 'RSC ');
}

function finish(value: string): string {
  const text = value.trim();
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function sentence(label: string, value: string): string {
  return `${label}: ${finish(value)}`;
}

function evidenceText(evidence: Evidence): string {
  return [
    evidence.title,
    evidence.type,
    evidence.identifier,
    evidence.issuer,
    evidence.date,
    evidence.processReference,
    evidence.notes,
    evidence.fileName,
    evidence.description,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function generateActivityText(activity: Activity, evidences: Evidence[]): string {
  const activityPeriod = period(activity.startDate, activity.endDate);
  const location = [activity.institution, activity.department].filter(Boolean).join(' · ');
  const context = [activityPeriod ? `período de ${activityPeriod}` : '', location].filter(Boolean);
  const framing = [
    activity.criterionId ? `critério ${activity.criterionId}` : '',
    levelLabel(activity.selectedLevel),
    `quantidade declarada ${activity.quantity}`,
  ].filter(Boolean);
  const proof = activity.evidenceIds
    .map((id) => evidences.find((evidence) => evidence.id === id))
    .filter((evidence): evidence is Evidence => Boolean(evidence))
    .map(evidenceText);
  const acting = [activity.category, activity.title, activity.role, activity.description]
    .filter(Boolean)
    .join('. ');

  return [
    sentence('Contexto', context.length ? context.join(' · ') : 'não informado'),
    sentence('Atuação', acting || 'não informada'),
    sentence('Resultados', activity.results || 'não informados'),
    sentence('Saberes e competências', activity.competencies?.join('; ') || 'não informados'),
    sentence('Enquadramento', framing.length ? framing.join(' · ') : 'não informado'),
    sentence('Comprovação', proof.length ? proof.join('; ') : 'não informada'),
  ].join('\n');
}

export function activityTextIsOutdated(activity: Activity, evidences: Evidence[]): boolean {
  return Boolean(
    activity.generatedText !== undefined &&
    activity.generatedText !== generateActivityText(activity, evidences),
  );
}

export function editActivityText(
  activity: Activity,
  editedText: string,
  evidences: Evidence[],
): Activity {
  return {
    ...activity,
    generatedText: activity.generatedText ?? generateActivityText(activity, evidences),
    editedText,
    isManuallyEdited: true,
  };
}

export function keepActivityText(activity: Activity, evidences: Evidence[]): Activity {
  return {
    ...activity,
    generatedText: generateActivityText(activity, evidences),
    editedText:
      activity.editedText ?? activity.generatedText ?? generateActivityText(activity, evidences),
    isManuallyEdited: true,
  };
}

export function regenerateActivityText(activity: Activity, evidences: Evidence[]): Activity {
  const generatedText = generateActivityText(activity, evidences);
  return { ...activity, generatedText, editedText: generatedText, isManuallyEdited: false };
}

export function displayedActivityText(activity: Activity, evidences: Evidence[]): string {
  return activity.editedText ?? activity.generatedText ?? generateActivityText(activity, evidences);
}

export function activityMemorialSection(activity: Activity): MemorialSectionId {
  if (activity.category === 'Formação') return 'education';
  if (activity.category === 'Pesquisa' || activity.category === 'Produção') return 'production';
  if (activity.category === 'Extensão') return 'community';
  if (activity.category === 'Gestão') return 'management';
  return 'teaching';
}

function datedOrder<T>(items: T[], date: (item: T) => string | undefined): T[] {
  return items
    .map((item, index) => ({ item, index, date: date(item) }))
    .sort((left, right) => {
      if (left.date && right.date && left.date !== right.date)
        return left.date.localeCompare(right.date);
      if (left.date && !right.date) return -1;
      if (!left.date && right.date) return 1;
      return left.index - right.index;
    })
    .map(({ item }) => item);
}

export function chronologicalActivities(activities: Activity[]): Activity[] {
  return datedOrder(activities, (activity) => activity.startDate ?? activity.endDate);
}

export function chronologicalEducation(education: Education[]): Education[] {
  return datedOrder(education, (item) => item.startedAt ?? item.completedAt);
}

export function generateEducationText(item: Education): string {
  const educationPeriod = period(item.startedAt, item.completedAt);
  return [
    finish(`${item.type ? `${item.type}: ` : ''}${item.title} — ${item.institution}`),
    item.area ? sentence('Área', item.area) : '',
    educationPeriod ? sentence('Período', educationPeriod) : '',
    item.status ? sentence('Situação', item.status) : '',
    item.evidenceReference ? sentence('Comprovação', item.evidenceReference) : '',
    item.notes ? `Observações: ${item.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
