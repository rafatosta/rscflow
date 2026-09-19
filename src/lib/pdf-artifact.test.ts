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
    const bytes = new Uint8Array(await createMemorialPdf(project).arrayBuffer())
    const text = new TextDecoder("windows-1252").decode(bytes)
    expect(text).toContain("Ação, educação, trajetória — “docência” e coração.")
    expect(text).not.toContain("trajetória ?")
  })

  it("pagina conteúdo textual longo dentro do limite de linhas", async () => {
    const longProject = { ...project, memorialSections: [{ id: "introduction", content: "atividade docente ".repeat(2_000) }] }
    const bytes = new Uint8Array(await createMemorialPdf(longProject).arrayBuffer())
    const source = new TextDecoder("windows-1252").decode(bytes)
    const pageCount = Number(source.match(/\/Count (\d+)/)?.[1])
    expect(pageCount).toBeGreaterThan(3)
    expect(source.match(/0 -15 Td/g)?.length).toBeLessThanOrEqual((pageCount - 2) * 43)
  })
})
