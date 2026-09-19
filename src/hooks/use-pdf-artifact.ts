import * as React from "react"

import { createPdfArtifact, type PdfArtifact } from "@/lib/pdf-artifact"

type PdfArtifactState = {
  artifact?: PdfArtifact
  error?: Error
  loading: boolean
}

export function usePdfArtifact(filename: string, generate: () => Blob | Promise<Blob>, dependencies: React.DependencyList) {
  const [state, setState] = React.useState<PdfArtifactState>({ loading: true })

  React.useEffect(() => {
    let active = true
    setState({ loading: true })
    void createPdfArtifact(filename, generate).then(
      (artifact) => { if (active) setState({ artifact, loading: false }) },
      (reason: unknown) => { if (active) setState({ error: reason instanceof Error ? reason : new Error("Não foi possível gerar o PDF."), loading: false }) },
    )
    return () => { active = false }
    // A lista é fornecida pelo chamador porque representa a fotografia documental.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return state
}
