import { ArrowLeft, FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";

type ProjectPageProps = { localId: string; onBack: () => void };

export function ProjectPage({ localId, onBack }: ProjectPageProps) {
  return (
    <main className="grid min-h-full place-items-center p-6">
      <section className="w-full max-w-lg rounded-xl border bg-card p-8 text-center text-card-foreground shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
          <FolderKanban className="size-6" />
        </span>
        <p className="mt-5 text-sm font-medium text-primary">PROJETO CRIADO</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Seu projeto está pronto
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          O identificador local deste projeto é{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
            {localId}
          </code>
          .
        </p>
        <div className="mt-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft />
            Voltar para projetos
          </Button>
        </div>
      </section>
    </main>
  );
}
