import { occurrenceProjectExportSchema } from '@/domain/criterion-entry';
import { activityProjectView } from '@/domain/project-migration';
import { currentProjectExportSchema } from '@/domain/project';
import {
  criterionSchema,
  regulationSchema,
  scoringPolicySchema,
  type Criterion,
} from '@/domain/regulation';
import type {
  ActivityScore,
  CalculationIssue,
  CalculationResult,
  CriterionScore,
  DirectiveScore,
  LevelScore,
  ScoringPolicySummary,
} from '@/domain/scoring';
import { Decimal } from './decimal';

const number = Decimal.from;
const sum = (values: Decimal[]) => values.reduce((total, value) => total.add(value), number(0));
const weighted = (quantity: Decimal, criterion: Criterion) =>
  quantity
    .min(number(criterion.maxQuantity))
    .multiply(number(criterion.factor))
    .multiply(number(criterion.weight));
const unavailable = (
  code: CalculationIssue['code'],
  message: string,
  policy?: ScoringPolicySummary,
): CalculationResult => ({
  status: 'unavailable',
  issues: [{ code, message }],
  ...(policy ? { policy } : {}),
});

/** Pontuação isolada do requisito; pendência humana não impede uma estimativa explícita. */
export function calculateRequirementScore(quantities: number[], input: unknown) {
  const result = criterionSchema.safeParse(input);
  if (!result.success || quantities.some((quantity) => !Number.isFinite(quantity) || quantity < 0))
    return { status: 'unavailable' as const, reason: 'Critério ou quantidade inválidos.' };
  if (result.data.provenance.issue)
    return {
      status: 'unavailable' as const,
      reason: 'Indisponível: conflito normativo pendente de validação.',
    };
  try {
    const quantity = sum(quantities.map(number));
    return {
      status: 'available' as const,
      score: weighted(quantity, result.data).toNumber(),
    };
  } catch {
    return {
      status: 'unavailable' as const,
      reason: 'Resultado fora do intervalo numérico suportado.',
    };
  }
}

/** Avaliação isolada: não inclui o teto compartilhado da diretriz. */
export function calculateActivity(
  quantity: number,
  input: unknown,
):
  | { status: 'available'; countedQuantity: number; score: number }
  | { status: 'unavailable'; reason: string } {
  const result = criterionSchema.safeParse(input);
  if (!result.success || !Number.isFinite(quantity) || quantity < 0)
    return { status: 'unavailable', reason: 'Critério ou quantidade inválidos.' };
  if (
    result.data.provenance.status !== 'validated' ||
    !result.data.provenance.validatedBy ||
    result.data.provenance.issue
  )
    return { status: 'unavailable', reason: 'Critério pendente de validação.' };
  try {
    return {
      status: 'available',
      countedQuantity: number(quantity).min(number(result.data.maxQuantity)).toNumber(),
      score: weighted(number(quantity), result.data).toNumber(),
    };
  } catch {
    return { status: 'unavailable', reason: 'Resultado fora do intervalo numérico suportado.' };
  }
}

export function roundFinalScore(
  value: number,
  input: unknown,
): { status: 'available'; score: number } | { status: 'unavailable'; reason: string } {
  const policy = scoringPolicySchema.safeParse(input);
  if (
    !policy.success ||
    policy.data.provenance.status !== 'validated' ||
    !policy.data.provenance.validatedBy
  )
    return {
      status: 'unavailable',
      reason: 'Política de arredondamento ausente, inválida ou pendente.',
    };
  try {
    return {
      status: 'available',
      score: number(value).roundHalfUp(policy.data.rounding.decimalPlaces).toNumber(),
    };
  } catch {
    return { status: 'unavailable', reason: 'Pontuação inválida.' };
  }
}

