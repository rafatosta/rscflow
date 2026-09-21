import { ExternalLink, FileText, ShieldCheck, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const capabilities = [
  "Criar e manter mais de um projeto de RSC",
  "Preencher dados docentes, formação e atividades de RSC I, II e III",
  "Anexar comprovantes aos lançamentos",
  "Preparar e editar o memorial descritivo",
  "Revisar pendências antes de gerar os documentos",
  "Gerar o memorial, os formulários e os comprovantes em PDF",
  "Baixar um pacote com os documentos finais",
  "Exportar e restaurar uma cópia completa do projeto",
];

export function AboutPage() {
  return (
    <main className="min-h-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Sobre o RSCFlow
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              O RSCFlow ajuda docentes do IFBA a organizar o Memorial Descritivo
              do Reconhecimento de Saberes e Competências (RSC). A aplicação
              reúne as informações do processo em um fluxo guiado e gera os
              documentos para conferência e entrega.
            </p>
          </div>
          <Badge variant="secondary" className="h-auto gap-2 px-3 py-1.5">
            <FileText /> RSCFlow
          </Badge>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>O que é possível fazer</CardTitle>
              <CardDescription>
                Um fluxo para preparar e revisar sua solicitação de RSC.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                {capabilities.map((capability) => (
                  <li key={capability} className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacidade e conservação dos dados</CardTitle>
              <CardDescription>
                Seus projetos e comprovantes ficam neste navegador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
              <p>
                O sistema não exige conta e não envia dados pessoais ou
                documentos para serviços externos.
              </p>
              <p>
                Limpar os dados do site, usar uma janela privativa ou trocar de
                navegador ou dispositivo pode impedir o acesso aos projetos
                salvos. Baixe regularmente uma cópia completa no formato
                <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs">.rscflow</code>.
              </p>
              <div className="flex gap-3 rounded-lg border p-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                <p>Confira os documentos gerados antes de utilizá-los em um processo oficial.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Importante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <div className="flex gap-3 rounded-lg border border-destructive/30 p-3">
              <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
              <p>
                O RSCFlow não é uma ferramenta oficial. É uma iniciativa para
                ajudar e auxiliar os professores na construção da sua solicitação
                de RSC. Em caso de divergência, prevalece a regulamentação
                oficial do IFBA.
              </p>
            </div>
            <p>
              O catálogo de critérios ainda aguarda validação humana final. As
              pontuações podem ser provisórias e um critério do RSC II possui
              conflito no texto oficial, por isso não é calculado.
            </p>
          </CardContent>
        </Card>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Iniciativa e desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>Iniciativa da SCPPD do IFBA - Campus Euclides da Cunha.</p>
              <p>
                Desenvolvedor:{" "}
                <a className="font-medium text-foreground underline underline-offset-4" href="mailto:rafael.tosta@ifba.edu.br">
                  Rafael Tosta
                </a>{" "}
                (rafael.tosta@ifba.edu.br)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Encontrou um problema?</CardTitle>
              <CardDescription>Ajude a melhorar o RSCFlow com um relato reproduzível.</CardDescription>
            </CardHeader>
            <CardContent>
              <a
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground underline underline-offset-4"
                href="https://github.com/rafatosta/rscflow/issues/new"
                target="_blank"
                rel="noreferrer"
              >
                Abrir uma nova issue <ExternalLink className="size-4" />
              </a>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
