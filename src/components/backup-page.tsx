import * as React from "react"
import { AlertCircle, CheckCircle2, Download, FileArchive, HardDrive, Upload } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getStoredAttachments, saveProjectBackup, type LocalProject } from "@/lib/projects"
import { useLocalProjects } from "@/hooks/use-local-projects"
import { createProjectBackup, readProjectBackup, type RestoredAttachment } from "@/lib/project-backup"
import { downloadFile } from "@/lib/document-generation"

type ImportCandidate = { project: LocalProject; attachments: RestoredAttachment[]; message: string }
const BACKUP_KEY = "rscflow.last-backup"

function createCopy(project: LocalProject) {
  const now = new Date().toISOString()
  return { ...project, localId: crypto.randomUUID(), name: `${project.name} (restaurado)`, revision: 1, createdAt: now, updatedAt: now }
}

export function BackupPage({ project }: { project: LocalProject }) {
  const { refreshProjects } = useLocalProjects()
  const [lastBackup, setLastBackup] = React.useState(() => window.localStorage.getItem(`${BACKUP_KEY}.${project.localId}`))
  const [candidate, setCandidate] = React.useState<ImportCandidate>()
  const [message, setMessage] = React.useState<string>()
  const [error, setError] = React.useState<string>()
  const changed = !lastBackup || new Date(project.updatedAt) > new Date(lastBackup)
  const slug = project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "projeto"

  const backup = async () => {
    setError(undefined); setMessage(undefined)
    try {
      const attachments = await getStoredAttachments(project.localId)
      downloadFile(`${slug}.rscflow`, await createProjectBackup(project, attachments))
      const now = new Date().toISOString(); window.localStorage.setItem(`${BACKUP_KEY}.${project.localId}`, now); setLastBackup(now); setMessage("Backup do projeto criado com sucesso.")
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível criar o backup do projeto.") }
  }
  const selectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return
    setCandidate(undefined); setError(undefined); setMessage(undefined)
    try {
      const restored = await readProjectBackup(file)
      setCandidate({ ...restored, message: `${restored.project.name} · ${restored.project.rscLevel} · ${restored.project.regulation}` })
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível ler o arquivo selecionado.") }
    event.target.value = ""
  }
  const restore = async () => { if (!candidate) return; const copy = createCopy(candidate.project); await saveProjectBackup(copy, candidate.attachments); await refreshProjects(); setMessage("Backup restaurado como um novo projeto local."); setCandidate(undefined) }

  return <section className="mt-6 space-y-6">
    <Alert><FileArchive /><AlertTitle>Backup do projeto</AlertTitle><AlertDescription>Crie uma cópia completa do projeto, incluindo os dados preenchidos e os arquivos anexados. Ao restaurar o backup, o RSCFlow criará uma nova cópia local que poderá ser revisada e editada normalmente.</AlertDescription></Alert>
    <Alert><HardDrive /><AlertTitle>Situação do backup</AlertTitle><AlertDescription>{lastBackup ? `Último backup: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(lastBackup))}.` : "Nenhum backup registrado neste navegador."} {changed ? "Há alterações desde o último backup." : "Não há alterações desde o último backup."} Os dados pertencem somente a este navegador.</AlertDescription></Alert>
    {message && <Alert><CheckCircle2 /><AlertTitle>Ação concluída</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}{error && <Alert variant="destructive"><AlertCircle /><AlertTitle>Não foi possível continuar</AlertTitle><AlertDescription>{error} Confira se você selecionou um backup do projeto ou crie um novo backup.</AlertDescription></Alert>}
    <div className="grid gap-4 lg:grid-cols-2"><BackupCard icon={FileArchive} title="Criar backup" description="Reúna os dados preenchidos, os lançamentos e os arquivos anexados em um único backup do projeto." action={<Button onClick={() => void backup()}><Download /> Criar backup</Button>} />
      <BackupCard icon={Upload} title="Restaurar backup" description="Selecione um backup do RSCFlow para recuperar o projeto e seus arquivos. O conteúdo será restaurado como um novo projeto, sem substituir suas cópias atuais." action={<Input type="file" accept=".rscflow" aria-label="Selecionar backup do projeto" onChange={selectFile} />} />
    </div>
    {candidate && <Card><CardHeader><CardTitle>Backup do projeto encontrado</CardTitle><CardDescription>{candidate.message}</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3"><Badge variant="secondary">Backup validado</Badge><Button onClick={() => void restore()}><CheckCircle2 /> Criar nova cópia local</Button></CardContent></Card>}
    <Card><CardHeader><CardTitle>Cuidados com a cópia local</CardTitle><CardDescription>Limpar dados do navegador, usar modo anônimo, trocar de dispositivo ou exceder o limite de armazenamento pode remover anexos e projetos locais.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Mantenha o backup do projeto em local seguro. Se o arquivo não puder ser lido, crie um novo backup a partir do projeto disponível.</p></CardContent></Card>
  </section>
}

function BackupCard({ icon: Icon, title, description, action }: { icon: typeof FileArchive; title: string; description: string; action: React.ReactNode }) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="size-4" />{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{action}</CardContent></Card>
}
