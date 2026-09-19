import { useEffect, useState } from "react"

import { AppHeader } from "@/components/app-header"
import { AppSidebar, type NavigationItem } from "@/components/app-sidebar"
import { HomePage } from "@/components/home-page"
import { ProjectPage } from "@/components/project-page"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const navigationItems: NavigationItem[] = [
  { id: "visao-geral", label: "Visão geral", icon: "layout-dashboard" },
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
    navigate("/")
  }

  const activeItem = navigationItems.find((item) => item.id === activePage) ?? navigationItems[0]
  const isProjectRoute = pathname.startsWith("/project/")

  return (
    <SidebarProvider>
      <AppSidebar activePage={activePage} items={navigationItems} onPageChange={handlePageChange} />
      <SidebarInset className="min-w-0 bg-slate-50">
        <AppHeader title={isProjectRoute ? "Projeto" : activeItem.label} />
        {isProjectRoute ? (
          <ProjectPage localId={pathname.split("/").at(-1) ?? ""} onBack={() => navigate("/")} />
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
