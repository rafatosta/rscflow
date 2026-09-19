export type LocalProject = {
  localId: string
  name: string
  rscLevel: string
  regulation: string
  revision: number
  createdAt: string
  updatedAt: string
  schemaVersion: string
}

const STORAGE_KEY = "rscflow.projects"

export function getLocalProjects(): LocalProject[] {
  try {
    const storedProjects = window.localStorage.getItem(STORAGE_KEY)
    if (!storedProjects) return []

    const parsedProjects: unknown = JSON.parse(storedProjects)
    return Array.isArray(parsedProjects) ? parsedProjects as LocalProject[] : []
  } catch {
    return []
  }
}

export function saveLocalProject(project: LocalProject) {
  const projects = getLocalProjects()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([project, ...projects]))
}

export function replaceLocalProjects(projects: LocalProject[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export function deleteLocalProject(localId: string) {
  replaceLocalProjects(getLocalProjects().filter((project) => project.localId !== localId))
}

export function duplicateLocalProject(project: LocalProject): LocalProject {
  const now = new Date().toISOString()
  const copy: LocalProject = {
    ...project,
    localId: crypto.randomUUID(),
    name: `${project.name} (cópia)`,
    revision: 1,
    createdAt: now,
    updatedAt: now,
  }
  saveLocalProject(copy)
  return copy
}

export function isLocalProject(value: unknown): value is LocalProject {
  if (!value || typeof value !== "object") return false
  const project = value as Partial<LocalProject>
  return typeof project.localId === "string" && typeof project.name === "string" &&
    typeof project.rscLevel === "string" && typeof project.regulation === "string" &&
    typeof project.revision === "number" && typeof project.createdAt === "string" &&
    typeof project.updatedAt === "string" && typeof project.schemaVersion === "string"
}
