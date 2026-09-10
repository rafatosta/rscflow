import { Database, FileCheck2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function App() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
      <section className="mx-auto max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
        <p className="text-sm font-medium tracking-wide text-cyan-300">RSCFLOW · BASE INICIAL</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Ambiente pronto para desenvolvimento.
        </h1>
        <p className="mt-4 max-w-xl leading-7 text-slate-300">
          Esta tela comprova a integração de React, Tailwind CSS, shadcn/ui e Lucide. As regras e
          funcionalidades do RSC serão implementadas somente a partir de fontes normativas
          validadas.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Status icon={<ShieldCheck aria-hidden="true" />} label="Contratos" />
          <Status icon={<Database aria-hidden="true" />} label="Dados versionados" />
          <Status icon={<FileCheck2 aria-hidden="true" />} label="Qualidade automatizada" />
        </div>
        <Button className="mt-8" type="button">
          Scaffold verificado
        </Button>
      </section>
    </main>
  );
}

function Status({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-slate-800 px-3 py-3 text-sm text-slate-200">
      {icon}
      <span>{label}</span>
    </div>
  );
}
