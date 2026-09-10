import { LocalProjects } from '@/components/local-projects';

export function App() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-50 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:p-8">
        <p className="text-sm font-medium tracking-wide text-cyan-300">RSCFLOW</p>
        <h1 className="mb-6 mt-3 text-3xl font-semibold tracking-tight">Meus projetos</h1>
        <LocalProjects />
      </div>
    </main>
  );
}
