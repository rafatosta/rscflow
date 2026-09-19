import {
  BarChart3,
  ChevronUp,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings,
  UsersRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export type NavigationItem = {
  id: string
  label: string
  icon: "layout-dashboard" | "folder-kanban" | "users-round" | "chart-no-axes-combined"
}

type AppSidebarProps = {
  activePage: string
  items: NavigationItem[]
  onPageChange: (page: string) => void
}

const icons = {
  "layout-dashboard": LayoutDashboard,
  "folder-kanban": FolderKanban,
  "users-round": UsersRound,
  "chart-no-axes-combined": BarChart3,
}

export function AppSidebar({ activePage, items, onPageChange }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" className="border-sidebar-border bg-white">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <a href="#inicio" className="flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-sm">R</span>
          <span className="truncate text-base font-semibold tracking-tight text-slate-900 group-data-[collapsible=icon]:hidden">Rscflow</span>
        </a>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0"><SidebarGroupContent><SidebarMenu>
          {items.map((item) => {
            const Icon = icons[item.icon]
            return <SidebarMenuItem key={item.id}><SidebarMenuButton
              isActive={activePage === item.id} tooltip={item.label} onClick={() => onPageChange(item.id)}
              className="h-10 rounded-lg px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-950 data-[active=true]:bg-indigo-50 data-[active=true]:font-medium data-[active=true]:text-indigo-700 data-[active=true]:hover:bg-indigo-50"
            ><Icon /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>
          })}
        </SidebarMenu></SidebarGroupContent></SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem><SidebarMenuButton tooltip="Central de ajuda" className="h-10 rounded-lg px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-950"><LifeBuoy /><span>Central de ajuda</span></SidebarMenuButton></SidebarMenuItem>
          <SidebarMenuItem><SidebarMenuButton tooltip="Configurações" className="h-10 rounded-lg px-3 text-slate-600 hover:bg-slate-100 hover:text-slate-950"><Settings /><span>Configurações</span></SidebarMenuButton></SidebarMenuItem>
        </SidebarMenu>
        <div className="mt-2 border-t border-slate-200 pt-2 group-data-[collapsible=icon]:border-t-0 group-data-[collapsible=icon]:pt-0">
          <div className="flex items-center gap-2 rounded-lg p-2 group-data-[collapsible=icon]:justify-center">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">AM</div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-slate-800">Ana Martins</p><p className="truncate text-xs text-slate-500">ana@rscflow.com</p></div>
            <Button variant="ghost" size="icon-xs" className="text-slate-500 group-data-[collapsible=icon]:hidden" aria-label="Sair"><LogOut /></Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-1 w-full justify-start text-slate-500 group-data-[collapsible=icon]:hidden"><ChevronUp />Gerenciar conta</Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
