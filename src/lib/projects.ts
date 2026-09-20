import Dexie, { type Table } from "dexie"
import { z } from "zod"

export type Identification = { name: string; cpf: string; admissionDate: string; siape: string; position: string; institution: string; campus: string; currentLevel: string; degree: string; personalEmail: string; professionalEmail: string; phone: string }
export type MemorialSection = { id: string; content: string }
export type Formation = { id: string; type: string; title: string; institution: string; area: string; startDate: string; endDate: string; status: string; documentReference: string; attachmentName: string; notes: string; createdAt: string; updatedAt: string }
export type RequirementOccurrence = { id: string; criterionId?: string; selectedLevel?: "rsc-i" | "rsc-ii" | "rsc-iii"; period: string; quantity: number; description: string; results: string; competencies: string; evidence: string; attachmentNames: string[]; generatedText?: string; editedText?: string; isManuallyEdited?: boolean; isGeneratedTextOutdated?: boolean; createdAt: string; updatedAt: string }
export type LocalProject = { localId: string; name: string; rscLevel: string; regulation: string; revision: number; createdAt: string; updatedAt: string; schemaVersion: string; formations?: Formation[]; requirementOccurrences?: RequirementOccurrence[]; memorialSections?: MemorialSection[]; identification?: Identification }
export type StoredAttachment = { id: string; projectId: string; occurrenceId: string; name: string; file: File }

const string = z.string()
const identificationSchema = z.object({ name: string, cpf: string, admissionDate: string, siape: string, position: string, institution: string, campus: string, currentLevel: string, degree: string, personalEmail: string, professionalEmail: string, phone: string })
const formationSchema = z.object({ id: string, type: string, title: string, institution: string, area: string, startDate: string, endDate: string, status: string, documentReference: string, attachmentName: string, notes: string, createdAt: string, updatedAt: string })
const occurrenceSchema = z.object({ id: string, criterionId: string.optional(), selectedLevel: z.enum(["rsc-i", "rsc-ii", "rsc-iii"]).optional(), period: string, quantity: z.number().finite(), description: string, results: string, competencies: string, evidence: string, attachmentNames: z.array(string), generatedText: string.optional(), editedText: string.optional(), isManuallyEdited: z.boolean().optional(), isGeneratedTextOutdated: z.boolean().optional(), createdAt: string, updatedAt: string })
export const localProjectSchema = z.object({ localId: string.min(1), name: string, rscLevel: string, regulation: string, revision: z.number().int().positive(), createdAt: string, updatedAt: string, schemaVersion: string, formations: z.array(formationSchema).optional(), requirementOccurrences: z.array(occurrenceSchema).optional(), memorialSections: z.array(z.object({ id: string, content: string })).optional(), identification: identificationSchema.optional() })

class RscflowDatabase extends Dexie {
  projects!: Table<LocalProject, string>
  attachments!: Table<StoredAttachment, string>
  constructor() { super("rscflow"); this.version(1).stores({ projects: "localId, updatedAt, revision" }); this.version(2).stores({ projects: "localId, updatedAt, revision", attachments: "id, projectId, occurrenceId" }) }
}
const db = new RscflowDatabase()
const LEGACY_STORAGE_KEY = "rscflow.projects"
export class ProjectConflictError extends Error { constructor() { super("Este projeto foi alterado em outra sessão. Reabra a última versão salva antes de continuar.") } }

export async function initializeProjectRepository() {
  if (await db.projects.count()) return
  try { const legacy: unknown = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY) ?? "[]"); if (Array.isArray(legacy)) { const valid = legacy.flatMap((item) => { const parsed = localProjectSchema.safeParse(item); return parsed.success ? [parsed.data] : [] }); if (valid.length) await db.projects.bulkPut(valid) } } catch { /* A base nova continua disponível mesmo se o legado estiver corrompido. */ }
}
export async function listLocalProjects() { await initializeProjectRepository(); return db.projects.orderBy("updatedAt").reverse().toArray() }
export async function getLocalProject(localId: string) { await initializeProjectRepository(); return db.projects.get(localId) }
export async function saveLocalProject(project: LocalProject) { const parsed = localProjectSchema.parse(project); await db.projects.add(parsed); return parsed }
export async function saveProjectBackup(project: LocalProject, attachments: Pick<StoredAttachment, "occurrenceId" | "name" | "file">[]) { const parsed = localProjectSchema.parse(project); await db.transaction("rw", db.projects, db.attachments, async () => { await db.projects.add(parsed); await db.attachments.bulkAdd(attachments.map((attachment) => ({ ...attachment, id: crypto.randomUUID(), projectId: parsed.localId }))) }); return parsed }
export async function updateLocalProject(project: LocalProject, expectedRevision: number) { const parsed = localProjectSchema.parse(project); return db.transaction("rw", db.projects, async () => { const current = await db.projects.get(parsed.localId); if (!current || current.revision !== expectedRevision) throw new ProjectConflictError(); const next = { ...parsed, revision: expectedRevision + 1, updatedAt: new Date().toISOString() }; await db.projects.put(next); return next }) }
export async function deleteLocalProject(localId: string) { await db.projects.delete(localId) }
export async function duplicateLocalProject(project: LocalProject) { const now = new Date().toISOString(); return saveLocalProject({ ...project, localId: crypto.randomUUID(), name: `${project.name} (cópia)`, revision: 1, createdAt: now, updatedAt: now }) }
export async function replaceLocalProjects(projects: LocalProject[]) { await db.transaction("rw", db.projects, async () => { await db.projects.clear(); await db.projects.bulkAdd(projects.map((project) => localProjectSchema.parse(project))) }) }
export async function replaceOccurrenceAttachments(projectId: string, occurrenceId: string, files: File[]) { await db.transaction("rw", db.attachments, async () => { await db.attachments.where("occurrenceId").equals(occurrenceId).delete(); await db.attachments.bulkAdd(files.map((file) => ({ id: crypto.randomUUID(), projectId, occurrenceId, name: file.name, file }))) }) }
export async function deleteOccurrenceAttachments(projectId: string, occurrenceId: string) { await db.attachments.where("occurrenceId").equals(occurrenceId).and((attachment) => attachment.projectId === projectId).delete() }
export async function getOccurrencesWithStoredAttachments(projectId: string, occurrenceIds: string[]) { const attachments = await db.attachments.where("projectId").equals(projectId).toArray(); const requested = new Set(occurrenceIds); return new Set(attachments.filter((attachment) => requested.has(attachment.occurrenceId)).map((attachment) => attachment.occurrenceId)) }
export async function getStoredAttachments(projectId: string) { return db.attachments.where("projectId").equals(projectId).toArray() }
export function isLocalProject(value: unknown): value is LocalProject { return localProjectSchema.safeParse(value).success }
