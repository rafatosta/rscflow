import type { LocalProject } from "@/lib/projects"

export function projectSectionHref(project: LocalProject, section: string) {
  return section === "overview" ? `/project/${project.localId}` : `/project/${project.localId}/${section}`
}
