import { describe, expect, it } from "vitest"

import { applyProjectSettings, localProjectSchema, type LocalProject } from "@/lib/projects"

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

describe("identificação do projeto", () => {
  it("mantém compatibilidade com dados legados e aceita a data informada sem validar prazo", () => {
    const legacyProject = {
      ...project,
      identification: {
        name: "Docente",
        cpf: "000.000.000-00",
        admissionDate: "2020-01-01",
        siape: "1234567",
        position: "Professor",
        institution: "Instituto Federal da Bahia",
        campus: "Salvador",
        currentLevel: "RSC I",
        degree: "Mestrado",
        personalEmail: "docente@example.com",
        professionalEmail: "docente@ifba.edu.br",
        phone: "(71) 99999-9999",
      },
    }
    const legacyParsed = localProjectSchema.parse(legacyProject)
    const withPreviousRsc = localProjectSchema.parse({
      ...legacyProject,
      identification: {
        ...legacyProject.identification,
        hasPreviousRsc: true,
        previousRscGrantDate: "2040-01-01",
        previousRscProcessNumber: "23000.123456/2020-12",
      },
    })

    expect(legacyParsed.identification?.hasPreviousRsc).toBeUndefined()
    expect(withPreviousRsc.identification).toMatchObject({
      hasPreviousRsc: true,
      previousRscGrantDate: "2040-01-01",
      previousRscProcessNumber: "23000.123456/2020-12",
    })
  })
})
