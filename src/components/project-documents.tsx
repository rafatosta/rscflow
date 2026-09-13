import { useEffect, useState } from 'react';
import type { OccurrenceProjectExport } from '@/domain/criterion-entry';
import type { FileResolver, SaveProjectChange } from '@/domain/local-files';
import { replaceOccurrenceEvidenceFile } from '@/features/requirements/requirements';
import { Button } from './ui/button';

export function ProjectDocuments({
  project,
  resolver,
  save,
  compact = false,
}: {
  project: OccurrenceProjectExport;
  resolver?: FileResolver;
  save?: SaveProjectChange;
  compact?: boolean;
}) {
  const [checks, setChecks] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const files = project.userData.storedFiles;
  const editTargets = (fileId: string) => {
    const evidenceIds = new Set(
      project.userData.evidence
        .filter((evidence) => evidence.fileIds.includes(fileId))
        .map((evidence) => evidence.id),
    );
    return project.userData.criterionEntries.flatMap((entry) =>
      entry.occurrences.filter((occurrence) =>
        occurrence.evidenceIds.some((evidenceId) => evidenceIds.has(evidenceId)),
      ),
    );
  };
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
      <h2 className="section-title">Documentos comprobatórios</h2>
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
            {files.map((file) => {
              const available = checks[file.id] === 'Disponível';
              const checked = checks[file.id] !== undefined;
              const targets = editTargets(file.id);
              return (
                <li key={file.id} className="subpanel p-3 break-words">
                  <p>
                    {file.name} · {file.size} bytes
                  </p>
                  <p>
                    {available ? 'Disponível' : checked ? 'Arquivo local ausente.' : 'Verificando…'}
                  </p>
                  {available ? (
                    <Button
                      variant="outline"
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
                  ) : checked ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {targets.map((occurrence) => (
                        <ReplaceFileAction
                          key={occurrence.id}
                          occurrenceId={occurrence.id}
                          occurrenceTitle={occurrence.title}
                          fileId={file.id}
                          disabled={!save}
                          onError={setError}
                          save={save}
                        />
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

function ReplaceFileAction({
  occurrenceId,
  occurrenceTitle,
  fileId,
  disabled,
  save,
  onError,
}: {
  occurrenceId: string;
  occurrenceTitle: string;
  fileId: string;
  disabled: boolean;
  save?: SaveProjectChange;
  onError: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const inputId = `replace-${fileId}-${occurrenceId}`;
  return (
    <>
      <input
        id={inputId}
        className="sr-only"
        type="file"
        disabled={disabled || saving}
        aria-label={`Selecionar arquivo para ${occurrenceTitle}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file || !save) return;
          setSaving(true);
          onError('');
          void save((current) => replaceOccurrenceEvidenceFile(current, occurrenceId, fileId, file))
            .catch((cause) =>
              onError(
                cause instanceof Error ? cause.message : 'Não foi possível salvar o arquivo.',
              ),
            )
            .finally(() => setSaving(false));
        }}
      />
      <Button
        variant="outline"
        disabled={disabled || saving}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        {saving ? 'Salvando arquivo…' : `Editar lançamento ${occurrenceTitle}`}
      </Button>
    </>
  );
}
