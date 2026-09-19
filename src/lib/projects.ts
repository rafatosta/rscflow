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
