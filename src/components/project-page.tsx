import * as React from "react"
import {
  BookOpen, CheckCircle2, ClipboardCheck, FileOutput,
  FileText, GraduationCap, HardDrive, LayoutDashboard, Search, UserRound,
} from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type FieldError } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { getLocalProjects } from "@/lib/projects"

const pages = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard, description: "Progresso, pontuação, comprovantes, pendências e backup." },
  { id: "profile", label: "Identificação", icon: UserRound, description: "Cadastro Funcional e Acadêmico do Servidor" },
  { id: "education", label: "Formação", icon: GraduationCap, description: "Formação, aperfeiçoamento e titulação." },
  { id: "requirements", label: "Requerimentos", icon: Search, description: "Catálogo, busca, lançamentos e enquadramentos." },
  { id: "memorial", label: "Memorial", icon: FileText, description: "Edição e regeneração do Memorial." },
  { id: "review", label: "Revisão", icon: ClipboardCheck, description: "Checklist e prontidão documental." },
  { id: "preview", label: "Visualizar", icon: FileOutput, description: "Visualizador A4 genérico." },
  { id: "documents", label: "Documentos", icon: HardDrive, description: "PDFs, JSON, backup, ZIP, importação e restauração." },
] as const

type ProjectPageProps = { localId: string; section: string }

export function ProjectPage({ localId, section }: ProjectPageProps) {
  const project = getLocalProjects().find((item) => item.localId === localId)
  const activePage = pages.find((page) => page.id === section) ?? pages[0]
  const Icon = activePage.icon

  return <main className="min-h-full px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-6xl">
      {!project && <p className="text-sm text-muted-foreground">Projeto local não encontrado.</p>}

      <section className="mt-2">
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
    <InfoCard title="Comprovantes" text="Nenhum comprovante adicionado." /><InfoCard title="Pendências" text="Preencha a identificação e a formação para começar." /><InfoCard title="Backup" text="Gere um backup JSON na seção Documentos." />
  </div>
  if (section === "profile") return <IdentificationForm />
  if (section === "preview") return <Card className="mt-6"><CardContent className="p-6"><div className="mx-auto aspect-[210/297] max-w-xl border bg-background p-8 shadow-sm"><p className="text-sm font-semibold">Memorial RSC</p><div className="mt-8 space-y-3"><div className="h-2 w-2/3 rounded bg-muted" /><div className="h-2 rounded bg-muted" /><div className="h-2 w-5/6 rounded bg-muted" /></div></div></CardContent></Card>
  return <div className="mt-6 grid gap-4 md:grid-cols-2"><InfoCard title={section === "documents" ? "Arquivos do projeto" : "Nenhum dado cadastrado"} text={section === "documents" ? "Exporte PDFs, JSON e backup ZIP, ou importe uma restauração." : "Adicione informações para compor esta etapa da avaliação."} /><Card><CardHeader><CardTitle>Próxima ação</CardTitle><CardDescription>Esta seção está pronta para receber seus lançamentos.</CardDescription></CardHeader><CardContent><Button><CheckCircle2 /> Adicionar informação</Button></CardContent></Card></div>
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{text}</CardDescription></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><BookOpen className="size-4" /> Os dados serão salvos neste navegador.</div></CardContent></Card>
}

const cargoOptions = ["Professor do Magistério Superior", "Professor do Ensino Básico, Técnico e Tecnológico"]
const institutionOptions = ["Instituto Federal da Bahia", "Universidade Federal da Bahia"]
const campusOptions = ["Salvador", "Barreiras", "Camaçari", "Vitória da Conquista"]
const rscOptions = ["RT: Graduação", "RT: Aperfeiçoamento", "RT: Especialização", "RT: Mestrado", "RT: Doutorado", "RSC I", "RSC II", "RSC III"]
const degreeOptions = ["Graduação", "Aperfeiçoamento", "Especialização", "Mestrado", "Doutorado"]

const cpfIsValid = (value: string) => {
  const digits = value.replace(/\D/g, "")
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false

  const digitAt = (position: number) => {
    const sum = digits.slice(0, position).split("").reduce((total, digit, index) => total + Number(digit) * (position + 1 - index), 0)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  return digitAt(9) === Number(digits[9]) && digitAt(10) === Number(digits[10])
}

const identificationSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo."),
  cpf: z.string().refine(cpfIsValid, "Informe um CPF válido."),
  admissionDate: z.string().min(1, "Informe a data de ingresso.").refine((value) => new Date(`${value}T00:00:00`) <= new Date(), "A data não pode ser futura."),
  siape: z.string().regex(/^\d{7}$/, "O SIAPE deve ter 7 dígitos."),
  position: z.string().min(1, "Selecione o cargo."),
  institution: z.string().min(1, "Selecione a instituição."),
  campus: z.string().min(1, "Selecione o campus de lotação."),
  currentLevel: z.string().min(1, "Selecione a RT/RSC atual."),
  degree: z.string().min(1, "Selecione a titulação."),
  personalEmail: z.email("Informe um e-mail pessoal válido."),
  professionalEmail: z.email("Informe um e-mail profissional válido."),
  phone: z.string().regex(/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/, "Informe um telefone válido com DDD."),
})

