import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  revision?: number;
  saveState?: "saved" | "saving" | "error";
  saveError?: string;
  onRetrySave?: () => void;
  onDiscardDraft?: () => void;
};

export function AppHeader({ title, subtitle, revision, saveState, saveError, onRetrySave, onDiscardDraft }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <SidebarTrigger />
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {saveState && <Badge variant={saveState === "error" ? "destructive" : "secondary"} title={saveError}>{saveState === "saving" ? "Salvando…" : saveState === "saved" ? "Salvo" : "Erro ao salvar"}</Badge>}
        {saveState === "error" && <><Button size="sm" variant="outline" onClick={onRetrySave}>Tentar novamente</Button><Button size="sm" variant="ghost" onClick={onDiscardDraft}>Reabrir versão salva</Button></>}
        {revision !== undefined && <Badge variant="secondary" className="shrink-0">rev. {revision}</Badge>}
      </div>
    </header>
  );
}
