import * as React from "react"
import { BookOpen, CheckCircle2, ChevronRight, FileText, Pencil } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { Regulation } from "@/domain/regulation"
import type { LocalProject, MemorialSection, RequirementOccurrence } from "@/lib/projects"
import { buildMemorialTextBase, buildOccurrenceNarrative, getCriterionDescription, getOccurrenceText, memorialSteps } from "@/components/project/memorial-content"


export function MemorialPage({ project, catalog, onChange, onOccurrencesChange }: { project: LocalProject; catalog?: Regulation; onChange: (sections: MemorialSection[]) => void; onOccurrencesChange: (occurrences: RequirementOccurrence[]) => void }) {
  const [activeId, setActiveId] = React.useState("cover")
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)
  const [isClearDialogOpen, setIsClearDialogOpen] = React.useState(false)
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = React.useState(false)
  const [isTextBaseDialogOpen, setIsTextBaseDialogOpen] = React.useState(false)
  const [editingNarrativeId, setEditingNarrativeId] = React.useState<string | null>(null)
  const [activeMemorialTab, setActiveMemorialTab] = React.useState("sections")
  const sections = project.memorialSections ?? []
  const activeIndex = memorialSteps.findIndex((step) => step.id === activeId)
  const activeStep = memorialSteps[activeIndex]
  const activeContent = sections.find((item) => item.id === activeId)?.content ?? ""
  const completedCount = memorialSteps.filter((step) => sections.some((item) => item.id === step.id && item.content.trim())).length
  const occurrences = project.requirementOccurrences ?? []
  const editingNarrative = occurrences.find((occurrence) => occurrence.id === editingNarrativeId)

  const updateContent = (content: string) => {
    const next = sections.filter((item) => item.id !== activeId)
    onChange(content ? [...next, { id: activeId, content }] : next)
  }
  const moveTo = (index: number) => {
    const nextStep = memorialSteps[index]
    if (nextStep) setActiveId(nextStep.id)
  }

  return <section className="mt-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="max-w-3xl text-base text-muted-foreground">O Memorial é seu texto autoral. Aplique as narrativas extraídas como ponto de partida e reescreva, complemente ou remova qualquer trecho conforme necessário.</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="outline" onClick={() => setIsTextBaseDialogOpen(true)}><BookOpen /> Aplicar narrativas ao Memorial</Button>
        <Button variant="outline" disabled={completedCount === 0} onClick={() => setIsClearAllDialogOpen(true)}>Limpar tudo</Button>
        <Button variant="outline" onClick={() => setIsPreviewOpen(true)}><FileText /> Pré-visualizar PDF</Button>
      </div>
    </div>

    <Tabs value={activeMemorialTab} onValueChange={setActiveMemorialTab} className="mt-6">
      <TabsList aria-label="Conteúdo do Memorial"><TabsTrigger value="sections">Seções do Memorial</TabsTrigger><TabsTrigger value="narratives">Narrativas extraídas</TabsTrigger></TabsList>
      <TabsContent value="sections" className="mt-6">
    <div className="grid gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
      <Card className="h-fit py-5">
        <CardHeader className="px-5"><CardTitle>Seções</CardTitle><CardDescription>{completedCount} de {memorialSteps.length} preenchidas</CardDescription></CardHeader>
        <CardContent className="mt-4 px-3">
          <nav aria-label="Seções do memorial" className="space-y-1">
            {memorialSteps.map((step, index) => {
              const isComplete = sections.some((item) => item.id === step.id && item.content.trim())
              const isActive = activeId === step.id
              return <Button key={step.id} variant={isActive ? "secondary" : "ghost"} className="h-12 w-full justify-start px-3 text-sm" onClick={() => setActiveId(step.id)}>
                <span className={isComplete ? "grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground" : "grid size-7 shrink-0 place-items-center rounded-full border text-xs"}>{isComplete ? <CheckCircle2 className="size-4" /> : index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-left">{step.label}</span><ChevronRight className="size-4" />
              </Button>
            })}
          </nav>
        </CardContent>
      </Card>

      <Card className="min-h-[34rem] py-5">
        <CardHeader className="px-5"><CardTitle>{activeStep.label}</CardTitle><CardDescription>{activeStep.hint}</CardDescription></CardHeader>
        <CardContent className="mt-5 flex flex-1 flex-col px-5">
          <Textarea value={activeContent} onChange={(event) => updateContent(event.target.value)} placeholder={`Descreva: ${activeStep.label.toLocaleLowerCase("pt-BR")}...`} className="min-h-72 flex-1 resize-y text-base" aria-label={`Conteúdo da seção ${activeStep.label}`} />
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{activeContent.length} caracteres</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" disabled={!activeContent} onClick={() => setIsClearDialogOpen(true)}>Limpar</Button>
              <Button variant="outline" disabled={activeIndex === 0} onClick={() => moveTo(activeIndex - 1)}>Anterior</Button>
              <Button disabled={activeIndex === memorialSteps.length - 1} onClick={() => moveTo(activeIndex + 1)}>Próxima seção <ChevronRight /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
      </TabsContent>
      <TabsContent value="narratives" className="mt-6">
        <Card>
          <CardHeader><CardTitle>Narrativas extraídas</CardTitle><CardDescription>Esta área organiza fielmente os dados cadastrados nos lançamentos — período, atividade, resultados, competências, critério e evidências. Nenhuma informação nova é criada.</CardDescription></CardHeader>
          <CardContent className="space-y-3">{occurrences.length ? occurrences.map((occurrence) => <div key={occurrence.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{occurrence.description}</p><Badge variant="outline">Baseada no lançamento</Badge>{occurrence.isGeneratedTextOutdated && <Badge variant="outline">Texto desatualizado</Badge>}{occurrence.isManuallyEdited && <Badge variant="secondary">Editado manualmente</Badge>}</div><p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{getOccurrenceText(occurrence, catalog)}</p></div><Button size="sm" variant="outline" className="shrink-0" onClick={() => setEditingNarrativeId(occurrence.id)}><Pencil /> Ajustar narrativa</Button></div>) : <p className="text-sm text-muted-foreground">Cadastre lançamentos para visualizar a extração estruturada dos dados do processo.</p>}</CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>Pré-visualização do memorial</DialogTitle><DialogDescription>Esta visualização reúne o conteúdo já redigido nas seções.</DialogDescription></DialogHeader>
        <article className="space-y-6 rounded-lg border bg-background p-6 text-sm leading-relaxed">
          {memorialSteps.filter((step) => sections.some((item) => item.id === step.id && item.content.trim())).map((step) => <section key={step.id}><h3 className="font-semibold">{step.label}</h3><p className="mt-2 whitespace-pre-wrap text-muted-foreground">{sections.find((item) => item.id === step.id)?.content}</p></section>)}
          {completedCount === 0 && <p className="text-muted-foreground">Nenhuma seção foi preenchida ainda.</p>}
        </article>
      </DialogContent>
    </Dialog>

    <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Limpar seção?</DialogTitle><DialogDescription>O texto de “{activeStep.label}” será removido do memorial.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setIsClearDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={() => { updateContent(""); setIsClearDialogOpen(false) }}>Limpar seção</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Limpar todo o memorial?</DialogTitle><DialogDescription>Todo o conteúdo redigido nas {completedCount} seções preenchidas será removido permanentemente.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setIsClearAllDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={() => { onChange([]); setIsClearAllDialogOpen(false) }}>Limpar tudo</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={isTextBaseDialogOpen} onOpenChange={setIsTextBaseDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Aplicar narrativas ao Memorial?</DialogTitle><DialogDescription>Será criado um texto-base editável nas seções do Memorial com os dados já cadastrados no processo. O conteúdo atual será substituído; depois, você poderá reescrever, complementar ou remover qualquer trecho.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setIsTextBaseDialogOpen(false)}>Cancelar</Button><Button onClick={() => { onChange(buildMemorialTextBase(project, catalog)); setActiveId("cover"); setIsTextBaseDialogOpen(false) }}>Aplicar texto-base</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={Boolean(editingNarrative)} onOpenChange={(open) => { if (!open) setEditingNarrativeId(null) }}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Ajustar narrativa extraída</DialogTitle><DialogDescription>Esta narrativa parte dos dados cadastrados no lançamento. Ao ajustá-la, sua versão autoral será preservada para comparação com futuras extrações.</DialogDescription></DialogHeader>
        {editingNarrative && <Textarea defaultValue={getOccurrenceText(editingNarrative, catalog)} className="min-h-72 resize-y" aria-label="Narrativa do lançamento" onChange={(event) => { const text = event.target.value; onOccurrencesChange(occurrences.map((occurrence) => occurrence.id === editingNarrative.id ? { ...occurrence, editedText: text, isManuallyEdited: text !== (occurrence.generatedText || buildOccurrenceNarrative(occurrence, getCriterionDescription(catalog, occurrence))), isGeneratedTextOutdated: occurrence.isGeneratedTextOutdated && text !== occurrence.generatedText } : occurrence)) }} />}
        <DialogFooter>{editingNarrative?.isGeneratedTextOutdated && <Button variant="outline" onClick={() => { onOccurrencesChange(occurrences.map((occurrence) => occurrence.id === editingNarrative.id ? { ...occurrence, editedText: occurrence.generatedText, isManuallyEdited: false, isGeneratedTextOutdated: false } : occurrence)); setEditingNarrativeId(null) }}>Usar versão regenerada</Button>}<Button onClick={() => setEditingNarrativeId(null)}>Concluir edição</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
}
