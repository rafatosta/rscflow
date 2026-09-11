import type { TypedProjectExport } from '@/domain/project';

export function buildMemorialPreview(project: TypedProjectExport): string {
  const data = project.userData;
  const teacher = data.teacher;
  return [
    data.memorial?.title || data.title,
    'Identificação do docente',
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
    data.memorial?.introduction || '',
    'Formação',
    ...data.education.map((item) =>
      [
        `${item.type ? `${item.type}: ` : ''}${item.title} — ${item.institution}`,
        item.area ? `Área: ${item.area}` : '',
        item.startedAt || item.completedAt
          ? `Período: ${item.startedAt ?? 'não informado'} a ${item.completedAt ?? 'em andamento'}`
          : '',
        item.status ? `Situação: ${item.status}` : '',
        item.evidenceReference ? `Documento comprobatório: ${item.evidenceReference}` : '',
        item.notes ? `Observações: ${item.notes}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    'Trajetória',
    ...data.activities.map((item) => {
      const evidenceTitles = item.evidenceIds
        .map((id) => data.evidence.find((evidence) => evidence.id === id)?.title)
        .filter(Boolean);
      return [
        `${item.category ? `${item.category}: ` : ''}${item.title}`,
        item.institution || item.department
          ? `Local: ${[item.institution, item.department].filter(Boolean).join(' · ')}`
          : '',
        item.startDate || item.endDate
          ? `Período: ${item.startDate ?? 'não informado'} a ${item.endDate ?? 'em andamento'}`
          : '',
        item.role ? `Papel ou função: ${item.role}` : '',
        item.description ? `Descrição: ${item.description}` : '',
        item.results ? `Resultados: ${item.results}` : '',
        item.competencies?.length ? `Competências: ${item.competencies.join('; ')}` : '',
        `Quantidade declarada: ${item.quantity}`,
        item.criterionId ? `Referência de critério: ${item.criterionId}` : '',
        evidenceTitles.length ? `Evidências: ${evidenceTitles.join('; ')}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    }),
    data.memorial?.conclusion || '',
  ]
    .filter(Boolean)
    .join('\n\n');
}
