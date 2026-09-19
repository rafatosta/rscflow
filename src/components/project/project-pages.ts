import {
  ClipboardCheck,
  FileOutput,
  FileText,
  GraduationCap,
  HardDrive,
  LayoutDashboard,
  Search,
  UserRound,
} from "lucide-react"

export const projectPages = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard, description: "Progresso, pontuação, comprovantes, pendências e backup." },
  { id: "profile", label: "Identificação", icon: UserRound, description: "Cadastro Funcional e Acadêmico do Servidor" },
  { id: "education", label: "Formação", icon: GraduationCap, description: "Formação, aperfeiçoamento e titulação." },
  { id: "requirements", label: "Requisitos", icon: Search, description: "Explore o catálogo normativo e registre suas experiências." },
  { id: "memorial", label: "Memorial", icon: FileText, description: "Edição e regeneração do Memorial." },
  { id: "review", label: "Revisão", icon: ClipboardCheck, description: "Checklist e prontidão documental." },
  { id: "preview-memorial", label: "Memorial descritivo", icon: FileOutput, description: "Visualização do memorial organizado em capa, sumário e seções editoriais." },
  { id: "preview-forms", label: "Formulários normativos", icon: FileOutput, description: "Visualização dos formulários preenchidos com os dados do processo." },
  { id: "preview-evidence", label: "Comprovantes consolidados", icon: FileOutput, description: "Visualização da capa, do sumário e dos comprovantes vinculados." },
  { id: "documents", label: "Gerar documentos", icon: HardDrive, description: "Preparar, revisar disponibilidade e baixar os artefatos de entrega." },
  { id: "backup", label: "Backup e restauração", icon: HardDrive, description: "Exportar, proteger e recuperar cópias locais do processo." },
] as const

export type ProjectSectionId = (typeof projectPages)[number]["id"]

export const requestedLevelIds = { "RSC 1": "rsc-i", "RSC 2": "rsc-ii", "RSC 3": "rsc-iii", "RSC I": "rsc-i", "RSC II": "rsc-ii", "RSC III": "rsc-iii" } as const
export const rscSectionLabels = { "rsc-i": "RSC I", "rsc-ii": "RSC II", "rsc-iii": "RSC III" } as const
