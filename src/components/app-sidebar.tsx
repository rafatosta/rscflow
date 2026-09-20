import * as React from "react";
import {
  BarChart3,
  ChevronRight,
  ClipboardCheck,
  FileOutput,
  FileText,
  FolderKanban,
  GraduationCap,
  HardDrive,
  LayoutDashboard,
  LifeBuoy,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThemeSettingsDialog } from "@/components/theme-settings-dialog";

export type NavigationItem = {
  id: string;
  label: string;
  icon:
    | "layout-dashboard"
    | "folder-kanban"
    | "users-round"
    | "chart-no-axes-combined"
    | "user-round"
    | "graduation-cap"
    | "search"
    | "file-text"
    | "clipboard-check"
    | "file-output"
    | "hard-drive";
  children?: NavigationItem[];
};

type AppSidebarProps = {
  activePage: string;
  items: NavigationItem[];
  onPageChange: (page: string) => void;
  processItems?: NavigationItem[];
  activeProcess?: string;
  onProcessChange?: (page: string) => void;
  onHomeClick: () => void;
};

const icons = {
  "layout-dashboard": LayoutDashboard,
  "folder-kanban": FolderKanban,
  "users-round": UsersRound,
  "chart-no-axes-combined": BarChart3,
  "user-round": UserRound,
  "graduation-cap": GraduationCap,
  search: Search,
  "file-text": FileText,
  "clipboard-check": ClipboardCheck,
  "file-output": FileOutput,
  "hard-drive": HardDrive,
};

export function AppSidebar({
  activePage,
  items,
  onPageChange,
  processItems = [],
  activeProcess,
  onProcessChange,
  onHomeClick,
}: AppSidebarProps) {
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const previewOpen = isPreviewOpen || activeProcess?.startsWith("preview-");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <button
          type="button"
          onClick={onHomeClick}
          className="flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
            R
          </span>
          <span className="truncate text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Rscflow
          </span>
        </button>
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
        {processItems.length > 0 && (
          <SidebarGroup className="mt-4 p-0">
            <SidebarGroupLabel>Processo de RSC</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {processItems.map((item) => {
                  const Icon = icons[item.icon];
                  const hasChildren = Boolean(item.children?.length);
                  const isActive = activeProcess === item.id || item.children?.some((child) => child.id === activeProcess);

                  if (hasChildren) {
                    return (
                      <Collapsible key={item.id} className="group/collapsible" open={previewOpen} onOpenChange={setIsPreviewOpen}>
                        <SidebarMenuItem>
                          <CollapsibleTrigger render={<SidebarMenuButton isActive={isActive} tooltip={item.label} />}>
                            <Icon />
                            <span>{item.label}</span>
                            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.children?.map((child) => {
                                const ChildIcon = icons[child.icon];
                                return <SidebarMenuSubItem key={child.id}><SidebarMenuSubButton isActive={activeProcess === child.id} onClick={() => onProcessChange?.(child.id)}><ChildIcon /><span>{child.label}</span></SidebarMenuSubButton></SidebarMenuSubItem>;
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        onClick={() => onProcessChange?.(item.id)}
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
        )}
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
            <ThemeSettingsDialog />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
