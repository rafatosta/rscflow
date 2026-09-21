import { Download, FileArchive, ListChecks } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const backupUrl = "https://raw.githubusercontent.com/rafatosta/rscflow/main/examples/rsc-iii-demonstrativo/rsc-iii-demostrativo-backup-completo.rscflow"

const steps = [
  {
    title: "Baixe o arquivo de demonstração",
    description: "Use o link abaixo para abrir o backup completo do exemplo RSC III no GitHub. Na página do arquivo, clique no botão de download.",
  },
  {
    title: "Abra o RSCFlow e restaure o backup",
    description: "Na tela inicial, escolha Restaurar backup, selecione o arquivo .rscflow baixado e confirme a criação de uma nova cópia local.",
  },
  {
    title: "Percorra o processo",
    description: "Abra o projeto restaurado e navegue por Identificação, Formação, Requisitos, Memorial e Revisão para conferir os dados preenchidos.",
  },
  {
    title: "Gere e confira os documentos",
    description: "Use Visualizar e Gerar documentos para verificar o memorial, os formulários normativos, o índice de comprovantes e o pacote final em PDF.",
  },
]

const checks = [
  "O arquivo aparece como um backup validado antes da restauração.",
  "A restauração cria um novo projeto sem substituir projetos existentes.",
  "Os dados do exemplo e os comprovantes vinculados são exibidos corretamente.",
  "As páginas de visualização e os PDFs são gerados sem erros.",
  "O backup do projeto pode ser criado novamente ao final do teste.",
]

export function TestingPage() {
  return (
    <main className="min-h-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="max-w-3xl space-y-3">
          <Badge variant="secondary" className="gap-2"><FileArchive /> Roteiro de teste</Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Teste o sistema com um projeto pronto</h1>
          <p className="text-base leading-7 text-muted-foreground">
            Use o backup demonstrativo para conhecer o fluxo completo do RSCFlow sem precisar preencher um projeto do zero.
          </p>
        </header>

        <Alert>
          <Download />
          <AlertTitle>Arquivo para baixar</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Backup completo de um processo demonstrativo de RSC III.</span>
            <a className={buttonVariants({ size: "sm", className: "shrink-0" })} href={backupUrl} download="rsc-iii-demostrativo-backup-completo.rscflow">
              Baixar backup <Download />
            </a>
          </AlertDescription>
        </Alert>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>O que precisa ser feito</CardTitle>
              <CardDescription>Siga estas etapas na ordem para validar a experiência principal.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-5">
                {steps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{index + 1}</span>
                    <div className="space-y-1">
                      <h3 className="font-medium">{step.title}</h3>
                      <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListChecks className="size-4" /> Resultado esperado</CardTitle>
              <CardDescription>Use esta lista para registrar o que foi conferido.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                {checks.map((check) => (
                  <li key={check} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <Alert variant="default">
          <FileArchive />
          <AlertTitle>Importante sobre os dados</AlertTitle>
          <AlertDescription>O backup é restaurado apenas no navegador atual e como uma nova cópia local. Ele serve para demonstração; não use os dados de exemplo em um processo oficial.</AlertDescription>
        </Alert>
      </div>
    </main>
  )
}