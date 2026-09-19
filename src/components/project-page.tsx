import * as React from "react"
import {
  BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, Copy, FileOutput,
  ChevronDown, FileText, GraduationCap, HardDrive, LayoutDashboard, Pencil, Plus, Search, Trash2, UserRound,
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
import { getLocalProjects } from "@/lib/projects"
import { type Formation, updateLocalProject } from "@/lib/projects"
import type { Regulation } from "@/domain/regulation"
import { calculateLevelProjection, type LevelProjection } from "@/domain/scoring"
import type { RequirementOccurrence } from "@/lib/projects"

const pages = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard, description: "Progresso, pontuação, comprovantes, pendências e backup." },
  { id: "profile", label: "Identificação", icon: UserRound, description: "Cadastro Funcional e Acadêmico do Servidor" },
  { id: "education", label: "Formação", icon: GraduationCap, description: "Formação, aperfeiçoamento e titulação." },
  { id: "requirements", label: "Requisitos", icon: Search, description: "Explore o catálogo normativo e registre suas experiências." },
  { id: "memorial", label: "Memorial", icon: FileText, description: "Edição e regeneração do Memorial." },
  { id: "review", label: "Revisão", icon: ClipboardCheck, description: "Checklist e prontidão documental." },
  { id: "preview", label: "Visualizar", icon: FileOutput, description: "Visualizador A4 genérico." },
  { id: "documents", label: "Documentos", icon: HardDrive, description: "PDFs, JSON, backup, ZIP, importação e restauração." },
] as const

type ProjectPageProps = { localId: string; section: string; catalog?: Regulation }

export function ProjectPage({ localId, section, catalog }: ProjectPageProps) {
  const [project, setProject] = React.useState(() => getLocalProjects().find((item) => item.localId === localId))
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
          if (!project) return
          const nextProject = { ...project, requirementOccurrences: occurrences, updatedAt: new Date().toISOString() }
          updateLocalProject(nextProject)
          setProject(nextProject)
        }} />
      </section>
    </div>
  </main>
}

