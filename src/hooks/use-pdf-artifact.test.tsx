import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { usePdfArtifact } from "@/hooks/use-pdf-artifact"

describe("usePdfArtifact", () => {
  it("reutiliza o artefato e o invalida quando a fotografia do projeto muda", async () => {
    const generate = vi.fn((version: number) => new Blob([String(version)], { type: "application/pdf" }))
    const { result, rerender } = renderHook(({ version }) => usePdfArtifact("arquivo.pdf", () => generate(version), [version]), { initialProps: { version: 1 } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    const first = result.current.artifact
    rerender({ version: 1 })
    expect(generate).toHaveBeenCalledTimes(1)
    await act(() => rerender({ version: 2 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(generate).toHaveBeenCalledTimes(2)
    expect(result.current.artifact).not.toBe(first)
  })
})
