import { useEffect, useState } from 'react';
import type { OccurrenceProjectExport } from '@/domain/criterion-entry';
import type { FileResolver } from '@/domain/local-files';
import { Button } from './ui/button';

export function ProjectDocuments({
  project,
  resolver,
  compact = false,
}: {
  project: OccurrenceProjectExport;
  resolver?: FileResolver;
  compact?: boolean;
}) {
  const [checks, setChecks] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const files = project.userData.storedFiles;
  useEffect(() => {
    let active = true;
    setChecks({});
    void Promise.all(
      files.map(async (file) => {
        try {
          if (!resolver) throw new Error('Leitura de arquivos indisponível.');
          await resolver.getFile(file.id);
          return [file.id, 'Disponível'] as const;
        } catch (cause) {
          return [
            file.id,
            cause instanceof Error ? cause.message : 'Arquivo indisponível',
          ] as const;
        }
      }),
    ).then((entries) => {
      if (active) setChecks(Object.fromEntries(entries));
    });
    return () => {
      active = false;
    };
  }, [files, resolver, revision]);
  return (
    <section className="panel space-y-3">
      <h2 className="text-xl font-semibold">Documentos comprobatórios</h2>
      <p role="status">
        {Object.values(checks).filter((value) => value === 'Disponível').length} de {files.length}{' '}
        arquivos disponíveis{Object.keys(checks).length < files.length ? ' · Verificando…' : ''}
      </p>
      {!files.length && (
        <p>Nenhum arquivo anexado. Adicione documentos ao preencher os requisitos.</p>
      )}
      {!compact && (
        <>
          <Button variant="outline" onClick={() => setRevision((value) => value + 1)}>
            Verificar documentos
          </Button>
          <ul className="space-y-3">
            {files.map((file) => (
              <li key={file.id} className="rounded border border-slate-600 p-3 break-words">
                <p>
                  {file.name} · {file.size} bytes
                </p>
                <p>{checks[file.id] ?? 'Verificando…'}</p>
                <Button
                  variant="outline"
                  disabled={checks[file.id] !== 'Disponível'}
                  onClick={() => {
                    void (async () => {
                      try {
                        setError('');
                        const value = await resolver!.getFile(file.id);
                        const url = URL.createObjectURL(value);
                        const anchor = document.createElement('a');
                        anchor.href = url;
                        anchor.download = file.name;
                        anchor.click();
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                      } catch (cause) {
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : 'Não foi possível ler o arquivo.',
                        );
                      }
                    })();
                  }}
                >
                  Baixar {file.name}
                </Button>
              </li>
            ))}
          </ul>
          <p>
            Para resolver um arquivo ausente, edite o lançamento em Requisitos e anexe o documento
            novamente.
          </p>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
