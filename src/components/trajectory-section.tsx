import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldError, type UseFormRegister } from 'react-hook-form';
import type { Activity, Evidence } from '@/domain/models';
import type { Regulation } from '@/domain/regulation';
import {
  activityCategories,
  activityFormSchema,
  activityFormValues,
  activityYear,
  createActivity,
  createEvidence,
  duplicateActivity,
  emptyActivityForm,
  emptyEvidenceForm,
  evidenceFormSchema,
  evidenceFormValues,
  filterActivities,
  removeEvidence,
  sortActivitiesChronologically,
  updateActivity,
  updateEvidence,
  type ActivityFormValues,
  type EvidenceFormValues,
} from '@/features/trajectory/trajectory';
import { Button } from './ui/button';
import { ConfirmDialog } from './ui/confirm-dialog';
import { CriterionCombobox } from './criterion-combobox';

type Props = {
  activities: Activity[];
  evidences: Evidence[];
  dataset?: Regulation;
  criterionRequired: boolean;
  disabled: boolean;
  onSave: (patch: { activities: Activity[]; evidence: Evidence[] }) => void;
};

function ActivityField({
  id,
  label,
  register,
  error,
  required = false,
  type = 'text',
}: {
  id: keyof ActivityFormValues;
  label: string;
  register: UseFormRegister<ActivityFormValues>;
  error?: FieldError;
  required?: boolean;
  type?: 'text' | 'date' | 'number';
}) {
  const errorId = `activity-${id}-error`;
  return (
    <label className="block" htmlFor={`activity-${id}`}>
      {label}{' '}
      {required ? (
        <span className="text-cyan-200">
          <span aria-hidden="true">*</span>
          <span className="sr-only">(obrigatório)</span>
        </span>
      ) : (
        <span className="text-sm text-slate-400">(opcional)</span>
      )}
      <input
        id={`activity-${id}`}
        className="field"
        type={type}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...register(id, type === 'number' ? { valueAsNumber: true } : undefined)}
      />
      {error && (
        <span id={errorId} className="mt-1 block text-sm text-rose-200">
          {error.message}
        </span>
      )}
    </label>
  );
}

function ActivityTextArea({
  id,
  label,
  register,
  error,
  hint,
}: {
  id: 'description' | 'results' | 'competencies';
  label: string;
  register: UseFormRegister<ActivityFormValues>;
  error?: FieldError;
  hint?: string;
}) {
  const hintId = hint ? `activity-${id}-hint` : undefined;
  const errorId = `activity-${id}-error`;
  return (
    <label className="block" htmlFor={`activity-${id}`}>
      {label} <span className="text-sm text-slate-400">(opcional)</span>
      {hint && (
        <span id={hintId} className="mt-1 block text-sm text-slate-400">
          {hint}
        </span>
      )}
      <textarea
        id={`activity-${id}`}
        className="field min-h-28"
        aria-invalid={Boolean(error)}
        aria-describedby={
          [hintId, error ? errorId : undefined].filter(Boolean).join(' ') || undefined
        }
        {...register(id)}
      />
      {error && (
        <span id={errorId} className="mt-1 block text-sm text-rose-200">
          {error.message}
        </span>
      )}
    </label>
  );
}

function EvidenceField({
  id,
  label,
  register,
  error,
  required = false,
  type = 'text',
}: {
  id: keyof EvidenceFormValues;
  label: string;
  register: UseFormRegister<EvidenceFormValues>;
  error?: FieldError;
  required?: boolean;
  type?: 'text' | 'date';
}) {
  const errorId = `evidence-${id}-error`;
  return (
    <label className="block" htmlFor={`evidence-${id}`}>
      {label}{' '}
      {required ? (
        <span className="text-cyan-200">
          <span aria-hidden="true">*</span>
          <span className="sr-only">(obrigatório)</span>
        </span>
      ) : (
        <span className="text-sm text-slate-400">(opcional)</span>
      )}
      <input
        id={`evidence-${id}`}
        className="field"
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...register(id)}
      />
      {error && (
        <span id={errorId} className="mt-1 block text-sm text-rose-200">
          {error.message}
        </span>
      )}
    </label>
  );
}

