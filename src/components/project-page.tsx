import {
  ArrowLeft, BookOpen, CheckCircle2, ClipboardCheck, FileOutput,
  FileText, GraduationCap, HardDrive, LayoutDashboard, Search, UserRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { getLocalProjects } from "@/lib/projects"

const pages = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard, description: "Progresso, pontuação, comprovantes, pendências e backup." },
  { id: "profile", label: "Perfil", icon: UserRound, description: "Dados docente, instituição e requerimento." },
  { id: "education", label: "Formação", icon: GraduationCap, description: "Formação, aperfeiçoamento e titulação." },
  { id: "requirements", label: "Requerimentos", icon: Search, description: "Catálogo, busca, lançamentos e enquadramentos." },
  { id: "memorial", label: "Memorial", icon: FileText, description: "Edição e regeneração do Memorial." },
  { id: "review", label: "Revisão", icon: ClipboardCheck, description: "Checklist e prontidão documental." },
  { id: "preview", label: "Visualizar", icon: FileOutput, description: "Visualizador A4 genérico." },
  { id: "documents", label: "Documentos", icon: HardDrive, description: "PDFs, JSON, backup, ZIP, importação e restauração." },
] as const

type ProjectPageProps = { localId: string; section: string; onNavigate: (path: string) => void }

export function ProjectPage({ localId, section, onNavigate }: ProjectPageProps) {
  const project = getLocalProjects().find((item) => item.localId === localId)
  const activePage = pages.find((page) => page.id === section) ?? pages[0]
  const Icon = activePage.icon
  const basePath = `/project/${localId}`

  return <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl">
      <Button variant="ghost" size="sm" onClick={() => onNavigate("/")}><ArrowLeft /> Projetos</Button>
      <div className="mt-4 flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">PROJETO RSC</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{project?.name ?? "Projeto"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{project ? `${project.rscLevel} · ${project.regulation}` : "Projeto local não encontrado."}</p>
        </div>
        {project && <Badge variant="secondary">rev. {project.revision}</Badge>}
      </div>

      <nav className="mt-5 flex gap-1 overflow-x-auto border-b pb-3" aria-label="Seções do projeto">
        {pages.map((page) => {
          const PageIcon = page.icon
          const path = page.id === "overview" ? basePath : `${basePath}/${page.id}`
          return <Button key={page.id} variant={page.id === activePage.id ? "secondary" : "ghost"} size="sm" onClick={() => onNavigate(path)}><PageIcon /> {page.label}</Button>
        })}
      </nav>

      <section className="mt-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-5" /></span>
          <div><h3 className="text-xl font-semibold">{activePage.label}</h3><p className="text-sm text-muted-foreground">{activePage.description}</p></div>
        </div>
        <ProjectSection section={activePage.id} />
      </section>
    </div>
  </main>
}

function ProjectSection({ section }: { section: (typeof pages)[number]["id"] }) {
  if (section === "overview") return <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <Card className="xl:col-span-2"><CardHeader><CardTitle>Andamento da avaliação</CardTitle><CardDescription>Complete as seções para avançar na revisão.</CardDescription></CardHeader><CardContent><Progress value={0}><ProgressLabel>Progresso do projeto</ProgressLabel><ProgressValue /></Progress></CardContent></Card>
    <Card><CardHeader><CardTitle>Pontuação estimada</CardTitle><CardDescription>Sem lançamentos avaliados.</CardDescription></CardHeader><CardContent><p className="text-3xl font-semibold">0 pts</p></CardContent></Card>
    <InfoCard title="Comprovantes" text="Nenhum comprovante adicionado." /><InfoCard title="Pendências" text="Preencha o perfil e a formação para começar." /><InfoCard title="Backup" text="Gere um backup JSON na seção Documentos." />
  </div>
  if (section === "preview") return <Card className="mt-6"><CardContent className="p-6"><div className="mx-auto aspect-[210/297] max-w-xl border bg-background p-8 shadow-sm"><p className="text-sm font-semibold">Memorial RSC</p><div className="mt-8 space-y-3"><div className="h-2 w-2/3 rounded bg-muted" /><div className="h-2 rounded bg-muted" /><div className="h-2 w-5/6 rounded bg-muted" /></div></div></CardContent></Card>
  return <div className="mt-6 grid gap-4 md:grid-cols-2"><InfoCard title={section === "documents" ? "Arquivos do projeto" : "Nenhum dado cadastrado"} text={section === "documents" ? "Exporte PDFs, JSON e backup ZIP, ou importe uma restauração." : "Adicione informações para compor esta etapa da avaliação."} /><Card><CardHeader><CardTitle>Próxima ação</CardTitle><CardDescription>Esta seção está pronta para receber seus lançamentos.</CardDescription></CardHeader><CardContent><Button><CheckCircle2 /> Adicionar informação</Button></CardContent></Card></div>
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{text}</CardDescription></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" /> Os dados serão salvos neste navegador.</div></CardContent></Card>
}
