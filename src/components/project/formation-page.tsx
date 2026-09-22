import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft } from "lucide-react"
import { useForm, type FieldError } from "react-hook-form"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/project/form-field"
import { useUnsavedFormProtection } from "@/components/project/use-unsaved-form-protection"
import type { Formation, LocalProject } from "@/lib/projects"

const formationTypes = ["Graduação", "Aperfeiçoamento", "Especialização", "Mestrado", "Doutorado", "Curso livre"]
const formationStatuses = ["Em andamento", "Concluída", "Interrompida"]
const formationSchema = z.object({
  type: z.string().min(1, "Selecione o tipo."),
  title: z.string().trim().min(1, "Informe o curso ou título."),
  institution: z.string().trim().min(1, "Informe a instituição."),
  area: z.string().trim(), startDate: z.string(), endDate: z.string(),
  status: z.string().min(1, "Selecione a situação."), documentReference: z.string().trim(),
  attachmentName: z.string(), notes: z.string().trim(),
}).superRefine((values, context) => {
  if (values.startDate && values.endDate && values.endDate < values.startDate) context.addIssue({ code: "custom", path: ["endDate"], message: "A data de fim não pode ser anterior à data de início." })
})
type FormationValues = z.infer<typeof formationSchema>
const emptyFormation: FormationValues = { type: "", title: "", institution: "", area: "", startDate: "", endDate: "", status: "", documentReference: "", attachmentName: "", notes: "" }

function formatTimestamp(value: string) { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) }

export function FormationPage({ project, action, formationId, onChange, onNavigate }: { project: LocalProject; action: "new" | "edit"; formationId?: string; onChange: (formations: Formation[]) => void; onNavigate: (path: string) => void }) {
  const formation = formationId ? project.formations?.find((item) => item.id === formationId) : undefined
  const form = useForm<FormationValues>({ resolver: zodResolver(formationSchema), defaultValues: formation ? { type: formation.type, title: formation.title, institution: formation.institution, area: formation.area, startDate: formation.startDate, endDate: formation.endDate, status: formation.status, documentReference: formation.documentReference, attachmentName: formation.attachmentName, notes: formation.notes } : emptyFormation })
  useUnsavedFormProtection(form.formState.isDirty)
  const returnPath = `/project/${project.localId}/education`

  if (action === "edit" && !formation) return <Card className="mt-6"><CardHeader><CardTitle>Formação indisponível</CardTitle><CardDescription>O registro selecionado não foi encontrado neste projeto.</CardDescription></CardHeader><CardContent><Button onClick={() => onNavigate(returnPath)}>Voltar para formações</Button></CardContent></Card>

  const saveFormation = (values: FormationValues) => {
    const now = new Date().toISOString()
    const next = formation ? { ...formation, ...values, updatedAt: now } : { id: crypto.randomUUID(), ...values, createdAt: now, updatedAt: now }
    onChange(formation ? (project.formations ?? []).map((item) => item.id === formation.id ? next : item) : [next, ...(project.formations ?? [])])
    onNavigate(returnPath)
  }

  return <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground"><ol className="flex flex-wrap items-center gap-2"><li>{project.rscLevel}</li><li aria-hidden="true">›</li><li>Formação</li><li aria-hidden="true">›</li><li className="text-foreground">{action === "edit" ? "Editar formação" : "Adicionar formação"}</li></ol></nav>
    <header className="sticky top-0 z-10 -mx-4 mb-6 flex flex-wrap items-start justify-between gap-4 border-b bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"><div><h1 className="text-2xl font-semibold">{action === "edit" ? "Editar formação" : "Adicionar formação"}</h1><p className="mt-1 text-sm text-muted-foreground">Cadastre cursos, titulações e aperfeiçoamentos do seu histórico.</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => onNavigate(returnPath)}><ArrowLeft /> Cancelar</Button><Button type="submit" form="formation-form">{action === "edit" ? "Salvar alterações" : "Cadastrar formação"}</Button></div></header>
    <form id="formation-form" className="grid gap-6" noValidate onSubmit={form.handleSubmit(saveFormation)}><Card><CardHeader><CardTitle>Dados da formação</CardTitle><CardDescription>Os campos marcados com asterisco são obrigatórios.</CardDescription></CardHeader><CardContent className="grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><SelectFormField label="Tipo" required error={form.formState.errors.type} value={form.watch("type")} options={formationTypes} onValueChange={(value) => form.setValue("type", value, { shouldValidate: true })} /><FormField label="Curso/título" required error={form.formState.errors.title}><Input {...form.register("title")} /></FormField><FormField label="Instituição" required error={form.formState.errors.institution}><Input {...form.register("institution")} /></FormField><FormField label="Área" error={form.formState.errors.area}><Input {...form.register("area")} /></FormField><FormField label="Data de início" error={form.formState.errors.startDate}><Input type="date" {...form.register("startDate")} /></FormField><FormField label="Data de fim" error={form.formState.errors.endDate}><Input type="date" min={form.watch("startDate") || undefined} {...form.register("endDate")} /></FormField><SelectFormField label="Situação" required error={form.formState.errors.status} value={form.watch("status")} options={formationStatuses} onValueChange={(value) => form.setValue("status", value, { shouldValidate: true })} /><FormField label="Referência documental" error={form.formState.errors.documentReference}><Input placeholder="Ex.: Diploma registrado nº 123" {...form.register("documentReference")} /></FormField></div><div className="grid gap-1.5 text-sm font-medium"><label htmlFor="formation-attachment">Anexo do diploma ou certificado</label><Input id="formation-attachment" type="file" accept=".pdf,image/*" onChange={(event) => form.setValue("attachmentName", event.target.files?.[0]?.name ?? "", { shouldDirty: true })} /><span className="text-xs font-normal text-muted-foreground">{form.watch("attachmentName") || "Nenhum arquivo selecionado."}</span></div><FormField label="Observações" error={form.formState.errors.notes}><Textarea rows={3} {...form.register("notes")} /></FormField></CardContent></Card>{formation && <Card><CardContent className="grid gap-4 p-4 text-sm sm:grid-cols-2"><div><span className="text-muted-foreground">Criado em</span><p className="mt-1 font-medium">{formatTimestamp(formation.createdAt)}</p></div><div><span className="text-muted-foreground">Atualizado em</span><p className="mt-1 font-medium">{formatTimestamp(formation.updatedAt)}</p></div><Badge variant="outline" className="w-fit">Registro existente</Badge></CardContent></Card>}</form>
  </div></main>
}

function SelectFormField({ label, required, error, value, options, onValueChange }: { label: string; required?: boolean; error?: FieldError; value: string; options: string[]; onValueChange: (value: string) => void }) { return <div className="grid gap-1.5"><label className="text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}</label><Select value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? "")}><SelectTrigger aria-invalid={Boolean(error)} className="h-9 w-full"><SelectValue placeholder={`Selecione ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{error && <span className="text-sm text-destructive">{error.message}</span>}</div> }