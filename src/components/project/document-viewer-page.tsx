import * as React from "react"
import { BookOpen, Pencil } from "lucide-react"

import { PdfArtifactViewer } from "@/components/pdf-artifact-viewer"
import { buildMemorialTextBase } from "@/components/project/memorial-content"
import { projectSectionHref } from "@/components/project/project-navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Regulation } from "@/domain/regulation"
import { usePdfArtifact } from "@/hooks/use-pdf-artifact"
import { createEvidenceIndexPdf, createFormsPdf, createMemorialPdf } from "@/lib/document-generation"
import { getStoredAttachments, type LocalProject, type MemorialSection, type StoredAttachment } from "@/lib/projects"

export type PreviewDocument = { id: "memorial" | "forms" | "evidence" }

function projectSlug(project: LocalProject) {
  return project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "projeto"
}

export function DocumentViewer({ project, catalog, documentId, onMemorialChange }: { project: LocalProject; catalog?: Regulation; documentId: PreviewDocument["id"]; onMemorialChange: (sections: MemorialSection[]) => void }) {
  if (documentId === "memorial") return <MemorialPdfPreview project={project} catalog={catalog} onMemorialChange={onMemorialChange} />
  if (documentId === "forms") return <FormsPdfPreview project={project} catalog={catalog} />
  return <EvidenceIndexPdfPreview project={project} />
}

function MemorialPdfPreview({ project, catalog, onMemorialChange }: { project: LocalProject; catalog?: Regulation; onMemorialChange: (sections: MemorialSection[]) => void }) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const filename = `${projectSlug(project)}-memorial-descritivo.pdf`
  const state = usePdfArtifact(filename, () => createMemorialPdf(project), [filename, project])
  return <>
    <div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(true)}><BookOpen /> Autopreencher textos</Button><Button variant="outline" nativeButton={false} render={<a href={projectSectionHref(project, "memorial")} />}><Pencil /> Editar textos</Button></div>
    <PdfArtifactViewer {...state} />
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Autopreencher o Memorial?</DialogTitle><DialogDescription>Um texto-base editável será criado com os dados cadastrados no processo. O conteúdo atual das seções será substituído.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => { onMemorialChange(buildMemorialTextBase(project, catalog)); setDialogOpen(false) }}>Autopreencher</Button></DialogFooter></DialogContent></Dialog>
  </>
}

function FormsPdfPreview({ project, catalog }: { project: LocalProject; catalog?: Regulation }) {
  const evidence = useEvidencePageMap(project, catalog)
  if (evidence.loading || evidence.error) return <PdfArtifactViewer loading={evidence.loading} error={evidence.error} />
  return <FormsArtifact project={project} catalog={catalog} firstEvidencePages={evidence.firstEvidencePages} />
}

function FormsArtifact({ project, catalog, firstEvidencePages }: { project: LocalProject; catalog?: Regulation; firstEvidencePages: Record<string, number> }) {
  const filename = `${projectSlug(project)}-formularios-normativos.pdf`
  const artifact = usePdfArtifact(filename, () => createFormsPdf(project, catalog, firstEvidencePages), [filename, project, catalog, firstEvidencePages])
  return <PdfArtifactViewer {...artifact} />
}

function EvidenceIndexPdfPreview({ project }: { project: LocalProject }) {
  const [attachments, setAttachments] = React.useState<StoredAttachment[]>()
  const [error, setError] = React.useState<Error>()
  React.useEffect(() => {
    let active = true
    setAttachments(undefined)
    void getStoredAttachments(project.localId).then((value) => { if (active) setAttachments(value) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason : new Error("Não foi possível ler os comprovantes.")) })
    return () => { active = false }
  }, [project.localId])
  if (!attachments || error) return <PdfArtifactViewer loading={!attachments && !error} error={error} />
  return <EvidenceIndexArtifact project={project} attachments={attachments} />
}

function EvidenceIndexArtifact({ project, attachments }: { project: LocalProject; attachments: StoredAttachment[] }) {
  const filename = `${projectSlug(project)}-indice-comprovantes.pdf`
  const state = usePdfArtifact(filename, () => createEvidenceIndexPdf(project, attachments), [filename, project, attachments])
  return <><p className="mt-6 text-sm text-muted-foreground">Este documento é um índice. Os arquivos originais permanecem separados no pacote ZIP.</p><PdfArtifactViewer {...state} /></>
}

function useEvidencePageMap(project: LocalProject, catalog?: Regulation) {
  const [state, setState] = React.useState<{ firstEvidencePages: Record<string, number>; loading: boolean; error?: Error }>({ firstEvidencePages: {}, loading: true })
  React.useEffect(() => {
    let active = true
    const tasks: Array<{ destroy: () => Promise<void> }> = []
    setState((value) => ({ ...value, loading: true, error: undefined }))
    void getStoredAttachments(project.localId).then(async (attachments) => {
      const ordered = orderAttachments(project, catalog, attachments)
      let page = 3
      const firstEvidencePages: Record<string, number> = {}
      for (const attachment of ordered) {
        const occurrence = (project.requirementOccurrences ?? []).find((item) => item.id === attachment.occurrenceId)
        if (occurrence?.criterionId && firstEvidencePages[occurrence.criterionId] === undefined) firstEvidencePages[occurrence.criterionId] = page
        if (attachment.file.type === "application/pdf" || attachment.name.toLowerCase().endsWith(".pdf")) {
          const { getDocument } = await import("pdfjs-dist")
          const task = getDocument({ data: new Uint8Array(await attachment.file.arrayBuffer()) })
          tasks.push(task)
          try { const document = await task.promise; page += document.numPages; document.cleanup() } catch { page += 1 }
        } else page += 1
      }
      if (active) setState({ firstEvidencePages, loading: false })
    }).catch((reason: unknown) => { if (active) setState({ firstEvidencePages: {}, loading: false, error: reason instanceof Error ? reason : new Error("Não foi possível mapear os comprovantes.") }) })
    return () => { active = false; tasks.forEach((task) => { void task.destroy() }) }
  }, [project, catalog])
  return state
}

function orderAttachments(project: LocalProject, catalog: Regulation | undefined, attachments: StoredAttachment[]) {
  const criterionOrder = new Map((catalog?.levels.flatMap((level) => level.criteria) ?? []).map((criterion, index) => [criterion.id, index]))
  const occurrenceOrder = new Map([...(project.requirementOccurrences ?? [])].sort((a, b) => (criterionOrder.get(a.criterionId ?? "") ?? Number.MAX_SAFE_INTEGER) - (criterionOrder.get(b.criterionId ?? "") ?? Number.MAX_SAFE_INTEGER) || a.createdAt.localeCompare(b.createdAt)).map((item, index) => [item.id, index]))
  return [...attachments].sort((a, b) => (occurrenceOrder.get(a.occurrenceId) ?? Number.MAX_SAFE_INTEGER) - (occurrenceOrder.get(b.occurrenceId) ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name, "pt-BR"))
}
