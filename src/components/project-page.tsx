import * as React from "react"
import {
  BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, Copy, Download, FileOutput,
  ChevronDown, ChevronRight, CircleAlert, CircleHelp, FileText, GraduationCap, HardDrive, LayoutDashboard, Minus, PanelLeft, PanelRight, Pencil, Plus, Printer, Search, Trash2, UserRound, ZoomIn,
} from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type FieldError } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { getOccurrencesWithStoredAttachments, replaceOccurrenceAttachments, type Formation, type Identification, type LocalProject, type MemorialSection, type RequirementOccurrence } from "@/lib/projects"
import { useLocalProjects } from "@/hooks/use-local-projects"
import type { Regulation } from "@/domain/regulation"
import { calculateLevelProjection, type LevelProjection } from "@/domain/scoring"
import { DocumentsPage } from "@/components/documents-page"
import { BackupPage } from "@/components/backup-page"

const pages = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard, description: "Progresso, pontuação, comprovantes, pendências e backup." },
  { id: "profile", label: "Identificação", icon: UserRound, description: "Cadastro Funcional e Acadêmico do Servidor" },
  { id: "education", label: "Formação", icon: GraduationCap, description: "Formação, aperfeiçoamento e titulação." },
  { id: "requirements", label: "Requisitos", icon: Search, description: "Explore o catálogo normativo e registre suas experiências." },
  { id: "memorial", label: "Memorial", icon: FileText, description: "Edição e regeneração do Memorial." },
  { id: "review", label: "Revisão", icon: ClipboardCheck, description: "Checklist e prontidão documental." },
  { id: "preview", label: "Visualizar", icon: FileOutput, description: "Visualizador A4 genérico." },
  { id: "documents", label: "Gerar documentos", icon: HardDrive, description: "Preparar, revisar disponibilidade e baixar os artefatos de entrega." },
  { id: "backup", label: "Backup e restauração", icon: HardDrive, description: "Exportar, proteger e recuperar cópias locais do processo." },
] as const

const requestedLevelIds = { "RSC 1": "rsc-i", "RSC 2": "rsc-ii", "RSC 3": "rsc-iii", "RSC I": "rsc-i", "RSC II": "rsc-ii", "RSC III": "rsc-iii" } as const

type ProjectPageProps = { section: string; catalog?: Regulation }

function useUnsavedFormProtection(isDirty: boolean) {
  React.useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => { if (isDirty) { event.preventDefault(); event.returnValue = "" } }
    window.addEventListener("beforeunload", protect)
    return () => window.removeEventListener("beforeunload", protect)
  }, [isDirty])
}

export function ProjectPage({ section, catalog }: ProjectPageProps) {
  const { project, updateDraft } = useLocalProjects()
  const activePage = pages.find((page) => page.id === section) ?? pages[0]
  const Icon = activePage.icon

  return <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl">
      {!project && <p className="text-sm text-muted-foreground">Projeto local não encontrado.</p>}

      <section className="mt-2">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-5" /></span>
          <div><h3 className="text-xl font-semibold">{activePage.label}</h3><p className="text-sm text-muted-foreground">{activePage.description}</p></div>
        </div>
        <ProjectSection section={activePage.id} project={project} catalog={catalog} onOccurrencesChange={(occurrences) => {
          updateDraft((current) => ({ ...current, requirementOccurrences: occurrences }))
        }} onMemorialChange={(memorialSections) => {
          updateDraft((current) => ({ ...current, memorialSections }))
        }} onIdentificationChange={(identification) => {
          updateDraft((current) => ({ ...current, identification }))
        }} onFormationsChange={(formations) => {
          updateDraft((current) => ({ ...current, formations }))
        }} />
      </section>
    </div>
  </main>
}

function ProjectSection({ section, project, catalog, onOccurrencesChange, onMemorialChange, onIdentificationChange, onFormationsChange }: { section: (typeof pages)[number]["id"]; project?: LocalProject; catalog?: Regulation; onOccurrencesChange: (occurrences: RequirementOccurrence[]) => void; onMemorialChange: (sections: MemorialSection[]) => void; onIdentificationChange: (identification: Identification) => void; onFormationsChange: (formations: Formation[]) => void }) {
  const requestedLevel = project ? requestedLevelIds[project.rscLevel as keyof typeof requestedLevelIds] : undefined
  const requestedProjection = project && catalog && requestedLevel ? calculateLevelProjection(catalog, requestedLevel, project.requirementOccurrences ?? []) : undefined

  if (section === "overview") return <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <Card className="xl:col-span-2"><CardHeader><CardTitle>Andamento da avaliação</CardTitle><CardDescription>Complete as seções para avançar na revisão.</CardDescription></CardHeader><CardContent><Progress value={0}><ProgressLabel>Progresso do projeto</ProgressLabel><ProgressValue /></Progress></CardContent></Card>
    <Card><CardHeader><CardTitle>Pontuação estimada</CardTitle><CardDescription>{requestedProjection ? requestedProjection.provisional ? "Cálculo sujeito à validação manual do catálogo." : "Cálculo disponível para conferência." : "Selecione um regulamento e um nível RSC disponíveis."}</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">{requestedProjection ? `${requestedProjection.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pts` : "—"}</p></CardContent></Card>
    <InfoCard title="Comprovantes" text="Nenhum comprovante adicionado." /><InfoCard title="Pendências" text="Preencha a identificação e a formação para começar." /><InfoCard title="Backup" text="Gere um backup JSON na seção Documentos." />
  </div>
  if (section === "profile") return project ? <IdentificationForm project={project} onSave={onIdentificationChange} /> : null
  if (section === "education") return project ? <EducationSection project={project} onChange={onFormationsChange} /> : null
  if (section === "memorial") return project ? <MemorialSectionEditor project={project} onChange={onMemorialChange} /> : null
  if (section === "requirements") {
    if (!project) return null
    if (!catalog) return <Card className="mt-6"><CardHeader><CardTitle>Regulamento indisponível</CardTitle><CardDescription>O regulamento salvo neste projeto não está disponível no catálogo local.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Selecione ou restaure um projeto vinculado a um regulamento instalado antes de cadastrar lançamentos.</p></CardContent></Card>
    return <RequirementsSection project={project} catalog={catalog} projections={{ "rsc-i": calculateLevelProjection(catalog, "rsc-i", project.requirementOccurrences ?? []), "rsc-ii": calculateLevelProjection(catalog, "rsc-ii", project.requirementOccurrences ?? []), "rsc-iii": calculateLevelProjection(catalog, "rsc-iii", project.requirementOccurrences ?? []) }} onOccurrencesChange={onOccurrencesChange} />
  }
  if (section === "review") return project ? <ReviewSection project={project} catalog={catalog} /> : null
  if (section === "preview") return project ? <DocumentViewer project={project} catalog={catalog} /> : null
  if (section === "documents") return project ? <DocumentsPage project={project} catalog={catalog} /> : null
  if (section === "backup") return project ? <BackupPage project={project} /> : null
  return <div className="mt-6 grid gap-4 md:grid-cols-2"><InfoCard title={section === "documents" ? "Arquivos do projeto" : "Nenhum dado cadastrado"} text={section === "documents" ? "Exporte PDFs, JSON e backup ZIP, ou importe uma restauração." : "Adicione informações para compor esta etapa da avaliação."} /><Card><CardHeader><CardTitle>Próxima ação</CardTitle><CardDescription>Esta seção está pronta para receber seus lançamentos.</CardDescription></CardHeader><CardContent><Button><CheckCircle2 /> Adicionar informação</Button></CardContent></Card></div>
}

