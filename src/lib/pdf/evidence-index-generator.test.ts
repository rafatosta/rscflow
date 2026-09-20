import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import { describe, expect, it } from "vitest"

import { createEvidenceIndexPdf } from "@/lib/document-generation"
import type { LocalProject, StoredAttachment } from "@/lib/projects"

const project: LocalProject = {
  localId: "evidence-index-project",
  name: "Processo de José",
  rscLevel: "RSC III",
  regulation: "Resolução 189/2026",
  revision: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  schemaVersion: "1",
  identification: {
    name: "José D’Ávila",
    cpf: "000.000.000-00",
    admissionDate: "2020-01-01",
    siape: "1234567",
    position: "Professor do Ensino Básico, Técnico e Tecnológico",
    institution: "Instituto Federal da Bahia",
    campus: "Vitória da Conquista",
    currentLevel: "D-III",
    degree: "Doutorado",
    personalEmail: "jose@example.com",
    professionalEmail: "jose@ifba.edu.br",
    phone: "(77) 99999-9999",
  },
  requirementOccurrences: [{
    id: "occurrence-1",
    period: "2025",
    quantity: 1,
    description: "Ação de extensão, pesquisa e orientação acadêmica.",
    results: "",
    competencies: "",
    evidence: "",
    attachmentNames: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }],
}

function attachment(index: number): StoredAttachment {
  return {
    id: `attachment-${index}`,
    projectId: project.localId,
    occurrenceId: "occurrence-1",
    name: `comprovante-${index}-educação-e-docência.pdf`,
    file: new File(["comprovante"], `comprovante-${index}.pdf`, {
      type: "application/pdf",
    }),
  }
}

async function readPdf(blob: Blob) {
  const task = getDocument({ data: new Uint8Array(await blob.arrayBuffer()) })
  const pdf = await task.promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "))
  }

  const metadata = await pdf.getMetadata()
  return { pages, pageCount: pdf.numPages, metadata, destroy: () => task.destroy() }
}

describe("gerador do índice de comprovantes", () => {
  it("gera capa e índice com metadados, identificação e glifos preservados", async () => {
    const blob = createEvidenceIndexPdf(project, [attachment(1)])
    const pdf = await readPdf(blob)

    expect(blob.type).toBe("application/pdf")
    expect(pdf.pageCount).toBe(2)
    expect(pdf.metadata.info).toMatchObject({
      Title: "Índice de comprovantes",
      Creator: "RSCFlow",
    })
    expect(pdf.pages[0]).toContain("ÍNDICE DE COMPROVANTES")
    expect(pdf.pages[0]).not.toMatch(/\b1\b/)
    expect(pdf.pages[1]).toContain("SUMÁRIO DE COMPROVANTES")
    expect(pdf.pages[1]).toContain("José D’Ávila")
    expect(pdf.pages[1]).toContain("C-001")
    expect(pdf.pages[1]).toContain("educação-e-docência.pdf")
    expect(pdf.pages[1]).toContain("Ação de extensão, pesquisa e orientação acadêmica.")
    await pdf.destroy()
  })

  it("pagina listas extensas pela altura real do conteúdo", async () => {
    const attachments = Array.from({ length: 90 }, (_, index) => attachment(index + 1))
    const pdf = await readPdf(createEvidenceIndexPdf(project, attachments))

    expect(pdf.pageCount).toBeGreaterThan(3)
    expect(pdf.pages.at(-1)).toContain("C-090")
    expect(pdf.pages.slice(1).every((page, index) => page.includes(String(index + 1)))).toBe(true)
    expect(pdf.pages.join(" ")).not.toContain("Índice de comprovantes - página")
    await pdf.destroy()
  }, 15_000)
})
