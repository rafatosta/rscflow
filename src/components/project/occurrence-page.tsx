import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, CircleAlert, Paperclip, Upload } from "lucide-react"
import { useForm, type FieldError } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/project/form-field"
import { buildOccurrenceNarrative } from "@/components/project/memorial-content"
import { useUnsavedFormProtection } from "@/components/project/use-unsaved-form-protection"
import { calculateLevelProjection } from "@/domain/scoring"
import type { Regulation } from "@/domain/regulation"
import { getOccurrencesWithStoredAttachments, replaceOccurrenceAttachments, type LocalProject, type RequirementOccurrence } from "@/lib/projects"

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

export function OccurrencePage({ project, catalog, action, occurrenceId, onOccurrencesChange, onNavigate }: {
  project: LocalProject
  catalog: Regulation
  action: "new" | "edit"
  occurrenceId?: string
  onOccurrencesChange: (occurrences: RequirementOccurrence[]) => void
  onNavigate: (path: string) => void
}) {
  const currentOccurrence = occurrenceId ? project.requirementOccurrences?.find((item) => item.id === occurrenceId) : undefined
  const criterionId = action === "new" ? new URLSearchParams(window.location.search).get("criterion") : currentOccurrence?.criterionId
  const requestedLevel = new URLSearchParams(window.location.search).get("level")
  const selectedLevel = currentOccurrence?.selectedLevel ?? (requestedLevel === "rsc-ii" || requestedLevel === "rsc-iii" ? requestedLevel : "rsc-i")
  const level = catalog.levels.find((item) => item.section === selectedLevel)
  const criterion = level?.criteria.find((item) => item.id === criterionId)
  const [attachments, setAttachments] = React.useState(currentOccurrence?.attachmentNames ?? [])
  const [attachmentFiles, setAttachmentFiles] = React.useState<File[]>([])
  const [storedAttachments, setStoredAttachments] = React.useState<Set<string> | null>(null)
  const form = useForm<OccurrenceFormValues, unknown, OccurrenceValues>({ resolver: zodResolver(occurrenceSchema), defaultValues: currentOccurrence ? {
    period: currentOccurrence.period, quantity: currentOccurrence.quantity, description: currentOccurrence.description,
    results: currentOccurrence.results, competencies: currentOccurrence.competencies, evidence: currentOccurrence.evidence,
  } : emptyOccurrence })
  const values = form.watch()
  useUnsavedFormProtection(form.formState.isDirty)

  React.useEffect(() => {
    if (currentOccurrence) void getOccurrencesWithStoredAttachments(project.localId, [currentOccurrence.id]).then(setStoredAttachments)
  }, [currentOccurrence, project.localId])

  if (!criterion || !level) {
    return <Card className="mt-6"><CardHeader><CardTitle>Lançamento indisponível</CardTitle><CardDescription>O critério deste lançamento não está disponível no catálogo atual.</CardDescription></CardHeader><CardContent><Button onClick={() => onNavigate(`/project/${project.localId}/requirements`)}>Voltar aos requisitos</Button></CardContent></Card>
  }

  const draft: RequirementOccurrence = {
    id: currentOccurrence?.id ?? "draft",
    criterionId: criterion.id,
    selectedLevel,
    period: values.period ?? "",
    quantity: Number(values.quantity) || 0,
    description: values.description ?? "",
    results: values.results ?? "",
    competencies: values.competencies ?? "",
    evidence: values.evidence ?? "",
    attachmentNames: attachments,
    createdAt: currentOccurrence?.createdAt ?? "",
    updatedAt: currentOccurrence?.updatedAt ?? "",
  }
  const projection = calculateLevelProjection(catalog, selectedLevel, [
    ...(project.requirementOccurrences ?? []).filter((item) => item.id !== currentOccurrence?.id),
    draft,
  ])
  const score = projection.criterionScores[criterion.id]
  const returnPath = `/project/${project.localId}/requirements`

  const saveOccurrence = async (nextValues: OccurrenceValues) => {
    const now = new Date().toISOString()
    const id = currentOccurrence?.id ?? crypto.randomUUID()
    const next = { id, criterionId: criterion.id, selectedLevel, ...nextValues, attachmentNames: attachments, createdAt: currentOccurrence?.createdAt ?? now, updatedAt: now }
    const generatedText = buildOccurrenceNarrative(next, criterion.description)
    const saved: RequirementOccurrence = currentOccurrence ? {
      ...currentOccurrence, ...next, generatedText,
      editedText: currentOccurrence.isManuallyEdited ? currentOccurrence.editedText : generatedText,
      isManuallyEdited: currentOccurrence.isManuallyEdited ?? false,
      isGeneratedTextOutdated: Boolean(currentOccurrence.isManuallyEdited && currentOccurrence.generatedText && generatedText !== currentOccurrence.generatedText),
    } : { ...next, generatedText, editedText: generatedText, isManuallyEdited: false, isGeneratedTextOutdated: false }
    if (attachmentFiles.length) await replaceOccurrenceAttachments(project.localId, id, attachmentFiles)
    onOccurrencesChange(currentOccurrence
      ? (project.requirementOccurrences ?? []).map((item) => item.id === id ? saved : item)
      : [...(project.requirementOccurrences ?? []), saved])
    onNavigate(returnPath)
  }

  return <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2"><li>{project.rscLevel}</li><li aria-hidden="true">›</li><li>{catalog.metadata.regulation.authority} nº {catalog.metadata.regulation.number}/{catalog.metadata.regulation.year}</li><li aria-hidden="true">›</li><li className="text-foreground">{action === "edit" ? "Editar lançamento" : "Novo lançamento"}</li></ol>
      </nav>
      <header className="sticky top-0 z-10 -mx-4 mb-6 flex flex-wrap items-start justify-between gap-4 border-b bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div><h1 className="text-2xl font-semibold">{action === "edit" ? "Editar lançamento" : "Novo lançamento"}</h1><p className="mt-1 text-sm text-muted-foreground">{criterion.code} · {criterion.description}</p></div>
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => onNavigate(returnPath)}><ArrowLeft /> Cancelar</Button><Button type="submit" form="occurrence-form">Salvar lançamento</Button></div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form id="occurrence-form" className="grid gap-4" noValidate onSubmit={form.handleSubmit(saveOccurrence)}>
          <Card><CardHeader><CardTitle>Dados do lançamento</CardTitle><CardDescription>Registre a atividade e os elementos que comprovam sua realização.</CardDescription></CardHeader><CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2"><FormField label="Período (opcional)" error={form.formState.errors.period}><Input placeholder="Ex.: 2024.1 a 2024.2" {...form.register("period")} /></FormField><FormField label={`Quantidade (${criterion.unit})`} required error={form.formState.errors.quantity as FieldError | undefined}><Input type="number" min="0.01" step="any" {...form.register("quantity")} /></FormField></div>
            <FormField label="Descrição da atividade" required error={form.formState.errors.description}><Textarea rows={3} {...form.register("description")} /></FormField>
            <FormField label="Resultados alcançados" error={form.formState.errors.results}><Textarea rows={3} {...form.register("results")} /></FormField>
            <FormField label="Competências relacionadas" error={form.formState.errors.competencies}><Textarea rows={3} {...form.register("competencies")} /></FormField>
            <FormField label="Evidências e anexos comprobatórios" error={form.formState.errors.evidence}><Textarea rows={3} placeholder="Informe links, referências ou identificação dos comprovantes." {...form.register("evidence")} /></FormField>
            <AttachmentField attachments={attachments} currentOccurrence={currentOccurrence} storedAttachments={storedAttachments} onChange={(files) => { setAttachmentFiles(files); setAttachments(files.map((file) => file.name)) }} />
          </CardContent></Card>
        </form>
        <aside className="lg:sticky lg:top-24 lg:self-start"><Card><CardHeader><CardTitle>Prévia da pontuação</CardTitle><CardDescription>Atualizada conforme a quantidade informada.</CardDescription></CardHeader><CardContent className="grid gap-3 text-sm"><SummaryRow label="Quantidade" value={`${score.quantity.toLocaleString("pt-BR")} de ${criterion.maxQuantity}`} /><SummaryRow label="Pontuação calculada" value={`${score.score.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pts`} /><SummaryRow label="Limite do critério" value={`${criterion.maxQuantity} ${criterion.unit}`} />{score.blocked ? <Badge variant="destructive">Cálculo bloqueado por conflito normativo</Badge> : <p className="text-xs text-muted-foreground">A pontuação considerada respeita o limite normativo e os fatores do critério.</p>}</CardContent></Card></aside>
      </div>
    </div>
  </main>
}

