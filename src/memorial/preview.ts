import type { TypedProjectExport } from '@/domain/project';
import {
  activityMemorialSection,
  chronologicalActivities,
  displayedActivityText,
  generateEducationText,
  memorialSections,
  type MemorialSectionId,
} from './generator';

export type MemorialDocumentSection = {
  id: 'cover' | 'summary' | 'introduction' | MemorialSectionId | 'conclusion';
  title: string;
  paragraphs: string[];
};

export function buildMemorialDocument(project: TypedProjectExport): MemorialDocumentSection[] {
  const data = project.userData;
  const teacher = data.teacher;
  const identification = [
    teacher.name || 'Nome não informado',
    teacher.cpf ? `CPF: ${teacher.cpf}` : '',
    teacher.siape || teacher.registration ? `SIAPE: ${teacher.siape ?? teacher.registration}` : '',
    teacher.role ? `Cargo: ${teacher.role}` : '',
    teacher.campus ? `Campus de lotação: ${teacher.campus}` : '',
    teacher.email ? `E-mail: ${teacher.email}` : '',
    teacher.phone ? `Telefone: ${teacher.phone}` : '',
    teacher.currentRsc ? `RT/RSC atual: ${teacher.currentRsc}` : '',
    teacher.schooling ? `Escolaridade: ${teacher.schooling}` : '',
    teacher.admissionDate ? `Data de ingresso: ${teacher.admissionDate}` : '',
    data.request?.effectiveDate ? `Data de vigência: ${data.request.effectiveDate}` : '',
    data.request
      ? `RSC pretendido: ${data.request.level.toUpperCase().replace('RSC-', 'RSC ')}`
      : '',
  ].filter(Boolean);
  const introduction = data.memorial?.introduction.trim();
  const content = new Map<MemorialSectionId, string[]>(
    memorialSections.map((section) => [section.id, []]),
  );
  const educationEntries = [
    ...data.education.map((item, index) => ({
      date: item.startedAt ?? item.completedAt,
      order: index,
      text: generateEducationText(item),
    })),
    ...data.activities
      .filter((activity) => activityMemorialSection(activity) === 'education')
      .map((activity, index) => ({
        date: activity.startDate ?? activity.endDate,
        order: data.education.length + index,
        text: displayedActivityText(activity, data.evidence),
      })),
  ].sort((left, right) => {
    if (left.date && right.date && left.date !== right.date)
      return left.date.localeCompare(right.date);
    if (left.date && !right.date) return -1;
    if (!left.date && right.date) return 1;
    return left.order - right.order;
  });
  content.get('education')!.push(...educationEntries.map((entry) => entry.text));
  for (const activity of chronologicalActivities(data.activities)) {
    if (activityMemorialSection(activity) === 'education') continue;
    content
      .get(activityMemorialSection(activity))!
      .push(displayedActivityText(activity, data.evidence));
  }
  for (const section of memorialSections) {
    const editorial = data.memorial?.sectionTexts?.[section.id]?.trim();
    if (editorial) content.get(section.id)!.unshift(editorial);
  }
  const listedTitles = [
    ...(introduction ? ['Apresentação introdutória'] : []),
    ...memorialSections.map((section) => section.title),
    'Conclusão',
  ];
  return [
    {
      id: 'cover',
      title: data.memorial?.title || data.title,
      paragraphs: identification,
    },
    {
      id: 'summary',
      title: 'Sumário',
      paragraphs: listedTitles.map((title, index) => `${index + 1}. ${title}`),
    },
    ...(introduction
      ? [
          {
            id: 'introduction' as const,
            title: 'Apresentação introdutória',
            paragraphs: [introduction],
          },
        ]
      : []),
    ...memorialSections.map((section) => ({
      ...section,
      paragraphs: content.get(section.id)!.length
        ? content.get(section.id)!
        : ['Nenhum conteúdo registrado.'],
    })),
    {
      id: 'conclusion',
      title: 'Conclusão',
      paragraphs: [data.memorial?.conclusion.trim() || 'Nenhuma conclusão registrada.'],
    },
  ];
}

export function buildMemorialPreview(project: TypedProjectExport): string {
  return buildMemorialDocument(project)
    .flatMap((section) => [section.title, ...section.paragraphs])
    .join('\n\n');
}
