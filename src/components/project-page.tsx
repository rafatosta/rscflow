import { ArrowLeft, FolderKanban } from "lucide-react"

import { Button } from "@/components/ui/button"

type ProjectPageProps = { localId: string; onBack: () => void }

export function ProjectPage({ localId, onBack }: ProjectPageProps) {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><FolderKanban className="size-6" /></span><p className="mt-5 text-sm font-medium text-indigo-700">PROJETO CRIADO</p><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Seu projeto está pronto</h1><p className="mt-3 text-sm leading-6 text-slate-500">O identificador local deste projeto é <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{localId}</code>.</p><Button variant="outline" className="mt-6" onClick={onBack}><ArrowLeft />Voltar para projetos</Button></section></main>
}