/** Cálculo derivado e puro: não grava resultados nem altera projeto/dataset. */
export function calculateProjectScore(
  projectInput: unknown,
  datasetInput: unknown,
): CalculationResult {
  const datasetResult = regulationSchema.safeParse(datasetInput);
  if (!datasetResult.success)
    return unavailable('invalid-dataset', 'Dataset estruturalmente inválido.');
  const dataset = datasetResult.data;
  const policy = dataset.metadata.scoring;
  const policyAvailable = Boolean(
    policy && policy.provenance.status === 'validated' && policy.provenance.validatedBy,
  );
  const policySummary: ScoringPolicySummary | undefined = policyAvailable
    ? {
        maximumLevelScore: policy!.maximumLevelScore,
        minimumTotal: policy!.minimumTotal,
        minimumRequestedLevel: policy!.minimumRequestedLevel,
      }
    : undefined;
  if (dataset.metadata.status !== 'validated')
    return unavailable(
      'pending-dataset',
      'Dataset normativo pendente de validação.',
      policySummary,
    );
  if (!policy || policy.provenance.status !== 'validated' || !policy.provenance.validatedBy)
    return unavailable('pending-policy', 'Política de cálculo pendente de validação.');
  const occurrenceInput = occurrenceProjectExportSchema.safeParse(projectInput);
  const scoringInput = occurrenceInput.success
    ? { ...activityProjectView(occurrenceInput.data), schemaVersion: '2.0' }
    : projectInput;
  const projectResult = currentProjectExportSchema.safeParse(scoringInput);
  if (!projectResult.success)
    return unavailable(
      'invalid-project',
      'Projeto tipado inválido; projetos legados exigem conversão explícita.',
      policySummary,
    );
  const project = projectResult.data;
  if (
    project.regulation.id !== dataset.metadata.regulation.id ||
    project.regulation.version !== dataset.metadata.version
  )
    return unavailable(
      'regulation-mismatch',
      'A referência do projeto não corresponde à versão do dataset.',
    );
  const request = project.userData.request;
  if (!request) return unavailable('missing-request', 'Selecione o nível pretendido.');
  const completePolicySummary = { ...policySummary!, requestedLevel: request.level };
  const issues: CalculationIssue[] = [];
  for (const activity of project.userData.activities) {
    const level = dataset.levels.find((item) => item.section === activity.selectedLevel);
    if (!level?.criteria.some((criterion) => criterion.id === activity.criterionId))
      issues.push({
        code: 'invalid-selection',
        activityId: activity.id,
        message: 'Escolha um único nível e um critério pertencente a ele.',
      });
  }
  if (issues.length) return { status: 'unavailable', issues };

  try {
    const activities: ActivityScore[] = [];
    const criteria: CriterionScore[] = [];
    const directives: DirectiveScore[] = [];
    const levels: LevelScore[] = [];
    const exactLevels = new Map<string, Decimal>();
    for (const level of dataset.levels) {
      const exactCriteria = new Map<string, Decimal>();
      for (const criterion of level.criteria) {
        const matches = project.userData.activities.filter(
          (activity) => activity.criterionId === criterion.id,
        );
        for (const activity of matches)
          activities.push({
            activityId: activity.id,
            criterionId: criterion.id,
            level: level.section,
            quantity: activity.quantity,
            score: weighted(number(activity.quantity), criterion).toNumber(),
          });
        // O máximo é compartilhado entre todas as atividades do mesmo item.
        const submitted = sum(matches.map((activity) => number(activity.quantity)));
        const counted = submitted.min(number(criterion.maxQuantity));
        const score = weighted(counted, criterion);
        exactCriteria.set(criterion.id, score);
        criteria.push({
          criterionId: criterion.id,
          directiveId: criterion.directiveId,
          level: level.section,
          code: criterion.code,
          description: criterion.description,
          unit: criterion.unit,
          submittedQuantity: submitted.toNumber(),
          countedQuantity: counted.toNumber(),
          score: score.toNumber(),
        });
      }
      const exactDirectives: Decimal[] = [];
      for (const directive of level.directives) {
        const directiveCriteria = criteria.filter(
          (criterion) => criterion.directiveId === directive.id,
        );
        const uncapped = sum(
          level.criteria
            .filter((criterion) => criterion.directiveId === directive.id)
            .map((criterion) => exactCriteria.get(criterion.id)!),
        );
        // weight da diretriz é descritivo; o peso já foi aplicado no critério.
        const score = uncapped.min(number(directive.maxScore));
        exactDirectives.push(score);
        directives.push({
          directiveId: directive.id,
          level: level.section,
          title: directive.title,
          maxScore: directive.maxScore,
          uncappedScore: uncapped.toNumber(),
          score: score.toNumber(),
          itemsUsed: directiveCriteria.filter((criterion) => criterion.submittedQuantity > 0)
            .length,
          experiencesUsed: activities.filter(
            (activity) =>
              activity.quantity > 0 &&
              activity.level === level.section &&
              directiveCriteria.some((criterion) => criterion.criterionId === activity.criterionId),
          ).length,
          maximumReached: directive.maxScore > 0 && uncapped.atLeast(number(directive.maxScore)),
        });
      }
      const uncapped = sum(exactDirectives);
      const score = uncapped.min(number(policy.maximumLevelScore));
      exactLevels.set(level.section, score);
      levels.push({
        level: level.section,
        uncappedScore: uncapped.toNumber(),
        score: score.toNumber(),
        maximumScore: policy.maximumLevelScore,
      });
    }
    const rawTotal = sum([...exactLevels.values()]);
    const total = rawTotal.roundHalfUp(policy.rounding.decimalPlaces);
    const totalMet = total.atLeast(number(policy.minimumTotal));
    const requestedLevelMet = exactLevels
      .get(request.level)!
      .atLeast(number(policy.minimumRequestedLevel));
    return {
      status:
        totalMet && requestedLevelMet
          ? 'quantitative-requirements-met'
          : 'quantitative-requirements-not-met',
      regulation: { ...project.regulation },
      policy: completePolicySummary,
      activities,
      criteria,
      directives,
      levels,
      rawTotal: rawTotal.toNumber(),
      total: total.toNumber(),
      requirements: { totalMet, requestedLevelMet, requestedLevel: request.level },
    };
  } catch {
    return unavailable('numeric-range', 'Resultado fora do intervalo numérico suportado.');
  }
}
