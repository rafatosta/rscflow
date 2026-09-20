import { describe, expect, it } from "vitest"

import { applyProjectSettings, type LocalProject } from "@/lib/projects"

const project: LocalProject = {
  localId: "project-1",
  name: "Projeto original",
  rscLevel: "RSC II",
  regulation: "regulation-1",
  revision: 1,
  createdAt: "2026-09-20T00:00:00.000Z",
  updatedAt: "2026-09-20T00:00:00.000Z",
  schemaVersion: "1.0",
  requirementOccurrences: [{
    id: "occurrence-1",
    criterionId: "rsc-ii-a-1",
    selectedLevel: "rsc-ii",
    period: "2025",
    quantity: 1,
    description: "Atividade",
    results: "",
    competencies: "",
    evidence: "",
    attachmentNames: [],
    generatedText: "Narrativa gerada",
    createdAt: "2026-09-20T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
  }],
}

describe("applyProjectSettings", () => {
  it("mantém os enquadramentos ao alterar nome e RSC pretendido", () => {
    const updated = applyProjectSettings(project, { name: "Novo nome", rscLevel: "RSC III", regulation: "regulation-1" })

    expect(updated.name).toBe("Novo nome")
    expect(updated.rscLevel).toBe("RSC III")
    expect(updated.requirementOccurrences).toEqual(project.requirementOccurrences)
  })

  it("remove enquadramentos incompatíveis ao trocar o regulamento", () => {
    const updated = applyProjectSettings(project, { name: project.name, rscLevel: project.rscLevel, regulation: "regulation-2" })
    const occurrence = updated.requirementOccurrences?.[0]

    expect(occurrence?.criterionId).toBeUndefined()
    expect(occurrence?.selectedLevel).toBeUndefined()
    expect(occurrence?.description).toBe("Atividade")
    expect(occurrence?.generatedText).toBe("Narrativa gerada")
    expect(occurrence?.isGeneratedTextOutdated).toBe(true)
  })
})
