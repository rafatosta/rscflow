import * as React from "react"
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url"
import { BookOpen, CircleAlert, Download, Minus, PanelLeft, PanelRight, Pencil, ZoomIn } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { calculateLevelProjection, type LevelProjection } from "@/domain/scoring"
import type { Regulation } from "@/domain/regulation"
import { createEvidenceIndexPdf, createFormsPdf, createMemorialPdf, downloadFile } from "@/lib/document-generation"
import { getStoredAttachments, type LocalProject, type MemorialSection, type RequirementOccurrence, type StoredAttachment } from "@/lib/projects"
import { buildMemorialTextBase, memorialSteps } from "@/components/project/memorial-content"
import { projectSectionHref } from "@/components/project/project-navigation"
import { rscSectionLabels } from "@/components/project/project-pages"

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export type PreviewDocument = {
  id: "memorial" | "forms" | "evidence"
  title: string
  type: string
  pages: PreviewPage[]
  warnings: string[]
  ready: boolean
}

type PreviewPage = { title: string; eyebrow: string; blocks: string[] }

const memorialPageCharacterLimit = 1_500

function splitMemorialBlock(block: string) {
  const words = block.trim().split(/\s+/)
  const parts: string[] = []
  let part = ""

  for (const word of words) {
    const nextPart = part ? `${part} ${word}` : word
    if (part && nextPart.length > memorialPageCharacterLimit) {
      parts.push(part)
      part = word
    } else {
      part = nextPart
    }
  }

  if (part) parts.push(part)
  return parts
}

function createMemorialPages(sections: MemorialSection[]): PreviewPage[] {
  return sections
    .filter((section) => section.content.trim())
    .flatMap((section) => {
      const title = memorialSteps.find((step) => step.id === section.id)?.label ?? "Seção do memorial"
      const blocks = section.content.split(/\n\s*\n/).flatMap(splitMemorialBlock)
      const pages: string[][] = []
      let pageBlocks: string[] = []
      let pageLength = 0

      for (const block of blocks) {
        const nextLength = pageLength + block.length
        if (pageBlocks.length && nextLength > memorialPageCharacterLimit) {
          pages.push(pageBlocks)
          pageBlocks = []
          pageLength = 0
        }
        pageBlocks.push(block)
        pageLength += block.length
      }
      if (pageBlocks.length) pages.push(pageBlocks)

      return pages.map((pageBlocks, index) => ({
        title: index === 0 ? title : `${title} (continuação)`,
        eyebrow: "MEMORIAL DESCRITIVO",
        blocks: pageBlocks,
      }))
    })
}

async function downloadPreviewDocument(project: LocalProject, catalog: Regulation | undefined, documentId: PreviewDocument["id"]) {
  const slug = project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "projeto"
  if (documentId === "memorial") downloadFile(`${slug}-memorial-descritivo.pdf`, createMemorialPdf(project))
  if (documentId === "forms") downloadFile(`${slug}-formularios-normativos.pdf`, createFormsPdf(project, catalog))
  if (documentId === "evidence") downloadFile(`${slug}-indice-comprovantes.pdf`, createEvidenceIndexPdf(project, await getStoredAttachments(project.localId)))
}

