import { describe, expect, it } from "vitest"

import { appHref, appPathname } from "@/lib/app-navigation"

describe("app navigation", () => {
  it("mantém as rotas na raiz quando não há subdiretório", () => {
    expect(appHref("/project/123", "/")).toBe("/project/123")
    expect(appPathname("/project/123", "/")).toBe("/project/123")
  })

  it("adiciona o caminho base às URLs navegáveis", () => {
    expect(appHref("/", "/rscflow/")).toBe("/rscflow/")
    expect(appHref("/project/123/review", "/rscflow/")).toBe(
      "/rscflow/project/123/review",
    )
  })

  it("remove o caminho base antes de identificar a rota interna", () => {
    expect(appPathname("/rscflow/", "/rscflow/")).toBe("/")
    expect(appPathname("/rscflow/project/123/review", "/rscflow/")).toBe(
      "/project/123/review",
    )
  })
})
