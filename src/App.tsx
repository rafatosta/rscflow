import { useEffect, useState } from "react"

import { AppHeader } from "@/components/app-header"
import { AppSidebar, type NavigationItem } from "@/components/app-sidebar"
import { ContentArea } from "@/components/content-area"
import { HomePage } from "@/components/home-page"
import { ProjectPage } from "@/components/project-page"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const navigationItems: NavigationItem[] = [
  { id: "visao-geral", label: "Visão geral", icon: "layout-dashboard" },
  { id: "projetos", label: "Projetos", icon: "folder-kanban" },
  { id: "equipe", label: "Equipe", icon: "users-round" },
  { id: "relatorios", label: "Relatórios", icon: "chart-no-axes-combined" },
]

function App() {
  const [pathname, setPathname] = useState(window.location.pathname)
  const [activePage, setActivePage] = useState("projetos")

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
    if (page === "projetos") navigate("/")
  }

  const activeItem = navigationItems.find((item) => item.id === activePage) ?? navigationItems[1]
  const isProjectRoute = pathname.startsWith("/project/")

  return (
    <SidebarProvider>
      <AppSidebar activePage={activePage} items={navigationItems} onPageChange={handlePageChange} />
      <SidebarInset className="min-w-0 bg-slate-50">
        <AppHeader title={isProjectRoute ? "Projeto" : activeItem.label} />
        {isProjectRoute ? (
          <ProjectPage localId={pathname.split("/").at(-1) ?? ""} onBack={() => navigate("/")} />
        ) : activePage === "projetos" ? (
          <HomePage onNavigate={navigate} />
        ) : (
          <ContentArea activePage={activePage} />
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function AppWithProviders() {
  return <TooltipProvider delay={0}><App /></TooltipProvider>
}
