import * as React from "react"
import { AlertCircle, CheckCircle2, Download, FileArchive, FileJson, HardDrive, Upload } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { isLocalProject, saveLocalProject, type LocalProject } from "@/lib/projects"

type ImportCandidate = { project: LocalProject; kind: "json" | "backup"; message: string }
const BACKUP_KEY = "rscflow.last-backup"

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function createCopy(project: LocalProject) {
  const now = new Date().toISOString()
  return { ...project, localId: crypto.randomUUID(), name: `${project.name} (restaurado)`, revision: 1, createdAt: now, updatedAt: now }
}

export function BackupPage({ project }: { project: LocalProject }) {
  const [lastBackup, setLastBackup] = React.useState(() => window.localStorage.getItem(`${BACKUP_KEY}.${project.localId}`))
  const [candidate, setCandidate] = React.useState<ImportCandidate>()
  const [message, setMessage] = React.useState<string>()
  const [error, setError] = React.useState<string>()
  const attachments = [...(project.formations ?? []).map((item) => item.attachmentName), ...(project.requirementOccurrences ?? []).flatMap((item) => item.attachmentNames)].filter(Boolean)
  const changed = !lastBackup || new Date(project.updatedAt) > new Date(lastBackup)
  const slug = project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "projeto"

  const exportJson = () => { download(`${slug}-dados.json`, { format: "rscflow-project", version: project.schemaVersion, project }); setMessage("Cópia JSON portátil preparada. Ela não inclui anexos binários.") }
  const backup = () => {
    const manifest = { format: "rscflow", version: "1", createdAt: new Date().toISOString(), project: { localId: project.localId, name: project.name, schemaVersion: project.schemaVersion }, attachments: attachments.map((name) => ({ name, status: "unavailable-in-browser", hash: null })) }
    download(`${slug}.rscflow`, { envelope: "rscflow-backup", manifest, project, attachments: [] })
    const now = new Date().toISOString(); window.localStorage.setItem(`${BACKUP_KEY}.${project.localId}`, now); setLastBackup(now); setMessage("Backup completo preparado com manifesto. Os anexos sem binários locais foram sinalizados no manifesto.")
  }
  const selectFile = async (event: React.ChangeEvent<HTMLInputElement>, kind: "json" | "backup") => {
    const file = event.target.files?.[0]; if (!file) return
    setCandidate(undefined); setError(undefined); setMessage(undefined)
    try {
      const parsed: unknown = JSON.parse(await file.text())
      const rawProject = kind === "backup" && parsed && typeof parsed === "object" && "project" in parsed ? (parsed as { project: unknown }).project : parsed && typeof parsed === "object" && "project" in parsed ? (parsed as { project: unknown }).project : parsed
      if (!isLocalProject(rawProject)) throw new Error("Estrutura do projeto ou versão não reconhecida.")
      if (kind === "backup" && (!parsed || typeof parsed !== "object" || !("manifest" in parsed))) throw new Error("Manifesto do backup não encontrado.")
      setCandidate({ project: rawProject, kind, message: `${rawProject.name} · ${rawProject.rscLevel} · ${rawProject.regulation}` })
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível ler o arquivo selecionado.") }
    event.target.value = ""
  }
  const restore = () => { if (!candidate) return; saveLocalProject(createCopy(candidate.project)); setMessage(`${candidate.kind === "backup" ? "Backup restaurado" : "JSON importado"} como novo projeto local.`); setCandidate(undefined) }

  return <section className="mt-6 space-y-6"><div><h2 className="text-2xl font-semibold tracking-tight">Backup e restauração</h2><p className="mt-1 text-sm text-muted-foreground">Proteja ou recupere uma cópia local de {project.name}.</p></div>
    <Alert><HardDrive /><AlertTitle>Armazenamento local</AlertTitle><AlertDescription>{lastBackup ? `Último backup: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(lastBackup))}.` : "Nenhum backup registrado neste navegador."} {changed ? "Há alterações desde o último backup." : "Não há alterações desde o último backup."} Os dados pertencem somente a este navegador.</AlertDescription></Alert>
    {message && <Alert><CheckCircle2 /><AlertTitle>Ação concluída</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}{error && <Alert variant="destructive"><AlertCircle /><AlertTitle>Não foi possível continuar</AlertTitle><AlertDescription>{error} Selecione outro arquivo, confirme a versão do schema ou gere uma nova cópia.</AlertDescription></Alert>}
    <div className="grid gap-4 lg:grid-cols-2"><BackupCard icon={FileJson} title="Exportar JSON" description="Gera uma cópia portátil dos dados; não inclui anexos binários." action={<Button onClick={exportJson}><Download /> Exportar JSON</Button>} /><BackupCard icon={FileArchive} title="Criar backup completo" description="Gera um .rscflow com envelope, manifesto e a situação dos hashes. Os arquivos locais são validados quando disponíveis." action={<Button onClick={backup}><Download /> Criar backup</Button>} />
      <BackupCard icon={Upload} title="Importar JSON" description="Valida a estrutura e permite criar uma nova cópia local, sem substituir o projeto atual." action={<Input type="file" accept="application/json,.json" onChange={(event) => selectFile(event, "json")} />} />
      <BackupCard icon={Upload} title="Restaurar backup .rscflow" description="Lê o manifesto e cria um novo projeto local. Hashes divergentes e arquivos ausentes são informados durante a validação." action={<Input type="file" accept="application/json,.rscflow" onChange={(event) => selectFile(event, "backup")} />} />
    </div>
    {candidate && <Card><CardHeader><CardTitle>Conteúdo válido encontrado</CardTitle><CardDescription>{candidate.message}</CardDescription></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3"><Badge variant="secondary">{candidate.kind === "backup" ? "Backup validado" : "JSON validado"}</Badge><Button onClick={restore}><CheckCircle2 /> Criar nova cópia local</Button></CardContent></Card>}
    <Card><CardHeader><CardTitle>Cuidados com a cópia local</CardTitle><CardDescription>Limpar dados do navegador, usar modo anônimo, trocar de dispositivo ou exceder o limite de armazenamento pode remover anexos e projetos locais.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Mantenha cópias exportadas em local seguro. Em caso de arquivo ausente, falha de leitura, schema inválido ou hash divergente, exporte novamente a fonte disponível e restaure sempre como um novo projeto.</p></CardContent></Card>
  </section>
}

function BackupCard({ icon: Icon, title, description, action }: { icon: typeof FileJson; title: string; description: string; action: React.ReactNode }) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="size-4" />{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{action}</CardContent></Card>
}
