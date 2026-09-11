import type { RscLevel } from './regulation';

export type CalculationIssue = {
  code:
    | 'invalid-project'
    | 'invalid-dataset'
    | 'pending-dataset'
    | 'pending-policy'
    | 'regulation-mismatch'
    | 'missing-request'
    | 'invalid-selection'
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
export type CalculationResult =
  | { status: 'unavailable'; issues: CalculationIssue[]; policy?: ScoringPolicySummary }
  | {
      status: 'quantitative-requirements-met' | 'quantitative-requirements-not-met';
      regulation: { id: string; version: string };
      policy: ScoringPolicySummary & { requestedLevel: RscLevel };
      activities: ActivityScore[];
      criteria: CriterionScore[];
      directives: DirectiveScore[];
      levels: LevelScore[];
      rawTotal: number;
      total: number;
      requirements: { totalMet: boolean; requestedLevelMet: boolean; requestedLevel: RscLevel };
    };
