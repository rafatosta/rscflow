import { ArrowUpRight, CheckCircle2, Clock3, FolderKanban, Plus, UsersRound } from "lucide-react"

import { Button } from "@/components/ui/button"

const summaries = [
  { label: "Projetos ativos", value: "12", detail: "+2 este mês", icon: FolderKanban, color: "bg-indigo-50 text-indigo-600" },
  { label: "Tarefas concluídas", value: "86%", detail: "+8,4% esta semana", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" },
  { label: "Em andamento", value: "24", detail: "5 com prazo próximo", icon: Clock3, color: "bg-amber-50 text-amber-600" },
  { label: "Membros ativos", value: "18", detail: "+3 novos membros", icon: UsersRound, color: "bg-violet-50 text-violet-600" },
]

export function ContentArea({ activePage }: { activePage: string }) {
  if (activePage !== "visao-geral") {
    return <main className="flex flex-1 items-center justify-center p-6" id="inicio"><section className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="text-sm font-medium text-indigo-600">Em breve</p><h2 className="mt-2 text-xl font-semibold text-slate-900">Esta página está pronta para receber seu conteúdo.</h2><p className="mt-2 text-sm leading-6 text-slate-500">Use a navegação lateral para alternar entre as áreas da sua plataforma.</p></section></main>
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8" id="inicio">
      <div className="mx-auto max-w-7xl">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div><p className="text-sm font-medium text-indigo-600">Segunda-feira, 19 de setembro</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Bom dia, Ana!</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">Acompanhe o que está acontecendo nos seus projetos e mantenha seu time em movimento.</p></div>
          <Button className="h-9 self-start bg-indigo-600 px-3 text-white hover:bg-indigo-700"><Plus />Novo projeto</Button>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo dos projetos">
          {summaries.map((summary) => {
            const Icon = summary.icon
            return <article key={summary.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-start justify-between"><span className={`grid size-10 place-items-center rounded-lg ${summary.color}`}><Icon className="size-5" /></span><button className="text-slate-400 transition-colors hover:text-slate-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`Ver detalhes de ${summary.label}`}><ArrowUpRight className="size-4" /></button></div><p className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">{summary.value}</p><p className="mt-1 text-sm font-medium text-slate-700">{summary.label}</p><p className="mt-2 text-xs text-slate-500">{summary.detail}</p></article>
          })}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-4"><div><h3 className="font-semibold text-slate-900">Projetos recentes</h3><p className="mt-1 text-sm text-slate-500">Continue de onde parou.</p></div><Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">Ver todos</Button></div><div className="mt-5 divide-y divide-slate-100">{["Reformulação da marca", "Portal do cliente", "Planejamento Q4"].map((project, index) => <div key={project} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className={`grid size-9 place-items-center rounded-lg ${["bg-rose-50 text-rose-600", "bg-sky-50 text-sky-600", "bg-amber-50 text-amber-600"][index]}`}><FolderKanban className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{project}</p><p className="mt-0.5 text-xs text-slate-500">Atualizado há {index + 1}h</p></div><span className="hidden text-xs text-slate-500 sm:block">{["8 tarefas", "14 tarefas", "6 tarefas"][index]}</span></div>)}</div></article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h3 className="font-semibold text-slate-900">Próximos passos</h3><p className="mt-1 text-sm text-slate-500">Não deixe nada passar.</p><div className="mt-5 space-y-3">{["Revisar briefing do Portal", "Validar cronograma Q4", "Enviar proposta comercial"].map((task, index) => <label key={task} className="-mx-2 flex cursor-pointer items-start gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50"><input type="checkbox" className="mt-0.5 size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /><span className="text-sm leading-5 text-slate-700">{task}<span className="mt-0.5 block text-xs text-slate-500">{["Hoje, 14:00", "Amanhã", "Sexta-feira"][index]}</span></span></label>)}</div></article>
        </section>
      </div>
    </main>
  )
}