function ProjectSection({ section, project, catalog, onOccurrencesChange }: { section: (typeof pages)[number]["id"]; project?: ReturnType<typeof getLocalProjects>[number]; catalog?: Regulation; onOccurrencesChange: (occurrences: RequirementOccurrence[]) => void }) {
  if (section === "overview") return <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <Card className="xl:col-span-2"><CardHeader><CardTitle>Andamento da avaliação</CardTitle><CardDescription>Complete as seções para avançar na revisão.</CardDescription></CardHeader><CardContent><Progress value={0}><ProgressLabel>Progresso do projeto</ProgressLabel><ProgressValue /></Progress></CardContent></Card>
    <Card><CardHeader><CardTitle>Pontuação estimada</CardTitle><CardDescription>Sem lançamentos avaliados.</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">0 pts</p></CardContent></Card>
    <InfoCard title="Comprovantes" text="Nenhum comprovante adicionado." /><InfoCard title="Pendências" text="Preencha a identificação e a formação para começar." /><InfoCard title="Backup" text="Gere um backup JSON na seção Documentos." />
  </div>
  if (section === "profile") return <IdentificationForm />
  if (section === "education") return project ? <EducationSection project={project} /> : null
  if (section === "requirements") {
    if (!project) return null
    if (!catalog) return <Card className="mt-6"><CardHeader><CardTitle>Regulamento indisponível</CardTitle><CardDescription>O regulamento salvo neste projeto não está disponível no catálogo local.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Selecione ou restaure um projeto vinculado a um regulamento instalado antes de cadastrar lançamentos.</p></CardContent></Card>
    return <RequirementsSection project={project} catalog={catalog} projections={{ "rsc-i": calculateLevelProjection(catalog, "rsc-i", project.requirementOccurrences ?? []), "rsc-ii": calculateLevelProjection(catalog, "rsc-ii", project.requirementOccurrences ?? []), "rsc-iii": calculateLevelProjection(catalog, "rsc-iii", project.requirementOccurrences ?? []) }} onOccurrencesChange={onOccurrencesChange} />
  }
  if (section === "preview") return <Card className="mt-6"><CardContent className="p-6"><div className="mx-auto aspect-[210/297] max-w-xl border bg-background p-8 shadow-sm"><p className="text-sm font-semibold">Memorial RSC</p><div className="mt-8 space-y-3"><div className="h-2 w-2/3 rounded bg-muted" /><div className="h-2 rounded bg-muted" /><div className="h-2 w-5/6 rounded bg-muted" /></div></div></CardContent></Card>
  return <div className="mt-6 grid gap-4 md:grid-cols-2"><InfoCard title={section === "documents" ? "Arquivos do projeto" : "Nenhum dado cadastrado"} text={section === "documents" ? "Exporte PDFs, JSON e backup ZIP, ou importe uma restauração." : "Adicione informações para compor esta etapa da avaliação."} /><Card><CardHeader><CardTitle>Próxima ação</CardTitle><CardDescription>Esta seção está pronta para receber seus lançamentos.</CardDescription></CardHeader><CardContent><Button><CheckCircle2 /> Adicionar informação</Button></CardContent></Card></div>
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{text}</CardDescription></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" /> Os dados serão salvos neste navegador.</div></CardContent></Card>
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

function RequirementsSection({ project, catalog, projections, onOccurrencesChange }: { project: ReturnType<typeof getLocalProjects>[number]; catalog: Regulation; projections: Record<"rsc-i" | "rsc-ii" | "rsc-iii", LevelProjection>; onOccurrencesChange: (occurrences: RequirementOccurrence[]) => void }) {
  const [levelId, setLevelId] = React.useState<"rsc-i" | "rsc-ii" | "rsc-iii">("rsc-i")
  const [query, setQuery] = React.useState("")
  const [criterionId, setCriterionId] = React.useState<string | null>(null)
  const [attachments, setAttachments] = React.useState<string[]>([])
  const form = useForm<OccurrenceFormValues, unknown, OccurrenceValues>({ resolver: zodResolver(occurrenceSchema), defaultValues: emptyOccurrence })
  const level = catalog.levels.find((item) => item.section === levelId)!
  const projection = projections[levelId]
  const selectedCriterion = level.criteria.find((item) => item.id === criterionId) ?? null
  const unassignedOccurrences = (project.requirementOccurrences ?? []).filter((item) => !item.criterionId || !item.selectedLevel)
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR")
  const matches = (description: string) => !normalizedQuery || description.toLocaleLowerCase("pt-BR").includes(normalizedQuery)
  const openDialog = (id: string) => { form.reset(emptyOccurrence); setAttachments([]); setCriterionId(id) }
  const saveOccurrence = (values: OccurrenceValues) => {
    if (!selectedCriterion) return
    const now = new Date().toISOString()
    onOccurrencesChange([...(project.requirementOccurrences ?? []), { id: crypto.randomUUID(), criterionId: selectedCriterion.id, selectedLevel: levelId, ...values, attachmentNames: attachments, createdAt: now, updatedAt: now }])
    setCriterionId(null)
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
        {level.directives.map((directive) => {
          const criteria = level.criteria.filter((criterion) => criterion.directiveId === directive.id && matches(criterion.description))
          if (criteria.length === 0) return null
          return <DirectiveCard key={directive.id} directive={directive} criteria={criteria} projection={projection} onAdd={openDialog} />
        })}
      </TabsContent>)}
    </Tabs>

    {unassignedOccurrences.length > 0 && <Card className="mt-4"><CardHeader><CardTitle>Lançamentos aguardando enquadramento</CardTitle><CardDescription>Essas ocorrências ainda não estão vinculadas a um critério e não entram na estimativa.</CardDescription></CardHeader><CardContent className="space-y-2">{unassignedOccurrences.map((occurrence) => <div key={occurrence.id} className="rounded-lg border p-3 text-sm"><p className="font-medium">{occurrence.description || "Lançamento sem descrição"}</p><p className="mt-1 text-muted-foreground">Quantidade: {occurrence.quantity}</p></div>)}</CardContent></Card>}

    <Dialog open={Boolean(selectedCriterion)} onOpenChange={(open) => { if (!open) setCriterionId(null) }}><DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Adicionar lançamento</DialogTitle><DialogDescription>{selectedCriterion ? `${selectedCriterion.code} · ${selectedCriterion.description}` : ""}</DialogDescription></DialogHeader><form className="grid gap-4" noValidate onSubmit={form.handleSubmit(saveOccurrence)}><div className="grid gap-4 sm:grid-cols-2"><FormField label="Período (opcional)" error={form.formState.errors.period}><Input placeholder="Ex.: 2024.1 a 2024.2" {...form.register("period")} /></FormField><FormField label={`Quantidade (${selectedCriterion?.unit ?? ""})`} required error={form.formState.errors.quantity as FieldError | undefined}><Input type="number" min="0.01" step="any" {...form.register("quantity")} /></FormField></div><FormField label="Descrição da atividade" required error={form.formState.errors.description}><Textarea rows={3} {...form.register("description")} /></FormField><FormField label="Resultados alcançados" error={form.formState.errors.results}><Textarea rows={3} {...form.register("results")} /></FormField><FormField label="Competências relacionadas" error={form.formState.errors.competencies}><Textarea rows={3} {...form.register("competencies")} /></FormField><FormField label="Evidências e anexos comprobatórios" error={form.formState.errors.evidence}><Textarea rows={3} placeholder="Informe links, referências ou identificação dos comprovantes." {...form.register("evidence")} /></FormField><div className="grid gap-1.5 text-sm font-medium"><label htmlFor="occurrence-attachments">Adicionar anexos</label><Input id="occurrence-attachments" type="file" multiple onChange={(event) => setAttachments(Array.from(event.target.files ?? []).map((file) => file.name))} /><span className="text-xs font-normal text-muted-foreground">{attachments.length ? attachments.join(", ") : "Nenhum arquivo selecionado."}</span></div><p className="text-sm text-muted-foreground">A pontuação é calculada automaticamente a partir das quantidades lançadas e dos limites do catálogo.</p><DialogFooter><DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose><Button type="submit">Salvar lançamento</Button></DialogFooter></form></DialogContent></Dialog>
  </section>
}

