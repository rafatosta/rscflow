import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <SidebarTrigger />
      <h1 className="min-w-0 text-lg font-semibold tracking-tight md:text-xl">
        {title}
      </h1>
    </header>
  );
}
