const requirementLevels = [
  { id: "rsc-i", label: "RSC I" },
  { id: "rsc-ii", label: "RSC II" },
  { id: "rsc-iii", label: "RSC III" },
] as const;

export function RequirementsPage({
  project,
  catalog,
  projections,
  onOccurrencesChange,
  onNavigate,
}: {
  project: LocalProject;
  catalog: Regulation;
  projections: Record<"rsc-i" | "rsc-ii" | "rsc-iii", LevelProjection>;
  onOccurrencesChange: (occurrences: RequirementOccurrence[]) => void;
  onNavigate: (path: string) => void;
}) {
  const [levelId, setLevelId] = React.useState<"rsc-i" | "rsc-ii" | "rsc-iii">(
    "rsc-i",
  );
  const [query, setQuery] = React.useState("");
  const [occurrencesWithStoredAttachments, setOccurrencesWithStoredAttachments] =
    React.useState<Set<string> | null>(null);
  const [occurrenceToDelete, setOccurrenceToDelete] =
    React.useState<RequirementOccurrence | null>(null);
  const [collapsedDirectiveIds, setCollapsedDirectiveIds] = React.useState<
    Set<string>
  >(() => new Set());
  const level = catalog.levels.find((item) => item.section === levelId)!;
  const projection = projections[levelId];
  const unassignedOccurrences = (project.requirementOccurrences ?? []).filter(
    (item) => !item.criterionId || !item.selectedLevel,
  );
  const occurrenceIds = React.useMemo(
    () =>
      (project.requirementOccurrences ?? []).map((occurrence) => occurrence.id),
    [project.requirementOccurrences],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const matches = (description: string) =>
    !normalizedQuery ||
    description.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
  const openOccurrencePage = (criterionId: string) => {
    onNavigate(`/project/${project.localId}/requirements/new?criterion=${encodeURIComponent(criterionId)}&level=${levelId}`);
  };
  const openEditPage = (occurrence: RequirementOccurrence) => {
    if (!occurrence.criterionId || !occurrence.selectedLevel) return;
    onNavigate(`/project/${project.localId}/requirements/edit/${encodeURIComponent(occurrence.id)}`);
  };
  const deleteOccurrence = async (occurrence: RequirementOccurrence) => {
    await deleteOccurrenceAttachments(project.localId, occurrence.id);
    onOccurrencesChange(
      (project.requirementOccurrences ?? []).filter(
        (item) => item.id !== occurrence.id,
      ),
    );
    setOccurrenceToDelete(null);
  };

  React.useEffect(() => {
    let ignore = false;

    void getOccurrencesWithStoredAttachments(
      project.localId,
      occurrenceIds,
    ).then((storedOccurrenceIds) => {
      if (!ignore) setOccurrencesWithStoredAttachments(storedOccurrenceIds);
    });

    return () => {
      ignore = true;
    };
  }, [occurrenceIds, project.localId]);

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
                  occurrencesWithStoredAttachments={
                    occurrencesWithStoredAttachments
                  }
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
                  onAdd={openOccurrencePage}
                  onEdit={openEditPage}
                  onDelete={setOccurrenceToDelete}
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
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {occurrence.description || "Lançamento sem descrição"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Quantidade: {occurrence.quantity}
                  </p>
                  <MissingAttachmentAlert
                    occurrence={occurrence}
                    occurrencesWithStoredAttachments={
                      occurrencesWithStoredAttachments
                    }
                    className="mt-3"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Excluir ${occurrence.description || "lançamento"}`}
                  onClick={() => setOccurrenceToDelete(occurrence)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={Boolean(occurrenceToDelete)} onOpenChange={(open) => { if (!open) setOccurrenceToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir lançamento?</AlertDialogTitle><AlertDialogDescription>O lançamento “{occurrenceToDelete?.description || "Sem descrição"}” e seus comprovantes armazenados serão removidos permanentemente. Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (occurrenceToDelete) void deleteOccurrence(occurrenceToDelete) }}>Excluir lançamento</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function DirectiveCard({
  directive,
  criteria,
  occurrences,
  occurrencesWithStoredAttachments,
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
  occurrencesWithStoredAttachments: Set<string> | null;
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
                          className="grid gap-3 rounded-lg bg-muted p-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                          <MissingAttachmentAlert
                            occurrence={occurrence}
                            occurrencesWithStoredAttachments={
                              occurrencesWithStoredAttachments
                            }
                          />
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

function MissingAttachmentAlert({
  occurrence,
  occurrencesWithStoredAttachments,
  className,
}: {
  occurrence: RequirementOccurrence;
  occurrencesWithStoredAttachments: Set<string> | null;
  className?: string;
}) {
  if (
    occurrencesWithStoredAttachments === null ||
    occurrence.attachmentNames.length === 0 ||
    occurrencesWithStoredAttachments.has(occurrence.id)
  )
    return null;

  return (
    <Alert className={className}>
      <CircleAlert />
      <AlertTitle>Arquivo precisa ser selecionado novamente</AlertTitle>
      <AlertDescription>
        Referência cadastrada: {occurrence.attachmentNames.join(", ")}. O arquivo
        não foi armazenado no navegador.
      </AlertDescription>
    </Alert>
  );
}
import * as React from "react";
import {
  ChevronDown,
  CircleAlert,
  Pencil,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LevelProjection } from "@/domain/scoring";
import type { Regulation } from "@/domain/regulation";
import {
  deleteOccurrenceAttachments,
  getOccurrencesWithStoredAttachments,
  type LocalProject,
  type RequirementOccurrence,
} from "@/lib/projects";
