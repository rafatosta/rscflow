import * as React from "react"
import { ChevronLeft, ChevronRight, CircleAlert, Download, Minus, Printer, ZoomIn } from "lucide-react"
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { downloadPdfArtifact, openPdfArtifactForPrint, type PdfArtifact } from "@/lib/pdf-artifact"

type PdfViewMode = "width" | "page"

type PdfArtifactViewerProps = {
  artifact?: PdfArtifact
  error?: Error
  loading?: boolean
  toolbarActions?: React.ReactNode
}

export function PdfArtifactActions({ artifact }: { artifact?: PdfArtifact }) {
  if (!artifact) return null
  return <><Button size="sm" variant="outline" onClick={() => openPdfArtifactForPrint(artifact)}><Printer /> Abrir para imprimir</Button><Button size="sm" onClick={() => downloadPdfArtifact(artifact)}><Download /> Baixar</Button></>
}

export function PdfArtifactViewer({ artifact, error, loading, toolbarActions }: PdfArtifactViewerProps) {
  const [document, setDocument] = React.useState<PDFDocumentProxy>()
  const [documentError, setDocumentError] = React.useState<Error>()
  const [pageNumber, setPageNumber] = React.useState(1)
  const [viewMode, setViewMode] = React.useState<PdfViewMode>("width")
  const [zoom, setZoom] = React.useState(100)
  const [pageMotion, setPageMotion] = React.useState<"next" | "previous">("next")
  const lastWheelPageChange = React.useRef(0)

  React.useEffect(() => {
    if (!artifact) return
    let active = true
    let task: { promise: Promise<PDFDocumentProxy>; destroy: () => Promise<void> } | undefined
    let loadedDocument: PDFDocumentProxy | undefined
    setDocument(undefined)
    setDocumentError(undefined)
    setPageNumber(1)
    void import("pdfjs-dist").then(async ({ getDocument, GlobalWorkerOptions }) => {
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default
      GlobalWorkerOptions.workerSrc = workerUrl
      if (!active) return
      task = getDocument({ data: artifact.bytes.slice() })
      loadedDocument = await task.promise
      if (active) setDocument(loadedDocument)
    }).catch((reason: unknown) => {
      if (active) setDocumentError(reason instanceof Error ? reason : new Error("Não foi possível abrir o PDF."))
    })
    return () => {
      active = false
      void task?.destroy()
      loadedDocument?.cleanup()
    }
  }, [artifact])

  const currentPage = document ? Math.min(pageNumber, document.numPages) : 1
  const movePage = (direction: 1 | -1) => {
    if (!document) return
    setPageMotion(direction > 0 ? "next" : "previous")
    setPageNumber((value) => Math.max(1, Math.min(document.numPages, value + direction)))
  }
  const handlePdfWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!document) return
    event.preventDefault()
    event.stopPropagation()
    if (Math.abs(event.deltaY) < 8) return
    const now = Date.now()
    if (now - lastWheelPageChange.current < 450) return
    lastWheelPageChange.current = now
    movePage(event.deltaY > 0 ? 1 : -1)
  }
  if (loading) return <div className="mt-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="mx-auto h-[60vh] max-w-3xl" /></div>
  if (error || documentError) return <Alert className="mt-6" variant="destructive"><CircleAlert /><AlertTitle>Falha ao preparar a prévia</AlertTitle><AlertDescription>{(error ?? documentError)?.message}</AlertDescription></Alert>
  if (!artifact) return null

  return <section className="mt-6 space-y-4" data-pdf-byte-length={artifact.bytes.byteLength}>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border p-3">
      {document ? <div className="flex items-center gap-2 justify-self-start"><Button size="icon" variant="ghost" aria-label="Ir para a página anterior" disabled={currentPage === 1} onClick={() => movePage(-1)}><ChevronLeft /></Button><span className="min-w-28 text-center text-sm">Página {currentPage} de {document.numPages}</span><Button size="icon" variant="ghost" aria-label="Ir para a próxima página" disabled={currentPage === document.numPages} onClick={() => movePage(1)}><ChevronRight /></Button></div> : <span className="text-sm justify-self-start">Carregando documento…</span>}
      <div className="flex items-center gap-1 justify-self-center"><Button size="icon" variant="ghost" aria-label="Reduzir zoom" disabled={zoom <= 50} onClick={() => setZoom((value) => value - 10)}><Minus /></Button><span className="w-12 text-center text-sm text-muted-foreground">{zoom}%</span><Button size="icon" variant="ghost" aria-label="Aumentar zoom" disabled={zoom >= 150} onClick={() => setZoom((value) => value + 10)}><ZoomIn /></Button></div>
      <div className="flex min-w-0 flex-wrap items-center justify-self-end gap-2">{toolbarActions}<Select value={viewMode} onValueChange={(value) => { if (value === "width" || value === "page") setViewMode(value) }}><SelectTrigger aria-label="Modo de visualização" className="w-44"><SelectValue>{viewMode === "width" ? "Ajustar à largura" : "Ajustar à página"}</SelectValue></SelectTrigger><SelectContent className="w-80"><SelectItem value="width"><span className="grid gap-0.5"><span>Ajustar à largura</span><span className="text-xs font-normal text-muted-foreground">Ocupa toda a largura disponível.</span></span></SelectItem><SelectItem value="page"><span className="grid gap-0.5"><span>Ajustar à página</span><span className="text-xs font-normal text-muted-foreground">Mostra a folha inteira na tela.</span></span></SelectItem></SelectContent></Select></div>
    </div>
    <div className="min-w-0"><div onWheelCapture={handlePdfWheel} className="overscroll-contain overflow-auto rounded-lg border bg-muted p-4 sm:p-8">{document && <PdfCanvas key={currentPage} document={document} pageNumber={currentPage} viewMode={viewMode} zoom={zoom} motion={pageMotion} />}</div>
    </div>
  </section>
}

