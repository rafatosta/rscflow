export type PdfArtifact = {
  blob: Blob
  bytes: Uint8Array
  filename: string
}

export async function createPdfArtifact(filename: string, generate: () => Blob | Promise<Blob>): Promise<PdfArtifact> {
  const blob = await generate()
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return { blob, bytes, filename }
}

export function downloadPdfArtifact(artifact: PdfArtifact) {
  const url = URL.createObjectURL(artifact.blob)
  const link = document.createElement("a")
  link.href = url
  link.download = artifact.filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function openPdfArtifactForPrint(artifact: PdfArtifact) {
  const url = URL.createObjectURL(artifact.blob)
  const opened = window.open(url, "_blank", "noopener,noreferrer")
  window.setTimeout(() => URL.revokeObjectURL(url), opened ? 60_000 : 1_000)
}
