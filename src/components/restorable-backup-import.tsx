import { useRef, useState, type ChangeEvent } from 'react';
import type { RestorableBackup } from '@/features/local-projects/restorable-backup';
import { restoreRestorableBackup } from '@/features/local-projects/restorable-backup';
import { Button } from './ui/button';

export function RestorableBackupImport({
  disabled,
  onRestore,
}: {
  disabled?: boolean;
  onRestore: (backup: RestorableBackup) => void;
}) {
  const [result, setResult] = useState<{ backup?: RestorableBackup; error?: string }>();
  const [loading, setLoading] = useState(false);
  const selection = useRef(0);
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    const current = ++selection.current;
    setResult(undefined);
    setLoading(Boolean(file));
    if (!file) return;
    try {
      const backup = await restoreRestorableBackup(file);
      if (selection.current === current) setResult({ backup });
    } catch (error) {
      if (selection.current === current)
        setResult({ error: error instanceof Error ? error.message : 'Backup inválido.' });
    } finally {
      if (selection.current === current) setLoading(false);
    }
  }
  return (
    <section className="mt-8 space-y-4" aria-label="Restaurar backup RSCFlow">
      <div>
        <label htmlFor="backup-file" className="block font-medium">
          Backup restaurável .rscflow
        </label>
        <p id="backup-help" className="mt-2 text-sm text-slate-300">
          Restaura os dados e os comprovantes em uma nova cópia local. Não é um JSON portátil nem um
          pacote de documentos.
        </p>
        <input
          id="backup-file"
          type="file"
          accept=".rscflow,application/zip"
          aria-describedby="backup-help"
          onChange={select}
          className="file-field"
        />
      </div>
      <div role="status" aria-live="polite">
        {loading && <p>Validando backup…</p>}
        {result?.backup && (
          <div className="subpanel p-5">
            <p className="font-semibold text-cyan-300">Backup íntegro</p>
            <p className="mt-2 text-sm">
              Schema {result.backup.project.schemaVersion}; {result.backup.files.length} arquivo(s)
              binário(s).
            </p>
            <Button className="mt-4" disabled={disabled} onClick={() => onRestore(result.backup!)}>
              Restaurar como novo projeto
            </Button>
          </div>
        )}
      </div>
      {result?.error && (
        <p role="alert" className="notice border-rose-300 text-rose-200">
          {result.error}
        </p>
      )}
    </section>
  );
}
