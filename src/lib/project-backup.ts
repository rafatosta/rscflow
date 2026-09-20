import { createZip } from "@/lib/document-generation"
import { isLocalProject, type LocalProject, type StoredAttachment } from "@/lib/projects"

type BackupAttachment = {
  path: string
  occurrenceId: string
  name: string
  type: string
  lastModified: number
}

type BackupManifest = {
  format: "rscflow-backup"
  version: 1
  createdAt: string
  projectFile: "project.json"
  attachments: BackupAttachment[]
}

export type RestoredAttachment = Pick<StoredAttachment, "occurrenceId" | "name" | "file">

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export async function createProjectBackup(project: LocalProject, attachments: StoredAttachment[]) {
  const attachmentFiles = await Promise.all(attachments.map(async (attachment, index) => {
    const path = `attachments/${String(index + 1).padStart(4, "0")}`
    return {
      metadata: {
        path,
        occurrenceId: attachment.occurrenceId,
        name: attachment.name,
        type: attachment.file.type,
        lastModified: attachment.file.lastModified,
      },
      archive: { name: path, data: new Uint8Array(await attachment.file.arrayBuffer()) },
    }
  }))
  const manifest: BackupManifest = {
    format: "rscflow-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    projectFile: "project.json",
    attachments: attachmentFiles.map(({ metadata }) => metadata),
  }

  return createZip([
    { name: "manifest.json", data: encoder.encode(JSON.stringify(manifest)) },
    { name: manifest.projectFile, data: encoder.encode(JSON.stringify(project)) },
    ...attachmentFiles.map(({ archive }) => archive),
  ])
}

export async function readProjectBackup(file: File) {
  const entries = readZipEntries(new Uint8Array(await file.arrayBuffer()))
  const manifest = parseJsonEntry(entries, "manifest.json") as Partial<BackupManifest>
  if (manifest.format !== "rscflow-backup" || manifest.version !== 1 || manifest.projectFile !== "project.json" || !Array.isArray(manifest.attachments)) {
    throw new Error("Este arquivo não é um backup válido do Rscflow.")
  }
  const project = parseJsonEntry(entries, manifest.projectFile)
  if (!isLocalProject(project)) throw new Error("Os dados do projeto não são compatíveis com esta versão.")

  const attachments = manifest.attachments.map((attachment) => {
    if (!attachment || typeof attachment.path !== "string" || typeof attachment.occurrenceId !== "string" || typeof attachment.name !== "string") {
      throw new Error("O backup contém informações de arquivos inválidas.")
    }
    const data = entries.get(attachment.path)
    if (!data) throw new Error("O backup está incompleto.")
    return {
      occurrenceId: attachment.occurrenceId,
      name: attachment.name,
      file: new File([data.slice().buffer as ArrayBuffer], attachment.name, {
        type: typeof attachment.type === "string" ? attachment.type : "",
        lastModified: typeof attachment.lastModified === "number" ? attachment.lastModified : Date.now(),
      }),
    }
  })

  return { project, attachments }
}

function parseJsonEntry(entries: Map<string, Uint8Array>, name: string) {
  const entry = entries.get(name)
  if (!entry) throw new Error("O backup está incompleto.")
  try {
    return JSON.parse(decoder.decode(entry)) as unknown
  } catch {
    throw new Error("Não foi possível ler o conteúdo do backup.")
  }
}

function readZipEntries(data: Uint8Array) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const endOffset = findEndOfCentralDirectory(view)
  const entryCount = view.getUint16(endOffset + 10, true)
  let offset = view.getUint32(endOffset + 16, true)
  const entries = new Map<string, Uint8Array>()

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("O arquivo de backup está corrompido.")
    const compression = view.getUint16(offset + 10, true)
    const compressedSize = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const localOffset = view.getUint32(offset + 42, true)
    const name = decoder.decode(data.subarray(offset + 46, offset + 46 + nameLength))
    if (compression !== 0 || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("Formato de backup não compatível.")
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const contentOffset = localOffset + 30 + localNameLength + localExtraLength
    entries.set(name, data.slice(contentOffset, contentOffset + compressedSize))
    offset += 46 + nameLength + extraLength + commentLength
  }

  return entries
}

function findEndOfCentralDirectory(view: DataView) {
  const minimumOffset = Math.max(0, view.byteLength - 65_557)
  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset
  }
  throw new Error("Este arquivo não é um backup válido do Rscflow.")
}