type PreviewDocument = {
  id: "memorial" | "forms" | "evidence"
  title: string
  type: string
  pages: PreviewPage[]
  warnings: string[]
  ready: boolean
}

type PreviewPage = { title: string; eyebrow: string; blocks: string[] }

function DocumentViewer({ project, catalog }: { project: LocalProject; catalog?: Regulation }) {
  const [documentId, setDocumentId] = React.useState<PreviewDocument["id"]>("memorial")
  const [pageIndex, setPageIndex] = React.useState(0)
  const [zoom, setZoom] = React.useState(85)
  const [showThumbnails, setShowThumbnails] = React.useState(true)
  const [showContext, setShowContext] = React.useState(true)
  const occurrences = project.requirementOccurrences ?? []
  const formations = project.formations ?? []
  const memorial = project.memorialSections ?? []
  const hasConclusion = memorial.some((section) => section.id === "conclusion" && section.content.trim())
  const hasEvidenceGaps = occurrences.some((occurrence) => !occurrence.evidence.trim() && occurrence.attachmentNames.length === 0)
  const attachedFiles = [...formations.map((formation) => formation.attachmentName), ...occurrences.flatMap((occurrence) => occurrence.attachmentNames)].filter(Boolean)
  const regulationTitle = catalog ? `${catalog.metadata.regulation.authority} · Resolução nº ${catalog.metadata.regulation.number}/${catalog.metadata.regulation.year}` : "Dataset normativo indisponível"

  const documents: PreviewDocument[] = [
    {
      id: "memorial",
      title: "Memorial descritivo",
      type: "Projeção editorial",
      ready: Boolean(project.identification && hasConclusion),
      warnings: [!project.identification && "Identificação do docente não está disponível.", !hasConclusion && "A seção de conclusão ainda não foi preenchida."].filter(Boolean) as string[],
      pages: [
        { title: "Capa", eyebrow: "MEMORIAL DESCRITIVO", blocks: [project.identification?.name ?? project.name, project.rscLevel, project.identification ? `${project.identification.position} · ${project.identification.institution}` : "Dados funcionais pendentes"] },
        ...memorial.filter((section) => section.content.trim()).map((section) => ({ title: memorialSteps.find((step) => step.id === section.id)?.label ?? "Seção do memorial", eyebrow: "MEMORIAL DESCRITIVO", blocks: [section.content] })),
      ],
    },
    {
      id: "forms",
      title: "Formulários normativos",
      type: "Projeção do formulário",
      ready: Boolean(catalog && project.identification && occurrences.length),
      warnings: [!catalog && "O dataset normativo vinculado não está disponível.", !project.identification && "Identificação do docente pendente.", !occurrences.length && "Não há lançamentos para compor os campos do formulário."].filter(Boolean) as string[],
      pages: [
        { title: "Identificação e norma", eyebrow: "FORMULÁRIO NORMATIVO", blocks: [regulationTitle, `Docente: ${project.identification?.name ?? "Não informado"}`, `Nível solicitado: ${project.rscLevel}`] },
        ...occurrences.map((occurrence, index) => {
          const criterion = catalog?.levels.find((level) => level.section === occurrence.selectedLevel)?.criteria.find((item) => item.id === occurrence.criterionId)
          return { title: `Lançamento ${index + 1}`, eyebrow: criterion ? `${criterion.code} · ${occurrence.selectedLevel?.toUpperCase()}` : "ENQUADRAMENTO PENDENTE", blocks: [criterion?.description ?? occurrence.description, occurrence.period ? `Período: ${occurrence.period}` : "Período não informado", `Quantidade declarada: ${occurrence.quantity}`, occurrence.evidence ? `Evidência: ${occurrence.evidence}` : "Evidência sem referência textual"] }
        }),
      ],
    },
    {
      id: "evidence",
      title: "Comprovantes consolidados",
      type: "Mapa de anexos",
      ready: Boolean(occurrences.length && !hasEvidenceGaps && attachedFiles.length),
      warnings: [!attachedFiles.length && "Nenhum arquivo local foi referenciado.", hasEvidenceGaps && "Há lançamentos sem evidência vinculada.", attachedFiles.length > 0 && "Os nomes dos arquivos foram preservados, mas o resolvedor de arquivos locais não está configurado neste navegador."].filter(Boolean) as string[],
      pages: attachedFiles.length ? attachedFiles.map((file, index) => ({ title: `Comprovante ${index + 1}`, eyebrow: `ANEXO · PÁGINA ${index + 1}`, blocks: [file, `Referência de página: C-${String(index + 1).padStart(3, "0")}`, "Validação local pendente de um resolvedor de arquivos."] })) : [{ title: "Índice de comprovantes", eyebrow: "ANEXOS", blocks: ["Não há comprovantes locais disponíveis para consolidar."] }],
    },
  ]

  const document = documents.find((item) => item.id === documentId) ?? documents[0]
  const currentPageIndex = Math.min(pageIndex, document.pages.length - 1)
  const page = document.pages[currentPageIndex]
  const evidencePageMap = attachedFiles.map((file, index) => `${file} → C-${String(index + 1).padStart(3, "0")}`).join("\n")

  const exportJson = () => {
    const data = { project, regulation: catalog?.metadata ?? null, artifacts: documents.map(({ id, title, type, ready, warnings, pages }) => ({ id, title, type, ready, warnings, pageCount: pages.length })), evidencePageMap: attachedFiles.map((file, index) => ({ file, page: `C-${String(index + 1).padStart(3, "0")}` })) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))
    const link = window.document.createElement("a")
    link.href = url
    link.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "projeto"}-exportacao.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <section className="mt-6 space-y-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><p className="text-sm text-muted-foreground">Leitura das projeções editoriais e dos artefatos produzidos. Esta área não recalcula pontuação nem altera o projeto.</p><div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" onClick={exportJson}><Download /> Exportar JSON</Button><Button variant="outline" onClick={() => window.print()}><Printer /> Imprimir</Button></div></div>
    <div className="flex flex-wrap gap-2">{documents.map((item) => <Button key={item.id} variant={item.id === documentId ? "secondary" : "outline"} onClick={() => { setDocumentId(item.id); setPageIndex(0) }}><FileText /> {item.title}<Badge variant={item.ready ? "secondary" : "outline"}>{item.ready ? "Pronto" : "Pendente"}</Badge></Button>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="text-sm"><span className="font-medium">{document.title}</span><span className="text-muted-foreground"> · {document.type} · {document.pages.length} página(s)</span></div><div className="flex items-center gap-1"><Button size="icon" variant="ghost" aria-label="Ocultar ou exibir miniaturas" onClick={() => setShowThumbnails((value) => !value)}><PanelLeft /></Button><Button size="icon" variant="ghost" aria-label="Reduzir zoom" disabled={zoom <= 55} onClick={() => setZoom((value) => value - 10)}><Minus /></Button><span className="w-12 text-center text-sm text-muted-foreground">{zoom}%</span><Button size="icon" variant="ghost" aria-label="Aumentar zoom" disabled={zoom >= 115} onClick={() => setZoom((value) => value + 10)}><ZoomIn /></Button><Button size="icon" variant="ghost" aria-label="Ocultar ou exibir contexto" onClick={() => setShowContext((value) => !value)}><PanelRight /></Button></div></div>
    <div className="grid gap-4 xl:grid-cols-[12rem_minmax(0,1fr)_18rem]">
      {showThumbnails && <aside className="order-2 xl:order-1"><Card><CardHeader><CardTitle className="text-base">Miniaturas</CardTitle></CardHeader><CardContent className="space-y-2">{document.pages.map((item, index) => <Button key={`${item.title}-${index}`} variant={index === currentPageIndex ? "secondary" : "ghost"} className="h-auto w-full justify-start whitespace-normal p-3 text-left" onClick={() => setPageIndex(index)}><span className="mr-2 text-muted-foreground">{index + 1}</span><span>{item.title}</span></Button>)}</CardContent></Card></aside>}
      <div className="order-1 min-w-0 xl:order-2"><div className="overflow-auto rounded-lg border bg-muted p-4 sm:p-8"><article className="mx-auto min-h-[62rem] w-[210mm] max-w-full origin-top bg-background p-8 shadow-sm sm:p-12" style={{ transform: `scale(${zoom / 100})`, marginBottom: `${(zoom - 100) * 6}px` }}><p className="text-xs font-medium tracking-widest text-muted-foreground">{page.eyebrow}</p><h3 className="mt-8 text-2xl font-semibold">{page.title}</h3><div className="mt-10 space-y-6">{page.blocks.map((block, index) => <p key={index} className="whitespace-pre-wrap text-base leading-7">{block}</p>)}</div><footer className="mt-16 border-t pt-4 text-xs text-muted-foreground">{document.title} · página {currentPageIndex + 1} de {document.pages.length}</footer></article></div><div className="mt-3 flex items-center justify-center gap-3"><Button size="sm" variant="outline" disabled={currentPageIndex === 0} onClick={() => setPageIndex((value) => value - 1)}>Anterior</Button><span className="text-sm text-muted-foreground">Página {currentPageIndex + 1} de {document.pages.length}</span><Button size="sm" variant="outline" disabled={currentPageIndex === document.pages.length - 1} onClick={() => setPageIndex((value) => value + 1)}>Próxima</Button></div></div>
      {showContext && <aside className="order-3"><Card><CardHeader><CardTitle className="text-base">Contexto do documento</CardTitle><CardDescription>Metadados e conferências disponíveis.</CardDescription></CardHeader><CardContent className="space-y-4"><div><p className="text-sm font-medium">Estado</p><Badge className="mt-1" variant={document.ready ? "secondary" : "outline"}>{document.ready ? "Artefato pronto" : "Artefato pendente"}</Badge></div><div><p className="text-sm font-medium">Dataset normativo</p><p className="mt-1 text-sm text-muted-foreground">{regulationTitle}</p></div>{document.warnings.length > 0 && <div><p className="text-sm font-medium">Avisos</p><ul className="mt-1 space-y-2 text-sm text-muted-foreground">{document.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}{evidencePageMap && <div><p className="text-sm font-medium">Mapa de páginas</p><pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-muted-foreground">{evidencePageMap}</pre></div>}</CardContent></Card></aside>}
    </div>
  </section>
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{text}</CardDescription></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" /> Os dados serão salvos neste navegador.</div></CardContent></Card>
}

type FindingSeverity = "bloqueio" | "conferencia"
type ReviewFinding = { severity: FindingSeverity; title: string; description: string; section: (typeof pages)[number]["id"]; occurrenceId?: string }

function projectSectionHref(project: LocalProject, section: string) {
  return section === "overview" ? `/project/${project.localId}` : `/project/${project.localId}/${section}`
}

function ReviewSection({ project, catalog }: { project: LocalProject; catalog?: Regulation }) {
  const occurrences = project.requirementOccurrences ?? []
  const occurrenceIds = React.useMemo(() => (project.requirementOccurrences ?? []).map((occurrence) => occurrence.id), [project.requirementOccurrences])
  const [occurrencesWithFiles, setOccurrencesWithFiles] = React.useState<Set<string>>(() => new Set())
  const formations = project.formations ?? []
  const memorial = project.memorialSections ?? []
  const requestedLevel = requestedLevelIds[project.rscLevel as keyof typeof requestedLevelIds]
  const requestedCatalogLevel = requestedLevel && catalog?.levels.find((level) => level.section === requestedLevel)
  const invalidOccurrences = occurrences.filter((occurrence) => !occurrence.selectedLevel || !occurrence.criterionId || !catalog?.levels.find((level) => level.section === occurrence.selectedLevel)?.criteria.some((criterion) => criterion.id === occurrence.criterionId))
  const occurrencesWithoutEvidence = occurrences.filter((occurrence) => !occurrence.evidence.trim() && occurrence.attachmentNames.length === 0)
  const projection = requestedLevel && catalog ? calculateLevelProjection(catalog, requestedLevel, occurrences) : undefined
  const hasConclusion = memorial.some((item) => item.id === "conclusion" && item.content.trim())
  const findings: ReviewFinding[] = []

  React.useEffect(() => {
    void getOccurrencesWithStoredAttachments(project.localId, occurrenceIds).then(setOccurrencesWithFiles)
  }, [occurrenceIds, project.localId])

  if (!project.identification) findings.push({ severity: "bloqueio", title: "Identificação do docente não foi salva", description: "O Memorial e os formulários normativos ficam bloqueados até que os dados funcionais e o nível solicitado sejam confirmados.", section: "profile" })
  if (formations.length === 0) findings.push({ severity: "conferencia", title: "Nenhuma formação cadastrada", description: "A revisão pode continuar, mas a formação deve ser conferida antes da emissão.", section: "education" })
  if (occurrences.length === 0) findings.push({ severity: "bloqueio", title: "Não há lançamentos para pontuar", description: "O resultado e os comprovantes consolidados ficam bloqueados.", section: "requirements" })
  if (invalidOccurrences.length) findings.push({ severity: "bloqueio", title: `${invalidOccurrences.length} lançamento(s) sem critério ou nível válido`, description: "Corrija o enquadramento normativo antes de gerar o resultado.", section: "requirements" })
  if (occurrencesWithoutEvidence.length) findings.push({ severity: "bloqueio", title: `${occurrencesWithoutEvidence.length} lançamento(s) sem evidência vinculada`, description: "Inclua uma referência de evidência ou um comprovante para consolidar os anexos.", section: "requirements" })
  occurrences.filter((occurrence) => !occurrencesWithFiles.has(occurrence.id)).forEach((occurrence) => {
    const title = occurrence.description.split(". ")[0] || "Lançamento sem descrição"
    const attachmentNames = occurrence.attachmentNames.filter(Boolean)
    findings.push({
      severity: "conferencia",
      title: `Comprovante não disponível: ${title}`,
      description: attachmentNames.length
        ? `Referência cadastrada: ${attachmentNames.join(", ")}. O arquivo não foi armazenado no navegador e precisa ser selecionado novamente.`
        : "Nenhum arquivo de comprovação foi cadastrado para este lançamento.",
      section: "requirements",
      occurrenceId: occurrence.id,
    })
  })
  if (!catalog || !requestedCatalogLevel || !projection) findings.push({ severity: "bloqueio", title: "Resultado indisponível", description: "O regulamento ou o nível RSC solicitado não está disponível no catálogo local.", section: "requirements" })
  else if (projection.provisional) findings.push({ severity: "conferencia", title: `Pontuação estimada: ${projection.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pontos`, description: "O catálogo está provisório e requer validação humana antes do uso oficial.", section: "requirements" })
  else if (projection.total < catalog.metadata.scoring.minimumRequestedLevel) findings.push({ severity: "conferencia", title: `Pontuação estimada: ${projection.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pontos`, description: `A estimativa está abaixo do mínimo de ${catalog.metadata.scoring.minimumRequestedLevel} pontos para o nível solicitado.`, section: "requirements" })
  if (!hasConclusion) findings.push({ severity: "bloqueio", title: "Conclusão do memorial não foi preparada", description: "O Memorial fica bloqueado até que a seção de conclusão seja preenchida.", section: "memorial" })
  findings.push({ severity: "conferencia", title: "Formulários normativos ainda não foram gerados", description: "A emissão e a conferência dos formulários serão necessárias antes do protocolo.", section: "documents" })

  const documents = [
    { title: "Memorial", ready: Boolean(project.identification && hasConclusion), section: "memorial" as const, note: hasConclusion ? "Conclusão preenchida." : "Requer identificação e conclusão." },
    { title: "Formulários normativos", ready: false, section: "documents" as const, note: "Geração ainda não disponível." },
    { title: "Comprovantes consolidados", ready: occurrences.length > 0 && !invalidOccurrences.length && !occurrencesWithoutEvidence.length, section: "requirements" as const, note: occurrencesWithoutEvidence.length ? "Há lançamentos sem evidência." : "Dependem de conferência dos arquivos locais." },
  ]

  return <section className="mt-6 space-y-6">
    <Card><CardHeader><CardTitle>Revisão de prontidão</CardTitle><CardDescription>Pendências que afetam a geração do Memorial, formulários normativos e comprovantes consolidados.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><ReviewSummary label="Bloqueios" value={findings.filter((item) => item.severity === "bloqueio").length} /><ReviewSummary label="Conferências" value={findings.filter((item) => item.severity === "conferencia").length} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Pendências</CardTitle><CardDescription>Um bloqueio impede a geração do documento; uma conferência pede sua atenção antes do protocolo.</CardDescription></CardHeader><CardContent className="space-y-3">{findings.length ? findings.map((finding, index) => <ReviewFindingCard key={`${finding.title}-${index}`} project={project} finding={finding} />) : <p className="text-sm text-muted-foreground">Não há pendências neste projeto.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Prontidão dos documentos</CardTitle><CardDescription>Estado atual dos artefatos que compõem o protocolo.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{documents.map((document) => <div key={document.title} className="rounded-lg border p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium">{document.title}</p><Badge variant={document.ready ? "secondary" : "outline"}>{document.ready ? "Pronto" : "Pendente"}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{document.note}</p><Button className="mt-4" size="sm" variant="outline" render={<a href={projectSectionHref(project, document.section)} />}>Ver seção</Button></div>)}</CardContent></Card>
  </section>
}

function ReviewSummary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>
}

function ReviewFindingCard({ project, finding }: { project: LocalProject; finding: ReviewFinding }) {
  const isBlocking = finding.severity === "bloqueio"
  const Icon = isBlocking ? CircleAlert : CircleHelp
  const variant = isBlocking ? "destructive" : "secondary"
  const href = `${projectSectionHref(project, finding.section)}${finding.occurrenceId ? `?occurrence=${encodeURIComponent(finding.occurrenceId)}` : ""}`
  return <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><Icon className="mt-0.5 size-5 shrink-0" /><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{finding.title}</p><Badge variant={variant}>{isBlocking ? "Bloqueia" : "Requer conferência"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{finding.description}</p></div></div><Button size="sm" variant="outline" className="shrink-0" render={<a href={href} />}>Corrigir</Button></div>
}

const memorialSteps = [
  { id: "cover", label: "Capa", hint: "Informe os dados que identificarão o memorial." },
  { id: "introduction", label: "Apresentação", hint: "Apresente-se e situe o propósito deste memorial." },
  { id: "career", label: "Trajetória e formação", hint: "Descreva sua formação e os principais marcos da trajetória profissional." },
  { id: "teaching", label: "Ensino e experiências", hint: "Relate suas experiências de ensino, inovação e atuação acadêmica." },
  { id: "outreach", label: "Extensão e pesquisa", hint: "Apresente ações de extensão, pesquisa e seus resultados." },
  { id: "management", label: "Gestão", hint: "Descreva atividades de gestão, comissões e participação institucional." },
  { id: "conclusion", label: "Conclusão", hint: "Escreva esta parte do memorial com clareza e objetividade." },
] as const

function MemorialSectionEditor({ project, onChange }: { project: LocalProject; onChange: (sections: MemorialSection[]) => void }) {
  const [activeId, setActiveId] = React.useState("cover")
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)
  const [isClearDialogOpen, setIsClearDialogOpen] = React.useState(false)
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = React.useState(false)
  const sections = project.memorialSections ?? []
  const activeIndex = memorialSteps.findIndex((step) => step.id === activeId)
  const activeStep = memorialSteps[activeIndex]
  const activeContent = sections.find((item) => item.id === activeId)?.content ?? ""
  const completedCount = memorialSteps.filter((step) => sections.some((item) => item.id === step.id && item.content.trim())).length

  const updateContent = (content: string) => {
    const next = sections.filter((item) => item.id !== activeId)
    onChange(content ? [...next, { id: activeId, content }] : next)
  }
  const moveTo = (index: number) => {
    const nextStep = memorialSteps[index]
    if (nextStep) setActiveId(nextStep.id)
  }

  return <section className="mt-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="max-w-3xl text-base text-muted-foreground">Organize sua trajetória profissional por seções e redija cada etapa do memorial. O conteúdo será consolidado no documento final.</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="outline" disabled={completedCount === 0} onClick={() => setIsClearAllDialogOpen(true)}>Limpar tudo</Button>
        <Button variant="outline" onClick={() => setIsPreviewOpen(true)}><FileText /> Pré-visualizar PDF</Button>
      </div>
    </div>

    <div className="mt-8 grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
      <Card className="h-fit py-5">
        <CardHeader className="px-5"><CardTitle>Seções</CardTitle><CardDescription>{completedCount} de {memorialSteps.length} preenchidas</CardDescription></CardHeader>
        <CardContent className="mt-4 px-3">
          <nav aria-label="Seções do memorial" className="space-y-1">
            {memorialSteps.map((step, index) => {
              const isComplete = sections.some((item) => item.id === step.id && item.content.trim())
              const isActive = activeId === step.id
              return <Button key={step.id} variant={isActive ? "secondary" : "ghost"} className="h-12 w-full justify-start px-3 text-sm" onClick={() => setActiveId(step.id)}>
                <span className={isComplete ? "grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground" : "grid size-7 shrink-0 place-items-center rounded-full border text-xs"}>{isComplete ? <CheckCircle2 className="size-4" /> : index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-left">{step.label}</span><ChevronRight className="size-4" />
              </Button>
            })}
          </nav>
        </CardContent>
      </Card>

      <Card className="min-h-[34rem] py-5">
        <CardHeader className="px-5"><CardTitle>{activeStep.label}</CardTitle><CardDescription>{activeStep.hint}</CardDescription></CardHeader>
        <CardContent className="mt-5 flex flex-1 flex-col px-5">
          <Textarea value={activeContent} onChange={(event) => updateContent(event.target.value)} placeholder={`Descreva: ${activeStep.label.toLocaleLowerCase("pt-BR")}...`} className="min-h-72 flex-1 resize-y text-base" aria-label={`Conteúdo da seção ${activeStep.label}`} />
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{activeContent.length} caracteres</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" disabled={!activeContent} onClick={() => setIsClearDialogOpen(true)}>Limpar</Button>
              <Button variant="outline" disabled={activeIndex === 0} onClick={() => moveTo(activeIndex - 1)}>Anterior</Button>
              <Button disabled={activeIndex === memorialSteps.length - 1} onClick={() => moveTo(activeIndex + 1)}>Próxima seção <ChevronRight /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Pré-visualização do memorial</DialogTitle><DialogDescription>Esta visualização reúne o conteúdo já redigido nas seções.</DialogDescription></DialogHeader>
        <article className="space-y-6 rounded-lg border bg-background p-6 text-sm leading-relaxed">
          {memorialSteps.filter((step) => sections.some((item) => item.id === step.id && item.content.trim())).map((step) => <section key={step.id}><h3 className="font-semibold">{step.label}</h3><p className="mt-2 whitespace-pre-wrap text-muted-foreground">{sections.find((item) => item.id === step.id)?.content}</p></section>)}
          {completedCount === 0 && <p className="text-muted-foreground">Nenhuma seção foi preenchida ainda.</p>}
        </article>
      </DialogContent>
    </Dialog>

    <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Limpar seção?</DialogTitle><DialogDescription>O texto de “{activeStep.label}” será removido do memorial.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={() => { updateContent(""); setIsClearDialogOpen(false) }}>Limpar seção</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Limpar todo o memorial?</DialogTitle><DialogDescription>Todo o conteúdo redigido nas {completedCount} seções preenchidas será removido permanentemente.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setIsClearAllDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={() => { onChange([]); setIsClearAllDialogOpen(false) }}>Limpar tudo</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
}

const requirementLevels = [
  { id: "rsc-i", label: "RSC I" },
  { id: "rsc-ii", label: "RSC II" },
  { id: "rsc-iii", label: "RSC III" },
] as const

const occurrenceSchema = z.object({
  period: z.string(),
  quantity: z.coerce.number().positive("Informe uma quantidade maior que zero."),
  description: z.string().trim().min(1, "Descreva a atividade."),
  results: z.string().trim(),
  competencies: z.string().trim(),
  evidence: z.string().trim(),
})
type OccurrenceValues = z.infer<typeof occurrenceSchema>
type OccurrenceFormValues = z.input<typeof occurrenceSchema>
const emptyOccurrence: OccurrenceValues = { period: "", quantity: 1, description: "", results: "", competencies: "", evidence: "" }

function RequirementsSection({ project, catalog, projections, onOccurrencesChange }: { project: LocalProject; catalog: Regulation; projections: Record<"rsc-i" | "rsc-ii" | "rsc-iii", LevelProjection>; onOccurrencesChange: (occurrences: RequirementOccurrence[]) => void }) {
  const [levelId, setLevelId] = React.useState<"rsc-i" | "rsc-ii" | "rsc-iii">("rsc-i")
  const [query, setQuery] = React.useState("")
  const [criterionId, setCriterionId] = React.useState<string | null>(null)
  const [editingOccurrenceId, setEditingOccurrenceId] = React.useState<string | null>(null)
  const [highlightAttachments, setHighlightAttachments] = React.useState(false)
  const [attachments, setAttachments] = React.useState<string[]>([])
  const [attachmentFiles, setAttachmentFiles] = React.useState<File[]>([])
  const [collapsedDirectiveIds, setCollapsedDirectiveIds] = React.useState<Set<string>>(() => new Set())
  const form = useForm<OccurrenceFormValues, unknown, OccurrenceValues>({ resolver: zodResolver(occurrenceSchema), defaultValues: emptyOccurrence })
  const level = catalog.levels.find((item) => item.section === levelId)!
  const projection = projections[levelId]
  const selectedCriterion = level.criteria.find((item) => item.id === criterionId) ?? null
  useUnsavedFormProtection(Boolean(selectedCriterion) && form.formState.isDirty)
  const unassignedOccurrences = (project.requirementOccurrences ?? []).filter((item) => !item.criterionId || !item.selectedLevel)
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR")
  const matches = (description: string) => !normalizedQuery || description.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
  const openDialog = (id: string) => { form.reset(emptyOccurrence); setAttachments([]); setAttachmentFiles([]); setEditingOccurrenceId(null); setHighlightAttachments(false); setCriterionId(id) }
  const closeDialog = () => { setCriterionId(null); setEditingOccurrenceId(null); setHighlightAttachments(false) }

  React.useEffect(() => {
    const occurrenceId = new URLSearchParams(window.location.search).get("occurrence")
    if (!occurrenceId || occurrenceId === editingOccurrenceId) return
    const occurrence = project.requirementOccurrences?.find((item) => item.id === occurrenceId)
    if (!occurrence?.criterionId || !occurrence.selectedLevel) return

    setLevelId(occurrence.selectedLevel)
    setCriterionId(occurrence.criterionId)
    setEditingOccurrenceId(occurrence.id)
    setAttachments(occurrence.attachmentNames)
    setAttachmentFiles([])
    form.reset({ period: occurrence.period, quantity: occurrence.quantity, description: occurrence.description, results: occurrence.results, competencies: occurrence.competencies, evidence: occurrence.evidence })
    window.history.replaceState({}, "", window.location.pathname)
  }, [editingOccurrenceId, form, project.requirementOccurrences])

  React.useEffect(() => {
    if (!editingOccurrenceId) return
    setHighlightAttachments(true)
    const timeout = window.setTimeout(() => document.getElementById("occurrence-attachments")?.focus(), 100)
    return () => window.clearTimeout(timeout)
  }, [editingOccurrenceId])

  const saveOccurrence = async (values: OccurrenceValues) => {
    if (!selectedCriterion) return
    const now = new Date().toISOString()
    const currentOccurrences = project.requirementOccurrences ?? []
    const occurrenceId = editingOccurrenceId ?? crypto.randomUUID()
    const nextOccurrences = editingOccurrenceId
      ? currentOccurrences.map((item) => item.id === occurrenceId ? { ...item, criterionId: selectedCriterion.id, selectedLevel: levelId, ...values, attachmentNames: attachments, updatedAt: now } : item)
      : [...currentOccurrences, { id: occurrenceId, criterionId: selectedCriterion.id, selectedLevel: levelId, ...values, attachmentNames: attachments, createdAt: now, updatedAt: now }]
    if (attachmentFiles.length) await replaceOccurrenceAttachments(project.localId, occurrenceId, attachmentFiles)
    onOccurrencesChange(nextOccurrences)
    const returnToReview = Boolean(editingOccurrenceId)
    closeDialog()
    if (returnToReview) {
      window.history.pushState({}, "", window.location.pathname.replace(/\/requirements$/, "/review"))
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
  }

  return <section className="mt-6">
    <Tabs value={levelId} onValueChange={(value) => { setLevelId(value as typeof levelId); setQuery("") }}>
      <Card>
        <CardHeader><CardTitle>Catálogo de requisitos</CardTitle><CardDescription>Escolha um nível, pesquise as descrições e vincule suas experiências a um critério normativo.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <TabsList aria-label="Nível de RSC" className="grid w-full max-w-md grid-cols-3">{requirementLevels.map((item) => <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}</TabsList>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar nas descrições dos requisitos" aria-label="Pesquisar requisitos" />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-3 text-sm"><span>{catalog.metadata.regulation.authority} nº {catalog.metadata.regulation.number}/{catalog.metadata.regulation.year} · {level.directives.length} diretrizes</span><Badge variant="secondary">Estimativa: {projection.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pts</Badge></div>
        </CardContent>
      </Card>

      {requirementLevels.map((item) => <TabsContent key={item.id} value={item.id} className="mt-4 space-y-4">
        {projection.provisional && <Card><CardContent className="p-4 text-sm text-muted-foreground">Este catálogo está pendente de validação humana final. As pontuações exibidas são estimativas provisórias e não representam pontuação oficial.</CardContent></Card>}
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Diretrizes deste nível</p><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setCollapsedDirectiveIds((current) => { const next = new Set(current); level.directives.forEach((directive) => next.delete(directive.id)); return next })}>Expandir todas</Button><Button type="button" variant="outline" size="sm" onClick={() => setCollapsedDirectiveIds((current) => { const next = new Set(current); level.directives.forEach((directive) => next.add(directive.id)); return next })}>Recolher todas</Button></div></div>
        {level.directives.map((directive) => {
          const criteria = level.criteria.filter((criterion) => criterion.directiveId === directive.id && matches(criterion.description))
          if (criteria.length === 0) return null
          return <DirectiveCard key={directive.id} directive={directive} criteria={criteria} projection={projection} open={!collapsedDirectiveIds.has(directive.id)} onOpenChange={(open) => setCollapsedDirectiveIds((current) => { const next = new Set(current); if (open) next.delete(directive.id); else next.add(directive.id); return next })} onAdd={openDialog} />
        })}
      </TabsContent>)}
    </Tabs>

    {unassignedOccurrences.length > 0 && <Card className="mt-4"><CardHeader><CardTitle>Lançamentos aguardando enquadramento</CardTitle><CardDescription>Essas ocorrências ainda não estão vinculadas a um critério e não entram na estimativa.</CardDescription></CardHeader><CardContent className="space-y-2">{unassignedOccurrences.map((occurrence) => <div key={occurrence.id} className="rounded-lg border p-3 text-sm"><p className="font-medium">{occurrence.description || "Lançamento sem descrição"}</p><p className="mt-1 text-muted-foreground">Quantidade: {occurrence.quantity}</p></div>)}</CardContent></Card>}

    <Dialog open={Boolean(selectedCriterion)} onOpenChange={(open) => { if (!open) closeDialog() }}><DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editingOccurrenceId ? "Corrigir lançamento" : "Adicionar lançamento"}</DialogTitle><DialogDescription>{selectedCriterion ? `${selectedCriterion.code} · ${selectedCriterion.description}` : ""}</DialogDescription></DialogHeader><form className="grid gap-4" noValidate onSubmit={form.handleSubmit(saveOccurrence)}><div className="grid gap-4 sm:grid-cols-2"><FormField label="Período (opcional)" error={form.formState.errors.period}><Input placeholder="Ex.: 2024.1 a 2024.2" {...form.register("period")} /></FormField><FormField label={`Quantidade (${selectedCriterion?.unit ?? ""})`} required error={form.formState.errors.quantity as FieldError | undefined}><Input type="number" min="0.01" step="any" {...form.register("quantity")} /></FormField></div><FormField label="Descrição da atividade" required error={form.formState.errors.description}><Textarea rows={3} {...form.register("description")} /></FormField><FormField label="Resultados alcançados" error={form.formState.errors.results}><Textarea rows={3} {...form.register("results")} /></FormField><FormField label="Competências relacionadas" error={form.formState.errors.competencies}><Textarea rows={3} {...form.register("competencies")} /></FormField><FormField label="Evidências e anexos comprobatórios" error={form.formState.errors.evidence}><Textarea rows={3} placeholder="Informe links, referências ou identificação dos comprovantes." {...form.register("evidence")} /></FormField><div className={`grid gap-1.5 rounded-lg p-3 text-sm font-medium ${highlightAttachments ? "ring-2 ring-primary ring-offset-2" : ""}`}><label htmlFor="occurrence-attachments">Adicionar comprovante</label><Input id="occurrence-attachments" type="file" multiple onChange={(event) => { const files = Array.from(event.target.files ?? []); setAttachmentFiles(files); setAttachments(files.map((file) => file.name)); setHighlightAttachments(false) }} /><span className="text-xs font-normal text-muted-foreground">{attachments.length ? attachments.join(", ") : "Nenhum arquivo selecionado."}</span></div><p className="text-sm text-muted-foreground">A pontuação é calculada automaticamente a partir das quantidades lançadas e dos limites do catálogo.</p><DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose><Button type="submit">Salvar lançamento</Button></DialogFooter></form></DialogContent></Dialog>
  </section>
}

function DirectiveCard({ directive, criteria, projection, open, onOpenChange, onAdd }: { directive: Regulation["levels"][number]["directives"][number]; criteria: Regulation["levels"][number]["criteria"]; projection: LevelProjection; open: boolean; onOpenChange: (open: boolean) => void; onAdd: (criterionId: string) => void }) {
  return <Collapsible open={open} onOpenChange={onOpenChange}>
    <Card>
      <CardHeader><div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><CardDescription>Diretriz {directive.code}</CardDescription><CardTitle className="mt-1 text-base">{directive.title}</CardTitle></div><div className="flex shrink-0 items-center gap-2"><Badge variant="outline">{projection.directiveScores[directive.id].toLocaleString("pt-BR", { maximumFractionDigits: 2 })} / {directive.maxScore} pts</Badge><CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" />} aria-label={`${open ? "Recolher" : "Expandir"} diretriz ${directive.code}`}><ChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} /><span className="hidden sm:inline">{open ? "Recolher" : "Expandir"}</span></CollapsibleTrigger></div></div></CardHeader>
      <CollapsibleContent><CardContent className="grid gap-3">{criteria.map((criterion) => {
        const score = projection.criterionScores[criterion.id]
        return <div key={criterion.id} className="rounded-lg border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-medium"><span className="mr-2 text-muted-foreground">{criterion.code}</span>{criterion.description}</p><div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>Unidade: {criterion.unit}</span><span>Máximo: {criterion.maxQuantity}</span><span>Fator: {criterion.factor}</span><span>Peso: {criterion.weight}</span></div></div><Button size="sm" onClick={() => onAdd(criterion.id)}>Adicionar lançamento</Button></div><div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><Badge variant="secondary">Quantidade: {score.quantity} de {criterion.maxQuantity}</Badge>{score.blocked ? <Badge variant="destructive">Cálculo bloqueado por conflito normativo</Badge> : <span className="text-muted-foreground">Estimativa do critério: {score.score.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pts</span>}</div></div>
      })}</CardContent></CollapsibleContent>
    </Card>
  </Collapsible>
}

const formationTypes = ["Graduação", "Aperfeiçoamento", "Especialização", "Mestrado", "Doutorado", "Curso livre"]
const formationStatuses = ["Em andamento", "Concluída", "Interrompida"]

const formationSchema = z.object({
  type: z.string().min(1, "Selecione o tipo."),
  title: z.string().trim().min(1, "Informe o curso ou título."),
  institution: z.string().trim().min(1, "Informe a instituição."),
  area: z.string().trim(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string().min(1, "Selecione a situação."),
  documentReference: z.string().trim(),
  attachmentName: z.string(),
  notes: z.string().trim(),
}).superRefine((values, context) => {
  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    context.addIssue({ code: "custom", path: ["endDate"], message: "A data de fim não pode ser anterior à data de início." })
  }
})

type FormationValues = z.infer<typeof formationSchema>

const emptyFormation: FormationValues = { type: "", title: "", institution: "", area: "", startDate: "", endDate: "", status: "", documentReference: "", attachmentName: "", notes: "" }

function formatFormationDate(value: string) {
  if (!value) return "Data não informada"
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`))
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
}

function EducationSection({ project, onChange }: { project: LocalProject; onChange: (formations: Formation[]) => void }) {
  const [formations, setFormations] = React.useState<Formation[]>(project.formations ?? [])
  const [editing, setEditing] = React.useState<Formation | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const orderedFormations = [...formations].sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""))
  const persist = (nextFormations: Formation[]) => {
    setFormations(nextFormations)
    onChange(nextFormations)
  }
  const createFormation = () => {
    setEditing(null)
    setIsDialogOpen(true)
  }
  const duplicateFormation = (formation: Formation) => {
    const now = new Date().toISOString()
    persist([{ ...formation, id: crypto.randomUUID(), title: `${formation.title} (cópia)`, createdAt: now, updatedAt: now }, ...formations])
  }
  const deleteFormation = (formation: Formation) => {
    if (window.confirm(`Excluir a formação “${formation.title}”?`)) persist(formations.filter((item) => item.id !== formation.id))
  }

  return <section className="mt-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h4 className="text-lg font-semibold">Formações cadastradas</h4><p className="text-sm text-muted-foreground">Os registros são exibidos da formação mais recente para a mais antiga.</p></div>
      <Button onClick={createFormation}><Plus /> Adicionar formação</Button>
    </div>
    {orderedFormations.length === 0 ? <Card className="mt-5"><CardContent className="flex min-h-44 flex-col items-center justify-center p-6 text-center"><GraduationCap className="size-7 text-muted-foreground" /><p className="mt-3 font-medium">Nenhuma formação cadastrada</p><p className="mt-1 text-sm text-muted-foreground">Adicione cursos, titulações e aperfeiçoamentos ao seu histórico.</p><Button className="mt-4" variant="outline" onClick={createFormation}><Plus /> Adicionar formação</Button></CardContent></Card> : <div className="mt-5 grid gap-4 md:grid-cols-2">
      {orderedFormations.map((formation) => <Card key={formation.id}>
        <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><CardDescription>{formation.type}</CardDescription><CardTitle className="mt-1 truncate">{formation.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{formation.institution}</p></div><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><GraduationCap className="size-4" /></span></div></CardHeader>
        <CardContent className="space-y-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />{formatFormationDate(formation.startDate)} — {formation.endDate ? formatFormationDate(formation.endDate) : "em andamento"}</div><div className="flex flex-wrap gap-2"><Badge variant="secondary">{formation.status}</Badge>{formation.area && <Badge variant="outline">{formation.area}</Badge>}</div><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => duplicateFormation(formation)}><Copy /> Duplicar</Button><Button variant="ghost" size="sm" onClick={() => { setEditing(formation); setIsDialogOpen(true) }}><Pencil /> Editar</Button><Button variant="ghost" size="icon-sm" aria-label={`Excluir ${formation.title}`} onClick={() => deleteFormation(formation)}><Trash2 /></Button></div></CardContent>
      </Card>)}
    </div>}
    <FormationDialog formation={editing} open={isDialogOpen} onOpenChange={setIsDialogOpen} onSave={(values) => {
      const now = new Date().toISOString()
      if (editing) persist(formations.map((item) => item.id === editing.id ? { ...item, ...values, updatedAt: now } : item))
      else persist([{ id: crypto.randomUUID(), ...values, createdAt: now, updatedAt: now }, ...formations])
      setIsDialogOpen(false)
    }} />
  </section>
}

function FormationDialog({ formation, open, onOpenChange, onSave }: { formation: Formation | null; open: boolean; onOpenChange: (open: boolean) => void; onSave: (values: FormationValues) => void }) {
  const form = useForm<FormationValues>({ resolver: zodResolver(formationSchema), defaultValues: emptyFormation })
  useUnsavedFormProtection(open && form.formState.isDirty)
  React.useEffect(() => { form.reset(formation ? { type: formation.type, title: formation.title, institution: formation.institution, area: formation.area, startDate: formation.startDate, endDate: formation.endDate, status: formation.status, documentReference: formation.documentReference, attachmentName: formation.attachmentName, notes: formation.notes } : emptyFormation) }, [formation, form, open])

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl" showCloseButton={false}><DialogHeader><DialogTitle>{formation ? "Editar formação" : "Nova formação"}</DialogTitle><DialogDescription>Os campos marcados com asterisco são obrigatórios.</DialogDescription></DialogHeader><form className="grid gap-4" noValidate onSubmit={form.handleSubmit(onSave)}>
    <div className="grid gap-4 sm:grid-cols-2"><SelectFormField label="Tipo" required error={form.formState.errors.type} value={form.watch("type")} options={formationTypes} onValueChange={(value) => form.setValue("type", value, { shouldValidate: true })} /><FormField label="Curso/título" required error={form.formState.errors.title}><Input {...form.register("title")} /></FormField><FormField label="Instituição" required error={form.formState.errors.institution}><Input {...form.register("institution")} /></FormField><FormField label="Área" error={form.formState.errors.area}><Input {...form.register("area")} /></FormField><FormField label="Data de início" error={form.formState.errors.startDate}><Input type="date" {...form.register("startDate")} /></FormField><FormField label="Data de fim" error={form.formState.errors.endDate}><Input type="date" min={form.watch("startDate") || undefined} {...form.register("endDate")} /></FormField><SelectFormField label="Situação" required error={form.formState.errors.status} value={form.watch("status")} options={formationStatuses} onValueChange={(value) => form.setValue("status", value, { shouldValidate: true })} /><FormField label="Referência documental" error={form.formState.errors.documentReference}><Input placeholder="Ex.: Diploma registrado nº 123" {...form.register("documentReference")} /></FormField></div>
    <div className="grid gap-1.5 text-sm font-medium"><label htmlFor="formation-attachment">Anexo do diploma ou certificado</label><Input id="formation-attachment" type="file" accept=".pdf,image/*" onChange={(event) => form.setValue("attachmentName", event.target.files?.[0]?.name ?? "")} /><span className="text-xs font-normal text-muted-foreground">{form.watch("attachmentName") || "Nenhum arquivo selecionado."}</span></div><FormField label="Observações" error={form.formState.errors.notes}><Textarea rows={3} {...form.register("notes")} /></FormField>
    <div className="grid gap-4 rounded-lg bg-muted p-3 text-sm sm:grid-cols-2"><div><span className="text-muted-foreground">Criado em</span><p className="mt-1 font-medium">{formation ? formatTimestamp(formation.createdAt) : "Será definido ao cadastrar."}</p></div><div><span className="text-muted-foreground">Atualizado em</span><p className="mt-1 font-medium">{formation ? formatTimestamp(formation.updatedAt) : "Será definido ao cadastrar."}</p></div></div>
    <DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose><Button type="submit">{formation ? "Salvar alterações" : "Cadastrar formação"}</Button></DialogFooter>
  </form></DialogContent></Dialog>
}

function SelectFormField({ label, required, error, value, options, onValueChange }: { label: string; required?: boolean; error?: FieldError; value: string; options: string[]; onValueChange: (value: string) => void }) {
  return <div className="grid gap-1.5"><label className="text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}</label><Select value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? "")}><SelectTrigger aria-invalid={Boolean(error)} className="h-9 w-full"><SelectValue placeholder={`Selecione ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{error && <span className="text-sm text-destructive">{error.message}</span>}</div>
}

const cargoOptions = ["Professor do Magistério Superior", "Professor do Ensino Básico, Técnico e Tecnológico"]
const institutionOptions = ["Instituto Federal da Bahia", "Universidade Federal da Bahia"]
const campusOptions = ["Salvador", "Barreiras", "Camaçari", "Vitória da Conquista"]
const rscOptions = ["RT: Graduação", "RT: Aperfeiçoamento", "RT: Especialização", "RT: Mestrado", "RT: Doutorado", "RSC I", "RSC II", "RSC III"]
const degreeOptions = ["Graduação", "Aperfeiçoamento", "Especialização", "Mestrado", "Doutorado"]

const cpfIsValid = (value: string) => {
  const digits = value.replace(/\D/g, "")
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false

  const digitAt = (position: number) => {
    const sum = digits.slice(0, position).split("").reduce((total, digit, index) => total + Number(digit) * (position + 1 - index), 0)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  return digitAt(9) === Number(digits[9]) && digitAt(10) === Number(digits[10])
}

const identificationSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo."),
  cpf: z.string().refine(cpfIsValid, "Informe um CPF válido."),
  admissionDate: z.string().min(1, "Informe a data de ingresso.").refine((value) => new Date(`${value}T00:00:00`) <= new Date(), "A data não pode ser futura."),
  siape: z.string().regex(/^\d{7}$/, "O SIAPE deve ter 7 dígitos."),
  position: z.string().min(1, "Selecione o cargo."),
  institution: z.string().min(1, "Selecione a instituição."),
  campus: z.string().min(1, "Selecione o campus de lotação."),
  currentLevel: z.string().min(1, "Selecione a RT/RSC atual."),
  degree: z.string().min(1, "Selecione a titulação."),
  personalEmail: z.email("Informe um e-mail pessoal válido."),
  professionalEmail: z.email("Informe um e-mail profissional válido."),
  phone: z.string().regex(/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/, "Informe um telefone válido com DDD."),
})

type IdentificationValues = z.infer<typeof identificationSchema>

function IdentificationForm({ project, onSave }: { project: LocalProject; onSave: (identification: Identification) => void }) {
  const form = useForm<IdentificationValues>({
    resolver: zodResolver(identificationSchema),
    defaultValues: project.identification ?? { name: "", cpf: "", admissionDate: "", siape: "", position: "", institution: "", campus: "", currentLevel: "", degree: "", personalEmail: "", professionalEmail: "", phone: "" },
  })
  React.useEffect(() => {
    const subscription = form.watch((values) => onSave(values as Identification))
    return () => subscription.unsubscribe()
  }, [form, onSave])

  return <form className="mt-6 space-y-4" noValidate onSubmit={(event) => event.preventDefault()}>
    <FormCard title="Identificação pessoal" description="Informe os dados básicos do servidor.">
      <FormField label="Nome" error={form.formState.errors.name}><Input autoComplete="name" {...form.register("name")} /></FormField>
      <FormField label="CPF" error={form.formState.errors.cpf}><Input inputMode="numeric" placeholder="000.000.000-00" {...form.register("cpf")} /></FormField>
      <FormField label="Data de ingresso" error={form.formState.errors.admissionDate}><Input type="date" {...form.register("admissionDate")} /></FormField>
    </FormCard>

    <FormCard title="Vínculo institucional" description="Selecione as informações funcionais vigentes.">
      <FormField label="SIAPE" error={form.formState.errors.siape}><Input inputMode="numeric" placeholder="7 dígitos" {...form.register("siape")} /></FormField>
      <ComboField label="Cargo" error={form.formState.errors.position} options={cargoOptions} value={form.watch("position")} onValueChange={(value) => form.setValue("position", value, { shouldValidate: true })} />
      <ComboField label="Instituição" error={form.formState.errors.institution} options={institutionOptions} value={form.watch("institution")} onValueChange={(value) => form.setValue("institution", value, { shouldValidate: true })} />
      <ComboField label="Campus de lotação" error={form.formState.errors.campus} options={campusOptions} value={form.watch("campus")} onValueChange={(value) => form.setValue("campus", value, { shouldValidate: true })} />
      <ComboField label="RT/RSC atual" error={form.formState.errors.currentLevel} options={rscOptions} value={form.watch("currentLevel")} onValueChange={(value) => form.setValue("currentLevel", value, { shouldValidate: true })} />
    </FormCard>

    <FormCard title="Formação" description="Indique a maior titulação concluída.">
      <ComboField label="Titulação" error={form.formState.errors.degree} options={degreeOptions} value={form.watch("degree")} onValueChange={(value) => form.setValue("degree", value, { shouldValidate: true })} />
    </FormCard>

    <FormCard title="Contato" description="Use canais de contato atualizados.">
      <FormField label="E-mail pessoal" error={form.formState.errors.personalEmail}><Input type="email" autoComplete="email" {...form.register("personalEmail")} /></FormField>
      <FormField label="E-mail profissional" error={form.formState.errors.professionalEmail}><Input type="email" {...form.register("professionalEmail")} /></FormField>
      <FormField label="Telefone" error={form.formState.errors.phone}><Input type="tel" autoComplete="tel" placeholder="(00) 90000-0000" {...form.register("phone")} /></FormField>
    </FormCard>

  </form>
}

function FormCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</CardContent></Card>
}

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: FieldError; children: React.ReactElement<{ "aria-invalid"?: boolean }> }) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}{required && <span className="text-destructive"> *</span>}</span>{React.cloneElement(children, { "aria-invalid": Boolean(error) })}{error && <span className="text-sm text-destructive">{error.message}</span>}</label>
}

function ComboField({ label, error, options, value, onValueChange }: { label: string; error?: FieldError; options: string[]; value: string; onValueChange: (value: string) => void }) {
  return <div className="grid gap-1.5"><label className="text-sm font-medium">{label}</label><Combobox items={options} value={value || null} onValueChange={(nextValue) => onValueChange(nextValue ?? "")}><ComboboxInput aria-invalid={Boolean(error)} aria-label={label} placeholder={`Selecione ${label.toLowerCase()}`} /><ComboboxContent><ComboboxEmpty>Nenhuma opção encontrada.</ComboboxEmpty><ComboboxList><ComboboxCollection>{(option: string) => <ComboboxItem key={option} value={option}>{option}</ComboboxItem>}</ComboboxCollection></ComboboxList></ComboboxContent></Combobox>{error && <span className="text-sm text-destructive">{error.message}</span>}</div>
}
