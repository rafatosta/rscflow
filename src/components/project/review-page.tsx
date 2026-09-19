import * as React from "react"
import { CircleAlert, CircleHelp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { calculateLevelProjection } from "@/domain/scoring"
import type { Regulation } from "@/domain/regulation"
import { getOccurrencesWithStoredAttachments, type LocalProject } from "@/lib/projects"
import { projectSectionHref } from "@/components/project/project-navigation"
import { requestedLevelIds, type ProjectSectionId } from "@/components/project/project-pages"

type FindingSeverity = "bloqueio" | "conferencia"
type ReviewFinding = { severity: FindingSeverity; title: string; description: string; section: ProjectSectionId; occurrenceId?: string }

export function ReviewPage({ project, catalog }: { project: LocalProject; catalog?: Regulation }) {
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
  if (occurrences.length === 0) findings.push({ severity: "bloqueio", title: "Não há lançamentos para pontuar", description: "O resultado e o índice de comprovantes ficam bloqueados.", section: "requirements" })
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
    { title: "Índice de comprovantes", ready: occurrences.length > 0 && !invalidOccurrences.length && !occurrencesWithoutEvidence.length, section: "requirements" as const, note: occurrencesWithoutEvidence.length ? "Há lançamentos sem evidência." : "Depende da conferência dos arquivos locais." },
  ]

  return <section className="mt-6 space-y-6">
    <Card><CardHeader><CardTitle>Revisão de prontidão</CardTitle><CardDescription>Pendências que afetam a geração do Memorial, formulários normativos e índice de comprovantes.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><ReviewSummary label="Bloqueios" value={findings.filter((item) => item.severity === "bloqueio").length} /><ReviewSummary label="Conferências" value={findings.filter((item) => item.severity === "conferencia").length} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Pendências</CardTitle><CardDescription>Um bloqueio impede a geração do documento; uma conferência pede sua atenção antes do protocolo.</CardDescription></CardHeader><CardContent className="space-y-3">{findings.length ? findings.map((finding, index) => <ReviewFindingCard key={`${finding.title}-${index}`} project={project} finding={finding} />) : <p className="text-sm text-muted-foreground">Não há pendências neste projeto.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Prontidão dos documentos</CardTitle><CardDescription>Estado atual dos artefatos que compõem o protocolo.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{documents.map((document) => <div key={document.title} className="rounded-lg border p-4"><div className="flex items-center justify-between gap-3"><p className="font-medium">{document.title}</p><Badge variant={document.ready ? "secondary" : "outline"}>{document.ready ? "Pronto" : "Pendente"}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{document.note}</p><Button className="mt-4" size="sm" variant="outline" nativeButton={false} render={<a href={projectSectionHref(project, document.section)} />}>Ver seção</Button></div>)}</CardContent></Card>
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
  return <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><Icon className="mt-0.5 size-5 shrink-0" /><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{finding.title}</p><Badge variant={variant}>{isBlocking ? "Bloqueia" : "Requer conferência"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{finding.description}</p></div></div><Button size="sm" variant="outline" className="shrink-0" nativeButton={false} render={<a href={href} />}>Corrigir</Button></div>
}
