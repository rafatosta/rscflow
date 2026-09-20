import type { Regulation } from "@/domain/regulation"
import type { LocalProject, StoredAttachment } from "@/lib/projects"

export type EvidencePagePlanEntry = {
  attachment: StoredAttachment
  code: string
  pageCount: number
  firstPage: number
  lastPage: number
}

export type EvidencePagePlan = {
  entries: EvidencePagePlanEntry[]
  pageReferences: Record<string, string>
}

export function orderEvidenceAttachments(
  project: LocalProject,
  catalog: Regulation | undefined,
  attachments: StoredAttachment[],
) {
  const criterionOrder = new Map(
    (catalog?.levels.flatMap((level) => level.criteria) ?? []).map(
      (criterion, index) => [criterion.id, index],
    ),
  )
  const occurrenceOrder = new Map(
    [...(project.requirementOccurrences ?? [])]
      .sort(
        (a, b) =>
          (criterionOrder.get(a.criterionId ?? "") ?? Number.MAX_SAFE_INTEGER) -
            (criterionOrder.get(b.criterionId ?? "") ?? Number.MAX_SAFE_INTEGER) ||
          a.createdAt.localeCompare(b.createdAt),
      )
      .map((item, index) => [item.id, index]),
  )

  return [...attachments].sort(
    (a, b) =>
      (occurrenceOrder.get(a.occurrenceId) ?? Number.MAX_SAFE_INTEGER) -
        (occurrenceOrder.get(b.occurrenceId) ?? Number.MAX_SAFE_INTEGER) ||
      a.name.localeCompare(b.name, "pt-BR"),
  )
}

export function isPdfAttachment(attachment: StoredAttachment) {
  return (
    attachment.file.type === "application/pdf" ||
    attachment.name.toLowerCase().endsWith(".pdf")
  )
}

async function pdfPageCount(attachment: StoredAttachment) {
  try {
    const { getDocument } = await import("pdfjs-dist")
    const task = getDocument({
      data: new Uint8Array(await attachment.file.arrayBuffer()),
    })
    try {
      const document = await task.promise
      return document.numPages
    } finally {
      await task.destroy()
    }
  } catch {
    // Um arquivo inválido ainda ocupa uma página de aviso no PDF final.
    return 1
  }
}

export async function buildEvidencePagePlan(
  project: LocalProject,
  catalog: Regulation | undefined,
  attachments: StoredAttachment[],
  indexPageCount: number,
): Promise<EvidencePagePlan> {
  const ordered = orderEvidenceAttachments(project, catalog, attachments)
  const counts = await Promise.all(
    ordered.map((attachment) =>
      isPdfAttachment(attachment) ? pdfPageCount(attachment) : 1,
    ),
  )
  const occurrences = new Map(
    (project.requirementOccurrences ?? []).map((occurrence) => [
      occurrence.id,
      occurrence,
    ]),
  )
  const references = new Map<string, string[]>()
  let nextPage = indexPageCount

  const entries = ordered.map((attachment, index): EvidencePagePlanEntry => {
    const pageCount = Math.max(1, counts[index] ?? 1)
    const firstPage = nextPage
    const lastPage = firstPage + pageCount - 1
    nextPage = lastPage + 1
    const criterionId = occurrences.get(attachment.occurrenceId)?.criterionId

    if (criterionId) {
      const value = firstPage === lastPage ? String(firstPage) : `${firstPage}–${lastPage}`
      const current = references.get(criterionId) ?? []
      if (!current.includes(value)) current.push(value)
      references.set(criterionId, current)
    }

    return {
      attachment,
      code: `C-${String(index + 1).padStart(3, "0")}`,
      pageCount,
      firstPage,
      lastPage,
    }
  })

  return {
    entries,
    pageReferences: Object.fromEntries(
      [...references].map(([criterionId, values]) => [criterionId, values.join(", ")]),
    ),
  }
}