type IdentificationValues = z.infer<typeof identificationSchema>

function IdentificationForm() {
  const form = useForm<IdentificationValues>({
    resolver: zodResolver(identificationSchema),
    defaultValues: { name: "", cpf: "", admissionDate: "", siape: "", position: "", institution: "", campus: "", currentLevel: "", degree: "", personalEmail: "", professionalEmail: "", phone: "" },
  })

  return <form className="mt-6 space-y-4" noValidate onSubmit={form.handleSubmit(() => undefined)}>
    <FormCard title="Identificação pessoal" description="Informe os dados básicos do servidor.">
      <FormField label="Nome" error={form.formState.errors.name}><Input autoComplete="name" {...form.register("name")} /></FormField>
      <FormField label="CPF" error={form.formState.errors.cpf}><Input inputMode="numeric" placeholder="000.000.000-00" {...form.register("cpf")} /></FormField>
      <FormField label="Data de ingresso" error={form.formState.errors.admissionDate}><Input type="date" {...form.register("admissionDate")} /></FormField>
    </FormCard>

    <FormCard title="Vínculo institucional" description="Selecione as informações funcionais vigentes.">
      <FormField label="SIAPE" error={form.formState.errors.siape}><Input inputMode="numeric" placeholder="7 dígitos" {...form.register("siape")} /></FormField>
      <ComboField label="Cargo" error={form.formState.errors.position} options={cargoOptions} value={form.watch("position")} onValueChange={(value) => form.setValue("position", value, { shouldValidate: true })} />
      <ComboField label="Instituição" error={form.formState.errors.institution} options={institutionOptions} value={form.watch("institution")} onValueChange={(value) => form.setValue("institution", value, { shouldValidate: true })} />
      <ComboField label="Campus de lotação" error={form.formState.errors.campus} options={campusOptions} value={form.watch("campus")} onValueChange={(value) => form.setValue("campus", value, { shouldValidate: true })} />
      <ComboField label="RT/RSC atual" error={form.formState.errors.currentLevel} options={rscOptions} value={form.watch("currentLevel")} onValueChange={(value) => form.setValue("currentLevel", value, { shouldValidate: true })} />
    </FormCard>

    <FormCard title="Formação" description="Indique a maior titulação concluída.">
      <ComboField label="Titulação" error={form.formState.errors.degree} options={degreeOptions} value={form.watch("degree")} onValueChange={(value) => form.setValue("degree", value, { shouldValidate: true })} />
    </FormCard>

    <FormCard title="Contato" description="Use canais de contato atualizados.">
      <FormField label="E-mail pessoal" error={form.formState.errors.personalEmail}><Input type="email" autoComplete="email" {...form.register("personalEmail")} /></FormField>
      <FormField label="E-mail profissional" error={form.formState.errors.professionalEmail}><Input type="email" {...form.register("professionalEmail")} /></FormField>
      <FormField label="Telefone" error={form.formState.errors.phone}><Input type="tel" autoComplete="tel" placeholder="(00) 90000-0000" {...form.register("phone")} /></FormField>
    </FormCard>

    <div className="flex justify-end"><Button type="submit">Validar dados</Button></div>
  </form>
}

function FormCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</CardContent></Card>
}

function FormField({ label, error, children }: { label: string; error?: FieldError; children: React.ReactElement<{ "aria-invalid"?: boolean }> }) {
  return <label className="grid gap-1.5 text-sm font-medium"><span>{label}</span>{React.cloneElement(children, { "aria-invalid": Boolean(error) })}{error && <span className="text-sm text-destructive">{error.message}</span>}</label>
}

function ComboField({ label, error, options, value, onValueChange }: { label: string; error?: FieldError; options: string[]; value: string; onValueChange: (value: string) => void }) {
  return <div className="grid gap-1.5"><label className="text-sm font-medium">{label}</label><Combobox items={options} value={value || null} onValueChange={(nextValue) => onValueChange(nextValue ?? "")}><ComboboxInput aria-invalid={Boolean(error)} aria-label={label} placeholder={`Selecione ${label.toLowerCase()}`} /><ComboboxContent><ComboboxEmpty>Nenhuma opção encontrada.</ComboboxEmpty><ComboboxList><ComboboxCollection>{(option: string) => <ComboboxItem key={option} value={option}>{option}</ComboboxItem>}</ComboboxCollection></ComboboxList></ComboboxContent></Combobox>{error && <span className="text-sm text-destructive">{error.message}</span>}</div>
}
