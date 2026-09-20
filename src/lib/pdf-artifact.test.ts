import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import { describe, expect, it, vi } from "vitest"

import { createMemorialPdf } from "@/lib/document-generation"
import { createPdfArtifact, downloadPdfArtifact } from "@/lib/pdf-artifact"
import type { LocalProject } from "@/lib/projects"

const project: LocalProject = {
  localId: "project-1",
  name: "Processo de José",
  rscLevel: "RSC III",
  regulation: "Resolução 42",
  revision: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  schemaVersion: "1",
  memorialSections: [{ id: "introduction", content: "Ação, educação, trajetória — “docência” e coração." }],
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

  return { pages, pageCount: pdf.numPages, destroy: () => task.destroy() }
}

describe("PdfArtifact", () => {
  it("mantém no Blob exatamente os bytes entregues à prévia", async () => {
    const artifact = await createPdfArtifact("memorial.pdf", () => createMemorialPdf(project))
    expect(new Uint8Array(await artifact.blob.arrayBuffer())).toEqual(artifact.bytes)
  })

  it("baixa o Blob armazenado sem chamar novamente o gerador", async () => {
    const generate = vi.fn(() => createMemorialPdf(project))
    const artifact = await createPdfArtifact("memorial.pdf", generate)
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:memorial")
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined)
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)
    downloadPdfArtifact(artifact)
    expect(generate).toHaveBeenCalledTimes(1)
    expect(createObjectURL).toHaveBeenCalledWith(artifact.blob)
    expect(click).toHaveBeenCalledTimes(1)
  })

  it("preserva acentos, cedilha, travessão e aspas tipográficas sem substituí-los por interrogação", async () => {
    const pdf = await readPdf(createMemorialPdf(project))
    const text = pdf.pages.join(" ")
    expect(text).toContain("Ação, educação, trajetória — “docência” e coração.")
    expect(text).not.toContain("trajetória ?")
    await pdf.destroy()
  })

  it("pagina conteúdo longo e registra no sumário a página real de cada seção", async () => {
    const longProject = {
      ...project,
      memorialSections: [
        { id: "introduction", content: "atividade docente ".repeat(2_000) },
        { id: "conclusion", content: "Síntese da trajetória." },
      ],
    }
    const pdf = await readPdf(createMemorialPdf(longProject))
    const conclusionPhysicalPage = pdf.pages.findIndex((page, index) => index >= 2 && page.includes("2 CONCLUSÃO")) + 1
    const conclusionVisiblePage = conclusionPhysicalPage - 2

    expect(pdf.pageCount).toBeGreaterThan(4)
    expect(pdf.pages[0]).not.toMatch(/\b1\b/)
    expect(pdf.pages[1]).toContain(`2 CONCLUSÃO`)
    expect(pdf.pages[1]).toContain(String(conclusionVisiblePage))
    expect(pdf.pages[conclusionPhysicalPage - 1]).toContain(String(conclusionVisiblePage))
    await pdf.destroy()
  }, 15_000)
})
