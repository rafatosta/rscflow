import { useEffect, useState } from "react"

import { AppHeader } from "@/components/app-header"
import { AppSidebar, type NavigationItem } from "@/components/app-sidebar"
import { HomePage } from "@/components/home-page"
import { ProjectPage } from "@/components/project-page"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { getLocalProjects } from "@/lib/projects"

const navigationItems: NavigationItem[] = [
  { id: "visao-geral", label: "Visão geral", icon: "layout-dashboard" },
]

const processItems: NavigationItem[] = [
  { id: "profile", label: "Perfil", icon: "user-round" },
  { id: "education", label: "Formação", icon: "graduation-cap" },
  { id: "requirements", label: "Requerimentos", icon: "search" },
  { id: "memorial", label: "Memorial", icon: "file-text" },
  { id: "review", label: "Revisão", icon: "clipboard-check" },
  { id: "preview", label: "Visualizar", icon: "file-output" },
  { id: "documents", label: "Documentos", icon: "hard-drive" },
]

function App() {
  const [pathname, setPathname] = useState(window.location.pathname)
  const [activePage, setActivePage] = useState("visao-geral")

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname)
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const navigate = (path: string) => {
    window.history.pushState({}, "", path)
    setPathname(path)
  }

  const handlePageChange = (page: string) => {
    setActivePage(page)
    navigate(isProjectRoute ? `/project/${routeMatch?.[1]}` : "/")
  }

  const activeItem = navigationItems.find((item) => item.id === activePage) ?? navigationItems[0]
  const routeMatch = pathname.match(/^\/project\/([^/]+)(?:\/([^/]+))?\/?$/)
  const isProjectRoute = Boolean(routeMatch)
  const projectSection = routeMatch?.[2] ?? "overview"
  const project = isProjectRoute
    ? getLocalProjects().find((item) => item.localId === routeMatch?.[1])
    : undefined

  return (
    <SidebarProvider>
      <AppSidebar
        activePage={isProjectRoute ? (projectSection === "overview" ? "visao-geral" : "") : activePage}
        items={navigationItems}
        onPageChange={handlePageChange}
        processItems={isProjectRoute ? processItems : []}
        activeProcess={projectSection}
        onProcessChange={(section) => navigate(`/project/${routeMatch?.[1]}/${section}`)}
        onHomeClick={() => navigate("/")}
      />
      <SidebarInset className="min-w-0">
        <AppHeader
          title={project?.name ?? (isProjectRoute ? "Projeto" : activeItem.label)}
          subtitle={project ? `${project.rscLevel} · ${project.regulation}` : undefined}
          revision={project?.revision}
        />
        {isProjectRoute ? (
          <ProjectPage localId={routeMatch?.[1] ?? ""} section={projectSection} />
        ) : (
          <HomePage onNavigate={navigate} />
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function AppWithProviders() {
  return <TooltipProvider delay={0}><App /></TooltipProvider>
}
