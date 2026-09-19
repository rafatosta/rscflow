import { Bell, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function AppHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
      <SidebarTrigger className="text-slate-600" />
      <h1 className="min-w-0 text-lg font-semibold tracking-tight text-slate-900 md:text-xl">{title}</h1>
      <div className="relative ml-auto hidden w-full max-w-xs sm:block"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Buscar" placeholder="Buscar..." className="h-9 border-slate-200 bg-slate-50 pl-9 shadow-none focus-visible:bg-white" /></div>
      <Button variant="ghost" size="icon-sm" className="relative shrink-0 text-slate-600" aria-label="Notificações"><Bell /><span className="absolute top-1.5 right-1.5 size-2 rounded-full border-2 border-white bg-indigo-600" /></Button>
      <button className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 outline-none ring-offset-2 transition-shadow hover:ring-2 hover:ring-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label="Abrir perfil de Ana Martins">AM</button>
    </header>
  )
}