function PdfCanvas({ document, pageNumber, viewMode, zoom, motion }: { document: PDFDocumentProxy; pageNumber: number; viewMode: PdfViewMode; zoom: number; motion: "next" | "previous" }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [error, setError] = React.useState<Error>()

  React.useEffect(() => {
    let active = true
    let page: PDFPageProxy | undefined
    let renderTask: RenderTask | undefined
    let observer: ResizeObserver | undefined
    let resizeHandler: (() => void) | undefined
    void document.getPage(pageNumber).then((loadedPage) => {
      page = loadedPage
      const canvas = canvasRef.current
      if (!active || !canvas) return
      const container = canvas.parentElement
      if (!container) return
      const render = () => {
        const styles = getComputedStyle(container)
        const availableWidth = container.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight)
        const baseViewport = page?.getViewport({ scale: 1 })
        if (!page || !baseViewport || availableWidth <= 0) return
        const widthScale = availableWidth / baseViewport.width
        const pageScale = Math.min(widthScale, Math.max(0.1, (window.innerHeight - container.getBoundingClientRect().top - 32) / baseViewport.height))
        const viewport = page.getViewport({ scale: (viewMode === "page" ? pageScale : widthScale) * (zoom / 100) })
        const outputScale = window.devicePixelRatio || 1
        const context = canvas.getContext("2d")
        if (!context) throw new Error("Canvas indisponível para renderizar o PDF.")
        renderTask?.cancel()
        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        renderTask = page.render({ canvas, canvasContext: context, viewport, transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0] })
      }
      render()
      resizeHandler = render
      observer = new ResizeObserver(render)
      observer.observe(container)
      window.addEventListener("resize", render)
    }).catch((reason: unknown) => {
      if (active && !(reason instanceof Error && reason.name === "RenderingCancelledException")) setError(reason instanceof Error ? reason : new Error("Falha ao renderizar a página."))
    })
    return () => { active = false; observer?.disconnect(); if (resizeHandler) window.removeEventListener("resize", resizeHandler); renderTask?.cancel(); page?.cleanup() }
  }, [document, pageNumber, viewMode, zoom])

  if (error) return <Alert variant="destructive"><CircleAlert /><AlertTitle>Falha ao renderizar a página</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>
  return <canvas ref={canvasRef} className={`mx-auto animate-in fade-in duration-300 ${motion === "next" ? "slide-in-from-bottom-2" : "slide-in-from-top-2"} bg-background shadow-sm`} />
}
