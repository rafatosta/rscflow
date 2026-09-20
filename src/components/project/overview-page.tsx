import * as React from "react"
import { ArrowRight, CheckCircle2, Circle, ClipboardCheck, HardDrive, Paperclip, Pencil, TriangleAlert, UserRound } from "lucide-react"

import { memorialSteps } from "@/components/project/memorial-content"
import { projectSectionHref } from "@/components/project/project-navigation"
import { requestedLevelIds, rscSectionLabels } from "@/components/project/project-pages"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { loadRegulations } from "@/data/regulations/load"
import { calculateLevelProjection } from "@/domain/scoring"
import type { Regulation } from "@/domain/regulation"
import type { Identification, LocalProject, ProjectSettings } from "@/lib/projects"

const regulations = loadRegulations()
const rscLevels = ["RSC I", "RSC II", "RSC III"] as const

function formatRegulation(regulation: Regulation) {
  const { authority, number, year } = regulation.metadata.regulation
  return `${authority} nº ${number}/${year}`
}

function isIdentificationComplete(identification?: Identification) {
  return identification !== undefined && Object.values(identification).every((value) => value.trim())
}

function getCompletion(project: LocalProject) {
  const completedMemorialSections = project.memorialSections?.filter((section) => section.content.trim()).length ?? 0
  const items = [
    { label: "Identificação", complete: isIdentificationComplete(project.identification), detail: "Dados pessoais e institucionais" },
    { label: "Formação", complete: (project.formations?.length ?? 0) > 0, detail: "Formação e atuação" },
    { label: "Requisitos", complete: (project.requirementOccurrences?.length ?? 0) > 0, detail: "Atividades e experiências" },
    { label: "Memorial", complete: completedMemorialSections === memorialSteps.length, detail: `${completedMemorialSections} de ${memorialSteps.length} seções preenchidas` },
  ]
  const completedUnits = Number(items[0].complete) + Number(items[1].complete) + Number(items[2].complete) + completedMemorialSections
  return { items, progress: Math.round((completedUnits / (3 + memorialSteps.length)) * 100) }
}

function getEvidenceCount(project: LocalProject) {
  return [
    ...(project.formations ?? []).map((formation) => formation.attachmentName),
    ...(project.requirementOccurrences ?? []).flatMap((occurrence) => occurrence.attachmentNames),
  ].filter(Boolean).length
}

function getPendingCount(project: LocalProject, catalog?: Regulation) {
  const occurrences = project.requirementOccurrences ?? []
  const requestedLevel = requestedLevelIds[project.rscLevel as keyof typeof requestedLevelIds]
  let count = 0
  if (!isIdentificationComplete(project.identification)) count += 1
  if (!(project.formations?.length ?? 0)) count += 1
  if (!occurrences.length) count += 1
  if (!catalog || !requestedLevel) count += 1
  count += occurrences.filter((occurrence) => !occurrence.selectedLevel || !occurrence.criterionId || !catalog?.levels.find((level) => level.section === occurrence.selectedLevel)?.criteria.some((criterion) => criterion.id === occurrence.criterionId)).length
  count += occurrences.filter((occurrence) => !occurrence.evidence.trim() && occurrence.attachmentNames.length === 0).length
  count += memorialSteps.filter((step) => !project.memorialSections?.some((section) => section.id === step.id && section.content.trim())).length
  return count
}