export function DocumentViewer({ project, catalog, documentId, onMemorialChange }: { project: LocalProject; catalog?: Regulation; documentId: PreviewDocument["id"]; onMemorialChange: (sections: MemorialSection[]) => void }) {
  const [pageIndex, setPageIndex] = React.useState(0)
  const [zoom, setZoom] = React.useState(85)
  const [showThumbnails, setShowThumbnails] = React.useState(true)
  const [showContext, setShowContext] = React.useState(true)
  const occurrences = React.useMemo(() => project.requirementOccurrences ?? [], [project.requirementOccurrences])
  const formations = project.formations ?? []
  const memorial = project.memorialSections ?? []
  const hasConclusion = memorial.some((section) => section.id === "conclusion" && section.content.trim())
  const hasEvidenceGaps = occurrences.some((occurrence) => !occurrence.evidence.trim() && occurrence.attachmentNames.length === 0)
  const attachedFiles = [...formations.map((formation) => formation.attachmentName), ...occurrences.flatMap((occurrence) => occurrence.attachmentNames)].filter(Boolean)
  const regulationTitle = catalog ? `${catalog.metadata.regulation.authority} · Resolução nº ${catalog.metadata.regulation.number}/${catalog.metadata.regulation.year}` : "Dataset normativo indisponível"

  const documents: PreviewDocument[] = [
    {
      id: "memorial",
      title: "Memorial descritivo",
      type: "Projeção editorial",
      ready: Boolean(project.identification && hasConclusion),
      warnings: [!project.identification && "Identificação do docente não está disponível.", !hasConclusion && "A seção de conclusão ainda não foi preenchida."].filter(Boolean) as string[],
      pages: [
        { title: "Capa", eyebrow: "MEMORIAL DESCRITIVO", blocks: [project.identification?.name ?? project.name, project.rscLevel, project.identification ? `${project.identification.position} · ${project.identification.institution}` : "Dados funcionais pendentes"] },
        ...createMemorialPages(memorial),
      ],
    },
    {
      id: "forms",
      title: "Formulários normativos",
      type: "Projeção do formulário",
      ready: Boolean(catalog && project.identification && occurrences.length),
      warnings: [!catalog && "O dataset normativo vinculado não está disponível.", !project.identification && "Identificação do docente pendente.", !occurrences.length && "Não há lançamentos para compor os campos do formulário."].filter(Boolean) as string[],
      pages: [
        { title: "Identificação e norma", eyebrow: "FORMULÁRIO NORMATIVO", blocks: [regulationTitle, `Docente: ${project.identification?.name ?? "Não informado"}`, `Nível solicitado: ${project.rscLevel}`] },
        ...occurrences.map((occurrence, index) => {
          const criterion = catalog?.levels.find((level) => level.section === occurrence.selectedLevel)?.criteria.find((item) => item.id === occurrence.criterionId)
          return { title: `Lançamento ${index + 1}`, eyebrow: criterion ? `${criterion.code} · ${occurrence.selectedLevel?.toUpperCase()}` : "ENQUADRAMENTO PENDENTE", blocks: [criterion?.description ?? occurrence.description, occurrence.period ? `Período: ${occurrence.period}` : "Período não informado", `Quantidade declarada: ${occurrence.quantity}`, occurrence.evidence ? `Evidência: ${occurrence.evidence}` : "Evidência sem referência textual"] }
        }),
      ],
    },
    {
      id: "evidence",
      title: "Comprovantes consolidados",
      type: "Mapa de anexos",
      ready: Boolean(occurrences.length && !hasEvidenceGaps && attachedFiles.length),
      warnings: [!attachedFiles.length && "Nenhum arquivo local foi referenciado.", hasEvidenceGaps && "Há lançamentos sem evidência vinculada.", attachedFiles.length > 0 && "Os nomes dos arquivos foram preservados, mas o resolvedor de arquivos locais não está configurado neste navegador."].filter(Boolean) as string[],
      pages: attachedFiles.length ? attachedFiles.map((file, index) => ({ title: `Comprovante ${index + 1}`, eyebrow: `ANEXO · PÁGINA ${index + 1}`, blocks: [file, `Referência de página: C-${String(index + 1).padStart(3, "0")}`, "Validação local pendente de um resolvedor de arquivos."] })) : [{ title: "Índice de comprovantes", eyebrow: "ANEXOS", blocks: ["Não há comprovantes locais disponíveis para consolidar."] }],
    },
  ]

  const document = documents.find((item) => item.id === documentId) ?? documents[0]
  if (documentId === "memorial") return <MemorialDocumentViewer project={project} catalog={catalog} onChange={onMemorialChange} onDownload={() => void downloadPreviewDocument(project, catalog, documentId)} />
  if (documentId === "forms") return <NormativeFormsViewer project={project} catalog={catalog} onDownload={(firstEvidencePages) => {
    const slug = project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "projeto"
    downloadFile(`${slug}-formularios-normativos.pdf`, createFormsPdf(project, catalog, firstEvidencePages))
  }} />
  if (documentId === "evidence") return <EvidencePackageViewer project={project} catalog={catalog} />
  const currentPageIndex = Math.min(pageIndex, document.pages.length - 1)
  const page = document.pages[currentPageIndex]
  const evidencePageMap = attachedFiles.map((file, index) => `${file} → C-${String(index + 1).padStart(3, "0")}`).join("\n")

  const exportJson = () => {
    const data = { project, regulation: catalog?.metadata ?? null, artifacts: documents.map(({ id, title, type, ready, warnings, pages }) => ({ id, title, type, ready, warnings, pageCount: pages.length })), evidencePageMap: attachedFiles.map((file, index) => ({ file, page: `C-${String(index + 1).padStart(3, "0")}` })) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))
    const link = window.document.createElement("a")
    link.href = url
    link.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "projeto"}-exportacao.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <section className="mt-6 space-y-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><p className="text-sm text-muted-foreground">Leitura das projeções editoriais e dos artefatos produzidos. Esta área não recalcula pontuação nem altera o projeto.</p><div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" onClick={exportJson}><Download /> Exportar JSON</Button><Button variant="outline" onClick={() => void downloadPreviewDocument(project, catalog, documentId)}><Download /> Baixar</Button></div></div>
    <div className="flex flex-wrap gap-2">{documents.map((item) => <Button key={item.id} variant={item.id === documentId ? "secondary" : "outline"} onClick={() => { void downloadPreviewDocument(project, catalog, item.id); setPageIndex(0) }}><Download /> Baixar {item.title}</Button>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="text-sm"><span className="font-medium">{document.title}</span><span className="text-muted-foreground"> · {document.type} · {document.pages.length} página(s)</span></div><div className="flex items-center gap-1"><Button size="icon" variant="ghost" aria-label="Ocultar ou exibir miniaturas" onClick={() => setShowThumbnails((value) => !value)}><PanelLeft /></Button><Button size="icon" variant="ghost" aria-label="Reduzir zoom" disabled={zoom <= 55} onClick={() => setZoom((value) => value - 10)}><Minus /></Button><span className="w-12 text-center text-sm text-muted-foreground">{zoom}%</span><Button size="icon" variant="ghost" aria-label="Aumentar zoom" disabled={zoom >= 115} onClick={() => setZoom((value) => value + 10)}><ZoomIn /></Button><Button size="icon" variant="ghost" aria-label="Ocultar ou exibir contexto" onClick={() => setShowContext((value) => !value)}><PanelRight /></Button></div></div>
    <div className="grid gap-4 xl:grid-cols-[12rem_minmax(0,1fr)_18rem]">
      {showThumbnails && <aside className="order-2 xl:order-1"><Card><CardHeader><CardTitle className="text-base">Miniaturas</CardTitle></CardHeader><CardContent className="space-y-2">{document.pages.map((item, index) => <Button key={`${item.title}-${index}`} variant={index === currentPageIndex ? "secondary" : "ghost"} className="h-auto w-full justify-start whitespace-normal p-3 text-left" onClick={() => setPageIndex(index)}><span className="mr-2 text-muted-foreground">{index + 1}</span><span>{item.title}</span></Button>)}</CardContent></Card></aside>}
      <div className="order-1 min-w-0 xl:order-2"><div className="overflow-auto rounded-lg border bg-muted p-4 sm:p-8"><article className="mx-auto flex h-[297mm] w-[210mm] max-w-full origin-top flex-col bg-background p-8 shadow-sm sm:p-12" style={{ transform: `scale(${zoom / 100})`, marginBottom: `${(zoom - 100) * 6}px` }}><p className="text-xs font-medium tracking-widest text-muted-foreground">{page.eyebrow}</p><h3 className="mt-8 text-2xl font-semibold">{page.title}</h3><div className="mt-10 space-y-6 overflow-hidden">{page.blocks.map((block, index) => <p key={index} className="break-words whitespace-pre-wrap text-base leading-7">{block}</p>)}</div><footer className="mt-auto border-t pt-4 text-xs text-muted-foreground">{document.title} · página {currentPageIndex + 1} de {document.pages.length}</footer></article></div><div className="mt-3 flex items-center justify-center gap-3"><Button size="sm" variant="outline" disabled={currentPageIndex === 0} onClick={() => setPageIndex((value) => value - 1)}>Anterior</Button><span className="text-sm text-muted-foreground">Página {currentPageIndex + 1} de {document.pages.length}</span><Button size="sm" variant="outline" disabled={currentPageIndex === document.pages.length - 1} onClick={() => setPageIndex((value) => value + 1)}>Próxima</Button></div></div>
      {showContext && <aside className="order-3"><Card><CardHeader><CardTitle className="text-base">Contexto do documento</CardTitle><CardDescription>Metadados e conferências disponíveis.</CardDescription></CardHeader><CardContent className="space-y-4"><div><p className="text-sm font-medium">Estado</p><Badge className="mt-1" variant={document.ready ? "secondary" : "outline"}>{document.ready ? "Artefato pronto" : "Artefato pendente"}</Badge></div><div><p className="text-sm font-medium">Dataset normativo</p><p className="mt-1 text-sm text-muted-foreground">{regulationTitle}</p></div>{document.warnings.length > 0 && <div><p className="text-sm font-medium">Avisos</p><ul className="mt-1 space-y-2 text-sm text-muted-foreground">{document.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}{evidencePageMap && <div><p className="text-sm font-medium">Mapa de páginas</p><pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-muted-foreground">{evidencePageMap}</pre></div>}</CardContent></Card></aside>}
    </div>
  </section>
}

function MemorialDocumentViewer({ project, catalog, onChange, onDownload }: { project: LocalProject; catalog?: Regulation; onChange: (sections: MemorialSection[]) => void; onDownload: () => void }) {
  const [pageIndex, setPageIndex] = React.useState(0)
  const [isTextBaseDialogOpen, setIsTextBaseDialogOpen] = React.useState(false)
  const contentPages = React.useMemo(() => createMemorialPages(project.memorialSections ?? []), [project.memorialSections])
  const totalPages = contentPages.length + 2
  const currentContent = contentPages[pageIndex - 2]
  const summary = contentPages.reduce<{ title: string; page: number }[]>((items, page, index) => page.title.endsWith("(continuação)") ? items : [...items, { title: page.title, page: index + 3 }], [])
  const pageTitle = pageIndex === 0 ? "Capa" : pageIndex === 1 ? "Sumário" : currentContent?.title ?? "Conteúdo"

  return <section className="mt-6 space-y-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><p className="text-sm text-muted-foreground">Memorial organizado em capa, sumário e seções editoriais paginadas.</p><div className="flex shrink-0 flex-wrap gap-2"><Button variant="outline" onClick={() => setIsTextBaseDialogOpen(true)}><BookOpen /> Autopreencher textos</Button><Button variant="outline" render={<a href={projectSectionHref(project, "memorial")} />}><Pencil /> Editar textos</Button><Button variant="outline" onClick={onDownload}><Download /> Baixar</Button></div></div>
    <div className="flex gap-2 overflow-x-auto pb-1"><Button variant={pageIndex === 0 ? "secondary" : "outline"} onClick={() => setPageIndex(0)}>Capa</Button><Button variant={pageIndex === 1 ? "secondary" : "outline"} onClick={() => setPageIndex(1)}>Sumário</Button>{contentPages.map((page, index) => <Button key={`${page.title}-${index}`} variant={pageIndex === index + 2 ? "secondary" : "outline"} onClick={() => setPageIndex(index + 2)}>{index + 3} · {page.title}</Button>)}</div>
    <div className="overflow-auto rounded-lg border bg-muted p-4 sm:p-8"><article className="mx-auto flex min-h-[297mm] w-[210mm] min-w-[210mm] flex-col bg-background p-10 shadow-sm">
      {pageIndex === 0 && <MemorialCover project={project} />}
      {pageIndex === 1 && <MemorialSummary summary={summary} />}
      {currentContent && <MemorialContentPage page={currentContent} />}
      <footer className="mt-auto border-t pt-3 text-center text-xs text-muted-foreground">Memorial descritivo · {pageTitle} · página {pageIndex + 1} de {totalPages}</footer>
    </article></div>
    {!contentPages.length && <Alert><CircleAlert /><AlertTitle>Conteúdo do memorial pendente</AlertTitle><AlertDescription>Preencha as seções do Memorial para compor as páginas do documento.</AlertDescription></Alert>}
    <Dialog open={isTextBaseDialogOpen} onOpenChange={setIsTextBaseDialogOpen}>
      <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Autopreencher o Memorial?</DialogTitle><DialogDescription>Um texto-base editável será criado com os dados cadastrados no processo. O conteúdo atual das seções será substituído.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setIsTextBaseDialogOpen(false)}>Cancelar</Button><Button onClick={() => { onChange(buildMemorialTextBase(project, catalog)); setPageIndex(0); setIsTextBaseDialogOpen(false) }}>Autopreencher</Button></DialogFooter></DialogContent>
    </Dialog>
  </section>
}

function MemorialCover({ project }: { project: LocalProject }) {
  const person = project.identification
  return <div className="flex flex-1 flex-col justify-center text-center"><p className="text-sm font-medium tracking-[0.2em]">INSTITUTO FEDERAL DA BAHIA</p><h3 className="mt-12 text-3xl font-semibold">MEMORIAL<br />DESCRITIVO</h3><p className="mt-6 text-xl">Reconhecimento de Saberes e Competências — {project.rscLevel}</p><div className="mt-24 space-y-3 text-base"><p className="font-medium">{person?.name || project.name}</p><p>SIAPE: {person?.siape || "não informado"}</p><p>{person?.position || "Cargo não informado"}</p><p>{person?.campus || "Campus não informado"}</p></div><p className="mt-24 text-sm text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { year: "numeric" }).format(new Date())}</p></div>
}

function MemorialSummary({ summary }: { summary: { title: string; page: number }[] }) {
  return <div><header className="text-center"><p className="text-lg font-bold">SUMÁRIO</p><p className="mt-2 text-sm text-muted-foreground">Seções que compõem o Memorial Descritivo.</p></header>{summary.length ? <table className="mt-10 w-full border-collapse text-sm"><tbody>{summary.map((item) => <tr key={item.title}><td className="border-b py-3">{item.title}</td><td className="border-b py-3 text-right">{item.page}</td></tr>)}</tbody></table> : <p className="mt-10 text-center text-sm text-muted-foreground">Não há seções preenchidas para listar.</p>}</div>
}

function MemorialContentPage({ page }: { page: PreviewPage }) {
  return <div className="flex flex-1 flex-col"><header className="border-b pb-5"><p className="text-xs font-medium tracking-widest text-muted-foreground">{page.eyebrow}</p><h3 className="mt-3 text-2xl font-semibold">{page.title}</h3></header><div className="mt-8 space-y-6 text-base leading-7">{page.blocks.map((block, index) => <p key={index} className="whitespace-pre-wrap">{block}</p>)}</div></div>
}

type EvidenceEntry = { occurrence: RequirementOccurrence; criterionCode: string; criterionDescription: string; name: string; file?: File }

function EvidencePackageViewer({ project, catalog }: { project: LocalProject; catalog?: Regulation }) {
  const [storedAttachments, setStoredAttachments] = React.useState<StoredAttachment[]>([])
  const [pageCounts, setPageCounts] = React.useState<Record<string, number>>({})
  const [pageIndex, setPageIndex] = React.useState(0)
  const occurrences = React.useMemo(() => project.requirementOccurrences ?? [], [project.requirementOccurrences])

  React.useEffect(() => { void getStoredAttachments(project.localId).then(setStoredAttachments) }, [project.localId])

  const entries = React.useMemo(() => createEvidenceEntries(occurrences, catalog, storedAttachments), [catalog, occurrences, storedAttachments])
  React.useEffect(() => {
    let active = true
    void Promise.all(entries.map(async (entry, index) => {
      if (!entry.file || !isPdfFile(entry.file)) return [evidenceEntryKey(entry, index), 1] as const
      const task = getDocument({ data: new Uint8Array(await entry.file.arrayBuffer()) })
      try { return [evidenceEntryKey(entry, index), (await task.promise).numPages] as const } catch { return [evidenceEntryKey(entry, index), 1] as const } finally { task.destroy() }
    })).then((counts) => { if (active) setPageCounts(Object.fromEntries(counts)) })
    return () => { active = false }
  }, [entries])

  const entryPageCount = (entry: EvidenceEntry, index: number) => pageCounts[evidenceEntryKey(entry, index)] ?? 1
  const entryStartPage = (index: number) => 3 + entries.slice(0, index).reduce((total, entry, entryIndex) => total + entryPageCount(entry, entryIndex), 0)
  const totalPages = 2 + entries.reduce((total, entry, index) => total + entryPageCount(entry, index), 0)
  const selected = entries[pageIndex - 2]
  const selectedIndex = pageIndex - 2
  const selectedStartPage = selected ? entryStartPage(selectedIndex) : undefined
  const selectedPageCount = selected ? entryPageCount(selected, selectedIndex) : undefined
  const pageTitle = pageIndex === 0 ? "Capa · página 1" : pageIndex === 1 ? "Sumário · página 2" : `C-${String(pageIndex - 1).padStart(3, "0")} · páginas ${selectedStartPage}${selectedPageCount && selectedPageCount > 1 ? `–${selectedStartPage! + selectedPageCount - 1}` : ""}`
  const downloadOriginal = () => {
    if (selected?.file) downloadFile(selected.file.name, selected.file)
  }

  return <section className="mt-6 space-y-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><p className="text-sm text-muted-foreground">Capa, sumário e comprovantes organizados pela sequência dos critérios nos formulários normativos.</p><Button className="shrink-0" variant="outline" disabled={!selected?.file} onClick={downloadOriginal}><Download /> Baixar original</Button></div>
    <div className="flex gap-2 overflow-x-auto pb-1"><Button variant={pageIndex === 0 ? "secondary" : "outline"} onClick={() => setPageIndex(0)}>Capa</Button><Button variant={pageIndex === 1 ? "secondary" : "outline"} onClick={() => setPageIndex(1)}>Sumário</Button>{entries.map((entry, index) => <Button key={`${entry.occurrence.id}-${entry.name}-${index}`} variant={pageIndex === index + 2 ? "secondary" : "outline"} onClick={() => setPageIndex(index + 2)}>C-{String(index + 1).padStart(3, "0")}</Button>)}</div>
    <div className="overflow-auto rounded-lg border bg-muted p-4 sm:p-8"><article className="mx-auto flex min-h-[297mm] w-[210mm] min-w-[210mm] flex-col bg-background p-10 shadow-sm">
      {pageIndex === 0 && <EvidenceCover project={project} catalog={catalog} entryCount={entries.length} />}
      {pageIndex === 1 && <EvidenceSummary entries={entries} entryPageCount={entryPageCount} entryStartPage={entryStartPage} />}
      {selected && <EvidenceAttachment key={`${selected.occurrence.id}-${selected.name}`} entry={selected} index={pageIndex - 1} startPage={selectedStartPage!} />}
      <footer className="mt-auto border-t pt-3 text-center text-xs text-muted-foreground">Comprovantes consolidados · {pageTitle} · {totalPages} página(s) no volume</footer>
    </article></div>
    {!entries.length && <Alert><CircleAlert /><AlertTitle>Nenhum comprovante disponível</AlertTitle><AlertDescription>Inclua arquivos nos lançamentos para gerar o sumário e as páginas de comprovantes.</AlertDescription></Alert>}
  </section>
}

function evidenceEntryKey(entry: EvidenceEntry, index: number) { return `${entry.occurrence.id}-${entry.name}-${index}` }
function isPdfFile(file: File) { return file.type === "application/pdf" || file.name.toLocaleLowerCase().endsWith(".pdf") }

function createEvidenceEntries(occurrences: RequirementOccurrence[], catalog: Regulation | undefined, storedAttachments: StoredAttachment[]): EvidenceEntry[] {
  const criteria = catalog?.levels.flatMap((level) => level.criteria) ?? []
  const order = new Map(criteria.map((criterion, index) => [criterion.id, index]))
  return [...occurrences].sort((first, second) => (order.get(first.criterionId ?? "") ?? Number.MAX_SAFE_INTEGER) - (order.get(second.criterionId ?? "") ?? Number.MAX_SAFE_INTEGER) || first.createdAt.localeCompare(second.createdAt)).flatMap((occurrence) => {
    const criterion = criteria.find((item) => item.id === occurrence.criterionId)
    return occurrence.attachmentNames.filter(Boolean).map((name) => ({ occurrence, criterionCode: criterion?.code ?? "Critério não informado", criterionDescription: criterion?.description ?? occurrence.description, name, file: storedAttachments.find((attachment) => attachment.occurrenceId === occurrence.id && attachment.name === name)?.file }))
  })
}

function EvidenceCover({ project, catalog, entryCount }: { project: LocalProject; catalog?: Regulation; entryCount: number }) {
  return <div className="flex flex-1 flex-col justify-center text-center"><p className="text-sm font-medium tracking-[0.2em]">INSTITUTO FEDERAL DA BAHIA</p><h3 className="mt-12 text-3xl font-semibold">COMPROVANTES<br />DO PROCESSO DE RSC</h3><p className="mt-6 text-xl">{project.rscLevel}</p><div className="mt-20 space-y-3 text-base"><p className="font-medium">{project.identification?.name || project.name}</p><p>{project.identification?.position || "Cargo não informado"}</p><p>{project.identification?.campus || "Campus não informado"}</p></div><div className="mt-20 space-y-2 text-sm text-muted-foreground"><p>{catalog ? `${catalog.metadata.regulation.authority} · Resolução nº ${catalog.metadata.regulation.number}/${catalog.metadata.regulation.year}` : "Regulamento não disponível"}</p><p>{entryCount} comprovante(s) organizado(s) neste volume</p></div></div>
}

function EvidenceSummary({ entries, entryPageCount, entryStartPage }: { entries: EvidenceEntry[]; entryPageCount: (entry: EvidenceEntry, index: number) => number; entryStartPage: (index: number) => number }) {
  return <div><header className="text-center"><p className="text-lg font-bold">SUMÁRIO DE COMPROVANTES</p><p className="mt-2 text-sm text-muted-foreground">Ordem correspondente aos critérios dos formulários normativos.</p></header>{entries.length ? <table className="mt-8 w-full border-collapse text-xs"><thead><tr className="bg-muted"><th className="border p-2 text-left">PÁGINAS</th><th className="border p-2 text-left">CRITÉRIO</th><th className="border p-2 text-left">DOCUMENTO</th></tr></thead><tbody>{entries.map((entry, index) => { const start = entryStartPage(index); const count = entryPageCount(entry, index); return <tr key={`${entry.occurrence.id}-${entry.name}-${index}`}><td className="border p-2">{start}{count > 1 ? `–${start + count - 1}` : ""}</td><td className="border p-2"><strong>{entry.criterionCode}</strong><br />{entry.criterionDescription}</td><td className="border p-2">C-{String(index + 1).padStart(3, "0")} · {entry.name}{!entry.file && <span className="block text-muted-foreground">Arquivo precisa ser selecionado novamente.</span>}</td></tr> })}</tbody></table> : <p className="mt-10 text-center text-sm text-muted-foreground">Não há arquivos vinculados aos lançamentos.</p>}</div>
}

function EvidenceAttachment({ entry, index, startPage }: { entry: EvidenceEntry; index: number; startPage: number }) {
  const [url, setUrl] = React.useState<string>()
  const isPdf = entry.file ? isPdfFile(entry.file) : false
  React.useEffect(() => { if (!entry.file || isPdf) { setUrl(undefined); return }; const nextUrl = URL.createObjectURL(entry.file); setUrl(nextUrl); return () => URL.revokeObjectURL(nextUrl) }, [entry.file, isPdf])
  return <div className="flex flex-1 flex-col"><header className="border-b pb-4"><p className="text-sm font-medium tracking-widest">COMPROVANTE C-{String(index).padStart(3, "0")} · PÁGINA {startPage}</p><h3 className="mt-2 text-xl font-semibold">{entry.name}</h3><p className="mt-2 text-sm text-muted-foreground">Critério {entry.criterionCode} · {entry.criterionDescription}</p></header><div className="mt-6 flex flex-1 items-center justify-center">{entry.file && isPdf ? <PdfPages file={entry.file} startPage={startPage} /> : entry.file && url ? entry.file.type.startsWith("image/") ? <img src={url} alt={`Prévia de ${entry.name}`} className="max-h-[205mm] max-w-full object-contain" /> : <a className="text-sm underline" href={url} download={entry.name}>Baixar {entry.name}</a> : <div className="max-w-md border p-8 text-center"><p className="font-medium">Arquivo não disponível neste navegador</p><p className="mt-2 text-sm text-muted-foreground">O sumário preserva a referência “{entry.name}”, mas o binário precisa ser selecionado novamente no lançamento para compor este volume.</p></div>}</div></div>
}

function PdfPages({ file, startPage }: { file: Blob; startPage: number }) {
  const [document, setDocument] = React.useState<PDFDocumentProxy>()
  const [error, setError] = React.useState<string>()

  React.useEffect(() => {
    let active = true
    let task: ReturnType<typeof getDocument> | undefined
    void file.arrayBuffer().then((data) => {
      task = getDocument({ data: new Uint8Array(data) })
      return task.promise
    }).then((loaded) => { if (active) setDocument(loaded) }).catch(() => { if (active) setError("Não foi possível renderizar este PDF.") })
    return () => { active = false; task?.destroy() }
  }, [file])

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>
  if (!document) return <p className="text-sm text-muted-foreground">Renderizando comprovante…</p>
  return <div className="w-full space-y-6">{Array.from({ length: document.numPages }, (_, index) => <PdfEvidencePage key={index} document={document} pageNumber={index + 1} globalPageNumber={startPage + index} />)}</div>
}

function PdfEvidencePage({ document, pageNumber, globalPageNumber }: { document: PDFDocumentProxy; pageNumber: number; globalPageNumber: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    let renderTask: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined
    void document.getPage(pageNumber).then((page) => {
      if (cancelled) return
      const viewport = page.getViewport({ scale: 1.35 })
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const context = canvas.getContext("2d")
      if (!context) return
      renderTask = page.render({ canvas, canvasContext: context, viewport })
      return renderTask.promise
    }).catch(() => undefined)
    return () => { cancelled = true; renderTask?.cancel() }
  }, [document, pageNumber])
  return <figure className="space-y-2"><canvas ref={canvasRef} className="mx-auto block max-w-full border" /><figcaption className="text-center text-xs text-muted-foreground">Página {globalPageNumber}</figcaption></figure>
}

type NormativeFormId = "request" | "score" | "rsc-i" | "rsc-ii" | "rsc-iii"

const normativeFormTabs: { id: NormativeFormId; label: string }[] = [
  { id: "request", label: "Anexo II" },
  { id: "score", label: "Anexo III" },
  { id: "rsc-i", label: "Anexo IV · RSC I" },
  { id: "rsc-ii", label: "Anexo V · RSC II" },
  { id: "rsc-iii", label: "Anexo VI · RSC III" },
]

function formatFormNumber(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
}

function formatFormDate(value?: string) {
  if (!value) return "____ de ______________ de ______"
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(date)
}

function NormativeFormsViewer({ project, catalog, onDownload }: { project: LocalProject; catalog?: Regulation; onDownload: (firstEvidencePages: Record<string, number>) => void }) {
  const [formId, setFormId] = React.useState<NormativeFormId>("request")
  const [storedAttachments, setStoredAttachments] = React.useState<StoredAttachment[]>([])
  const [evidencePageCounts, setEvidencePageCounts] = React.useState<Record<string, number>>({})
  const occurrences = React.useMemo(() => project.requirementOccurrences ?? [], [project.requirementOccurrences])
  const title = normativeFormTabs.find((tab) => tab.id === formId)?.label
  const evidenceEntries = React.useMemo(() => createEvidenceEntries(occurrences, catalog, storedAttachments), [catalog, occurrences, storedAttachments])

  React.useEffect(() => { void getStoredAttachments(project.localId).then(setStoredAttachments) }, [project.localId])
  React.useEffect(() => {
    let active = true
    void Promise.all(evidenceEntries.map(async (entry, index) => {
      if (!entry.file || !isPdfFile(entry.file)) return [evidenceEntryKey(entry, index), 1] as const
      const task = getDocument({ data: new Uint8Array(await entry.file.arrayBuffer()) })
      try { return [evidenceEntryKey(entry, index), (await task.promise).numPages] as const } catch { return [evidenceEntryKey(entry, index), 1] as const } finally { task.destroy() }
    })).then((counts) => { if (active) setEvidencePageCounts(Object.fromEntries(counts)) })
    return () => { active = false }
  }, [evidenceEntries])

  const firstEvidencePages = React.useMemo(() => {
    const pages: Record<string, number> = {}
    let page = 3
    evidenceEntries.forEach((entry, index) => {
      const criterionId = entry.occurrence.criterionId
      if (criterionId && pages[criterionId] === undefined) pages[criterionId] = page
      page += evidencePageCounts[evidenceEntryKey(entry, index)] ?? 1
    })
    return pages
  }, [evidenceEntries, evidencePageCounts])

  return <section className="mt-6 space-y-4">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><p className="text-sm text-muted-foreground">Planilhas normativas preenchidas a partir da identificação, dos lançamentos e do catálogo local. Revise antes do protocolo.</p><Button className="shrink-0" variant="outline" onClick={() => onDownload(firstEvidencePages)}><Download /> Baixar</Button></div>
    <div className="flex flex-wrap gap-2">{normativeFormTabs.map((tab) => <Button key={tab.id} variant={formId === tab.id ? "secondary" : "outline"} onClick={() => setFormId(tab.id)}>{tab.label}</Button>)}</div>
    <div className="overflow-auto rounded-lg border bg-muted p-4 sm:p-8"><article className="normative-form mx-auto w-[210mm] min-w-[210mm] bg-background p-8 text-[10px] shadow-sm sm:p-10">
      {formId === "request" && <NormativeRequest project={project} />}
      {formId === "score" && <ScoreForm catalog={catalog} occurrences={occurrences} />}
      {formId !== "request" && formId !== "score" && <CriteriaForm catalog={catalog} occurrences={occurrences} levelId={formId} firstEvidencePages={firstEvidencePages} />}
      <footer className="mt-6 border-t pt-3 text-center text-[9px] text-muted-foreground">{title} · formulário normativo preenchido · {project.name}</footer>
    </article></div>
  </section>
}

function NormativeRequest({ project }: { project: LocalProject }) {
  const person = project.identification
  const selected = ({ "RSC 1": "RSC I", "RSC 2": "RSC II", "RSC 3": "RSC III" } as Record<string, string>)[project.rscLevel] ?? project.rscLevel
  return <div className="space-y-5 font-serif text-sm leading-relaxed">
    <FormHeading annex="ANEXO – II" title="SOLICITAÇÃO DE RECONHECIMENTO DE SABERES E COMPETÊNCIAS À CPPD" subtitle="INSTITUTO FEDERAL DA BAHIA" />
    <div className="grid grid-cols-12 border border-foreground"><FormCell className="col-span-7" label="Nome do(a) docente:" value={person?.name} /><FormCell className="col-span-3 border-l" label="CPF:" value={person?.cpf} /><FormCell className="col-span-2 border-l" label="Matrícula SIAPE:" value={person?.siape} /><FormCell className="col-span-12 border-t" label="Cargo:" value={person?.position} /><FormCell className="col-span-12 border-t" label="Campus de lotação:" value={person?.campus} /><FormCell className="col-span-6 border-t" label="E-mail:" value={person?.professionalEmail || person?.personalEmail} /><FormCell className="col-span-6 border-l border-t" label="Telefone:" value={person?.phone} /><FormCell className="col-span-5 border-t" label="RT ou RSC (atual) - c/ nº do processo:" value={person?.currentLevel} /><FormCell className="col-span-4 border-l border-t" label="Portaria de concessão:" value="" /><FormCell className="col-span-3 border-l border-t" label="Data de vigência:" value="" /></div>
    <section className="border border-foreground"><h3 className="border-b border-foreground py-3 text-center text-xl font-bold underline">REQUERIMENTO</h3><div className="space-y-4 p-4 text-base"><p>Venho requerer, conforme disposto no Art. 18, da Lei nº 12.772, e sob os termos do Regulamento de RSC, aprovado pela Resolução CONSUP nº {project.regulation.match(/\d+/)?.[0] ?? "________"}, a concessão do RSC, declarando a veracidade da documentação apresentada neste processo, sob as penas da Lei.</p><div><p>Nível de RSC pretendido:</p>{["RSC I", "RSC II", "RSC III"].map((level) => <p key={level}>{level} &nbsp; ({selected === level ? "X" : " "})</p>)}</div></div></section>
    <div className="pt-8 text-center text-base">{person?.campus || "________________"}, {formatFormDate(person?.admissionDate)}</div><div className="pt-16 text-center text-base">________________________________________<br /><span className="text-xs">Assinatura</span></div>
  </div>
}

function FormHeading({ annex, title, subtitle }: { annex: string; title: string; subtitle?: string }) {
  return <header className="text-center"><p className="text-lg font-bold">{annex}</p><div className="mt-3 border-2 border-foreground px-4 py-2 text-lg font-bold">{title}{subtitle && <><br />{subtitle}</>}</div></header>
}

function FormCell({ label, value, className }: { label: string; value?: string; className: string }) {
  return <div className={`${className} min-h-16 p-2`}><p className="font-bold underline">{label}</p><p className="mt-2 break-words">{value || " "}</p></div>
}

function ScoreForm({ catalog, occurrences }: { catalog?: Regulation; occurrences: RequirementOccurrence[] }) {
  return <div className="font-serif"><FormHeading annex="ANEXO – III" title="FORMULÁRIO PARA INDICAR PONTUAÇÃO OBTIDA" />{catalog ? catalog.levels.map((level) => <ScoreLevelTable key={level.section} catalog={catalog} occurrences={occurrences} levelId={level.section} />) : <p className="mt-8 text-center">Dataset normativo indisponível.</p>}</div>
}

function ScoreLevelTable({ catalog, occurrences, levelId }: { catalog: Regulation; occurrences: RequirementOccurrence[]; levelId: "rsc-i" | "rsc-ii" | "rsc-iii" }) {
  const level = catalog.levels.find((item) => item.section === levelId)!
  const projection = calculateLevelProjection(catalog, levelId, occurrences)
  const label = rscSectionLabels[levelId]
  return <section className="mt-5 break-inside-avoid"><h3 className="border border-foreground bg-muted py-1 text-center text-xs font-bold">RECONHECIMENTO DE SABERES E COMPETÊNCIAS – {label}</h3><table className="w-full border-collapse text-[10px]"><thead><tr className="bg-muted"><th className="border p-1">DIRETRIZ</th><th className="border p-1">PESO</th><th className="border p-1">PONTUAÇÃO MÁXIMA</th><th className="border p-1">PONTUAÇÃO OBTIDA</th><th className="border p-1">% OBTIDO EM RELAÇÃO AO MÁXIMO</th></tr></thead><tbody>{level.directives.map((directive) => { const score = projection.directiveScores[directive.id] ?? 0; return <tr key={directive.id}><td className="border p-1"><strong>{directive.code})</strong> {directive.title}</td><td className="border p-1 text-center">{directive.weight}</td><td className="border p-1 text-center">{formatFormNumber(directive.maxScore)}</td><td className="border p-1 text-center">{formatFormNumber(score)}</td><td className="border p-1 text-center">{directive.maxScore ? formatFormNumber((score / directive.maxScore) * 100) : "0"}%</td></tr> })}<tr className="bg-muted font-bold"><td className="border p-1 text-center">TOTAL</td><td className="border p-1 text-center">{level.directives.reduce((total, item) => total + item.weight, 0)}</td><td className="border p-1 text-center">{level.directives.reduce((total, item) => total + item.maxScore, 0)}</td><td className="border p-1 text-center">{formatFormNumber(projection.total)}</td><td className="border p-1 text-center">{formatFormNumber(projection.total)}%</td></tr></tbody></table></section>
}

function CriteriaForm({ catalog, occurrences, levelId, firstEvidencePages }: { catalog?: Regulation; occurrences: RequirementOccurrence[]; levelId: "rsc-i" | "rsc-ii" | "rsc-iii"; firstEvidencePages: Record<string, number> }) {
  const annex = { "rsc-i": "ANEXO – IV", "rsc-ii": "ANEXO – V", "rsc-iii": "ANEXO – VI" }[levelId]
  const label = rscSectionLabels[levelId]
  if (!catalog) return <p>Dataset normativo indisponível.</p>
  const level = catalog.levels.find((item) => item.section === levelId)!
  const projection = calculateLevelProjection(catalog, levelId, occurrences)
  return <div className="font-serif"><header className="text-center"><p className="text-lg font-bold">{annex}</p><p className="mt-2 text-base">QUADRO DE REFERÊNCIA DE CRITÉRIOS PARA O {label}</p><p className="mt-2 text-base">FORMULÁRIO DE PONTUAÇÃO</p></header><section className="mt-4"><h3 className="border border-foreground bg-muted py-1 text-center text-xs font-bold">RECONHECIMENTO DE SABERES E COMPETÊNCIAS – {label}</h3>{level.directives.map((directive) => <CriteriaDirectiveTable key={directive.id} directive={directive} level={level} projection={projection} firstEvidencePages={firstEvidencePages} />)}</section></div>
}

function CriteriaDirectiveTable({ directive, level, projection, firstEvidencePages }: { directive: Regulation["levels"][number]["directives"][number]; level: Regulation["levels"][number]; projection: LevelProjection; firstEvidencePages: Record<string, number> }) {
  const criteria = level.criteria.filter((criterion) => criterion.directiveId === directive.id)
  const score = projection.directiveScores[directive.id] ?? 0
  return <table className="w-full border-collapse text-[9px] break-inside-avoid"><thead><tr className="bg-muted"><th colSpan={2} className="border p-1 text-left">{directive.code}) {directive.title}</th><th className="border p-1">Fator de pontuação p/ unidade</th><th className="border p-1">UN</th><th className="border p-1">Quantidade máxima/UN</th><th className="border p-1">Peso</th><th className="border p-1">Quantidade comprovada (UN)</th><th className="border p-1">Pontuação final</th><th className="border p-1">Página inicial do comprovante</th></tr></thead><tbody>{criteria.map((criterion) => { const item = projection.criterionScores[criterion.id]; return <tr key={criterion.id}><td className="border p-1 align-top">{criterion.code}</td><td className="border p-1">{criterion.description}</td><td className="border p-1 text-center">{formatFormNumber(criterion.factor)}</td><td className="border p-1 text-center">{criterion.unit}</td><td className="border p-1 text-center">{criterion.maxQuantity}</td><td className="border p-1 text-center">{criterion.weight}</td><td className="border p-1 text-center">{item?.quantity ?? 0}</td><td className="border p-1 text-center">{item?.blocked ? "—" : formatFormNumber(item?.score ?? 0)}</td><td className="border p-1 text-center">{firstEvidencePages[criterion.id] ?? "—"}</td></tr> })}<tr className="bg-muted font-bold"><td colSpan={7} className="border p-1 text-center">Pontuação máxima da diretriz: {directive.maxScore} pontos</td><td colSpan={2} className="border p-1 text-center">Pontuação obtida: {formatFormNumber(score)}</td></tr></tbody></table>
}
