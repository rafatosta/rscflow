import type { Regulation } from "@/domain/regulation"
import { calculateLevelProjection } from "@/domain/scoring"
import type { LocalProject } from "@/lib/projects"

export type NormativeCriterionRow = {
  code: string
  description: string
  factor: number
  unit: string
  maximumQuantity: number
  weight: number
  provenQuantity: number
  finalScore?: number
  proofPage?: number
}

export type NormativeDirective = {
  code: string
  title: string
  weight: number
  maximumScore: number
  obtainedScore: number
  criteria: NormativeCriterionRow[]
}

export type NormativeLevel = {
  level: "rsc-i" | "rsc-ii" | "rsc-iii"
  obtainedScore: number
  directives: NormativeDirective[]
}

export type NormativeProcessDocument = {
  regulation: { authority: string; number: string; year: number }
  request: {
    fields: Array<{ label: string; value: string }>
    requestedLevel?: NormativeLevel["level"]
  }
  levels: NormativeLevel[]
  totalScore: number
  provisional: boolean
}

const requestedLevels: Record<string, NormativeLevel["level"] | undefined> = {
  "RSC 1": "rsc-i", "RSC I": "rsc-i", "RSC 2": "rsc-ii", "RSC II": "rsc-ii", "RSC 3": "rsc-iii", "RSC III": "rsc-iii",
}

/** Projeta os anexos sem misturar regras de domínio com o desenho do PDF. */
export function buildNormativeProcessDocument(
  project: LocalProject,
  regulation: Regulation,
  firstEvidencePages: Record<string, number> = {},
): NormativeProcessDocument {
  const person = project.identification
  const occurrences = project.requirementOccurrences ?? []
  const levels = regulation.levels.map((level): NormativeLevel => {
    const projection = calculateLevelProjection(regulation, level.section, occurrences)
    return {
      level: level.section,
      obtainedScore: projection.total,
      directives: level.directives.map((directive) => ({
        code: directive.code,
        title: directive.title,
        weight: directive.weight,
        maximumScore: directive.maxScore,
        obtainedScore: projection.directiveScores[directive.id] ?? 0,
        criteria: level.criteria.filter((criterion) => criterion.directiveId === directive.id).map((criterion) => {
          const score = projection.criterionScores[criterion.id]
          return {
            code: criterion.code,
            description: criterion.description,
            factor: criterion.factor,
            unit: criterion.unit,
            maximumQuantity: criterion.maxQuantity,
            weight: criterion.weight,
            provenQuantity: score?.quantity ?? 0,
            finalScore: score?.blocked ? undefined : score?.score ?? 0,
            proofPage: firstEvidencePages[criterion.id],
          }
        }),
      })),
    }
  })

  return {
    regulation: regulation.metadata.regulation,
    request: {
      requestedLevel: requestedLevels[project.rscLevel],
      fields: [
        ["Nome do(a) docente", person?.name ?? project.name],
        ["CPF", person?.cpf ?? ""],
        ["Matrícula SIAPE", person?.siape ?? ""],
        ["Cargo", person?.position ?? ""],
        ["Campus de lotação", person?.campus ?? ""],
        ["E-mail", person?.professionalEmail || person?.personalEmail || ""],
        ["Telefone", person?.phone ?? ""],
        ["RT ou RSC atual", person?.currentLevel ?? ""],
        ["Portaria de concessão", ""],
        ["Data de vigência", ""],
      ].map(([label, value]) => ({ label, value })),
    },
    levels,
    totalScore: levels.reduce((total, level) => total + level.obtainedScore, 0),
    provisional: regulation.metadata.status !== "validated" || levels.some((level) => regulation.levels.find((item) => item.section === level.level)?.status !== "validated"),
  }
}
