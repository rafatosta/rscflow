import type { Evidence } from './models';
import type { RscLevel } from './regulation';
import type { StoredFile } from './criterion-entry';

export type CalculationIssue = {
  code:
    | 'invalid-project'
    | 'invalid-dataset'
    | 'pending-dataset'
    | 'pending-policy'
    | 'regulation-mismatch'
    | 'missing-request'
    | 'invalid-selection'
    | 'normative-conflict'
    | 'numeric-range';
  message: string;
  activityId?: string;
};
export type ActivityScore = {
  activityId: string;
  criterionId: string;
  level: RscLevel;
  quantity: number;
  /** Pontuação individual com limite do item, antes da consolidação e dos tetos. */
  score: number;
};
export type CriterionScore = {
  criterionId: string;
  directiveId: string;
  level: RscLevel;
  code: string;
  description: string;
  unit: string;
  submittedQuantity: number;
  countedQuantity: number;
  score: number;
};
export type DirectiveScore = {
  directiveId: string;
  level: RscLevel;
  title: string;
  maxScore: number;
  uncappedScore: number;
  score: number;
  itemsUsed: number;
  experiencesUsed: number;
  maximumReached: boolean;
};
export type LevelScore = {
  level: RscLevel;
  uncappedScore: number;
  score: number;
  maximumScore: number;
};
export type ScoringPolicySummary = {
  maximumLevelScore: number;
  minimumTotal: number;
  minimumRequestedLevel: number;
  requestedLevel?: RscLevel;
};
export type NormativeValidation = {
  status: 'validated' | 'provisional';
  message?: string;
};
export type RequirementProof = Evidence & { files: StoredFile[] };
export type RequirementLaunch = {
  id: string;
  title: string;
  quantity: number;
  proofs: RequirementProof[];
};
/**
 * Projeção derivada do projeto e do catálogo. Não é persistida nem substitui o motor de cálculo.
 * `calculatedScore` ainda não aplica o teto da quantidade; `consideredScore` já o respeita.
 */
export type RequirementProjection = {
  level: RscLevel;
  criterionId: string;
  code: string;
  description: string;
  unit: string;
  launches: RequirementLaunch[];
  quantity: number;
  consideredQuantity: number;
  pointsPerUnit: number;
  weight: number;
  calculatedScore: number;
  maximumQuantity: number;
  directiveMaximumScore: number;
  consideredScore: number;
  validation: NormativeValidation;
};
export type CalculationResult =
  | { status: 'unavailable'; issues: CalculationIssue[]; policy?: ScoringPolicySummary }
  | {
      status: 'quantitative-requirements-met' | 'quantitative-requirements-not-met';
      regulation: { id: string; version: string | null };
      policy: ScoringPolicySummary & { requestedLevel: RscLevel };
      validation: NormativeValidation;
      activities: ActivityScore[];
      criteria: CriterionScore[];
      requirementProjection: RequirementProjection[];
      directives: DirectiveScore[];
      levels: LevelScore[];
      rawTotal: number;
      total: number;
      requirements: { totalMet: boolean; requestedLevelMet: boolean; requestedLevel: RscLevel };
    };
