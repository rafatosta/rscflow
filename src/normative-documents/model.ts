import type { EvidencePageMap } from '@/domain/evidence-page-map';
import type { TypedProjectExport } from '@/domain/project';
import type { Regulation, RscLevel } from '@/domain/regulation';
import type { CalculationResult, RequirementProjection } from '@/domain/scoring';

export type NormativeField = { label: string; value?: string };
export type ProofReference = { evidenceId: string; startPage: number; endPage: number };
export type NormativeCriterionRow = {
  code: string;
  description: string;
  factor: number;
  unit: string;
  maximumQuantity: number;
  weight: number;
  provenQuantity?: number;
  finalScore?: number;
  proofReferences: ProofReference[];
};
export type NormativeDirective = {
  code: string;
  title: string;
  weight?: number;
  maximumScore: number;
  obtainedScore?: number;
  criteria: NormativeCriterionRow[];
};
export type NormativeLevel = {
  level: RscLevel;
  obtainedScore?: number;
  directives: NormativeDirective[];
};
export type NormativeProcessDocument = {
  templateId: 'ifba-189-2026';
  regulation: { authority: string; number: string; year: number };
  request: { fields: NormativeField[]; requestedLevel?: RscLevel; effectiveDate?: string };
  levels: NormativeLevel[];
  totalScore?: number;
  validation: { status: 'validated' | 'provisional' | 'unavailable'; message?: string };
  issues: string[];
};

const field = (label: string, value?: string): NormativeField => ({
  label,
  ...(value?.trim() ? { value: value.trim() } : {}),
});

function referencesFor(
  pageMap: EvidencePageMap | undefined,
  level: RscLevel,
  criterionId: string,
  occurrenceIds: Set<string>,
): ProofReference[] {
  if (!pageMap) return [];
  return pageMap.evidences.flatMap((evidence) =>
    evidence.links.some(
      (link) =>
        link.level === level &&
        link.criterionId === criterionId &&
        occurrenceIds.has(link.occurrenceId),
    )
      ? [
          {
            evidenceId: evidence.evidenceId,
            startPage: evidence.startPage,
            endPage: evidence.endPage,
          },
        ]
      : [],
  );
}

/** Projeta os anexos oficiais sem recalcular pontuação nem reordenar comprovantes. */
export function buildNormativeProcessDocument(
  project: TypedProjectExport,
  regulation: Regulation,
  calculation: CalculationResult,
  pageMap?: EvidencePageMap,
): NormativeProcessDocument {
  if (regulation.metadata.regulation.id !== 'ifba-189-2026')
    throw new Error('Não existe template normativo para este regulamento.');

  const teacher = project.userData.teacher;
  const issues: string[] = [];
  const requiredFields = [
    ['Nome do(a) docente', teacher.name],
    ['CPF', teacher.cpf],
    ['Matrícula SIAPE', teacher.siape ?? teacher.registration],
    ['Cargo', teacher.role],
    ['Campus de lotação', teacher.campus],
    ['E-mail', teacher.email],
    ['Telefone', teacher.phone],
    ['RT ou RSC (atual) - c/ nº do processo', teacher.currentRsc],
    ['Portaria de concessão', undefined],
    ['Data de vigência', project.userData.request?.effectiveDate],
  ] as const;
  for (const [label, value] of requiredFields)
    if (!value?.trim()) issues.push(`${label}: não informado.`);

  const projections: Map<string, RequirementProjection> =
    calculation.status === 'unavailable'
      ? new Map<string, RequirementProjection>()
      : new Map(calculation.requirementProjection.map((item) => [item.criterionId, item]));
  const directiveScores: Map<string, number> =
    calculation.status === 'unavailable'
      ? new Map<string, number>()
      : new Map(calculation.directives.map((item) => [item.directiveId, item.score]));
  const levelScores =
    calculation.status === 'unavailable'
      ? new Map<RscLevel, number>()
      : new Map(calculation.levels.map((item) => [item.level, item.score]));

  if (calculation.status === 'unavailable')
    issues.push(...calculation.issues.map((item) => item.message));
  if (!pageMap && project.userData.activities.some((item) => item.evidenceIds.length))
    issues.push('Referências de páginas indisponíveis: o mapa de comprovantes não foi fornecido.');

  const levels = regulation.levels.map((level): NormativeLevel => ({
    level: level.section,
    obtainedScore: levelScores.get(level.section),
    directives: level.directives.map((directive) => ({
      code: directive.code,
      title: directive.title,
      weight: directive.weight,
      maximumScore: directive.maxScore,
      obtainedScore: directiveScores.get(directive.id),
      criteria: level.criteria
        .filter((criterion) => criterion.directiveId === directive.id)
        .map((criterion) => {
          const projection = projections.get(criterion.id);
          const occurrenceIds = new Set(projection?.launches.map((launch) => launch.id) ?? []);
          return {
            code: criterion.code,
            description: criterion.description,
            factor: criterion.factor,
            unit: criterion.unit,
            maximumQuantity: criterion.maxQuantity,
            weight: criterion.weight,
            provenQuantity: projection?.quantity,
            finalScore: projection?.consideredScore,
            proofReferences: referencesFor(pageMap, level.section, criterion.id, occurrenceIds),
          };
        }),
    })),
  }));

  const validation =
    calculation.status === 'unavailable'
      ? { status: 'unavailable' as const, message: 'Pontuação indisponível conforme o domínio.' }
      : calculation.validation;
  return {
    templateId: 'ifba-189-2026',
    regulation: regulation.metadata.regulation,
    request: {
      fields: requiredFields.map(([label, value]) => field(label, value)),
      requestedLevel: project.userData.request?.level,
      effectiveDate: project.userData.request?.effectiveDate,
    },
    levels,
    totalScore: calculation.status === 'unavailable' ? undefined : calculation.total,
    validation,
    issues,
  };
}
