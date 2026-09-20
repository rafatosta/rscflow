import type { LocalProject } from "@/lib/projects"
import { appHref } from "@/lib/app-navigation"

export function projectSectionHref(project: LocalProject, section: string) {
  const path = section === "overview" ? `/project/${project.localId}` : `/project/${project.localId}/${section}`
  return appHref(path)
}
