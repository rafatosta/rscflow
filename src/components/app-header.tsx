import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  revision?: number;
};

export function AppHeader({ title, subtitle, revision }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <SidebarTrigger />
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {revision !== undefined && <Badge variant="secondary" className="ml-auto shrink-0">rev. {revision}</Badge>}
    </header>
  );
}
