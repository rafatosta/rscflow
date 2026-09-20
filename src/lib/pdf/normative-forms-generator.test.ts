import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import { describe, expect, it } from "vitest"

import { loadIfbaRegulation } from "@/data/regulations/load"
import { createFormsPdf } from "@/lib/document-generation"
import type { LocalProject } from "@/lib/projects"

const project: LocalProject = {
  localId: "project-pdf",
  name: "Processo de José",
  rscLevel: "RSC III",
  regulation: "Resolução 189/2026",
  revision: 1,
  createdAt: "2026-09-19T00:00:00.000Z",
  updatedAt: "2026-09-19T00:00:00.000Z",
  schemaVersion: "1",
  identification: {
    name: "João D’Ávila — Ação e Coração",
    cpf: "000.000.000-00",
    admissionDate: "2020-01-01",
    siape: "1234567",
    position: "Professor do Ensino Básico, Técnico e Tecnológico",
    institution: "Instituto Federal da Bahia",
    campus: "Vitória da Conquista",
    currentLevel: "D-III",
    degree: "Doutorado",
    personalEmail: "joao@example.com",
    professionalEmail: "joao@ifba.edu.br",
    phone: "(71) 99999-9999",
  },
  requirementOccurrences: [],
}

describe("gerador dos formulários normativos", () => {
  it("abre os bytes definitivos no pdfjs e preserva estrutura, metadados e glifos", async () => {
    const catalog = loadIfbaRegulation()
    const criterionId = catalog.levels[0]?.criteria[0]?.id
    const blob = createFormsPdf(project, catalog, criterionId ? { [criterionId]: "2–4, 5" } : {})
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const task = getDocument({ data: bytes })
    const pdf = await task.promise
    const metadata = await pdf.getMetadata()
    const texts: string[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      texts.push(content.items.map((item) => "str" in item ? item.str : "").join(" "))
    }

    expect(pdf.numPages).toBeGreaterThanOrEqual(7)
    expect(metadata.info).toMatchObject({ Title: "Formulários e anexos do processo de RSC", Creator: "RSCFlow" })
    expect(texts.join(" ")).toContain("João D’Ávila — Ação e Coração")
    expect(texts.join(" ")).toContain("ANEXO VII")
    expect(texts.join(" ")).toContain("QUADRO DE PONTUAÇÃO MÁXIMA DOS ITENS")
    expect(texts.join(" ")).toContain("RECONHECIMENTO DE SABERES E COMPETÊNCIAS - RSC I")
    expect(texts.join(" ")).toContain("Subtotal")
    expect(texts.join(" ")).toContain("TOTAL GERAL")
    expect(texts.join(" ")).toContain("2–4, 5")

    await task.destroy()
  }, 15_000)
})
