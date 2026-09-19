import { BookOpen } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { calculateLevelProjection } from "@/domain/scoring"
import type { Regulation } from "@/domain/regulation"
import type { LocalProject } from "@/lib/projects"
import { requestedLevelIds, rscSectionLabels } from "@/components/project/project-pages"

function calculateProjectProgress(project?: LocalProject) {
  if (!project) return 0
  const identificationComplete = project.identification !== undefined && Object.values(project.identification).every((value) => value.trim())
  const hasFormation = (project.formations?.length ?? 0) > 0
  const hasRequirement = (project.requirementOccurrences?.length ?? 0) > 0
  const completedMemorialSections = project.memorialSections?.filter((section) => section.content.trim()).length ?? 0
  return Math.round(((Number(identificationComplete) + Number(hasFormation) + Number(hasRequirement) + completedMemorialSections) / 10) * 100)
}

export function OverviewPage({ project, catalog }: { project?: LocalProject; catalog?: Regulation }) {
  const requestedLevel = project ? requestedLevelIds[project.rscLevel as keyof typeof requestedLevelIds] : undefined
  const requestedProjection = project && catalog && requestedLevel ? calculateLevelProjection(catalog, requestedLevel, project.requirementOccurrences ?? []) : undefined
  const levelProjections = project && catalog ? catalog.levels.map((level) => ({ level, projection: calculateLevelProjection(catalog, level.section, project.requirementOccurrences ?? []) })) : []
  const cumulativeScore = levelProjections.reduce((total, { projection }) => total + projection.total, 0)
  const minimumTotal = catalog?.metadata.scoring.minimumTotal
  const minimumRequestedLevel = catalog?.metadata.scoring.minimumRequestedLevel
  const meetsResolutionCriteria = Boolean(requestedProjection && minimumTotal !== undefined && minimumRequestedLevel !== undefined && cumulativeScore >= minimumTotal && requestedProjection.total >= minimumRequestedLevel)

  return <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <Card className="xl:col-span-2"><CardHeader><CardTitle>Andamento do preenchimento</CardTitle><CardDescription>Complete as seções para avançar no preenchimento dos dados.</CardDescription></CardHeader><CardContent><Progress value={calculateProjectProgress(project)}><ProgressLabel>Progresso do projeto</ProgressLabel><ProgressValue /></Progress></CardContent></Card>
    <Card><CardHeader><CardTitle>Resultado estimado</CardTitle><CardDescription>{requestedProjection && minimumTotal !== undefined && minimumRequestedLevel !== undefined ? `A resolução exige ${minimumTotal} pontos na soma dos RSC e ${minimumRequestedLevel} no nível solicitado.` : "Selecione um regulamento e um nível RSC disponíveis."}</CardDescription></CardHeader><CardContent>{requestedProjection && minimumTotal !== undefined && minimumRequestedLevel !== undefined ? <div className="space-y-3"><div className="flex items-center justify-between gap-3"><p className="text-3xl font-semibold">{cumulativeScore.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pts</p><Badge variant={meetsResolutionCriteria ? "secondary" : "destructive"}>{meetsResolutionCriteria ? "Apto" : "Não atende aos critérios"}</Badge></div><div className="space-y-1 text-xs text-muted-foreground"><p>Total acumulado: {cumulativeScore.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} de {minimumTotal} pts.</p><p>{rscSectionLabels[requestedProjection.levelId]} solicitado: {requestedProjection.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} de {minimumRequestedLevel} pts.</p>{requestedProjection.provisional && <p>Resultado sujeito à validação manual do catálogo.</p>}</div></div> : <p className="text-3xl font-semibold">—</p>}</CardContent></Card>
    <Card className="xl:col-span-3"><CardHeader><CardTitle>Resumo de pontuação por RSC</CardTitle><CardDescription>Estimativas calculadas a partir dos lançamentos registrados no projeto.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{levelProjections.map(({ level, projection }) => <div key={level.section} className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">{rscSectionLabels[level.section]}</p><p className="mt-1 text-2xl font-semibold">{projection.total.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} pts</p><p className="mt-1 text-xs text-muted-foreground">{projection.provisional ? "Requer validação manual do catálogo." : "Cálculo disponível para conferência."}</p></div>)}{levelProjections.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pontuação está disponível para este regulamento.</p>}</CardContent></Card>
    <InfoCard title="Comprovantes" text="Nenhum comprovante adicionado." /><InfoCard title="Pendências" text="Preencha a identificação e a formação para começar." /><InfoCard title="Backup" text="Gere um backup JSON na seção Documentos." />
  </div>
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{text}</CardDescription></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" /> Os dados serão salvos neste navegador.</div></CardContent></Card>
}
