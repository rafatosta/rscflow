import * as React from "react"
import { BookOpen, Pencil, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { loadRegulations } from "@/data/regulations/load"
import { calculateLevelProjection } from "@/domain/scoring"
import type { Regulation } from "@/domain/regulation"
import type { LocalProject, ProjectSettings } from "@/lib/projects"
import { requestedLevelIds, rscSectionLabels } from "@/components/project/project-pages"

const regulations = loadRegulations()
const rscLevels = ["RSC I", "RSC II", "RSC III"] as const

function formatRegulation(regulation: Regulation) {
  const { authority, number, year } = regulation.metadata.regulation
  return `${authority} nº ${number}/${year}`
}

function calculateProjectProgress(project?: LocalProject) {
  if (!project) return 0
  const identificationComplete = project.identification !== undefined && Object.values(project.identification).every((value) => value.trim())
  const hasFormation = (project.formations?.length ?? 0) > 0
  const hasRequirement = (project.requirementOccurrences?.length ?? 0) > 0
  const completedMemorialSections = project.memorialSections?.filter((section) => section.content.trim()).length ?? 0
  return Math.round(((Number(identificationComplete) + Number(hasFormation) + Number(hasRequirement) + completedMemorialSections) / 10) * 100)
}

export function OverviewPage({ project, catalog, onProjectSettingsChange }: { project?: LocalProject; catalog?: Regulation; onProjectSettingsChange: (settings: ProjectSettings) => void }) {
  const requestedLevel = project ? requestedLevelIds[project.rscLevel as keyof typeof requestedLevelIds] : undefined
  const requestedProjection = project && catalog && requestedLevel ? calculateLevelProjection(catalog, requestedLevel, project.requirementOccurrences ?? []) : undefined
  const levelProjections = project && catalog ? catalog.levels.map((level) => ({ level, projection: calculateLevelProjection(catalog, level.section, project.requirementOccurrences ?? []) })) : []
  const cumulativeScore = levelProjections.reduce((total, { projection }) => total + projection.total, 0)
  const minimumTotal = catalog?.metadata.scoring.minimumTotal
  const minimumRequestedLevel = catalog?.metadata.scoring.minimumRequestedLevel
  const meetsResolutionCriteria = Boolean(requestedProjection && minimumTotal !== undefined && minimumRequestedLevel !== undefined && cumulativeScore >= minimumTotal && requestedProjection.total >= minimumRequestedLevel)

  return <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {project && <ProjectSettingsCard project={project} onSave={onProjectSettingsChange} />}
    <Card className="xl:col-span-2"><CardHeader><CardTitle>Andamento do preenchimento</CardTitle><CardDescription>Complete as seções para avançar no preenchimento dos dados.</CardDescription></CardHeader><CardContent><Progress value={calculateProjectProgress(project)}><ProgressLabel>Progresso do projeto</ProgressLabel><ProgressValue /></Progress></CardContent></Card>
    <Card><CardHeader><CardTitle>Resultado estimado</CardTitle><CardDescription>{requestedProjection && minimumTotal !== undefined && minimumRequestedLevel !== undefined ? `A resolução exige ${minimumTotal} pontos na soma dos RSC e ${minimumRequestedLevel} no nível solicitado.` : "Selecione um regulamento e um nível RSC disponíveis."}</CardDescription></CardHeader><CardContent>{requestedProjection && minimumTotal !== undefined && minimumRequestedLevel !== undefined ? <div className="space-y-3"><div className="flex items-center justify-between gap-3"><p className="text-3xl font-semibold">{cumulativeScore.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pts</p><Badge variant={meetsResolutionCriteria ? "secondary" : "destructive"}>{meetsResolutionCriteria ? "Apto" : "Não atende aos critérios"}</Badge></div><div className="space-y-1 text-xs text-muted-foreground"><p>Total acumulado: {cumulativeScore.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} de {minimumTotal} pts.</p><p>{rscSectionLabels[requestedProjection.levelId]} solicitado: {requestedProjection.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} de {minimumRequestedLevel} pts.</p>{requestedProjection.provisional && <p>Resultado sujeito à validação manual do catálogo.</p>}</div></div> : <p className="text-3xl font-semibold">—</p>}</CardContent></Card>
    <Card className="xl:col-span-3"><CardHeader><CardTitle>Resumo de pontuação por RSC</CardTitle><CardDescription>Estimativas calculadas a partir dos lançamentos registrados no projeto.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{levelProjections.map(({ level, projection }) => <div key={level.section} className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">{rscSectionLabels[level.section]}</p><p className="mt-1 text-2xl font-semibold">{projection.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pts</p><p className="mt-1 text-xs text-muted-foreground">{projection.provisional ? "Requer validação manual do catálogo." : "Cálculo disponível para conferência."}</p></div>)}{levelProjections.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pontuação está disponível para este regulamento.</p>}</CardContent></Card>
    <InfoCard title="Comprovantes" text="Nenhum comprovante adicionado." /><InfoCard title="Pendências" text="Preencha a identificação e a formação para começar." /><InfoCard title="Backup do projeto" text="Crie uma cópia na seção de backup do projeto." />
  </div>
}

function ProjectSettingsCard({ project, onSave }: { project: LocalProject; onSave: (settings: ProjectSettings) => void }) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState(project.name)
  const [rscLevel, setRscLevel] = React.useState(project.rscLevel)
  const [regulation, setRegulation] = React.useState(project.regulation)
  const regulationChanged = regulation !== project.regulation
  const selectedRegulation = regulations.find((item) => item.metadata.regulation.id === project.regulation)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setName(project.name)
      setRscLevel(project.rscLevel)
      setRegulation(project.regulation)
    }
  }

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName || !rscLevel || !regulation) return
    onSave({ name: trimmedName, rscLevel, regulation })
    setOpen(false)
  }

  return <>
    <Card className="md:col-span-2 xl:col-span-3">
      <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
        <div><CardTitle>Dados do projeto</CardTitle><CardDescription>Informações usadas em todas as etapas, cálculos e documentos deste projeto.</CardDescription></div>
        <Button variant="outline" onClick={() => handleOpenChange(true)}><Pencil /> Editar dados</Button>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <ProjectSetting label="Nome do projeto" value={project.name} />
        <ProjectSetting label="Regulamento" value={selectedRegulation ? formatRegulation(selectedRegulation) : project.regulation} />
        <ProjectSetting label="RSC pretendido" value={project.rscLevel} />
      </CardContent>
    </Card>

    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={save}>
          <DialogHeader><DialogTitle>Editar dados do projeto</DialogTitle><DialogDescription>As alterações serão aplicadas a todas as seções, cálculos e documentos.</DialogDescription></DialogHeader>
          <div className="mt-5 space-y-4">
            <label className="grid gap-1.5 text-sm font-medium" htmlFor="project-name">Nome do projeto<Input id="project-name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} required /></label>
            <label className="grid gap-1.5 text-sm font-medium" htmlFor="project-regulation">Regulamento<Select value={regulation} onValueChange={(value) => setRegulation(value ?? "")}><SelectTrigger id="project-regulation" className="w-full"><SelectValue placeholder="Selecione um regulamento" /></SelectTrigger><SelectContent>{regulations.map((item) => <SelectItem key={item.metadata.regulation.id} value={item.metadata.regulation.id}>{formatRegulation(item)}</SelectItem>)}</SelectContent></Select></label>
            <label className="grid gap-1.5 text-sm font-medium" htmlFor="project-rsc-level">RSC pretendido<Select value={rscLevel} onValueChange={(value) => setRscLevel(value ?? "")}><SelectTrigger id="project-rsc-level" className="w-full"><SelectValue placeholder="Selecione o nível" /></SelectTrigger><SelectContent>{rscLevels.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select></label>
            {regulationChanged && <Alert><TriangleAlert /><AlertTitle>Os lançamentos precisarão ser reenquadrados</AlertTitle><AlertDescription>A troca de regulamento remove os vínculos atuais com critérios para impedir cálculos usando regras incompatíveis. As descrições e evidências serão preservadas.</AlertDescription></Alert>}
          </div>
          <DialogFooter className="mt-5"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={!name.trim() || !rscLevel || !regulation}>Salvar alterações</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>
}

function ProjectSetting({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{text}</CardDescription></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" /> Os dados serão salvos neste navegador.</div></CardContent></Card>
}
