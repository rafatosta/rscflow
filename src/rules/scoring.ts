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
} from '@/domain/scoring';
import { Decimal } from './decimal';

const number = Decimal.from;
const sum = (values: Decimal[]) => values.reduce((total, value) => total.add(value), number(0));
const weighted = (quantity: Decimal, criterion: Criterion) =>
  quantity
    .min(number(criterion.maxQuantity))
    .multiply(number(criterion.factor))
    .multiply(number(criterion.weight));
const unavailable = (code: CalculationIssue['code'], message: string): CalculationResult => ({
  status: 'unavailable',
  issues: [{ code, message }],
});

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
  if (result.data.provenance.status !== 'validated' || !result.data.provenance.validatedBy)
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
  const projectResult = currentProjectExportSchema.safeParse(projectInput);
  if (!projectResult.success)
    return unavailable(
      'invalid-project',
      'Projeto tipado inválido; projetos legados exigem conversão explícita.',
    );
  const datasetResult = regulationSchema.safeParse(datasetInput);
  if (!datasetResult.success)
    return unavailable('invalid-dataset', 'Dataset estruturalmente inválido.');
  const dataset = datasetResult.data;
  const project = projectResult.data;
  if (dataset.metadata.status !== 'validated')
    return unavailable('pending-dataset', 'Dataset normativo pendente de validação.');
  const policy = dataset.metadata.scoring;
  if (!policy || policy.provenance.status !== 'validated' || !policy.provenance.validatedBy)
    return unavailable('pending-policy', 'Política de cálculo pendente de validação.');
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
          submittedQuantity: submitted.toNumber(),
          countedQuantity: counted.toNumber(),
          score: score.toNumber(),
        });
      }
      const exactDirectives: Decimal[] = [];
      for (const directive of level.directives) {
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
          uncappedScore: uncapped.toNumber(),
          score: score.toNumber(),
        });
      }
      const uncapped = sum(exactDirectives);
      const score = uncapped.min(number(policy.maximumLevelScore));
      exactLevels.set(level.section, score);
      levels.push({
        level: level.section,
        uncappedScore: uncapped.toNumber(),
        score: score.toNumber(),
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
