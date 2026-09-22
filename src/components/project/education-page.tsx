function formatFormationDate(value: string) {
  if (!value) return "Data não informada"
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`))
}

export function EducationPage({ project, onChange, onNavigate }: { project: LocalProject; onChange: (formations: Formation[]) => void; onNavigate: (path: string) => void }) {
  const [formations, setFormations] = React.useState<Formation[]>(project.formations ?? [])
  const [formationToDelete, setFormationToDelete] = React.useState<Formation | null>(null)

  const orderedFormations = [...formations].sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""))
  const persist = (nextFormations: Formation[]) => {
    setFormations(nextFormations)
    onChange(nextFormations)
  }
  const createFormation = () => onNavigate(`/project/${project.localId}/education/new`)
  const duplicateFormation = (formation: Formation) => {
    const now = new Date().toISOString()
    persist([{ ...formation, id: crypto.randomUUID(), title: `${formation.title} (cópia)`, createdAt: now, updatedAt: now }, ...formations])
  }
  const deleteFormation = (formation: Formation) => {
    persist(formations.filter((item) => item.id !== formation.id))
    setFormationToDelete(null)
  }

  return <section className="mt-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h4 className="text-lg font-semibold">Formações cadastradas</h4><p className="text-sm text-muted-foreground">Os registros são exibidos da formação mais recente para a mais antiga.</p></div>
      <Button onClick={createFormation}><Plus /> Adicionar formação</Button>
    </div>
    {orderedFormations.length === 0 ? <Card className="mt-5"><CardContent className="flex min-h-44 flex-col items-center justify-center p-6 text-center"><GraduationCap className="size-7 text-muted-foreground" /><p className="mt-3 font-medium">Nenhuma formação cadastrada</p><p className="mt-1 text-sm text-muted-foreground">Adicione cursos, titulações e aperfeiçoamentos ao seu histórico.</p><Button className="mt-4" variant="outline" onClick={createFormation}><Plus /> Adicionar formação</Button></CardContent></Card> : <div className="mt-5 grid gap-4 md:grid-cols-2">
      {orderedFormations.map((formation) => <Card key={formation.id}>
        <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><CardDescription>{formation.type}</CardDescription><CardTitle className="mt-1 truncate">{formation.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{formation.institution}</p></div><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><GraduationCap className="size-4" /></span></div></CardHeader>
        <CardContent className="space-y-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />{formatFormationDate(formation.startDate)} — {formation.endDate ? formatFormationDate(formation.endDate) : "em andamento"}</div><div className="flex flex-wrap gap-2"><Badge variant="secondary">{formation.status}</Badge>{formation.area && <Badge variant="outline">{formation.area}</Badge>}</div><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => duplicateFormation(formation)}><Copy /> Duplicar</Button><Button variant="ghost" size="sm" onClick={() => onNavigate(`/project/${project.localId}/education/edit/${encodeURIComponent(formation.id)}`)}><Pencil /> Editar</Button><Button variant="ghost" size="icon-sm" aria-label={`Excluir ${formation.title}`} onClick={() => setFormationToDelete(formation)}><Trash2 /></Button></div></CardContent>
      </Card>)}
    </div>}
    <AlertDialog open={Boolean(formationToDelete)} onOpenChange={(open) => { if (!open) setFormationToDelete(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Excluir formação?</AlertDialogTitle><AlertDialogDescription>A formação “{formationToDelete?.title}” será removida permanentemente. Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (formationToDelete) deleteFormation(formationToDelete) }}>Excluir formação</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
}

import * as React from "react"
import { CalendarDays, Copy, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Formation, LocalProject } from "@/lib/projects"
