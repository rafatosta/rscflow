import { useState } from "react";
import {
  ArchiveRestore,
  ArrowRight,
  Copy,
  FileJson2,
  FolderOpen,
  HardDrive,
  Info,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLocalProjects,
  deleteLocalProject,
  duplicateLocalProject,
  isLocalProject,
  replaceLocalProjects,
  saveLocalProject,
  type LocalProject,
} from "@/lib/projects";
import { loadRegulations } from "@/data/regulations/load";

const rscLevels = ["RSC 1", "RSC 2", "RSC 3"];
const regulations = loadRegulations();

type HomePageProps = { onNavigate: (path: string) => void };

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatRegulation(regulation: (typeof regulations)[number]) {
  const { authority, number, year } = regulation.metadata.regulation
  return `${authority} nº ${number}/${year}`
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [projects, setProjects] = useState<LocalProject[]>(getLocalProjects);
  const [rscLevel, setRscLevel] = useState("");
  const [regulation, setRegulation] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const refreshProjects = () => setProjects(getLocalProjects())

  const exportProject = (project: LocalProject) => {
    const file = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(file)
    const link = document.createElement("a")
    link.href = url
    link.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const restoreProject = async (file?: File) => {
    if (!file) return
    try {
      const imported: unknown = JSON.parse(await file.text())
      const restored = Array.isArray(imported) ? imported : [imported]
      if (!restored.every(isLocalProject)) throw new Error("invalid")
      replaceLocalProjects([...restored, ...getLocalProjects()])
      refreshProjects()
    } catch {
      setShowErrors(true)
    }
  }

  const createProject = () => {
    if (!rscLevel || !regulation) {
      setShowErrors(true);
      return;
    }

    const now = new Date().toISOString();
    const project: LocalProject = {
      localId: crypto.randomUUID(),
      name: `Novo projeto ${rscLevel}`,
      rscLevel,
      regulation,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      schemaVersion: "1.0",
    };

    saveLocalProject(project);
    setProjects((currentProjects) => [project, ...currentProjects]);
    onNavigate(`/project/${project.localId}`);
  };

  return (
    <main className="min-h-full px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-primary">
              <span className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                R
              </span>
              MEUS PROJETOS
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Seus projetos de RSC
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Crie, acompanhe e retome suas avaliações. Seus dados permanecem
              salvos somente neste navegador.
            </p>
          </div>
          <Badge variant="secondary" className="h-auto gap-2 px-3 py-1.5">
            <ShieldCheck /> Dados locais e privados
          </Badge>
        </header>

        <Alert className="mt-7">
          <Info />
          <AlertTitle>Armazenamento local</AlertTitle>
          <AlertDescription>
            Seus projetos não são enviados a um servidor. Exporte um backup em
            JSON regularmente para mantê-los seguros ao trocar ou limpar o
            navegador.
          </AlertDescription>
        </Alert>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Plus className="size-5" />
                </span>
                <div>
                  <CardTitle>Novo projeto</CardTitle>
                  <CardDescription>
                    Defina a base para começar uma avaliação.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <label className="block text-sm font-medium" htmlFor="rsc-level">
                  RSC pretendido <span className="text-destructive">*</span>
                  <Select
                    value={rscLevel}
                    onValueChange={(value) => setRscLevel(value ?? "")}
                  >
                    <SelectTrigger
                      id="rsc-level"
                      aria-invalid={showErrors && !rscLevel}
                      className="mt-2 h-10 w-full"
                    >
                      <SelectValue placeholder="Selecione o nível de RSC" />
                    </SelectTrigger>
                    <SelectContent>
                      {rscLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showErrors && !rscLevel && (
                    <span className="mt-1.5 block text-xs font-normal text-destructive">
                      Selecione o RSC pretendido.
                    </span>
                  )}
                </label>
                <label className="block text-sm font-medium" htmlFor="regulation">
                  Regulamento{" "}
                  <span className="text-destructive">*</span>
                  <Select
                    value={regulation}
                    onValueChange={(value) => setRegulation(value ?? "")}
                  >
                    <SelectTrigger
                      id="regulation"
                      aria-invalid={showErrors && !regulation}
                      className="mt-2 h-10 w-full"
                    >
                      <SelectValue placeholder="Selecione um regulamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {regulations.map((item) => (
                        <SelectItem key={item.metadata.regulation.id} value={item.metadata.regulation.id}>
                          {formatRegulation(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showErrors && !regulation && (
                    <span className="mt-1.5 block text-xs font-normal text-destructive">
                      Selecione o regulamento.
                    </span>
                  )}
                </label>
                <div className="grid">
                  <Button size="lg" onClick={createProject}>
                    Criar projeto <ArrowRight />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <ArchiveRestore className="size-5" />
                </span>
                <div>
                  <CardTitle>Restaurar backup</CardTitle>
                  <CardDescription>
                    Retome um projeto salvo em arquivo JSON.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/50 px-6 text-center">
                <span className="grid size-11 place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
                  <Upload className="size-5" />
                </span>
                <p className="mt-4 text-sm font-medium">
                  Arraste seu arquivo JSON aqui
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  ou escolha um arquivo de projeto do seu computador
                </p>
                <div className="mt-4">
                  <Button variant="outline" type="button" onClick={() => document.getElementById("restore-file")?.click()}>
                    <FolderOpen />
                    Selecionar arquivo
                  </Button>
                  <input id="restore-file" className="sr-only" type="file" accept="application/json,.json" onChange={(event) => void restoreProject(event.target.files?.[0])} />
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Selecione um arquivo JSON exportado pelo Rscflow para restaurar
                seus projetos neste navegador.
              </p>
              {showErrors && <p className="mt-2 text-xs text-destructive">Não foi possível restaurar este arquivo.</p>}
            </CardContent>
          </Card>
        </section>

        <section className="mt-12" aria-labelledby="local-projects-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">NESTE NAVEGADOR</p>
              <h2 id="local-projects-title" className="mt-1 text-2xl font-semibold tracking-tight">
                Projetos locais
              </h2>
            </div>
            <p className="flex max-w-md items-center gap-2 text-sm leading-5 text-muted-foreground">
              <FileJson2 className="size-4 shrink-0 text-primary" />
              Exporte seus projetos regularmente para ter sempre um backup.
            </p>
          </div>

          {projects.length === 0 ? (
            <Card className="mt-5">
              <CardContent className="grid min-h-64 place-items-center px-6 text-center">
                <div>
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                    <HardDrive className="size-6" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold">
                    Ainda não há projetos por aqui
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                    Comece criando seu primeiro projeto de RSC. Ele ficará salvo
                    somente neste navegador.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Card key={project.localId}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate">{project.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {project.rscLevel} · {project.regulation}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">rev. {project.revision}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={0}>
                      <ProgressLabel>Progresso</ProgressLabel>
                      <ProgressValue />
                    </Progress>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Última alteração: {formatDate(project.updatedAt)}
                    </p>
                    <div className="mt-5 flex items-center gap-1 border-t pt-4">
                      <span className="mr-auto">
                        <Button
                          size="sm"
                          onClick={() => onNavigate(`/project/${project.localId}`)}
                        >
                          Continuar <ArrowRight />
                        </Button>
                      </span>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Duplicar ${project.name}`}
                        onClick={() => { duplicateLocalProject(project); refreshProjects() }}
                      >
                        <Copy />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Exportar ${project.name} em JSON`}
                        onClick={() => exportProject(project)}
                      >
                        <FileJson2 />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Excluir ${project.name}`}
                        onClick={() => { deleteLocalProject(project.localId); refreshProjects() }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