function dateLabel(value?: string): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

export function TrajectorySection({
  activities,
  evidences,
  dataset,
  criterionRequired,
  disabled,
  onSave,
}: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'' | (typeof activityCategories)[number]>('');
  const [activityOpen, setActivityOpen] = useState(activities.length === 0);
  const [editingActivity, setEditingActivity] = useState<Activity>();
  const [deletingActivity, setDeletingActivity] = useState<Activity>();
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState<Evidence>();
  const [deletingEvidence, setDeletingEvidence] = useState<Evidence>();
  const schema = useMemo(() => activityFormSchema(criterionRequired), [criterionRequired]);
  const filtered = filterActivities(activities, search, category);
  const activityForm = useForm<ActivityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyActivityForm,
    mode: 'onTouched',
  });
  const evidenceForm = useForm<EvidenceFormValues>({
    resolver: zodResolver(evidenceFormSchema),
    defaultValues: emptyEvidenceForm,
    mode: 'onTouched',
  });
  const selectedCriterionId = activityForm.watch('criterionId');

  useEffect(() => {
    activityForm.reset(activityFormValues(editingActivity));
  }, [activityForm, editingActivity]);
  useEffect(() => {
    evidenceForm.reset(evidenceFormValues(editingEvidence));
  }, [editingEvidence, evidenceForm]);

  const closeActivity = () => {
    setEditingActivity(undefined);
    setActivityOpen(false);
    activityForm.reset(emptyActivityForm);
  };
  const closeEvidence = () => {
    setEditingEvidence(undefined);
    setEvidenceOpen(false);
    evidenceForm.reset(emptyEvidenceForm);
  };
  const saveActivity = (values: ActivityFormValues) => {
    const next = editingActivity
      ? activities.map((activity) =>
          activity.id === editingActivity.id
            ? updateActivity(activity, values, criterionRequired)
            : activity,
        )
      : [...activities, createActivity(values, criterionRequired)];
    onSave({ activities: sortActivitiesChronologically(next), evidence: evidences });
    closeActivity();
  };
  const saveEvidence = (values: EvidenceFormValues) => {
    const next = editingEvidence
      ? evidences.map((evidence) =>
          evidence.id === editingEvidence.id ? updateEvidence(evidence, values) : evidence,
        )
      : [...evidences, createEvidence(values)];
    onSave({ activities, evidence: next });
    closeEvidence();
  };

  let previousYear = '';
  return (
    <div className="space-y-6">
      <section className="panel space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Trajetória profissional</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Organize atividades e referências documentais sem anexar arquivos.
            </p>
          </div>
          {!activityOpen && (
            <Button
              disabled={disabled}
              onClick={() => {
                setEditingActivity(undefined);
                activityForm.reset(emptyActivityForm);
                setActivityOpen(true);
              }}
            >
              Adicionar atividade
            </Button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="activity-search">
            Buscar atividades
            <input
              id="activity-search"
              className="field"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label htmlFor="activity-category-filter">
            Filtrar por categoria
            <select
              id="activity-category-filter"
              className="field"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as '' | (typeof activityCategories)[number])
              }
            >
              <option value="">Todas as categorias</option>
              {activityCategories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        {!activities.length && (
          <div className="rounded border border-dashed border-slate-600 p-5 text-slate-300">
            <p className="font-medium text-slate-100">Nenhuma atividade registrada.</p>
            <p className="mt-2">Use o formulário amplo abaixo para iniciar sua trajetória.</p>
          </div>
        )}
        {activities.length > 0 && !filtered.length && (
          <p role="status" className="rounded border border-slate-600 p-4 text-slate-300">
            Nenhuma atividade corresponde à busca e ao filtro atuais.
          </p>
        )}
        <ol className="space-y-4" aria-label="Atividades">
          {filtered.map((activity) => {
            const year = activityYear(activity);
            const showYear = year !== previousYear;
            previousYear = year;
            const linkedEvidence = activity.evidenceIds
              .map((id) => evidences.find((evidence) => evidence.id === id))
              .filter((evidence): evidence is Evidence => Boolean(evidence));
            return (
              <li key={activity.id}>
                {showYear && <h3 className="mb-3 text-lg font-semibold text-cyan-200">{year}</h3>}
                <article className="rounded-lg border border-slate-600 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-cyan-200">
                        {activity.category ?? 'Categoria não informada'}
                      </p>
                      <h4 className="break-words text-lg font-semibold">{activity.title}</h4>
                      {(activity.institution || activity.department) && (
                        <p className="break-words text-slate-300">
                          {[activity.institution, activity.department].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full border border-slate-600 px-3 py-1 text-sm">
                      Quantidade: {activity.quantity}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {(activity.startDate || activity.endDate) && (
                      <div>
                        <dt className="text-slate-400">Período</dt>
                        <dd>
                          {dateLabel(activity.startDate) || 'Início não informado'} –{' '}
                          {dateLabel(activity.endDate) || 'Em andamento'}
                        </dd>
                      </div>
                    )}
                    {activity.role && (
                      <div>
                        <dt className="text-slate-400">Papel ou função</dt>
                        <dd>{activity.role}</dd>
                      </div>
                    )}
                    {activity.description && (
                      <div className="sm:col-span-2">
                        <dt className="text-slate-400">Descrição</dt>
                        <dd className="whitespace-pre-wrap break-words">{activity.description}</dd>
                      </div>
                    )}
                    {activity.results && (
                      <div className="sm:col-span-2">
                        <dt className="text-slate-400">Resultados</dt>
                        <dd className="whitespace-pre-wrap break-words">{activity.results}</dd>
                      </div>
                    )}
                    {activity.competencies?.length ? (
                      <div className="sm:col-span-2">
                        <dt className="text-slate-400">Competências</dt>
                        <dd>{activity.competencies.join(' · ')}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-slate-400">Referência de critério</dt>
                      <dd>{activity.criterionId || 'Não definida'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Evidências</dt>
                      <dd>{linkedEvidence.map((item) => item.title).join(' · ') || 'Nenhuma'}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      aria-label={`Editar atividade ${activity.title}`}
                      onClick={() => {
                        setEditingActivity(activity);
                        setActivityOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      aria-label={`Duplicar atividade ${activity.title}`}
                      onClick={() =>
                        onSave({
                          activities: sortActivitiesChronologically([
                            ...activities,
                            duplicateActivity(activity),
                          ]),
                          evidence: evidences,
                        })
                      }
                    >
                      Duplicar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disabled}
                      aria-label={`Excluir atividade ${activity.title}`}
                      onClick={() => setDeletingActivity(activity)}
                    >
                      Excluir
                    </Button>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </section>

      {activityOpen && (
        <section className="panel">
          <h2 className="text-xl font-semibold">
            {editingActivity ? `Editar ${editingActivity.title}` : 'Adicionar atividade'}
          </h2>
          <p id="activity-required" className="mt-2 text-sm text-slate-300">
            Campos com <span aria-hidden="true">*</span> são obrigatórios. A referência de critério
            não é inferida pela categoria.
          </p>
          <form
            className="mt-5"
            noValidate
            aria-describedby="activity-required"
            onSubmit={activityForm.handleSubmit(saveActivity)}
          >
            <fieldset disabled={disabled} className="grid gap-5 sm:grid-cols-2">
              <legend className="sr-only">Dados da atividade</legend>
              <div className="sm:col-span-2">
                <ActivityField
                  id="title"
                  label="Título da atividade"
                  required
                  register={activityForm.register}
                  error={activityForm.formState.errors.title}
                />
              </div>
              <label className="block" htmlFor="activity-category">
                Categoria{' '}
                <span className="text-cyan-200">
                  <span aria-hidden="true">*</span>
                  <span className="sr-only">(obrigatório)</span>
                </span>
                <select
                  id="activity-category"
                  className="field"
                  aria-invalid={Boolean(activityForm.formState.errors.category)}
                  aria-describedby={
                    activityForm.formState.errors.category ? 'activity-category-error' : undefined
                  }
                  {...activityForm.register('category')}
                >
                  <option value="" disabled>
                    Selecione
                  </option>
                  {activityCategories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                {activityForm.formState.errors.category && (
                  <span id="activity-category-error" className="mt-1 block text-sm text-rose-200">
                    {activityForm.formState.errors.category.message}
                  </span>
                )}
              </label>
              <ActivityField
                id="quantity"
                label="Quantidade declarada"
                required
                type="number"
                register={activityForm.register}
                error={activityForm.formState.errors.quantity}
              />
              <ActivityField
                id="institution"
                label="Instituição"
                register={activityForm.register}
                error={activityForm.formState.errors.institution}
              />
              <ActivityField
                id="department"
                label="Setor ou departamento"
                register={activityForm.register}
                error={activityForm.formState.errors.department}
              />
              <ActivityField
                id="startDate"
                label="Data inicial"
                type="date"
                register={activityForm.register}
                error={activityForm.formState.errors.startDate}
              />
              <ActivityField
                id="endDate"
                label="Data final"
                type="date"
                register={activityForm.register}
                error={activityForm.formState.errors.endDate}
              />
              <ActivityField
                id="role"
                label="Papel ou função"
                register={activityForm.register}
                error={activityForm.formState.errors.role}
              />
              <CriterionCombobox
                dataset={dataset}
                value={selectedCriterionId}
                required={criterionRequired}
                disabled={disabled}
                error={activityForm.formState.errors.criterionId?.message}
                onSelect={(criterionId, level) => {
                  activityForm.setValue('criterionId', criterionId, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  activityForm.setValue('selectedLevel', level ?? '', {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />
              <div className="sm:col-span-2">
                <ActivityTextArea
                  id="description"
                  label="Descrição"
                  register={activityForm.register}
                  error={activityForm.formState.errors.description}
                />
              </div>
              <div className="sm:col-span-2">
                <ActivityTextArea
                  id="results"
                  label="Resultados"
                  register={activityForm.register}
                  error={activityForm.formState.errors.results}
                />
              </div>
              <div className="sm:col-span-2">
                <ActivityTextArea
                  id="competencies"
                  label="Competências"
                  hint="Informe uma competência por linha."
                  register={activityForm.register}
                  error={activityForm.formState.errors.competencies}
                />
              </div>
              <fieldset className="rounded border border-slate-600 p-4 sm:col-span-2">
                <legend className="px-1 font-medium">Evidências vinculadas</legend>
                {!evidences.length ? (
                  <p className="text-sm text-slate-300">
                    Cadastre uma referência documental nesta página para vinculá-la.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {evidences.map((evidence) => (
                      <label key={evidence.id} className="flex items-start gap-3 rounded p-2">
                        <input
                          className="mt-1 size-4 accent-cyan-400"
                          type="checkbox"
                          value={evidence.id}
                          {...activityForm.register('evidenceIds')}
                        />
                        <span>
                          <span className="block">{evidence.title}</span>
                          <span className="text-sm text-slate-400">
                            {evidence.type || 'Tipo não informado'}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit">
                  {editingActivity ? 'Salvar atividade' : 'Adicionar atividade'}
                </Button>
                {(editingActivity || activities.length > 0) && (
                  <Button type="button" variant="outline" onClick={closeActivity}>
                    Cancelar
                  </Button>
                )}
              </div>
            </fieldset>
          </form>
        </section>
      )}

      <section className="panel space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Referências de evidências</h2>
            <p className="mt-2 text-sm text-slate-300">
              Somente metadados são armazenados; nenhum arquivo é anexado.
            </p>
          </div>
          {!evidenceOpen && (
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => {
                setEditingEvidence(undefined);
                evidenceForm.reset(emptyEvidenceForm);
                setEvidenceOpen(true);
              }}
            >
              Adicionar evidência
            </Button>
          )}
        </div>
        {!evidences.length && <p className="text-slate-300">Nenhuma evidência cadastrada.</p>}
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="Evidências">
          {evidences.map((evidence) => (
            <li key={evidence.id} className="rounded border border-slate-600 p-4">
              <p className="text-sm text-cyan-200">{evidence.type || 'Tipo não informado'}</p>
              <h3 className="break-words font-semibold">{evidence.title}</h3>
              <div className="mt-2 space-y-1 text-sm">
                {evidence.identifier && <p>Identificador: {evidence.identifier}</p>}
                {evidence.issuer && <p>Emissor: {evidence.issuer}</p>}
                {evidence.date && <p>Data: {dateLabel(evidence.date)}</p>}
                {evidence.processReference && (
                  <p className="break-words">Processo: {evidence.processReference}</p>
                )}
                {evidence.notes && <p className="break-words">Notas: {evidence.notes}</p>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled}
                  aria-label={`Editar evidência ${evidence.title}`}
                  onClick={() => {
                    setEditingEvidence(evidence);
                    setEvidenceOpen(true);
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disabled}
                  aria-label={`Excluir evidência ${evidence.title}`}
                  onClick={() => setDeletingEvidence(evidence)}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {evidenceOpen && (
        <section className="panel">
          <h2 className="text-xl font-semibold">
            {editingEvidence ? `Editar ${editingEvidence.title}` : 'Adicionar evidência'}
          </h2>
          <form className="mt-5" noValidate onSubmit={evidenceForm.handleSubmit(saveEvidence)}>
            <fieldset disabled={disabled} className="grid gap-5 sm:grid-cols-2">
              <legend className="sr-only">Metadados da evidência</legend>
              <EvidenceField
                id="type"
                label="Tipo de evidência"
                required
                register={evidenceForm.register}
                error={evidenceForm.formState.errors.type}
              />
              <EvidenceField
                id="title"
                label="Título da evidência"
                required
                register={evidenceForm.register}
                error={evidenceForm.formState.errors.title}
              />
              <EvidenceField
                id="identifier"
                label="Identificador"
                register={evidenceForm.register}
                error={evidenceForm.formState.errors.identifier}
              />
              <EvidenceField
                id="issuer"
                label="Emissor"
                register={evidenceForm.register}
                error={evidenceForm.formState.errors.issuer}
              />
              <EvidenceField
                id="date"
                label="Data da evidência"
                type="date"
                register={evidenceForm.register}
                error={evidenceForm.formState.errors.date}
              />
              <EvidenceField
                id="processReference"
                label="Referência do processo"
                register={evidenceForm.register}
                error={evidenceForm.formState.errors.processReference}
              />
              <label className="block sm:col-span-2" htmlFor="evidence-notes">
                Notas <span className="text-sm text-slate-400">(opcional)</span>
                <textarea
                  id="evidence-notes"
                  className="field min-h-28"
                  aria-invalid={Boolean(evidenceForm.formState.errors.notes)}
                  aria-describedby={
                    evidenceForm.formState.errors.notes ? 'evidence-notes-error' : undefined
                  }
                  {...evidenceForm.register('notes')}
                />
                {evidenceForm.formState.errors.notes && (
                  <span id="evidence-notes-error" className="mt-1 block text-sm text-rose-200">
                    {evidenceForm.formState.errors.notes.message}
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit">
                  {editingEvidence ? 'Salvar evidência' : 'Adicionar evidência'}
                </Button>
                <Button type="button" variant="outline" onClick={closeEvidence}>
                  Cancelar
                </Button>
              </div>
            </fieldset>
          </form>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deletingActivity)}
        onOpenChange={(open) => {
          if (!open) setDeletingActivity(undefined);
        }}
        title="Excluir atividade?"
        description={`A atividade “${deletingActivity?.title ?? ''}” será removida do projeto.`}
        busy={disabled}
        onConfirm={() => {
          if (!deletingActivity) return;
          onSave({
            activities: activities.filter((activity) => activity.id !== deletingActivity.id),
            evidence: evidences,
          });
          setDeletingActivity(undefined);
        }}
      />
      <ConfirmDialog
        open={Boolean(deletingEvidence)}
        onOpenChange={(open) => {
          if (!open) setDeletingEvidence(undefined);
        }}
        title="Excluir evidência?"
        description={`A evidência “${deletingEvidence?.title ?? ''}” será removida também dos vínculos das atividades.`}
        busy={disabled}
        onConfirm={() => {
          if (!deletingEvidence) return;
          onSave(removeEvidence(deletingEvidence.id, activities, evidences));
          setDeletingEvidence(undefined);
        }}
      />
    </div>
  );
}
