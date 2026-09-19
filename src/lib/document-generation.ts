import type { Regulation } from "@/domain/regulation"
import type { LocalProject, StoredAttachment } from "@/lib/projects"
import { calculateLevelProjection } from "@/domain/scoring"

type PdfPage = { title: string; lines: string[]; eyebrow?: string; cover?: boolean }

const encoder = new TextEncoder()

function latin1(value: string) {
  const bytes = new Uint8Array(value.length)
  for (let index = 0; index < value.length; index += 1) bytes[index] = value.charCodeAt(index) <= 255 ? value.charCodeAt(index) : 63
  return bytes
}

function joinBytes(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const part of parts) { result.set(part, offset); offset += part.length }
  return result
}

function wrap(text: string, width = 88) {
  return text.split(/\n+/).flatMap((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (!words.length) return [""]
    const lines: string[] = []
    let line = ""
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (line && next.length > width) { lines.push(line); line = word } else line = next
    }
    if (line) lines.push(line)
    return lines
  })
}

function pdfText(value: string) { return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)") }

/** Produz um PDF A4 com a mesma hierarquia editorial da prévia do processo. */
export function createPdf(pages: PdfPage[]) {
  const renderedPages = pages.flatMap((page) => {
    if (page.cover) return [page]
    const lines = page.lines.flatMap((line) => wrap(line, 82))
    return Array.from({ length: Math.max(1, Math.ceil(lines.length / 43)) }, (_, index) => ({ ...page, title: index ? `${page.title} (continuação)` : page.title, lines: lines.slice(index * 43, (index + 1) * 43) }))
  })
  const pageContents = renderedPages.map((page, pageIndex) => {
    const body = page.lines.flatMap((line) => wrap(line, 82))
    const footer = `${page.eyebrow ?? "DOCUMENTO RSC"} - página ${pageIndex + 1} de ${renderedPages.length}`
    const commands = page.cover
      ? ["BT", "/F2 12 Tf", "0.2 g", "175 700 Td", "(INSTITUTO FEDERAL DA BAHIA) Tj", "/F2 24 Tf", "0 -92 Td", `(${pdfText(page.title.toUpperCase())}) Tj`, "/F1 13 Tf", "0 -42 Td", ...body.flatMap((line) => ["0 -20 Td", `(${pdfText(line)}) Tj`]), "ET"]
      : ["BT", "/F2 8 Tf", "0.45 g", "50 800 Td", `(${pdfText((page.eyebrow ?? "DOCUMENTO RSC").toUpperCase())}) Tj`, "/F2 18 Tf", "0 g", "0 -34 Td", `(${pdfText(page.title)}) Tj`, "/F1 11 Tf", "0 -38 Td", ...body.flatMap((line) => ["0 -15 Td", `(${pdfText(line)}) Tj`]), "ET", "BT", "0.45 g", "/F1 8 Tf", "50 32 Td", `(${pdfText(footer)}) Tj`, "ET"]
    return latin1(commands.join("\n"))
  })
  const objectCount = 4 + pageContents.length * 2
  const objects: Uint8Array[] = []
  const pageObjectIds = pageContents.map((_, index) => 5 + index * 2)
  objects.push(encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"))
  objects.push(encoder.encode(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageContents.length} >>`))
  objects.push(encoder.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"))
  objects.push(encoder.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"))
  pageContents.forEach((content, index) => {
    const pageId = pageObjectIds[index]
    objects[pageId - 1] = encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`)
    objects[pageId] = joinBytes([encoder.encode(`<< /Length ${content.length} >>\nstream\n`), content, encoder.encode("\nendstream")])
  })
  const header = encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")
  const chunks: Uint8Array[] = [header]
  const offsets = [0]
  let position = header.length
  objects.forEach((object, index) => {
    offsets.push(position)
    const wrapped = joinBytes([encoder.encode(`${index + 1} 0 obj\n`), object, encoder.encode("\nendobj\n")])
    chunks.push(wrapped); position += wrapped.length
  })
  const xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF`
  chunks.push(encoder.encode(xref))
  return new Blob([joinBytes(chunks)], { type: "application/pdf" })
}

const identity = (project: LocalProject) => {
  const person = project.identification
  return [`Docente: ${person?.name ?? "Não informado"}`, `SIAPE: ${person?.siape ?? "Não informado"}`, `Cargo: ${person?.position ?? "Não informado"}`, `Instituição/campus: ${person ? `${person.institution} · ${person.campus}` : "Não informado"}`, `Nível solicitado: ${project.rscLevel}`]
}

export function createMemorialPdf(project: LocalProject) {
  const sections = (project.memorialSections ?? []).filter((section) => section.content.trim())
  const labels: Record<string, string> = { cover: "Apresentação", introduction: "Introdução", career: "Trajetória profissional", teaching: "Atuação docente", outreach: "Extensão e pesquisa", management: "Gestão e contribuição institucional", conclusion: "Conclusão" }
  const summary = sections.length ? sections.map((section, index) => `${index + 1}. ${labels[section.id] ?? "Seção do memorial"}`) : ["Nenhuma seção preenchida."]
  return createPdf([
    { title: "Memorial descritivo", lines: [project.rscLevel, "", project.identification?.name ?? project.name, project.identification?.position ?? "Cargo não informado", project.identification?.campus ?? "Campus não informado"], cover: true, eyebrow: "Memorial descritivo" },
    { title: "Sumário", lines: summary, eyebrow: "Memorial descritivo" },
    ...sections.map((section) => ({ title: labels[section.id] ?? "Seção do memorial", lines: [section.content], eyebrow: "Memorial descritivo" })),
  ])
}

export function createFormsPdf(project: LocalProject, catalog?: Regulation) {
  const occurrences = project.requirementOccurrences ?? []
  const number = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
  const levelLabels = { "rsc-i": "RSC I", "rsc-ii": "RSC II", "rsc-iii": "RSC III" } as const
  const pages: PdfPage[] = [{ title: "Formulários normativos", lines: [project.rscLevel, "", project.identification?.name ?? project.name, project.identification?.siape ? `SIAPE: ${project.identification.siape}` : "SIAPE não informado"], cover: true, eyebrow: "Formulários normativos" }, {
    title: "Anexo II - Solicitação de Reconhecimento de Saberes e Competências à CPPD",
    lines: [...identity(project), `CPF: ${project.identification?.cpf ?? "Não informado"}`, `E-mail: ${project.identification?.professionalEmail || project.identification?.personalEmail || "Não informado"}`, `Telefone: ${project.identification?.phone ?? "Não informado"}`, "", `Nível de RSC pretendido: ${project.rscLevel}`, `Regulamento: ${catalog ? `${catalog.metadata.regulation.authority} · Resolução nº ${catalog.metadata.regulation.number}/${catalog.metadata.regulation.year}` : "Regulamento local não disponível."}`],
    eyebrow: "Anexo II",
  }]

  if (!catalog) return createPdf([...pages, { title: "Anexos III a VI", lines: ["Dataset normativo indisponível para preencher os formulários de pontuação."], eyebrow: "Formulários normativos" }])

  pages.push({
    title: "Anexo III - Formulário para indicar pontuação obtida",
    lines: catalog.levels.flatMap((level) => {
      const projection = calculateLevelProjection(catalog, level.section, occurrences)
      return [
        `Reconhecimento de Saberes e Competências - ${levelLabels[level.section]}`,
        ...level.directives.map((directive) => `${directive.code}) ${directive.title} · Peso ${directive.weight} · Máximo ${number(directive.maxScore)} · Obtido ${number(projection.directiveScores[directive.id] ?? 0)}`),
        `Total ${levelLabels[level.section]}: ${number(projection.total)} pontos`,
        "",
      ]
    }),
    eyebrow: "Anexo III",
  })

  catalog.levels.forEach((level, index) => {
    const projection = calculateLevelProjection(catalog, level.section, occurrences)
    pages.push({
      title: `Anexo ${index + 4} - Quadro de referência de critérios para o ${levelLabels[level.section]}`,
      lines: level.directives.flatMap((directive) => {
        const criteria = level.criteria.filter((criterion) => criterion.directiveId === directive.id)
        return [
          `${directive.code}) ${directive.title}`,
          ...criteria.map((criterion) => {
            const score = projection.criterionScores[criterion.id]
            return `${criterion.code} · ${criterion.description} · Fator ${number(criterion.factor)} · UN ${criterion.unit} · Máximo ${number(criterion.maxQuantity)} · Peso ${number(criterion.weight)} · Quantidade comprovada ${number(score?.quantity ?? 0)} · Pontuação final ${score?.blocked ? "-" : number(score?.score ?? 0)}`
          }),
          `Pontuação máxima da diretriz: ${number(directive.maxScore)} pontos · Pontuação obtida: ${number(projection.directiveScores[directive.id] ?? 0)}`,
          "",
        ]
      }),
      eyebrow: `Anexo ${index + 4}`,
    })
  })
  return createPdf(pages)
}

export function createEvidenceIndexPdf(project: LocalProject, attachments: StoredAttachment[]) {
  const occurrences = project.requirementOccurrences ?? []
  const lines = attachments.length ? attachments.map((attachment, index) => {
    const occurrence = occurrences.find((item) => item.id === attachment.occurrenceId)
    return `C-${String(index + 1).padStart(3, "0")} · ${attachment.name}${occurrence ? ` · ${occurrence.description}` : ""}`
  }) : ["Nenhum anexo binário está disponível neste navegador."]
  return createPdf([{ title: "Índice de comprovantes", lines: [project.rscLevel, "", project.identification?.name ?? project.name], cover: true, eyebrow: "Comprovantes" }, { title: "Sumário de comprovantes", lines: [...identity(project), "", ...lines], eyebrow: "Comprovantes" }])
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0) }
  return (crc ^ 0xffffffff) >>> 0
}
function u16(value: number) { return Uint8Array.of(value & 255, (value >>> 8) & 255) }
function u32(value: number) { return Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255) }

/** Cria um ZIP sem compressão, preservando os anexos binários armazenados no IndexedDB. */
export function createZip(files: { name: string; data: Uint8Array }[]) {
  const chunks: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0
  for (const file of files) {
    const name = encoder.encode(file.name); const crc = crc32(file.data)
    const local = joinBytes([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name, file.data])
    chunks.push(local)
    central.push(joinBytes([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]))
    offset += local.length
  }
  const centralData = joinBytes(central)
  return new Blob([joinBytes([...chunks, centralData, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralData.length), u32(offset), u16(0)])], { type: "application/zip" })
}

export function downloadFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob); const link = document.createElement("a")
  link.href = url; link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
