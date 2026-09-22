import * as React from "react"
import { BookOpen, Pencil } from "lucide-react"

import { PdfArtifactViewer } from "@/components/pdf-artifact-viewer"
import { buildMemorialTextBase } from "@/components/project/memorial-content"
import { projectSectionHref } from "@/components/project/project-navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Regulation } from "@/domain/regulation"
import { usePdfArtifact } from "@/hooks/use-pdf-artifact"
import { createEvidenceIndexPdf, createEvidencePageReferences, createFormsPdf, createMemorialPdf } from "@/lib/document-generation"
import type { PdfArtifact } from "@/lib/pdf-artifact"
import { getStoredAttachments, type LocalProject, type MemorialSection, type StoredAttachment } from "@/lib/projects"

export type PreviewDocument = { id: "memorial" | "forms" | "evidence" }

function projectSlug(project: LocalProject) {
  return project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "projeto"
}

export function DocumentViewer({ project, catalog, documentId, onMemorialChange, onPdfArtifactChange }: { project: LocalProject; catalog?: Regulation; documentId: PreviewDocument["id"]; onMemorialChange: (sections: MemorialSection[]) => void; onPdfArtifactChange: (artifact?: PdfArtifact) => void }) {
  if (documentId === "memorial") return <MemorialPdfPreview project={project} catalog={catalog} onMemorialChange={onMemorialChange} onPdfArtifactChange={onPdfArtifactChange} />
  if (documentId === "forms") return <FormsPdfPreview project={project} catalog={catalog} onPdfArtifactChange={onPdfArtifactChange} />
  return <EvidenceIndexPdfPreview project={project} catalog={catalog} onPdfArtifactChange={onPdfArtifactChange} />
}

function MemorialPdfPreview({ project, catalog, onMemorialChange, onPdfArtifactChange }: { project: LocalProject; catalog?: Regulation; onMemorialChange: (sections: MemorialSection[]) => void; onPdfArtifactChange: (artifact?: PdfArtifact) => void }) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const filename = `${projectSlug(project)}-memorial-descritivo.pdf`
  const state = usePdfArtifact(filename, () => createMemorialPdf(project), [filename, project])
  React.useEffect(() => { onPdfArtifactChange(state.artifact); return () => onPdfArtifactChange(undefined) }, [onPdfArtifactChange, state.artifact])
  return <>
    <div className="mt-6 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(true)}><BookOpen /> Autopreencher textos</Button><Button variant="outline" nativeButton={false} render={<a href={projectSectionHref(project, "memorial")} />}><Pencil /> Editar textos</Button></div>
    <PdfArtifactViewer {...state} />
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Autopreencher o Memorial?</DialogTitle><DialogDescription>Um texto-base editável será criado com os dados cadastrados no processo. O conteúdo atual das seções será substituído.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => { onMemorialChange(buildMemorialTextBase(project, catalog)); setDialogOpen(false) }}>Autopreencher</Button></DialogFooter></DialogContent></Dialog>
  </>
}

function FormsPdfPreview({ project, catalog, onPdfArtifactChange }: { project: LocalProject; catalog?: Regulation; onPdfArtifactChange: (artifact?: PdfArtifact) => void }) {
  const evidence = useEvidencePageMap(project, catalog)
  if (evidence.loading || evidence.error) return <PdfArtifactViewer loading={evidence.loading} error={evidence.error} />
  return <FormsArtifact project={project} catalog={catalog} evidencePageReferences={evidence.evidencePageReferences} onPdfArtifactChange={onPdfArtifactChange} />
}

function FormsArtifact({ project, catalog, evidencePageReferences, onPdfArtifactChange }: { project: LocalProject; catalog?: Regulation; evidencePageReferences: Record<string, string>; onPdfArtifactChange: (artifact?: PdfArtifact) => void }) {
  const filename = `${projectSlug(project)}-formularios-normativos.pdf`
  const artifact = usePdfArtifact(filename, () => createFormsPdf(project, catalog, evidencePageReferences), [filename, project, catalog, evidencePageReferences])
  React.useEffect(() => { onPdfArtifactChange(artifact.artifact); return () => onPdfArtifactChange(undefined) }, [onPdfArtifactChange, artifact.artifact])
  return <PdfArtifactViewer {...artifact} />
}

function EvidenceIndexPdfPreview({ project, catalog, onPdfArtifactChange }: { project: LocalProject; catalog?: Regulation; onPdfArtifactChange: (artifact?: PdfArtifact) => void }) {
  const [attachments, setAttachments] = React.useState<StoredAttachment[]>()
  const [error, setError] = React.useState<Error>()
  React.useEffect(() => {
    let active = true
    setAttachments(undefined)
    void getStoredAttachments(project.localId).then((value) => { if (active) setAttachments(value) }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason : new Error("Não foi possível ler os comprovantes.")) })
    return () => { active = false }
  }, [project.localId])
  if (!attachments || error) return <PdfArtifactViewer loading={!attachments && !error} error={error} />
  return <EvidenceIndexArtifact project={project} catalog={catalog} attachments={attachments} onPdfArtifactChange={onPdfArtifactChange} />
}

function EvidenceIndexArtifact({ project, catalog, attachments, onPdfArtifactChange }: { project: LocalProject; catalog?: Regulation; attachments: StoredAttachment[]; onPdfArtifactChange: (artifact?: PdfArtifact) => void }) {
  const filename = `${projectSlug(project)}-indice-comprovantes.pdf`
  const state = usePdfArtifact(filename, () => createEvidenceIndexPdf(project, attachments, catalog), [filename, project, attachments, catalog])
  React.useEffect(() => { onPdfArtifactChange(state.artifact); return () => onPdfArtifactChange(undefined) }, [onPdfArtifactChange, state.artifact])
  return <><p className="mt-6 text-sm text-muted-foreground">O índice e os comprovantes estão reunidos neste PDF. Os arquivos originais também permanecem disponíveis no pacote ZIP.</p><PdfArtifactViewer {...state} /></>
}

function useEvidencePageMap(project: LocalProject, catalog?: Regulation) {
  const [state, setState] = React.useState<{ evidencePageReferences: Record<string, string>; loading: boolean; error?: Error }>({ evidencePageReferences: {}, loading: true })
  React.useEffect(() => {
    let active = true
    setState((value) => ({ ...value, loading: true, error: undefined }))
    void getStoredAttachments(project.localId).then(async (attachments) => {
      const evidencePageReferences = await createEvidencePageReferences(project, attachments, catalog)
      if (active) setState({ evidencePageReferences, loading: false })
    }).catch((reason: unknown) => { if (active) setState({ evidencePageReferences: {}, loading: false, error: reason instanceof Error ? reason : new Error("Não foi possível mapear os comprovantes.") }) })
    return () => { active = false }
  }, [project, catalog])
  return state
}