export function OverviewPage({ project, catalog, onProjectSettingsChange }: { project?: LocalProject; catalog?: Regulation; onProjectSettingsChange: (settings: ProjectSettings) => void }) {
  if (!project) return null

  const requestedLevel = requestedLevelIds[project.rscLevel as keyof typeof requestedLevelIds]
  const levelProjections = catalog ? catalog.levels.map((level) => ({ level, projection: calculateLevelProjection(catalog, level.section, project.requirementOccurrences ?? []) })) : []
  const requestedProjection = levelProjections.find(({ level }) => level.section === requestedLevel)?.projection
  const cumulativeScore = levelProjections.reduce((total, { projection }) => total + projection.total, 0)
  const minimumTotal = catalog?.metadata.scoring.minimumTotal
  const minimumRequestedLevel = catalog?.metadata.scoring.minimumRequestedLevel
  const meetsResolutionCriteria = Boolean(requestedProjection && minimumTotal !== undefined && minimumRequestedLevel !== undefined && cumulativeScore >= minimumTotal && requestedProjection.total >= minimumRequestedLevel)
  const completion = getCompletion(project)
  const evidenceCount = getEvidenceCount(project)
  const pendingCount = getPendingCount(project, catalog)

  return <div className="mt-6 grid gap-4 md:grid-cols-2">
    <ProjectSettingsCard key={project.localId} project={project} onSave={onProjectSettingsChange} />
    <CompletionCard completion={completion} />
    <ProfileCard project={project} />
    <ScoreCard catalog={catalog} requestedProjection={requestedProjection} cumulativeScore={cumulativeScore} levelProjections={levelProjections} meetsResolutionCriteria={meetsResolutionCriteria} />
    <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
      <SummaryCard icon={Paperclip} title="Comprovantes" value={evidenceCount} description={evidenceCount === 1 ? "comprovante vinculado ao projeto" : "comprovantes vinculados ao projeto"} />
      <SummaryCard icon={ClipboardCheck} title="Pendências" value={pendingCount} description={pendingCount === 1 ? "item precisa de atenção" : "itens precisam de atenção"} />
      <Card>
        <CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground"><HardDrive className="size-4" /></span><div><CardTitle>Backup do projeto</CardTitle><CardDescription>Proteja os dados e comprovantes.</CardDescription></div></div></CardHeader>
        <CardContent><Button className="w-full" variant="outline" nativeButton={false} render={<a href={projectSectionHref(project, "backup")} />}>Acessar backup <ArrowRight /></Button></CardContent>
      </Card>
    </div>
  </div>
}

function CompletionCard({ completion }: { completion: ReturnType<typeof getCompletion> }) {
  const message = completion.progress === 100 ? "Preenchimento concluído" : completion.progress >= 70 ? "Quase lá!" : completion.progress > 0 ? "Continue preenchendo" : "Vamos começar"
  return <Card>
    <CardHeader><CardTitle>Status do preenchimento</CardTitle><CardDescription>{message}</CardDescription></CardHeader>
    <CardContent className="space-y-5">
      <div><p className="mb-3 text-3xl font-semibold">{completion.progress}%</p><Progress value={completion.progress}><ProgressLabel>Progresso geral</ProgressLabel><ProgressValue /></Progress></div>
      <div className="space-y-3">{completion.items.map((item) => { const Icon = item.complete ? CheckCircle2 : Circle; return <div key={item.label} className="flex items-start gap-3"><Icon className={item.complete ? "mt-0.5 size-4 shrink-0 text-primary" : "mt-0.5 size-4 shrink-0 text-muted-foreground"} /><div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.detail}</p></div></div> })}</div>
    </CardContent>
  </Card>
}

