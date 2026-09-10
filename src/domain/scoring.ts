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
  submittedQuantity: number;
  countedQuantity: number;
  score: number;
};
export type DirectiveScore = {
  directiveId: string;
  level: RscLevel;
  uncappedScore: number;
  score: number;
};
export type LevelScore = { level: RscLevel; uncappedScore: number; score: number };
export type CalculationResult =
  | { status: 'unavailable'; issues: CalculationIssue[] }
  | {
      status: 'quantitative-requirements-met' | 'quantitative-requirements-not-met';
      regulation: { id: string; version: string };
      activities: ActivityScore[];
      criteria: CriterionScore[];
      directives: DirectiveScore[];
      levels: LevelScore[];
      rawTotal: number;
      total: number;
      requirements: { totalMet: boolean; requestedLevelMet: boolean; requestedLevel: RscLevel };
    };
