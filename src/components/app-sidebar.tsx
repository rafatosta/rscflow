import * as React from "react";
import {
  BarChart3,
  ChevronRight,
  ClipboardCheck,
  FileOutput,
  FileText,
  FlaskConical,
  FolderKanban,
  GraduationCap,
  HardDrive,
  Info,
  LayoutDashboard,
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
  useSidebar,
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
    | "hard-drive"
    | "info"
    | "flask-conical";
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
  onAboutClick: () => void;
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
  info: Info,
  "flask-conical": FlaskConical,
};

export function AppSidebar({
  activePage,
  items,
  onPageChange,
  processItems = [],
  activeProcess,
  onProcessChange,
  onHomeClick,
  onAboutClick,
}: AppSidebarProps) {
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const { isMobile, setOpenMobile } = useSidebar();
  const previewOpen = isPreviewOpen || activeProcess?.startsWith("preview-");
  const navigateAndClose = (navigate: () => void) => {
    navigate();
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        <button
          type="button"
          onClick={() => navigateAndClose(onHomeClick)}
          className="flex items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt="RSCflow"
            className="size-8 shrink-0 rounded-lg shadow-sm"
          />
          <span className="truncate text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            RSCflow
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
                      onClick={() => navigateAndClose(() => onPageChange(item.id))}
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
                                return <SidebarMenuSubItem key={child.id}><SidebarMenuSubButton isActive={activeProcess === child.id} onClick={() => navigateAndClose(() => onProcessChange?.(child.id))}><ChildIcon /><span>{child.label}</span></SidebarMenuSubButton></SidebarMenuSubItem>;
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
                        onClick={() => navigateAndClose(() => onProcessChange?.(item.id))}
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
              isActive={activePage === "sobre"}
              tooltip="Sobre"
              onClick={() => navigateAndClose(onAboutClick)}
            >
              <Info />
              <span>Sobre</span>
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
