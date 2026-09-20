import { describe, expect, it } from "vitest"

import { createProjectBackup, readProjectBackup } from "@/lib/project-backup"
import type { LocalProject, StoredAttachment } from "@/lib/projects"

const project: LocalProject = {
  localId: "project-1",
  name: "Projeto de teste",
  rscLevel: "RSC II",
  regulation: "regulation-1",
  revision: 2,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  schemaVersion: "1.0",
}

describe("backup do projeto", () => {
  it("preserva o projeto e seus anexos no arquivo rscflow", async () => {
    const attachment: StoredAttachment = {
      id: "attachment-1",
      projectId: project.localId,
      occurrenceId: "occurrence-1",
      name: "comprovante.txt",
      file: new File(["conteúdo do comprovante"], "comprovante.txt", { type: "text/plain", lastModified: 123 }),
    }

    const backup = await createProjectBackup(project, [attachment])
    const restored = await readProjectBackup(new File([backup], "projeto.rscflow"))

    expect(restored.project).toEqual(project)
    expect(restored.attachments).toHaveLength(1)
    expect(restored.attachments[0]).toMatchObject({ occurrenceId: "occurrence-1", name: "comprovante.txt" })
    expect(await restored.attachments[0].file.text()).toBe("conteúdo do comprovante")
  })
})
