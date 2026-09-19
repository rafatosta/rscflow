import type { Regulation } from "@/domain/regulation"
import type { LocalProject, MemorialSection, RequirementOccurrence } from "@/lib/projects"

export const memorialSteps = [
  { id: "cover", label: "Capa", hint: "Informe os dados que identificarão o memorial." },
  { id: "introduction", label: "Apresentação", hint: "Apresente-se e situe o propósito deste memorial." },
  { id: "career", label: "Trajetória e formação", hint: "Descreva sua formação e os principais marcos da trajetória profissional." },
  { id: "teaching", label: "Ensino e experiências", hint: "Relate suas experiências de ensino, inovação e atuação acadêmica." },
  { id: "outreach", label: "Extensão e pesquisa", hint: "Apresente ações de extensão, pesquisa e seus resultados." },
  { id: "management", label: "Gestão", hint: "Descreva atividades de gestão, comissões e participação institucional." },
  { id: "conclusion", label: "Conclusão", hint: "Escreva esta parte do memorial com clareza e objetividade." },
] as const

function formatMemorialDate(value: string) {
  if (!value) return "data de ingresso não informada"
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(date)
}

export function getCriterionDescription(catalog: Regulation | undefined, occurrence: RequirementOccurrence) {
  return catalog?.levels.find((level) => level.section === occurrence.selectedLevel)?.criteria.find((criterion) => criterion.id === occurrence.criterionId)?.description
}

export function buildOccurrenceNarrative(occurrence: RequirementOccurrence, criterionDescription?: string) {
  const evidence = [occurrence.evidence, ...occurrence.attachmentNames].filter(Boolean).join("; ")
  return [
    occurrence.period && `Contexto e período: ${occurrence.period}.`,
    `Atividade realizada: ${occurrence.description}.`,
    occurrence.results && `Resultados alcançados: ${occurrence.results}.`,
    occurrence.competencies && `Saberes e competências demonstrados: ${occurrence.competencies}.`,
    criterionDescription && `Enquadramento no critério: ${criterionDescription}.`,
    evidence && `Comprovantes relacionados: ${evidence}.`,
  ].filter(Boolean).join("\n\n")
}

export function getOccurrenceText(occurrence: RequirementOccurrence, catalog?: Regulation) {
  return occurrence.editedText || occurrence.generatedText || buildOccurrenceNarrative(occurrence, getCriterionDescription(catalog, occurrence))
}

export function buildMemorialTextBase(project: LocalProject, catalog?: Regulation): MemorialSection[] {
  const identification = project.identification
  const name = identification?.name || "[nome do(a) docente]"
  const institution = identification?.institution || "[instituição]"
  const campus = identification?.campus || "[campus]"
  const position = identification?.position || "[cargo]"
  const degree = identification?.degree || "[titulação]"
  const formations = project.formations ?? []
  const occurrences = project.requirementOccurrences ?? []
  const formationSummary = formations.length
    ? formations.map((formation) => [
      `${formation.type}: ${formation.title}${formation.institution ? ` — ${formation.institution}` : ""}.`,
      formation.startDate || formation.endDate ? `Período: ${[formation.startDate, formation.endDate].filter(Boolean).join(" a ")}.` : "",
      formation.status && `Situação: ${formation.status}.`,
      formation.notes && `Observações: ${formation.notes}.`,
    ].filter(Boolean).join(" ")).join("\n\n")
    : "Não há formações complementares cadastradas no processo."
  const occurrenceSummary = occurrences.length
    ? [...occurrences].sort((first, second) => (first.period || first.createdAt).localeCompare(second.period || second.createdAt, "pt-BR")).map((occurrence, index) => `${index + 1}. ${getOccurrenceText(occurrence, catalog)}`).join("\n\n")
    : "Não há lançamentos de atividades cadastrados no processo."

  return [
    { id: "cover", content: `MEMORIAL DESCRITIVO\n\n${name}\nSIAPE: ${identification?.siape || "[SIAPE não informado]"}\n${position}\n${institution} · ${campus}\nReconhecimento de Saberes e Competências — ${project.rscLevel}` },
    { id: "introduction", content: `Eu, ${name}, SIAPE ${identification?.siape || "[não informado]"}, ${position} no(a) ${institution}, campus ${campus}, apresento este Memorial Descritivo para instruir meu processo de Reconhecimento de Saberes e Competências (RSC), no nível ${project.rscLevel}. Este texto-base foi composto a partir dos dados cadastrados no processo e deve ser revisado e complementado antes do protocolo.` },
    { id: "career", content: `Minha trajetória funcional no(a) ${institution} teve início em ${formatMemorialDate(identification?.admissionDate ?? "")}. Atualmente, informo a titulação ${degree} e o nível funcional ${identification?.currentLevel || "[nível atual não informado]"}.\n\nFormações cadastradas:\n${formationSummary}` },
    { id: "teaching", content: `Para este processo de ${project.rscLevel}, foram cadastrados ${occurrences.length} lançamento(s) de atividades e experiências. A seguir, as narrativas são organizadas cronologicamente a partir dos dados já cadastrados.\n\n${occurrenceSummary}` },
    { id: "outreach", content: `As ações de extensão, pesquisa e demais experiências relacionadas ao processo devem ser apresentadas com seus objetivos, público envolvido, resultados e evidências. Os lançamentos cadastrados neste processo podem ser usados como referência para detalhar esta seção.\n\nQuantidade de lançamentos disponíveis: ${occurrences.length}.` },
    { id: "management", content: `Nesta seção, descrevo atividades de gestão, participação em comissões e outras contribuições institucionais pertinentes ao pedido de ${project.rscLevel}. Cada atividade deve ser associada ao período de atuação, às responsabilidades desempenhadas e aos documentos comprobatórios correspondentes.` },
    { id: "conclusion", content: `Diante da trajetória, formação e atividades apresentadas neste Memorial Descritivo, solicito a apreciação do pedido de Reconhecimento de Saberes e Competências no nível ${project.rscLevel}. Declaro que as informações serão revisadas e acompanhadas das evidências pertinentes antes do protocolo.` },
  ]
}