function DirectiveCard({ directive, criteria, projection, onAdd }: { directive: Regulation["levels"][number]["directives"][number]; criteria: Regulation["levels"][number]["criteria"]; projection: LevelProjection; onAdd: (criterionId: string) => void }) {
  const [open, setOpen] = React.useState(true)

  return <Collapsible open={open} onOpenChange={setOpen}>
    <Card>
      <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardDescription>Diretriz {directive.code}</CardDescription><CardTitle className="mt-1 text-base">{directive.title}</CardTitle></div><div className="flex items-center gap-2"><Badge variant="outline">{projection.directiveScores[directive.id].toLocaleString("pt-BR", { maximumFractionDigits: 2 })} / {directive.maxScore} pts</Badge><CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" />} aria-label={`${open ? "Recolher" : "Expandir"} diretriz ${directive.code}`}><ChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} /><span className="hidden sm:inline">{open ? "Recolher" : "Expandir"}</span></CollapsibleTrigger></div></div></CardHeader>
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

function EducationSection({ project }: { project: ReturnType<typeof getLocalProjects>[number] }) {
  const [formations, setFormations] = React.useState<Formation[]>(project.formations ?? [])
  const [editing, setEditing] = React.useState<Formation | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)

  const orderedFormations = [...formations].sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""))
  const persist = (nextFormations: Formation[]) => {
    setFormations(nextFormations)
    updateLocalProject({ ...project, formations: nextFormations, updatedAt: new Date().toISOString() })
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

function IdentificationForm() {
  const form = useForm<IdentificationValues>({
    resolver: zodResolver(identificationSchema),
    defaultValues: { name: "", cpf: "", admissionDate: "", siape: "", position: "", institution: "", campus: "", currentLevel: "", degree: "", personalEmail: "", professionalEmail: "", phone: "" },
  })

  return <form className="mt-6 space-y-4" noValidate onSubmit={form.handleSubmit(() => undefined)}>
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

    <div className="flex justify-end"><Button type="submit">Validar dados</Button></div>
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
