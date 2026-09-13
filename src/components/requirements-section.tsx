import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Occurrence, OccurrenceProjectExport } from '@/domain/criterion-entry';
import type { Criterion, Regulation, RscLevel } from '@/domain/regulation';
import type { CalculationResult } from '@/domain/scoring';
import type { SaveProjectChange } from '@/domain/local-files';
import { searchCriteria, criterionProvenanceLabel } from '@/features/criteria/criteria-explorer';
import { levelLabel, levels } from '@/features/project-shell/project-view';
import {
  previewRequirement,
  quantityPresentation,
  requirementFormSchema,
  saveRequirement,
  removeRequirement,
  type RequirementValues,
} from '@/features/requirements/requirements';
import { Button } from './ui/button';
import { ConfirmDialog } from './ui/confirm-dialog';

export function RequirementsSection({
  project,
  dataset,
  scoring,
  save,
  disabled,
  setFormDirty,
}: {
  project: OccurrenceProjectExport;
  dataset?: Regulation;
  scoring: CalculationResult;
  save: SaveProjectChange;
  disabled: boolean;
  setFormDirty: (dirty: boolean) => void;
}) {
  const [level, setLevel] = useState<RscLevel>(project.userData.request?.level ?? 'rsc-i');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ criterion: Criterion; occurrence?: Occurrence }>();
  const [deleting, setDeleting] = useState<Occurrence>();
  const [reframing, setReframing] = useState<Occurrence>();
  const trigger = useRef<HTMLElement | null>(null);
  const close = () => {
    setEditing(undefined);
    setFormDirty(false);
    const id = trigger.current?.id;
    requestAnimationFrame(() => {
      if (id) document.getElementById(id)?.focus();
    });
  };
  const current = dataset?.levels.find((item) => item.section === level);
  const matches = dataset ? searchCriteria(dataset, query, level) : [];
  const pending = [
    ...project.userData.unassignedOccurrences,
    ...project.userData.criterionEntries
      .filter(
        (entry) =>
          !dataset?.levels
            .find((item) => item.section === entry.selectedLevel)
            ?.criteria.some((item) => item.id === entry.criterionId),
      )
      .flatMap((entry) => entry.occurrences),
  ];
  return (
    <div className="space-y-5">
      <p>
        Escolha um requisito e registre o que realizou. Seus lançamentos alimentam a pontuação e o
        memorial.
      </p>
      <div role="tablist" aria-label="Níveis RSC" className="flex flex-wrap gap-2">
        {levels.map((item, index) => (
          <button
            key={item}
            id={`tab-${item}`}
            role="tab"
            aria-selected={level === item}
            aria-controls="requirements-panel"
            tabIndex={level === item ? 0 : -1}
            disabled={!!editing || disabled}
            className={`rounded border px-4 py-3 ${level === item ? 'bg-cyan-400 text-slate-950' : 'border-slate-600'}`}
            onClick={() => setLevel(item)}
            onKeyDown={(event) => {
              const next =
                event.key === 'ArrowRight'
                  ? (index + 1) % levels.length
                  : event.key === 'ArrowLeft'
                    ? (index + levels.length - 1) % levels.length
                    : event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? levels.length - 1
                        : undefined;
              if (next !== undefined) {
                event.preventDefault();
                setLevel(levels[next]);
                document.getElementById(`tab-${levels[next]}`)?.focus();
              }
            }}
          >
            {levelLabel(item)}
          </button>
        ))}
      </div>
      <div
        id="requirements-panel"
        role="tabpanel"
        aria-labelledby={`tab-${level}`}
        className="space-y-5"
      >
        {dataset?.metadata.status !== 'validated' && (
          <p role="status" className="panel text-amber-200">
            Catálogo pendente de validação humana. Você pode registrar informações provisórias; a
            pontuação está indisponível. {dataset?.metadata.notice}
          </p>
        )}
        {!dataset && (
          <p>O regulamento deste projeto não está disponível. Confira a cópia importada.</p>
        )}
        {!editing && (
          <>
            {!!pending.length && (
              <section className="panel space-y-3">
                <h2>Registros a enquadrar</h2>
                <p>Escolha um requisito para completar os registros importados.</p>
                {pending.map((item) => (
                  <div key={item.id}>
                    <p>{item.title}</p>
                    <Button variant="outline" onClick={() => setReframing(item)}>
                      Enquadrar {item.title}
                    </Button>
                    <Button variant="outline" onClick={() => setDeleting(item)}>
                      Excluir {item.title}
                    </Button>
                  </div>
                ))}
              </section>
            )}
            {reframing && (
              <p role="status">
                Selecione abaixo o requisito para “{reframing.title}”.{' '}
                <Button variant="outline" onClick={() => setReframing(undefined)}>
                  Cancelar enquadramento
                </Button>
              </p>
            )}
            <label className="block">
              Buscar requisitos
              <input
                className="field"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {!project.userData.criterionEntries.some(
              (entry) => entry.selectedLevel === level && entry.occurrences.length,
            ) && (
              <p>
                Nenhum lançamento cadastrado neste RSC. Localize abaixo uma atividade que deseja
                registrar.
              </p>
            )}
            {dataset && !matches.length && (
              <p role="status">Nenhum requisito encontrado. Tente outra descrição.</p>
            )}
            {current?.directives.map((directive) => {
              const criteria = matches.filter((item) => item.directive.id === directive.id);
              if (!criteria.length) return null;
              const score =
                scoring.status === 'unavailable'
                  ? undefined
                  : scoring.directives.find((item) => item.directiveId === directive.id);
              return (
                <section key={directive.id} className="panel space-y-4">
                  <h2 className="text-xl font-semibold break-words">{directive.title}</h2>
                  <p>
                    {score?.score.toLocaleString('pt-BR') ?? '—'} / {directive.maxScore} pontos
                  </p>
                  {score && (
                    <progress
                      aria-label={`Pontuação de ${directive.title}`}
                      className="w-full"
                      max={directive.maxScore || 1}
                      value={score.score}
                    />
                  )}
                  {criteria.map(({ criterion }) => {
                    const entries = project.userData.criterionEntries
                      .filter(
                        (entry) =>
                          entry.criterionId === criterion.id && entry.selectedLevel === level,
                      )
                      .flatMap((entry) => entry.occurrences);
                    const points =
                      scoring.status === 'unavailable'
                        ? undefined
                        : scoring.criteria.find((item) => item.criterionId === criterion.id);
                    return (
                      <article
                        key={criterion.id}
                        className="rounded border border-slate-600 p-4 space-y-3 break-words"
                        aria-label={criterion.description}
                      >
                        <h3 className="font-semibold text-lg">{criterion.description}</h3>
                        <p className="text-sm text-slate-300">
                          {levelLabel(level)} · item {criterion.code} · Unidade: {criterion.unit} ·
                          Máximo considerado: {criterion.maxQuantity}
                        </p>
                        <p>
                          Pontuação do requisito: {points?.score.toLocaleString('pt-BR') ?? '—'}
                        </p>
                        {criterion.provenance.status !== 'validated' && (
                          <p className="text-amber-200">
                            {criterionProvenanceLabel(criterion.provenance)}
                          </p>
                        )}
                        {criterion.provenance.issue && (
                          <p className="text-amber-200">{criterion.provenance.issue.description}</p>
                        )}
                        <details>
                          <summary>Referência normativa e valores</summary>
                          <p>
                            Valor por unidade: {criterion.factor} · Peso: {criterion.weight}
                          </p>
                          <p>{criterion.provenance.sourceReference}</p>
                        </details>
                        <ul className="space-y-3">
                          {entries.map((entry) => (
                            <li key={entry.id} className="rounded bg-slate-800 p-3">
                              <p>
                                {entry.period.start ?? 'Sem período'}
                                {entry.period.end && ` até ${entry.period.end}`} ·{' '}
                                {entry.description || entry.title} · {entry.quantity}{' '}
                                {criterion.unit}
                              </p>
                              <p>
                                {scoring.status === 'unavailable'
                                  ? 'Pontuação indisponível'
                                  : `${scoring.activities.find((item) => item.activityId === entry.id)?.score ?? '—'} pontos antes dos tetos`}
                              </p>
                              <p>
                                {entry.evidenceIds.length
                                  ? `Documentos: ${entry.evidenceIds.map((id) => project.userData.evidence.find((item) => item.id === id)?.title).join('; ')}`
                                  : 'Pendente: sem documento comprobatório.'}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                <Button
                                  id={`edit-${entry.id}`}
                                  variant="outline"
                                  disabled={disabled}
                                  onClick={(event) => {
                                    trigger.current = event.currentTarget;
                                    setEditing({ criterion, occurrence: entry });
                                  }}
                                >
                                  Editar lançamento
                                </Button>
                                <Button
                                  variant="outline"
                                  disabled={disabled}
                                  onClick={() => setDeleting(entry)}
                                >
                                  Excluir lançamento
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <Button
                          id={`add-${criterion.id}`}
                          disabled={disabled}
                          onClick={(event) => {
                            trigger.current = event.currentTarget;
                            setEditing({ criterion, occurrence: reframing });
                            setReframing(undefined);
                          }}
                        >
                          {reframing ? 'Usar este requisito' : 'Adicionar lançamento'}
                        </Button>
                      </article>
                    );
                  })}
                </section>
              );
            })}
          </>
        )}
        {editing && dataset && (
          <RequirementEditor
            key={editing.occurrence?.id ?? editing.criterion.id}
            {...editing}
            project={project}
            dataset={dataset}
            level={level}
            disabled={disabled}
            save={save}
            close={close}
            setFormDirty={setFormDirty}
          />
        )}
      </div>
      <ConfirmDialog
        open={!!deleting}
        busy={disabled}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined);
        }}
        title="Excluir lançamento?"
        description="O lançamento será removido. Os documentos compartilhados serão preservados."
        onConfirm={() => {
          if (deleting)
            void save(async (current) => removeRequirement(current, deleting.id)).then((ok) => {
              if (ok) setDeleting(undefined);
            });
        }}
      />
    </div>
  );
}

