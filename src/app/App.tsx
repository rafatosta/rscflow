import { ProjectImport } from '@/components/project-import';

export function App() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-50 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-8">
        <p className="text-sm font-medium tracking-wide text-cyan-300">RSCFLOW</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Verificar arquivo de projeto</h1>
        <p className="mt-4 leading-7 text-slate-300">
          Selecione um arquivo JSON para conferir sua estrutura e consultar os metadados declarados.
        </p>
        <ProjectImport />
      </div>
    </main>
  );
}
