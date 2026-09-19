import { useState } from "react"

import { AppHeader } from "@/components/app-header"
import { AppSidebar, type NavigationItem } from "@/components/app-sidebar"
import { ContentArea } from "@/components/content-area"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const navigationItems: NavigationItem[] = [
  { id: "visao-geral", label: "Visão geral", icon: "layout-dashboard" },
  { id: "projetos", label: "Projetos", icon: "folder-kanban" },
  { id: "equipe", label: "Equipe", icon: "users-round" },
  { id: "relatorios", label: "Relatórios", icon: "chart-no-axes-combined" },
]

function App() {
  const [activePage, setActivePage] = useState(navigationItems[0].id)
  const activeItem = navigationItems.find((item) => item.id === activePage) ?? navigationItems[0]

  return (
    <TooltipProvider delay={0}>
      <SidebarProvider>
        <AppSidebar activePage={activePage} items={navigationItems} onPageChange={setActivePage} />
        <SidebarInset className="min-w-0 bg-slate-50">
          <AppHeader title={activeItem.label} />
          <ContentArea activePage={activePage} />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

export default App
