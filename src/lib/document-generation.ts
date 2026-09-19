import type { Regulation } from "@/domain/regulation"
import type { LocalProject, StoredAttachment } from "@/lib/projects"

type PdfPage = { title: string; lines: string[] }

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

/** Produz um PDF A4 simples, sem dependências externas, apropriado para os textos do processo. */
export function createPdf(pages: PdfPage[]) {
  const pageContents = pages.map((page) => {
    const lines = [page.title.toUpperCase(), "", ...page.lines.flatMap((line) => wrap(line))]
    const commands = ["BT", "/F1 11 Tf", "50 792 Td"]
    lines.slice(0, 50).forEach((line, index) => {
      if (index) commands.push("0 -14 Td")
      commands.push(`(${pdfText(line)}) Tj`)
    })
    commands.push("ET")
    return latin1(commands.join("\n"))
  })
  const objectCount = 3 + pageContents.length * 2
  const objects: Uint8Array[] = []
  const pageObjectIds = pageContents.map((_, index) => 4 + index * 2)
  objects.push(encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"))
  objects.push(encoder.encode(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageContents.length} >>`))
  objects.push(encoder.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"))
  pageContents.forEach((content, index) => {
    const pageId = pageObjectIds[index]
    objects[pageId - 1] = encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`)
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
  return createPdf([{ title: "Memorial descritivo", lines: identity(project) }, ...sections.map((section) => ({ title: section.id, lines: [section.content] }))])
}

export function createFormsPdf(project: LocalProject, catalog?: Regulation) {
  const criteria = catalog?.levels.flatMap((level) => level.criteria) ?? []
  const occurrences = project.requirementOccurrences ?? []
  const pages: PdfPage[] = [{ title: "Formulários normativos", lines: [...identity(project), catalog ? `Regulamento: ${catalog.metadata.regulation.authority} · Resolução nº ${catalog.metadata.regulation.number}/${catalog.metadata.regulation.year}` : "Regulamento local não disponível."] }]
  occurrences.forEach((occurrence, index) => {
    const criterion = criteria.find((item) => item.id === occurrence.criterionId)
    pages.push({ title: `Lançamento ${index + 1}`, lines: [`Critério: ${criterion ? `${criterion.code} · ${criterion.description}` : "Não informado"}`, `Período: ${occurrence.period || "Não informado"}`, `Quantidade: ${occurrence.quantity}`, `Atividade: ${occurrence.description}`, occurrence.results && `Resultados: ${occurrence.results}`, occurrence.competencies && `Competências: ${occurrence.competencies}`, occurrence.evidence && `Evidência declarada: ${occurrence.evidence}`].filter(Boolean) as string[] })
  })
  return createPdf(pages)
}

export function createEvidenceIndexPdf(project: LocalProject, attachments: StoredAttachment[]) {
  const occurrences = project.requirementOccurrences ?? []
  const lines = attachments.length ? attachments.map((attachment, index) => {
    const occurrence = occurrences.find((item) => item.id === attachment.occurrenceId)
    return `C-${String(index + 1).padStart(3, "0")} · ${attachment.name}${occurrence ? ` · ${occurrence.description}` : ""}`
  }) : ["Nenhum anexo binário está disponível neste navegador."]
  return createPdf([{ title: "Índice de comprovantes", lines: [...identity(project), "", ...lines] }])
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
