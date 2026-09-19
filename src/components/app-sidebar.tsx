import {
  BarChart3,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  UsersRound,
} from "lucide-react";

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
} from "@/components/ui/sidebar";

export type NavigationItem = {
  id: string;
  label: string;
  icon:
    | "layout-dashboard"
    | "folder-kanban"
    | "users-round"
    | "chart-no-axes-combined";
};

type AppSidebarProps = {
  activePage: string;
  items: NavigationItem[];
  onPageChange: (page: string) => void;
};

const icons = {
  "layout-dashboard": LayoutDashboard,
  "folder-kanban": FolderKanban,
  "users-round": UsersRound,
  "chart-no-axes-combined": BarChart3,
};

export function AppSidebar({
  activePage,
  items,
  onPageChange,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <a
          href="#inicio"
          className="flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-sm">
            R
          </span>
          <span className="truncate text-base font-semibold tracking-tight text-slate-900 group-data-[collapsible=icon]:hidden">
            Rscflow
          </span>
        </a>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = icons[item.icon];
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activePage === item.id}
                      tooltip={item.label}
                      onClick={() => onPageChange(item.id)}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Central de ajuda"
            >
              <LifeBuoy />
              <span>Central de ajuda</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Configurações"
            >
              <Settings />
              <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
