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

export function EducationPage({ project, onChange }: { project: LocalProject; onChange: (formations: Formation[]) => void }) {
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
import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarDays, Copy, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react"
import { useForm, type FieldError } from "react-hook-form"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/project/form-field"
import { useUnsavedFormProtection } from "@/components/project/use-unsaved-form-protection"
import type { Formation, LocalProject } from "@/lib/projects"
