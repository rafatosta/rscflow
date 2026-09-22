import * as React from "react"
import { BackupPage } from "@/components/backup-page"
import { DocumentsPage } from "@/components/documents-page"
import { DocumentViewer, type PreviewDocument } from "@/components/project/document-viewer-page"
import { PdfArtifactActions } from "@/components/pdf-artifact-viewer"
import { EducationPage } from "@/components/project/education-page"
import { FormationPage } from "@/components/project/formation-page"
import { IdentificationPage } from "@/components/project/identification-page"
import { MemorialPage } from "@/components/project/memorial-page"
import { OverviewPage } from "@/components/project/overview-page"
import { OccurrencePage } from "@/components/project/occurrence-page"
import { projectPages, type ProjectSectionId } from "@/components/project/project-pages"
import { RequirementsPage } from "@/components/project/requirements-page"
import { ReviewPage } from "@/components/project/review-page"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { calculateLevelProjection } from "@/domain/scoring"
import type { Regulation } from "@/domain/regulation"
import { useLocalProjects } from "@/hooks/use-local-projects"
import { applyProjectSettings, type Formation, type Identification, type LocalProject, type MemorialSection, type RequirementOccurrence } from "@/lib/projects"
import type { PdfArtifact } from "@/lib/pdf-artifact"

type ProjectPageProps = { section: string; catalog?: Regulation; occurrenceAction?: "new" | "edit"; occurrenceId?: string; formationAction?: "new" | "edit"; formationId?: string; onNavigate: (path: string) => void }

export function ProjectPage({ section, catalog, occurrenceAction, occurrenceId, formationAction, formationId, onNavigate }: ProjectPageProps) {
  const { project, updateDraft } = useLocalProjects()
  const [pdfArtifact, setPdfArtifact] = React.useState<PdfArtifact>()
  const activePage = projectPages.find((page) => page.id === section) ?? projectPages[0]
  const Icon = activePage.icon

  React.useEffect(() => { setPdfArtifact(undefined) }, [section])

  return <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl">
      {!project && <p className="text-sm text-muted-foreground">Projeto local não encontrado.</p>}

      <section className="mt-2">
        {occurrenceAction && project && catalog ? <OccurrencePage project={project} catalog={catalog} action={occurrenceAction} occurrenceId={occurrenceId} onOccurrencesChange={(occurrences) => updateDraft((current) => ({ ...current, requirementOccurrences: occurrences }))} onNavigate={onNavigate} /> : formationAction && project ? <FormationPage key={`${formationAction}-${formationId ?? "new"}`} project={project} action={formationAction} formationId={formationId} onChange={(formations) => updateDraft((current) => ({ ...current, formations }))} onNavigate={onNavigate} /> : <>
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-5" /></span>
          <div className="min-w-0"><h3 className="text-xl font-semibold">{activePage.label}</h3><p className="text-sm text-muted-foreground">{activePage.description}</p></div>
          <div className="ml-auto flex flex-wrap gap-2"><PdfArtifactActions artifact={pdfArtifact} /></div>
        </div>
        <ProjectSection
          section={activePage.id}
          project={project}
          catalog={catalog}
          onNavigate={onNavigate}
          onOccurrencesChange={(occurrences) => updateDraft((current) => ({ ...current, requirementOccurrences: occurrences }))}
          onMemorialChange={(memorialSections) => updateDraft((current) => ({ ...current, memorialSections }))}
          onIdentificationChange={(identification) => updateDraft((current) => ({ ...current, identification }))}
          onFormationsChange={(formations) => updateDraft((current) => ({ ...current, formations }))}
          onProjectSettingsChange={(settings) => updateDraft((current) => applyProjectSettings(current, settings))}
          onPdfArtifactChange={setPdfArtifact}
        />
        </>}
      </section>
    </div>
  </main>
}

type ProjectSectionProps = {
  section: ProjectSectionId
  project?: LocalProject
  catalog?: Regulation
  onNavigate: (path: string) => void
  onOccurrencesChange: (occurrences: RequirementOccurrence[]) => void
  onMemorialChange: (sections: MemorialSection[]) => void
  onIdentificationChange: (identification: Identification) => void
  onFormationsChange: (formations: Formation[]) => void
  onProjectSettingsChange: (settings: Pick<LocalProject, "name" | "rscLevel" | "regulation">) => void
  onPdfArtifactChange: (artifact?: PdfArtifact) => void
}

function ProjectSection({ section, project, catalog, onNavigate, onOccurrencesChange, onMemorialChange, onIdentificationChange, onFormationsChange, onProjectSettingsChange, onPdfArtifactChange }: ProjectSectionProps) {
  if (section === "overview") return <OverviewPage project={project} catalog={catalog} onProjectSettingsChange={onProjectSettingsChange} />
  if (!project) return null
  if (section === "profile") return <IdentificationPage project={project} onSave={onIdentificationChange} />
  if (section === "education") return <EducationPage project={project} onChange={onFormationsChange} onNavigate={onNavigate} />
  if (section === "memorial") return <MemorialPage project={project} catalog={catalog} onChange={onMemorialChange} onOccurrencesChange={onOccurrencesChange} />
  if (section === "requirements") {
    if (!catalog) return <Card className="mt-6"><CardHeader><CardTitle>Regulamento indisponível</CardTitle><CardDescription>O regulamento salvo neste projeto não está disponível no catálogo local.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Selecione ou restaure um projeto vinculado a um regulamento instalado antes de cadastrar lançamentos.</p></CardContent></Card>
    return <RequirementsPage project={project} catalog={catalog} projections={{
      "rsc-i": calculateLevelProjection(catalog, "rsc-i", project.requirementOccurrences ?? []),
      "rsc-ii": calculateLevelProjection(catalog, "rsc-ii", project.requirementOccurrences ?? []),
      "rsc-iii": calculateLevelProjection(catalog, "rsc-iii", project.requirementOccurrences ?? []),
    }} onOccurrencesChange={onOccurrencesChange} onNavigate={onNavigate} />
  }
  if (section === "review") return <ReviewPage project={project} catalog={catalog} />
  if (section === "preview-memorial" || section === "preview-forms" || section === "preview-evidence") return <DocumentViewer project={project} catalog={catalog} documentId={section.replace("preview-", "") as PreviewDocument["id"]} onMemorialChange={onMemorialChange} onPdfArtifactChange={onPdfArtifactChange} />
  if (section === "documents") return <DocumentsPage project={project} catalog={catalog} />
  if (section === "backup") return <BackupPage project={project} />
  return null
}
