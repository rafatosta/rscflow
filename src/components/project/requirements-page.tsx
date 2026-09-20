const requirementLevels = [
  { id: "rsc-i", label: "RSC I" },
  { id: "rsc-ii", label: "RSC II" },
  { id: "rsc-iii", label: "RSC III" },
] as const;

const occurrenceSchema = z.object({
  period: z.string(),
  quantity: z.coerce
    .number()
    .positive("Informe uma quantidade maior que zero."),
  description: z.string().trim().min(1, "Descreva a atividade."),
  results: z.string().trim(),
  competencies: z.string().trim(),
  evidence: z.string().trim(),
});
type OccurrenceValues = z.infer<typeof occurrenceSchema>;
type OccurrenceFormValues = z.input<typeof occurrenceSchema>;
const emptyOccurrence: OccurrenceValues = {
  period: "",
  quantity: 1,
  description: "",
  results: "",
  competencies: "",
  evidence: "",
};

export function RequirementsPage({
  project,
  catalog,
  projections,
  onOccurrencesChange,
}: {
  project: LocalProject;
  catalog: Regulation;
  projections: Record<"rsc-i" | "rsc-ii" | "rsc-iii", LevelProjection>;
  onOccurrencesChange: (occurrences: RequirementOccurrence[]) => void;
}) {
  const [levelId, setLevelId] = React.useState<"rsc-i" | "rsc-ii" | "rsc-iii">(
    "rsc-i",
  );
  const [query, setQuery] = React.useState("");
  const [criterionId, setCriterionId] = React.useState<string | null>(null);
  const [editingOccurrenceId, setEditingOccurrenceId] = React.useState<
    string | null
  >(null);
  const [returnToReviewAfterEdit, setReturnToReviewAfterEdit] =
    React.useState(false);
  const [highlightAttachments, setHighlightAttachments] = React.useState(false);
  const [attachments, setAttachments] = React.useState<string[]>([]);
  const [attachmentFiles, setAttachmentFiles] = React.useState<File[]>([]);
  const [collapsedDirectiveIds, setCollapsedDirectiveIds] = React.useState<
    Set<string>
  >(() => new Set());
  const form = useForm<OccurrenceFormValues, unknown, OccurrenceValues>({
    resolver: zodResolver(occurrenceSchema),
    defaultValues: emptyOccurrence,
  });
  const level = catalog.levels.find((item) => item.section === levelId)!;
  const projection = projections[levelId];
  const selectedCriterion =
    level.criteria.find((item) => item.id === criterionId) ?? null;
  useUnsavedFormProtection(
    Boolean(selectedCriterion) && form.formState.isDirty,
  );
  const unassignedOccurrences = (project.requirementOccurrences ?? []).filter(
    (item) => !item.criterionId || !item.selectedLevel,
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const matches = (description: string) =>
    !normalizedQuery ||
    description.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
  const openDialog = (id: string) => {
    form.reset(emptyOccurrence);
    setAttachments([]);
    setAttachmentFiles([]);
    setEditingOccurrenceId(null);
    setReturnToReviewAfterEdit(false);
    setHighlightAttachments(false);
    setCriterionId(id);
  };
  const openEditDialog = (occurrence: RequirementOccurrence) => {
    if (!occurrence.criterionId || !occurrence.selectedLevel) return;
    setLevelId(occurrence.selectedLevel);
    setCriterionId(occurrence.criterionId);
    setEditingOccurrenceId(occurrence.id);
    setReturnToReviewAfterEdit(false);
    setAttachments(occurrence.attachmentNames);
    setAttachmentFiles([]);
    setHighlightAttachments(false);
    form.reset({
      period: occurrence.period,
      quantity: occurrence.quantity,
      description: occurrence.description,
      results: occurrence.results,
      competencies: occurrence.competencies,
      evidence: occurrence.evidence,
    });
  };
  const closeDialog = () => {
    setCriterionId(null);
    setEditingOccurrenceId(null);
    setReturnToReviewAfterEdit(false);
    setHighlightAttachments(false);
  };
  const deleteOccurrence = async (occurrence: RequirementOccurrence) => {
    if (
      !window.confirm(
        `Excluir o lançamento “${occurrence.description || "Sem descrição"}”?`,
      )
    )
      return;
    await deleteOccurrenceAttachments(project.localId, occurrence.id);
    onOccurrencesChange(
      (project.requirementOccurrences ?? []).filter(
        (item) => item.id !== occurrence.id,
      ),
    );
  };

  React.useEffect(() => {
    const occurrenceId = new URLSearchParams(window.location.search).get(
      "occurrence",
    );
    if (!occurrenceId || occurrenceId === editingOccurrenceId) return;
    const occurrence = project.requirementOccurrences?.find(
      (item) => item.id === occurrenceId,
    );
    if (!occurrence?.criterionId || !occurrence.selectedLevel) return;

    setLevelId(occurrence.selectedLevel);
    setCriterionId(occurrence.criterionId);
    setEditingOccurrenceId(occurrence.id);
    setReturnToReviewAfterEdit(true);
    setAttachments(occurrence.attachmentNames);
    setAttachmentFiles([]);
    form.reset({
      period: occurrence.period,
      quantity: occurrence.quantity,
      description: occurrence.description,
      results: occurrence.results,
      competencies: occurrence.competencies,
      evidence: occurrence.evidence,
    });
    window.history.replaceState({}, "", window.location.pathname);
  }, [editingOccurrenceId, form, project.requirementOccurrences]);

  React.useEffect(() => {
    if (!editingOccurrenceId) return;
    setHighlightAttachments(true);
    const timeout = window.setTimeout(
      () => document.getElementById("occurrence-attachments")?.focus(),
      100,
    );
    return () => window.clearTimeout(timeout);
  }, [editingOccurrenceId]);

  const saveOccurrence = async (values: OccurrenceValues) => {
    if (!selectedCriterion) return;
    const now = new Date().toISOString();
    const currentOccurrences = project.requirementOccurrences ?? [];
    const occurrenceId = editingOccurrenceId ?? crypto.randomUUID();
    const nextOccurrences = editingOccurrenceId
      ? currentOccurrences.map((item) => {
          if (item.id !== occurrenceId) return item;
          const next = {
            ...item,
            criterionId: selectedCriterion.id,
            selectedLevel: levelId,
            ...values,
            attachmentNames: attachments,
            updatedAt: now,
          };
          const generatedText = buildOccurrenceNarrative(
            next,
            selectedCriterion.description,
          );
          const isGeneratedTextOutdated = Boolean(
            item.isManuallyEdited &&
            item.generatedText &&
            generatedText !== item.generatedText,
          );
          return {
            ...next,
            generatedText,
            editedText: item.isManuallyEdited ? item.editedText : generatedText,
            isManuallyEdited: item.isManuallyEdited ?? false,
            isGeneratedTextOutdated,
          };
        })
      : (() => {
          const next = {
            id: occurrenceId,
            criterionId: selectedCriterion.id,
            selectedLevel: levelId,
            ...values,
            attachmentNames: attachments,
            createdAt: now,
            updatedAt: now,
          };
          const generatedText = buildOccurrenceNarrative(
            next,
            selectedCriterion.description,
          );
          return [
            ...currentOccurrences,
            {
              ...next,
              generatedText,
              editedText: generatedText,
              isManuallyEdited: false,
              isGeneratedTextOutdated: false,
            },
          ];
        })();
    if (attachmentFiles.length)
      await replaceOccurrenceAttachments(
        project.localId,
        occurrenceId,
        attachmentFiles,
      );
    onOccurrencesChange(nextOccurrences);
    const returnToReview = returnToReviewAfterEdit;
    closeDialog();
    if (returnToReview) {
      window.history.pushState(
        {},
        "",
        window.location.pathname.replace(/\/requirements$/, "/review"),
      );
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  return (
    <section className="mt-6">
      <Tabs
        value={levelId}
        onValueChange={(value) => {
          setLevelId(value as typeof levelId);
          setQuery("");
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Catálogo de requisitos</CardTitle>
            <CardDescription>
              Escolha um nível, pesquise as descrições e vincule suas
              experiências a um critério normativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TabsList
              aria-label="Nível de RSC"
              className="grid w-full max-w-md grid-cols-3"
            >
              {requirementLevels.map((item) => (
                <TabsTrigger key={item.id} value={item.id}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar nas descrições dos requisitos"
              aria-label="Pesquisar requisitos"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-3 text-sm">
              <span>
                {catalog.metadata.regulation.authority} nº{" "}
                {catalog.metadata.regulation.number}/
                {catalog.metadata.regulation.year} · {level.directives.length}{" "}
                diretrizes
              </span>
              <Badge variant="secondary">
                Estimativa:{" "}
                {projection.total.toLocaleString("pt-BR", {
                  maximumFractionDigits: 2,
                })}{" "}
                pts
              </Badge>
            </div>
          </CardContent>
        </Card>

        {requirementLevels.map((item) => (
          <TabsContent key={item.id} value={item.id} className="mt-4 space-y-4">
            {projection.provisional && (
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Este catálogo está pendente de validação humana final. As
                  pontuações exibidas são estimativas provisórias e não
                  representam pontuação oficial.
                </CardContent>
              </Card>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Diretrizes deste nível
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCollapsedDirectiveIds((current) => {
                      const next = new Set(current);
                      level.directives.forEach((directive) =>
                        next.delete(directive.id),
                      );
                      return next;
                    })
                  }
                >
                  Expandir todas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCollapsedDirectiveIds((current) => {
                      const next = new Set(current);
                      level.directives.forEach((directive) =>
                        next.add(directive.id),
                      );
                      return next;
                    })
                  }
                >
                  Recolher todas
                </Button>
              </div>
            </div>
            {level.directives.map((directive) => {
              const criteria = level.criteria.filter(
                (criterion) =>
                  criterion.directiveId === directive.id &&
                  matches(criterion.description),
              );
              if (criteria.length === 0) return null;
              return (
                <DirectiveCard
                  key={directive.id}
                  directive={directive}
                  criteria={criteria}
                  occurrences={project.requirementOccurrences ?? []}
                  projection={projection}
                  open={!collapsedDirectiveIds.has(directive.id)}
                  onOpenChange={(open) =>
                    setCollapsedDirectiveIds((current) => {
                      const next = new Set(current);
                      if (open) next.delete(directive.id);
                      else next.add(directive.id);
                      return next;
                    })
                  }
                  onAdd={openDialog}
                  onEdit={openEditDialog}
                  onDelete={(occurrence) => void deleteOccurrence(occurrence)}
                />
              );
            })}
          </TabsContent>
        ))}
      </Tabs>

      {unassignedOccurrences.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Lançamentos aguardando enquadramento</CardTitle>
            <CardDescription>
              Essas ocorrências ainda não estão vinculadas a um critério e não
              entram na estimativa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {unassignedOccurrences.map((occurrence) => (
              <div
                key={occurrence.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {occurrence.description || "Lançamento sem descrição"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Quantidade: {occurrence.quantity}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Excluir ${occurrence.description || "lançamento"}`}
                  onClick={() => void deleteOccurrence(occurrence)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog
        open={Boolean(selectedCriterion)}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingOccurrenceId
                ? "Corrigir lançamento"
                : "Adicionar lançamento"}
            </DialogTitle>
            <DialogDescription>
              {selectedCriterion
                ? `${selectedCriterion.code} · ${selectedCriterion.description}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            noValidate
            onSubmit={form.handleSubmit(saveOccurrence)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Período (opcional)"
                error={form.formState.errors.period}
              >
                <Input
                  placeholder="Ex.: 2024.1 a 2024.2"
                  {...form.register("period")}
                />
              </FormField>
              <FormField
                label={`Quantidade (${selectedCriterion?.unit ?? ""})`}
                required
                error={form.formState.errors.quantity as FieldError | undefined}
              >
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  {...form.register("quantity")}
                />
              </FormField>
            </div>
            <FormField
              label="Descrição da atividade"
              required
              error={form.formState.errors.description}
            >
              <Textarea rows={3} {...form.register("description")} />
            </FormField>
            <FormField
              label="Resultados alcançados"
              error={form.formState.errors.results}
            >
              <Textarea rows={3} {...form.register("results")} />
            </FormField>
            <FormField
              label="Competências relacionadas"
              error={form.formState.errors.competencies}
            >
              <Textarea rows={3} {...form.register("competencies")} />
            </FormField>
            <FormField
              label="Evidências e anexos comprobatórios"
              error={form.formState.errors.evidence}
            >
              <Textarea
                rows={3}
                placeholder="Informe links, referências ou identificação dos comprovantes."
                {...form.register("evidence")}
              />
            </FormField>
            <div
              className={`grid gap-3 rounded-lg border p-4 ${highlightAttachments ? "ring-2 ring-primary ring-offset-2" : ""}`}
            >
              <div>
                <p className="text-sm font-medium">Comprovantes</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Anexe um ou mais arquivos que comprovem este lançamento.
                </p>
              </div>
              <Input
                id="occurrence-attachments"
                className="sr-only"
                type="file"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (!files.length) return;
                  setAttachmentFiles(files);
                  setAttachments(files.map((file) => file.name));
                  setHighlightAttachments(false);
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById("occurrence-attachments")?.click()
                  }
                >
                  <Upload />
                  {attachments.length
                    ? "Substituir arquivos"
                    : "Selecionar arquivos"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {attachments.length
                    ? `${attachments.length} ${attachments.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}`
                    : "Nenhum arquivo selecionado"}
                </span>
              </div>
              {attachments.length > 0 && (
                <ul className="grid gap-1.5" aria-label="Arquivos selecionados">
                  {attachments.map((attachment, index) => (
                    <li
                      key={`${attachment}-${index}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 truncate">{attachment}</span>
                    </li>
                  ))}
                </ul>
              )}
              {editingOccurrenceId &&
                attachments.length > 0 &&
                attachmentFiles.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Estes arquivos já estão vinculados. Uma nova seleção
                    substituirá todos eles.
                  </p>
                )}
            </div>
            <p className="text-sm text-muted-foreground">
              A pontuação é calculada automaticamente a partir das quantidades
              lançadas e dos limites do catálogo.
            </p>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button type="submit">Salvar lançamento</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DirectiveCard({
  directive,
  criteria,
  occurrences,
  projection,
  open,
  onOpenChange,
  onAdd,
  onEdit,
  onDelete,
}: {
  directive: Regulation["levels"][number]["directives"][number];
  criteria: Regulation["levels"][number]["criteria"];
  occurrences: RequirementOccurrence[];
  projection: LevelProjection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (criterionId: string) => void;
  onEdit: (occurrence: RequirementOccurrence) => void;
  onDelete: (occurrence: RequirementOccurrence) => void;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardDescription>Diretriz {directive.code}</CardDescription>
              <CardTitle className="mt-1 text-base">
                {directive.title}
              </CardTitle>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline">
                {projection.directiveScores[directive.id].toLocaleString(
                  "pt-BR",
                  { maximumFractionDigits: 2 },
                )}{" "}
                / {directive.maxScore} pts
              </Badge>
              <CollapsibleTrigger
                render={<Button type="button" variant="ghost" size="sm" />}
                aria-label={`${open ? "Recolher" : "Expandir"} diretriz ${directive.code}`}
              >
                <ChevronDown
                  className={`transition-transform ${open ? "rotate-180" : ""}`}
                />
                <span className="hidden sm:inline">
                  {open ? "Recolher" : "Expandir"}
                </span>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="grid gap-3">
            {criteria.map((criterion) => {
              const score = projection.criterionScores[criterion.id];
              const criterionOccurrences = occurrences.filter(
                (occurrence) =>
                  occurrence.selectedLevel === projection.levelId &&
                  occurrence.criterionId === criterion.id,
              );
              return (
                <div key={criterion.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">
                        <span className="mr-2 text-muted-foreground">
                          {criterion.code}
                        </span>
                        {criterion.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Unidade: {criterion.unit}</span>
                        <span>Máximo: {criterion.maxQuantity}</span>
                        <span>Fator: {criterion.factor}</span>
                        <span>Peso: {criterion.weight}</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => onAdd(criterion.id)}>
                      Adicionar lançamento
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">
                      Quantidade: {score.quantity} de {criterion.maxQuantity}
                    </Badge>
                    {score.blocked ? (
                      <Badge variant="destructive">
                        Cálculo bloqueado por conflito normativo
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        Estimativa do critério:{" "}
                        {score.score.toLocaleString("pt-BR", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        pts
                      </span>
                    )}
                  </div>
                  {criterionOccurrences.length > 0 && (
                    <div className="mt-4 grid gap-2 border-t pt-3">
                      {criterionOccurrences.map((occurrence) => (
                        <div
                          key={occurrence.id}
                          className="flex flex-col gap-3 rounded-lg bg-muted p-3 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {occurrence.description}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {occurrence.period
                                ? `${occurrence.period} · `
                                : ""}
                              Quantidade: {occurrence.quantity}
                              {occurrence.attachmentNames.length
                                ? ` · ${occurrence.attachmentNames.length} comprovante(s)`
                                : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(occurrence)}
                            >
                              <Pencil /> Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Excluir ${occurrence.description}`}
                              onClick={() => onDelete(occurrence)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Paperclip, Pencil, Trash2, Upload } from "lucide-react";
import { useForm, type FieldError } from "react-hook-form";
import { z } from "zod";

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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { LevelProjection } from "@/domain/scoring";
import type { Regulation } from "@/domain/regulation";
import {
  deleteOccurrenceAttachments,
  replaceOccurrenceAttachments,
  type LocalProject,
  type RequirementOccurrence,
} from "@/lib/projects";
import { FormField } from "@/components/project/form-field";
import { buildOccurrenceNarrative } from "@/components/project/memorial-content";
import { useUnsavedFormProtection } from "@/components/project/use-unsaved-form-protection";
