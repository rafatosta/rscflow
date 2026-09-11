import type { TypedProjectExport } from '@/domain/project';

export function buildMemorialPreview(project: TypedProjectExport): string {
  const data = project.userData;
  return [
    data.memorial?.title || data.title,
    data.teacher.name || 'Docente não informado',
    data.memorial?.introduction || '',
    'Formação',
    ...data.education.map(
      (item) =>
        `${item.title} — ${item.institution}${item.completedAt ? ` (${item.completedAt})` : ''}`,
    ),
    'Trajetória',
    ...data.activities.map((item) => item.title),
    data.memorial?.conclusion || '',
  ]
    .filter(Boolean)
    .join('\n\n');
}
