import * as React from "react"
import { CircleAlert, Download, Minus, Printer, ZoomIn } from "lucide-react"
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { downloadPdfArtifact, openPdfArtifactForPrint, type PdfArtifact } from "@/lib/pdf-artifact"

type PdfArtifactViewerProps = {
  artifact?: PdfArtifact
  error?: Error
  loading?: boolean
}

export function PdfArtifactViewer({ artifact, error, loading }: PdfArtifactViewerProps) {
  const [document, setDocument] = React.useState<PDFDocumentProxy>()
  const [documentError, setDocumentError] = React.useState<Error>()
  const [pageNumber, setPageNumber] = React.useState(1)
  const [zoom, setZoom] = React.useState(90)

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
  if (loading) return <div className="mt-6 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="mx-auto h-[60vh] max-w-3xl" /></div>
  if (error || documentError) return <Alert className="mt-6" variant="destructive"><CircleAlert /><AlertTitle>Falha ao preparar a prévia</AlertTitle><AlertDescription>{(error ?? documentError)?.message}</AlertDescription></Alert>
  if (!artifact) return null

  return <section className="mt-6 space-y-4" data-pdf-byte-length={artifact.bytes.byteLength}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">A prévia, o download e a impressão usam o mesmo arquivo PDF.</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openPdfArtifactForPrint(artifact)}><Printer /> Abrir para imprimir</Button><Button onClick={() => downloadPdfArtifact(artifact)}><Download /> Baixar</Button></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <span className="text-sm">{document ? `Página ${currentPage} de ${document.numPages}` : "Carregando documento…"}</span>
      <div className="flex items-center gap-1"><Button size="icon" variant="ghost" aria-label="Reduzir zoom" disabled={zoom <= 50} onClick={() => setZoom((value) => value - 10)}><Minus /></Button><span className="w-12 text-center text-sm text-muted-foreground">{zoom}%</span><Button size="icon" variant="ghost" aria-label="Aumentar zoom" disabled={zoom >= 150} onClick={() => setZoom((value) => value + 10)}><ZoomIn /></Button></div>
    </div>
    <div className="overflow-auto rounded-lg border bg-muted p-4 sm:p-8">{document && <PdfCanvas document={document} pageNumber={currentPage} scale={zoom / 100} />}</div>
    {document && <div className="flex items-center justify-center gap-3"><Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPageNumber((value) => value - 1)}>Anterior</Button><span className="text-sm text-muted-foreground">Página {currentPage} de {document.numPages}</span><Button size="sm" variant="outline" disabled={currentPage === document.numPages} onClick={() => setPageNumber((value) => value + 1)}>Próxima</Button></div>}
  </section>
}

function PdfCanvas({ document, pageNumber, scale }: { document: PDFDocumentProxy; pageNumber: number; scale: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [error, setError] = React.useState<Error>()

  React.useEffect(() => {
    let active = true
    let page: PDFPageProxy | undefined
    let renderTask: RenderTask | undefined
    void document.getPage(pageNumber).then((loadedPage) => {
      page = loadedPage
      const canvas = canvasRef.current
      if (!active || !canvas) return
      const viewport = page.getViewport({ scale })
      const outputScale = window.devicePixelRatio || 1
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Canvas indisponível para renderizar o PDF.")
      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      renderTask = page.render({ canvas, canvasContext: context, viewport, transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0] })
      return renderTask.promise
    }).catch((reason: unknown) => {
      if (active && !(reason instanceof Error && reason.name === "RenderingCancelledException")) setError(reason instanceof Error ? reason : new Error("Falha ao renderizar a página."))
    })
    return () => { active = false; renderTask?.cancel(); page?.cleanup() }
  }, [document, pageNumber, scale])

  if (error) return <Alert variant="destructive"><CircleAlert /><AlertTitle>Falha ao renderizar a página</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>
  return <canvas ref={canvasRef} className="mx-auto bg-background shadow-sm" />
}
