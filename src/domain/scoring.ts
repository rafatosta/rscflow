import type { Regulation, RegulationCriterion } from "@/domain/regulation"
import type { RequirementOccurrence } from "@/lib/projects"

export type CriterionScore = {
  criterionId: string
  quantity: number
  cappedQuantity: number
  score: number
  blocked: boolean
}

export type LevelProjection = {
  levelId: "rsc-i" | "rsc-ii" | "rsc-iii"
  criterionScores: Record<string, CriterionScore>
  directiveScores: Record<string, number>
  total: number
  provisional: boolean
}

const isBlocked = (criterion: RegulationCriterion) => criterion.provenance.issue?.type === "normative-conflict"

export function calculateLevelProjection(regulation: Regulation, levelId: LevelProjection["levelId"], occurrences: RequirementOccurrence[]): LevelProjection {
  const level = regulation.levels.find((item) => item.section === levelId)
  if (!level) throw new Error(`Nível regulatório não encontrado: ${levelId}`)

  const criterionScores = Object.fromEntries(level.criteria.map((criterion) => {
    const quantity = occurrences.filter((item) => item.selectedLevel === levelId && item.criterionId === criterion.id)
      .reduce((total, item) => total + item.quantity, 0)
    const cappedQuantity = Math.min(quantity, criterion.maxQuantity)
    const blocked = isBlocked(criterion)
    return [criterion.id, { criterionId: criterion.id, quantity, cappedQuantity, score: blocked ? 0 : cappedQuantity * criterion.factor * criterion.weight, blocked }]
  }))

  const directiveScores = Object.fromEntries(level.directives.map((directive) => {
    const subtotal = level.criteria.filter((criterion) => criterion.directiveId === directive.id)
      .reduce((total, criterion) => total + criterionScores[criterion.id].score, 0)
    return [directive.id, Math.min(subtotal, directive.maxScore)]
  }))
  const total = Math.min(Object.values(directiveScores).reduce((sum, score) => sum + score, 0), regulation.metadata.scoring.maximumLevelScore)

  return { levelId, criterionScores, directiveScores, total, provisional: level.status !== "validated" || regulation.metadata.status !== "validated" }
}
