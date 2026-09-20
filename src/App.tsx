import { useEffect, useState } from "react"

import { AppHeader } from "@/components/app-header"
import { AppSidebar, type NavigationItem } from "@/components/app-sidebar"
import { HomePage } from "@/components/home-page"
import { ProjectPage } from "@/components/project-page"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { loadRegulations } from "@/data/regulations/load"
import { LocalProjectsProvider, useLocalProjects } from "@/hooks/use-local-projects"
import { ThemeProvider } from "@/hooks/use-theme"
import { appHref, appPathname } from "@/lib/app-navigation"

const regulationCatalogs = loadRegulations()

const navigationItems: NavigationItem[] = [
  { id: "visao-geral", label: "Visão geral", icon: "layout-dashboard" },
]

const processItems: NavigationItem[] = [
  { id: "overview", label: "Visão geral", icon: "layout-dashboard" },
  { id: "profile", label: "Identificação", icon: "user-round" },
  { id: "education", label: "Formação", icon: "graduation-cap" },
  { id: "requirements", label: "Requisitos", icon: "search" },
  { id: "memorial", label: "Memorial", icon: "file-text" },
  { id: "review", label: "Revisão", icon: "clipboard-check" },
  {
    id: "preview",
    label: "Visualizar",
    icon: "file-output",
    children: [
      { id: "preview-memorial", label: "Memorial descritivo", icon: "file-text" },
      { id: "preview-forms", label: "Formulários normativos", icon: "file-text" },
      { id: "preview-evidence", label: "Índice de comprovantes", icon: "file-text" },
    ],
  },
  { id: "documents", label: "Gerar documentos", icon: "file-output" },
  { id: "backup", label: "Backup do projeto", icon: "hard-drive" },
]

function App() {
  const [pathname, setPathname] = useState(() => appPathname(window.location.pathname))
  const [activePage, setActivePage] = useState("visao-geral")

  useEffect(() => {
    const handlePopState = () => setPathname(appPathname(window.location.pathname))
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const { project, saveState, saveError, flush, openProject, retrySave, discardDraft } = useLocalProjects()
  const navigate = async (path: string) => {
    if (!(await flush())) return
    window.history.pushState({}, "", appHref(path))
    setPathname(path)
    window.scrollTo(0, 0)
  }

  const handlePageChange = (page: string) => {
    setActivePage(page)
    void navigate("/")
  }

  const activeItem = navigationItems.find((item) => item.id === activePage) ?? navigationItems[0]
  const routeMatch = pathname.match(/^\/project\/([^/]+)(?:\/([^/]+))?\/?$/)
  const isProjectRoute = Boolean(routeMatch)
  const projectSection = routeMatch?.[2] === "preview" ? "preview-memorial" : routeMatch?.[2] ?? "overview"
  useEffect(() => { if (isProjectRoute && routeMatch?.[1]) void openProject(routeMatch[1]) }, [isProjectRoute, openProject, routeMatch])
  const projectCatalog = project
    ? regulationCatalogs.find((catalog) => catalog.metadata.regulation.id === project.regulation)
    : undefined

  return (
    <SidebarProvider>
      <AppSidebar
        activePage={isProjectRoute ? "" : activePage}
        items={navigationItems}
        onPageChange={handlePageChange}
        processItems={isProjectRoute ? processItems : []}
        activeProcess={projectSection}
        onProcessChange={(section) => void navigate(section === "overview" ? `/project/${routeMatch?.[1]}` : `/project/${routeMatch?.[1]}/${section}`)}
        onHomeClick={() => void navigate("/")}
      />
      <SidebarInset className="min-w-0">
        <AppHeader
          title={isProjectRoute ? project?.name ?? "Projeto" : activeItem.label}
          subtitle={isProjectRoute && project ? `${project.rscLevel} · ${project.regulation}` : undefined}
          revision={isProjectRoute ? project?.revision : undefined}
          saveState={isProjectRoute ? saveState : undefined}
          saveError={saveError}
          onRetrySave={() => void retrySave()}
          onDiscardDraft={() => void discardDraft()}
        />
        {isProjectRoute ? (
          <ProjectPage section={projectSection} catalog={projectCatalog} />
        ) : (
          <HomePage onNavigate={navigate} />
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function AppWithProviders() {
  return <ThemeProvider><TooltipProvider delay={0}><LocalProjectsProvider><App /></LocalProjectsProvider></TooltipProvider></ThemeProvider>
}
