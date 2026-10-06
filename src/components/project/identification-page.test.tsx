import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { IdentificationPage } from "@/components/project/identification-page"
import type { LocalProject } from "@/lib/projects"

const project: LocalProject = {
  localId: "project-identification",
  name: "Projeto de teste",
  rscLevel: "RSC II",
  regulation: "Resolução 189/2026",
  revision: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  schemaVersion: "1",
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
    hasPreviousRsc: true,
  },
}

describe("identificação de RSC anterior", () => {
  it("exibe a observação e registra qualquer data informada sem bloquear o formulário", async () => {
    const onSave = vi.fn()
    render(<IdentificationPage project={project} onSave={onSave} />)

    expect(screen.getByText("Para alteração do nível de RSC, as atividades deverão ter sido realizadas em, no mínimo, 3 (três) anos após a data da última concessão.")).toBeInTheDocument()
    expect(screen.getByLabelText("Número do processo anterior")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Data da concessão do RSC anterior"), { target: { value: "2040-01-01" } })

    await waitFor(() => {
      expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({
        hasPreviousRsc: true,
        previousRscGrantDate: "2040-01-01",
      }))
    })
  })
})
