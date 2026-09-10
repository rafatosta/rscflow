import { useRef, useState, type ChangeEvent } from 'react';
import {
  validateProjectFile,
  type ProjectFileResult,
} from '@/features/project-import/validate-project-file';

export function ProjectImport() {
  const [result, setResult] = useState<ProjectFileResult | null>(null);
  const [loading, setLoading] = useState(false);
  const selection = useRef(0);

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    const current = ++selection.current;
    setResult(null);
    setLoading(Boolean(file));
    if (!file) return;
    const next = await validateProjectFile(file);
    // A leitura anterior pode terminar depois que outro arquivo foi selecionado.
    if (current !== selection.current) return;
    setResult(next);
    setLoading(false);
  }

  return (
    <section className="mt-8 space-y-5" aria-label="Validação de arquivo">
      <div>
        <label htmlFor="project-file" className="block font-medium">
          Arquivo de projeto JSON
        </label>
        <p id="file-help" className="mt-2 text-sm leading-6 text-slate-300">
          A leitura acontece neste navegador. O arquivo não é enviado nem salvo pela aplicação.
        </p>
        <input
          id="project-file"
          type="file"
          accept=".json,application/json"
          aria-describedby="file-help"
          onChange={selectFile}
          className="mt-3 block w-full min-w-0 rounded-md border border-slate-500 p-3 text-sm file:mr-3 file:rounded file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:font-medium file:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        />
      </div>
      <p className="text-sm leading-6 text-amber-200">
        Validade estrutural não significa validação normativa. A referência informada no arquivo não
        é certificada por esta verificação.
      </p>
      <div role="status" aria-live="polite" aria-atomic="true">
        {loading && <p>Lendo arquivo…</p>}
        {result?.success && (
          <div className="rounded-lg border border-slate-600 p-5">
            <h2 className="text-lg font-semibold text-cyan-300">Estrutura válida</h2>
            <dl className="mt-4 space-y-3 break-words">
              <div>
                <dt className="text-slate-300">Versão do esquema</dt>
                <dd>{result.project.schemaVersion}</dd>
              </div>
              <div>
                <dt className="text-slate-300">Versão da aplicação</dt>
                <dd>{result.project.applicationVersion}</dd>
              </div>
              <div>
                <dt className="text-slate-300">Referência normativa declarada</dt>
                <dd>{result.project.regulation.id}</dd>
              </div>
              <div>
                <dt className="text-slate-300">Versão normativa declarada</dt>
                <dd>{result.project.regulation.version}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
      {result && !result.success && (
        <div role="alert" className="rounded-lg border border-rose-300 p-5 text-rose-200">
          <h2 className="font-semibold">Não foi possível validar a estrutura</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {result.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