function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"><span className="text-muted-foreground">{label}</span><strong className="text-right">{value}</strong></div> }

function AttachmentField({ attachments, currentOccurrence, storedAttachments, onChange }: { attachments: string[]; currentOccurrence?: RequirementOccurrence; storedAttachments: Set<string> | null; onChange: (files: File[]) => void }) {
  return <div className="grid gap-3 rounded-lg border p-4"><div><p className="text-sm font-medium">Comprovantes</p><p className="mt-1 text-xs text-muted-foreground">Anexe um ou mais arquivos que comprovem este lançamento.</p></div>{currentOccurrence && storedAttachments && !storedAttachments.has(currentOccurrence.id) && <Alert><CircleAlert /><AlertTitle>Arquivo precisa ser selecionado novamente</AlertTitle><AlertDescription>Referência cadastrada: {attachments.join(", ")}. O arquivo não foi armazenado no navegador.</AlertDescription></Alert>}<Input id="occurrence-attachments" className="sr-only" type="file" multiple onChange={(event) => onChange(Array.from(event.target.files ?? []))} /><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("occurrence-attachments")?.click()}><Upload />{attachments.length ? "Substituir arquivos" : "Selecionar arquivos"}</Button><span className="text-xs text-muted-foreground">{attachments.length ? `${attachments.length} arquivo(s) selecionado(s)` : "Nenhum arquivo selecionado"}</span></div>{attachments.length > 0 && <ul className="grid gap-1.5" aria-label="Arquivos selecionados">{attachments.map((attachment, index) => <li key={`${attachment}-${index}`} className="flex items-center gap-2 text-sm"><Paperclip className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 truncate">{attachment}</span></li>)}</ul>}</div>
}