import * as React from "react"
import { AlertCircle, CheckCircle2, Download, Eye, FileArchive, FileCheck2, FileText, LoaderCircle, ShieldCheck } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Regulation } from "@/domain/regulation"
import { calculateLevelProjection } from "@/domain/scoring"
import { getStoredAttachments, type LocalProject, type StoredAttachment } from "@/lib/projects"
import { createEvidenceIndexPdf, createFormsPdf, createMemorialPdf, createZip, downloadFile } from "@/lib/document-generation"

type ArtifactId = "memorial" | "forms" | "evidence" | "zip"
type ArtifactState = "idle" | "processing" | "ready" | "error"

const requestedLevel = { "RSC 1": "rsc-i", "RSC 2": "rsc-ii", "RSC 3": "rsc-iii", "RSC I": "rsc-i", "RSC II": "rsc-ii", "RSC III": "rsc-iii" } as const

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : undefined
}

export function DocumentsPage({ project, catalog }: { project: LocalProject; catalog?: Regulation }) {
  const [states, setStates] = React.useState<Record<ArtifactId, ArtifactState>>({ memorial: "idle", forms: "idle", evidence: "idle", zip: "idle" })
  const [generatedAt, setGeneratedAt] = React.useState<Partial<Record<ArtifactId, string>>>({})
  const [errors, setErrors] = React.useState<Partial<Record<ArtifactId, string>>>({})
  const [storedAttachments, setStoredAttachments] = React.useState<StoredAttachment[]>([])
  const [isLoadingAttachments, setIsLoadingAttachments] = React.useState(true)
  React.useEffect(() => {
    let active = true
    setIsLoadingAttachments(true)
    void getStoredAttachments(project.localId).then((files) => { if (active) { setStoredAttachments(files); setIsLoadingAttachments(false) } }).catch(() => { if (active) setIsLoadingAttachments(false) })
    return () => { active = false }
  }, [project.localId])
  const occurrences = project.requirementOccurrences ?? []
  const attachments = [...(project.formations ?? []).map((item) => item.attachmentName), ...occurrences.flatMap((item) => item.attachmentNames)].filter(Boolean)
  const noEvidence = occurrences.filter((item) => !item.evidence.trim() && !item.attachmentNames.length).length
  const hasConclusion = (project.memorialSections ?? []).some((item) => item.id === "conclusion" && item.content.trim())
  const level = requestedLevel[project.rscLevel as keyof typeof requestedLevel]
  const projection = catalog && level ? calculateLevelProjection(catalog, level, occurrences) : undefined
  const cumulativeScore = catalog ? catalog.levels.reduce((total, item) => total + calculateLevelProjection(catalog, item.section, occurrences).total, 0) : 0
  const scoreReady = Boolean(projection && catalog && cumulativeScore >= catalog.metadata.scoring.minimumTotal && projection.total >= catalog.metadata.scoring.minimumRequestedLevel)
  const status = !project.identification || !catalog || !occurrences.length || noEvidence ? "bloqueado" : !hasConclusion || !scoreReady || attachments.length > storedAttachments.length ? "com avisos" : "pronto"
  const slug = project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "projeto"

  const items = [
    { id: "memorial" as const, title: "Memorial descritivo", icon: FileText, ready: Boolean(project.identification && hasConclusion), requirements: ["Identificação do docente", "Conclusão do memorial preenchida"], notes: [!project.identification && "Identificação do docente não disponível.", !hasConclusion && "A conclusão do memorial ainda não foi preenchida."].filter(Boolean) as string[] },
    { id: "forms" as const, title: "Formulários e anexos normativos", icon: FileCheck2, ready: Boolean(catalog && project.identification && occurrences.length && scoreReady), requirements: ["Dataset normativo disponível", "Identificação e lançamentos válidos", "Mínimo de pontos total e no RSC solicitado"], notes: [!catalog && "Dataset normativo não disponível.", !scoreReady && "A pontuação não alcança o mínimo acumulado de 60 pontos ou o mínimo de 36 no RSC solicitado."].filter(Boolean) as string[] },
    { id: "evidence" as const, title: "Índice PDF de comprovantes", icon: ShieldCheck, ready: Boolean(occurrences.length && !noEvidence && storedAttachments.length), requirements: ["Lançamentos com evidência", "Comprovantes binários disponíveis neste navegador"], notes: [noEvidence > 0 && `${noEvidence} lançamento(s) sem evidência vinculada.`, !attachments.length && "Nenhum comprovante local foi referenciado.", attachments.length > storedAttachments.length && "Alguns comprovantes precisam ser selecionados novamente para integrarem o pacote."].filter(Boolean) as string[] },
    { id: "zip" as const, title: "Pacote final ZIP", icon: FileArchive, ready: Boolean(project.identification && hasConclusion && catalog && occurrences.length && !noEvidence && storedAttachments.length), requirements: ["Memorial e formulários prontos", "Comprovantes binários disponíveis", "Mesma fotografia do projeto"], notes: ["O pacote inclui PDFs, dados do projeto e os anexos binários armazenados localmente.", !storedAttachments.length && "Sem comprovantes binários, o pacote final permanece bloqueado."].filter(Boolean) as string[] },
  ]

  const run = (id: ArtifactId) => {
    const item = items.find((value) => value.id === id)!
    if (!item.ready) {
      setErrors((value) => ({ ...value, [id]: "Os requisitos pendentes impedem a geração deste artefato." }))
      setStates((value) => ({ ...value, [id]: "error" }))
      return
    }
    setErrors((value) => ({ ...value, [id]: undefined }))
    setStates((value) => ({ ...value, [id]: "processing" }))
    window.setTimeout(async () => {
      try {
        const generatedAt = new Date().toISOString()
        if (id === "memorial") downloadFile(`${slug}-memorial-descritivo.pdf`, createMemorialPdf(project))
        if (id === "forms") downloadFile(`${slug}-formularios-normativos.pdf`, createFormsPdf(project, catalog))
        if (id === "evidence") downloadFile(`${slug}-indice-comprovantes.pdf`, createEvidenceIndexPdf(project, storedAttachments))
        if (id === "zip") {
          const data = new Uint8Array(await createEvidenceIndexPdf(project, storedAttachments).arrayBuffer())
          const files = [
            { name: "memorial-descritivo.pdf", data: new Uint8Array(await createMemorialPdf(project).arrayBuffer()) },
            { name: "formularios-normativos.pdf", data: new Uint8Array(await createFormsPdf(project, catalog).arrayBuffer()) },
            { name: "indice-comprovantes.pdf", data },
            { name: "dados-do-projeto.json", data: new TextEncoder().encode(JSON.stringify({ generatedAt, project }, null, 2)) },
            ...await Promise.all(storedAttachments.map(async (attachment, index) => ({ name: `comprovantes/C-${String(index + 1).padStart(3, "0")}-${attachment.name.replace(/[\\/:*?"<>|]/g, "-")}`, data: new Uint8Array(await attachment.file.arrayBuffer()) }))),
          ]
          downloadFile(`${slug}-documentos-rsc.zip`, createZip(files))
        }
        setStates((value) => ({ ...value, [id]: "ready" }))
        setGeneratedAt((value) => ({ ...value, [id]: generatedAt }))
      } catch (reason) {
        setErrors((value) => ({ ...value, [id]: reason instanceof Error ? reason.message : "Não foi possível montar o arquivo para download." }))
        setStates((value) => ({ ...value, [id]: "error" }))
      }
    }, 200)
  }

  return <section className="mt-6 space-y-6">
    <div className="flex justify-end"><Button variant="outline" nativeButton={false} render={<a href={`/project/${project.localId}/preview`} />}><Eye /> Abrir prévia</Button></div>
    <Alert><CheckCircle2 /><AlertTitle>Prontidão geral: {status}</AlertTitle><AlertDescription>{status === "bloqueado" ? "Há requisitos que impedem a emissão. Consulte os bloqueios em cada artefato." : status === "com avisos" ? "É possível seguir apenas após conferir os avisos documentais." : "Os dados disponíveis atendem aos requisitos locais de geração."}</AlertDescription></Alert>
    <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => {
      const Icon = item.icon
      const state = states[item.id]
      return <Card key={item.id}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Icon className="size-4" />{item.title}</CardTitle><CardDescription>{item.ready ? "Requisitos locais atendidos." : "Requer conferência antes da geração."}</CardDescription></div><Badge variant={item.ready ? "secondary" : "outline"}>{state === "processing" ? "Preparando" : item.ready ? "Pronto" : "Bloqueado"}</Badge></div></CardHeader><CardContent className="space-y-4"><div><p className="text-sm font-medium">Requisitos</p><ul className="mt-1 space-y-1 text-sm text-muted-foreground">{item.requirements.map((requirement) => <li key={requirement}>• {requirement}</li>)}</ul></div>{item.notes.length > 0 && <div><p className="text-sm font-medium">Pendências e avisos</p><ul className="mt-1 space-y-1 text-sm text-muted-foreground">{item.notes.map((note) => <li key={note}>• {note}</li>)}</ul></div>}{errors[item.id] && <Alert variant="destructive"><AlertCircle /><AlertTitle>Falha de geração</AlertTitle><AlertDescription>{errors[item.id]}</AlertDescription></Alert>}<div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{generatedAt[item.id] ? `Última geração: ${formatDate(generatedAt[item.id])}` : "Ainda não gerado nesta sessão."}</span><Button size="sm" disabled={state === "processing"} onClick={() => run(item.id)}>{state === "processing" ? <><LoaderCircle className="animate-spin" /> Preparando</> : state === "ready" ? <><Download /> Baixar novamente</> : "Preparar e gerar"}</Button></div></CardContent></Card>
    })}</div>
    <Card><CardHeader><CardTitle>Verificação local dos comprovantes</CardTitle><CardDescription>O pacote usa somente arquivos binários ainda disponíveis no armazenamento local deste navegador.</CardDescription></CardHeader><CardContent>{isLoadingAttachments ? <p className="text-sm text-muted-foreground">Verificando arquivos locais…</p> : attachments.length ? <div className="space-y-2">{attachments.map((file, index) => { const available = storedAttachments.some((attachment) => attachment.name === file); return <div key={`${file}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span className="truncate">{file}</span><Badge variant={available ? "secondary" : "outline"}>{available ? "Disponível" : "Selecione novamente"}</Badge></div> })}</div> : <p className="text-sm text-muted-foreground">Não há comprovantes referenciados no projeto.</p>}</CardContent></Card>
  </section>
}