function ProfileCard({ project }: { project: LocalProject }) {
  const identification = project.identification
  const fields = [
    ["Nome", identification?.name],
    ["SIAPE", identification?.siape],
    ["CPF", identification?.cpf],
    ["E-mail", identification?.professionalEmail || identification?.personalEmail],
    ["Campus", identification?.campus],
    ["Cargo", identification?.position],
    ["Titulação", identification?.degree],
    ["Nível atual", identification?.currentLevel],
  ]
  return <Card>
    <CardHeader className="flex-row items-start justify-between"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground"><UserRound className="size-4" /></span><div><CardTitle>Resumo do perfil</CardTitle><CardDescription>Dados usados nos documentos do processo.</CardDescription></div></div><Button size="sm" variant="outline" nativeButton={false} render={<a href={projectSectionHref(project, "profile")} />}><Pencil /> Editar</Button></CardHeader>
    <CardContent className="grid gap-y-3">{fields.map(([label, value]) => <div key={label} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 text-sm"><span className="text-muted-foreground">{label}</span><span className="truncate font-medium">{value || "Não informado"}</span></div>)}</CardContent>
  </Card>
}

function ScoreCard({ catalog, requestedProjection, cumulativeScore, levelProjections, meetsResolutionCriteria }: { catalog?: Regulation; requestedProjection?: ReturnType<typeof calculateLevelProjection>; cumulativeScore: number; levelProjections: Array<{ level: Regulation["levels"][number]; projection: ReturnType<typeof calculateLevelProjection> }>; meetsResolutionCriteria: boolean }) {
  const minimumTotal = catalog?.metadata.scoring.minimumTotal
  const minimumRequestedLevel = catalog?.metadata.scoring.minimumRequestedLevel
  const scoreProgress = minimumTotal ? Math.min((cumulativeScore / minimumTotal) * 100, 100) : 0
  return <Card>
    <CardHeader className="sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>Resumo da pontuação</CardTitle><CardDescription>Estimativa consolidada a partir dos lançamentos válidos.</CardDescription></div>{requestedProjection && <Badge variant={meetsResolutionCriteria ? "secondary" : "destructive"}>{meetsResolutionCriteria ? "Apto" : "Não atende aos critérios"}</Badge>}</CardHeader>
    <CardContent className="grid gap-6">
      {catalog && requestedProjection && minimumTotal !== undefined && minimumRequestedLevel !== undefined ? <div className="space-y-4"><div><p className="text-4xl font-semibold">{cumulativeScore.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} <span className="text-lg font-normal text-muted-foreground">/ {minimumTotal} pts</span></p><p className="mt-1 text-sm text-muted-foreground">Pontuação total acumulada necessária</p></div><Progress value={scoreProgress}><ProgressLabel>Progresso até o mínimo total</ProgressLabel><ProgressValue /></Progress><div className="flex items-center justify-between gap-3 rounded-lg border p-3"><span className="text-sm">{rscSectionLabels[requestedProjection.levelId]} solicitado</span><span className="font-semibold">{requestedProjection.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} / {minimumRequestedLevel} pts</span></div></div> : <p className="text-sm text-muted-foreground">Selecione um regulamento e um nível RSC disponíveis para calcular a pontuação.</p>}
      <div className="divide-y rounded-lg border">{levelProjections.map(({ level, projection }) => <div key={level.section} className="flex items-center justify-between gap-3 p-3"><div><p className="text-sm font-medium">{rscSectionLabels[level.section]}</p><p className="text-xs text-muted-foreground">{projection.provisional ? "Requer validação" : "Cálculo disponível"}</p></div><span className="text-lg font-semibold">{projection.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pts</span></div>)}</div>
    </CardContent>
  </Card>
}

function SummaryCard({ icon: Icon, title, value, description }: { icon: React.ComponentType<{ className?: string }>; title: string; value: number; description: string }) {
  return <Card><CardHeader><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4" /></span><CardTitle>{title}</CardTitle></div></CardHeader><CardContent><p className="text-3xl font-semibold">{value}</p><p className="mt-1 text-sm text-muted-foreground">{description}</p></CardContent></Card>
}

function ProjectSettingsCard({ project, onSave }: { project: LocalProject; onSave: (settings: ProjectSettings) => void }) {
  return <Card>
    <CardHeader><CardTitle>Dados do projeto</CardTitle><CardDescription>Edite os campos diretamente. As alterações são salvas automaticamente e aplicadas a todas as seções.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="project-name">Nome do projeto<Input id="project-name" defaultValue={project.name} maxLength={120} onChange={(event) => { if (event.target.value.trim()) onSave({ name: event.target.value, rscLevel: project.rscLevel, regulation: project.regulation }) }} onBlur={(event) => { const name = event.target.value.trim(); if (name && name !== project.name) { event.target.value = name; onSave({ name, rscLevel: project.rscLevel, regulation: project.regulation }) } }} /></label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="project-regulation">Regulamento<Select value={project.regulation} onValueChange={(regulation) => { if (regulation) onSave({ name: project.name, rscLevel: project.rscLevel, regulation }) }}><SelectTrigger id="project-regulation" className="w-full"><SelectValue placeholder="Selecione um regulamento" /></SelectTrigger><SelectContent>{regulations.map((item) => <SelectItem key={item.metadata.regulation.id} value={item.metadata.regulation.id}>{formatRegulation(item)}</SelectItem>)}</SelectContent></Select></label>
        <label className="grid gap-1.5 text-sm font-medium" htmlFor="project-rsc-level">RSC pretendido<Select value={project.rscLevel} onValueChange={(rscLevel) => { if (rscLevel) onSave({ name: project.name, rscLevel, regulation: project.regulation }) }}><SelectTrigger id="project-rsc-level" className="w-full"><SelectValue placeholder="Selecione o nível" /></SelectTrigger><SelectContent>{rscLevels.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select></label>
      </div>
      <Alert><TriangleAlert /><AlertTitle>Atenção ao trocar o regulamento</AlertTitle><AlertDescription>Os vínculos atuais com critérios serão removidos para impedir cálculos incompatíveis. As descrições e evidências dos lançamentos serão preservadas.</AlertDescription></Alert>
    </CardContent>
  </Card>
}