function RequirementEditor({
  criterion,
  occurrence,
  project,
  dataset,
  level,
  disabled,
  save,
  close,
  setFormDirty,
}: {
  criterion: Criterion;
  occurrence?: Occurrence;
  project: OccurrenceProjectExport;
  dataset: Regulation;
  level: RscLevel;
  disabled: boolean;
  save: SaveProjectChange;
  close: () => void;
  setFormDirty: (dirty: boolean) => void;
}) {
  const [file, setFile] = useState<File>();
  const [evidenceIds, setEvidenceIds] = useState(occurrence?.evidenceIds ?? []);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    setFocus,
    formState: { errors, isDirty },
  } = useForm<RequirementValues>({
    resolver: zodResolver(requirementFormSchema),
    defaultValues: {
      start: occurrence?.period.start ?? '',
      end: occurrence?.period.end ?? '',
      quantity: occurrence?.quantity ?? 0,
      description: occurrence?.description ?? '',
    },
  });
  useEffect(() => {
    setFocus('start');
  }, [setFocus]);
  const evidenceDirty =
    JSON.stringify(evidenceIds) !== JSON.stringify(occurrence?.evidenceIds ?? []);
  useEffect(() => {
    setFormDirty(isDirty || !!file || evidenceDirty);
    return () => setFormDirty(false);
  }, [isDirty, file, evidenceDirty, setFormDirty]);
  const quantity = watch('quantity');
  const presentation = quantityPresentation(criterion);
  return (
    <form
      className="panel space-y-4"
      aria-label="Lançamento"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError('');
        try {
          if (
            await save((current) =>
              saveRequirement(
                current,
                dataset,
                criterion.id,
                level,
                values,
                occurrence?.id,
                file,
                evidenceIds,
              ),
            )
          )
            close();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.');
        }
      })}
    >
      <h2 className="text-xl font-semibold">
        {occurrence ? 'Editar lançamento' : 'Adicionar lançamento'}
      </h2>
      <p className="font-semibold break-words">{criterion.description}</p>
      <p>
        Unidade: {criterion.unit} · Valor por unidade: {criterion.factor} · Peso: {criterion.weight}{' '}
        · Máximo considerado: {criterion.maxQuantity}
      </p>
      <p role="status">Pontuação calculada: {previewRequirement(dataset, criterion, quantity)}</p>
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Dados do lançamento</legend>
        <label>
          De
          <input
            className="field"
            type="date"
            {...register('start')}
            aria-invalid={!!errors.start}
            aria-describedby={errors.start ? 'start-error' : undefined}
          />
          {errors.start && <span id="start-error">{errors.start.message}</span>}
        </label>
        <label>
          Até
          <input
            className="field"
            type="date"
            {...register('end')}
            aria-invalid={!!errors.end}
            aria-describedby={errors.end ? 'end-error' : undefined}
          />
          {errors.end && <span id="end-error">{errors.end.message}</span>}
        </label>
        <label className="sm:col-span-2">
          {presentation.label}
          <input
            className="field"
            aria-label={presentation.label}
            type="number"
            step="any"
            min="0"
            {...register('quantity', { valueAsNumber: true })}
            aria-invalid={!!errors.quantity}
            aria-describedby="quantity-help quantity-error"
          />
          <span id="quantity-help" className="block text-sm text-slate-300">
            {presentation.help}
          </span>
          <span id="quantity-error">{errors.quantity?.message}</span>
        </label>
        <label className="sm:col-span-2">
          Documento comprobatório (opcional)
          <input
            className="field"
            aria-label="Documento comprobatório (opcional)"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0])}
          />
          <span className="block text-sm text-slate-300">
            O arquivo será guardado neste navegador. Você pode anexar depois; o backup JSON não
            inclui arquivos.
          </span>
        </label>
        {!!project.userData.evidence.length && (
          <details className="sm:col-span-2">
            <summary>Usar documentos já cadastrados</summary>
            {project.userData.evidence.map((item) => (
              <label key={item.id} className="block py-2">
                <input
                  type="checkbox"
                  checked={evidenceIds.includes(item.id)}
                  onChange={(event) =>
                    setEvidenceIds(
                      event.target.checked
                        ? [...evidenceIds, item.id]
                        : evidenceIds.filter((id) => id !== item.id),
                    )
                  }
                />{' '}
                {item.title}
              </label>
            ))}
          </details>
        )}
        <label className="sm:col-span-2">
          Descrição (opcional)
          <textarea className="field" {...register('description')} />
        </label>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <Button type="submit">Salvar lançamento</Button>
          <Button type="button" variant="outline" onClick={close}>
            Cancelar
          </Button>
        </div>
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
