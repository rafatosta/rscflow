import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldError, type UseFormRegister } from 'react-hook-form';
import type { Education } from '@/domain/models';
import {
  createEducation,
  duplicateEducation,
  educationFormSchema,
  educationFormValues,
  emptyEducationForm,
  sortEducationChronologically,
  updateEducation,
  type EducationFormValues,
} from '@/features/education/education';
import { Button } from './ui/button';
import { ConfirmDialog } from './ui/confirm-dialog';

type Props = {
  education: Education[];
  disabled: boolean;
  onSave: (education: Education[]) => void;
};

function Field({
  id,
  label,
  register,
  error,
  required = false,
  type = 'text',
}: {
  id: keyof EducationFormValues;
  label: string;
  register: UseFormRegister<EducationFormValues>;
  error?: FieldError;
  required?: boolean;
  type?: 'text' | 'date';
}) {
  const errorId = `education-${id}-error`;
  return (
    <label className="block" htmlFor={`education-${id}`}>
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
        id={`education-${id}`}
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

export function EducationSection({ education, disabled, onSave }: Props) {
  const [formOpen, setFormOpen] = useState(education.length === 0);
  const [editing, setEditing] = useState<Education>();
  const [deleting, setDeleting] = useState<Education>();
  const ordered = sortEducationChronologically(education);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EducationFormValues>({
    resolver: zodResolver(educationFormSchema),
    defaultValues: emptyEducationForm,
    mode: 'onTouched',
  });

  useEffect(() => reset(educationFormValues(editing)), [editing, reset]);

  const closeForm = () => {
    setEditing(undefined);
    setFormOpen(false);
    reset(emptyEducationForm);
  };
  const save = (values: EducationFormValues) => {
    const next = editing
      ? education.map((item) => (item.id === editing.id ? updateEducation(item, values) : item))
      : [...education, createEducation(values)];
    onSave(sortEducationChronologically(next));
    closeForm();
  };

  return (
    <div className="space-y-6">
      <section className="panel space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Formação, aperfeiçoamento e titulação</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Registros com datas aparecem do mais recente para o mais antigo.
            </p>
          </div>
          {!formOpen && (
            <Button
              disabled={disabled}
              onClick={() => {
                setEditing(undefined);
                reset(emptyEducationForm);
                setFormOpen(true);
              }}
            >
              Adicionar formação
            </Button>
          )}
        </div>

        {!ordered.length && (
          <div className="rounded border border-dashed border-slate-600 p-5 text-slate-300">
            <p className="font-medium text-slate-100">Nenhuma formação registrada.</p>
            <p className="mt-2">Preencha o formulário para adicionar o primeiro registro.</p>
          </div>
        )}

        <ol className="grid gap-4">
          {ordered.map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-600 p-4">
              <article className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-cyan-200">{item.type || 'Tipo não informado'}</p>
                    <h3 className="break-words text-lg font-semibold">{item.title}</h3>
                    <p className="break-words text-slate-300">{item.institution}</p>
                  </div>
                  <span className="rounded-full border border-slate-600 px-3 py-1 text-sm">
                    {item.status || 'Situação não informada'}
                  </span>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  {item.area && (
                    <div>
                      <dt className="text-slate-400">Área</dt>
                      <dd>{item.area}</dd>
                    </div>
                  )}
                  {(item.startedAt || item.completedAt) && (
                    <div>
                      <dt className="text-slate-400">Período</dt>
                      <dd>
                        {dateLabel(item.startedAt) || 'Início não informado'} –{' '}
                        {dateLabel(item.completedAt) || 'Em andamento'}
                      </dd>
                    </div>
                  )}
                  {item.evidenceReference && (
                    <div className="sm:col-span-2">
                      <dt className="text-slate-400">Documento comprobatório</dt>
                      <dd className="break-words">{item.evidenceReference}</dd>
                    </div>
                  )}
                  {item.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-slate-400">Observações</dt>
                      <dd className="whitespace-pre-wrap break-words">{item.notes}</dd>
                    </div>
                  )}
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    aria-label={`Editar formação ${item.title}`}
                    onClick={() => {
                      setEditing(item);
                      setFormOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    aria-label={`Duplicar formação ${item.title}`}
                    onClick={() =>
                      onSave(sortEducationChronologically([...education, duplicateEducation(item)]))
                    }
                  >
                    Duplicar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    aria-label={`Excluir formação ${item.title}`}
                    onClick={() => setDeleting(item)}
                  >
                    Excluir
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      {formOpen && (
        <section className="panel">
          <h2 className="text-xl font-semibold">
            {editing ? `Editar ${editing.title}` : 'Adicionar formação'}
          </h2>
          <p id="education-required" className="mt-2 text-sm text-slate-300">
            Campos com <span aria-hidden="true">*</span> são obrigatórios.
          </p>
          <form
            className="mt-5"
            aria-describedby="education-required"
            noValidate
            onSubmit={handleSubmit(save)}
          >
            <fieldset disabled={disabled} className="grid gap-5 sm:grid-cols-2">
              <legend className="sr-only">Dados da formação</legend>
              <Field id="type" label="Tipo" required register={register} error={errors.type} />
              <Field
                id="status"
                label="Situação"
                required
                register={register}
                error={errors.status}
              />
              <div className="sm:col-span-2">
                <Field
                  id="title"
                  label="Curso ou título"
                  required
                  register={register}
                  error={errors.title}
                />
              </div>
              <Field
                id="institution"
                label="Instituição"
                required
                register={register}
                error={errors.institution}
              />
              <Field id="area" label="Área" register={register} error={errors.area} />
              <Field
                id="startedAt"
                label="Data inicial"
                type="date"
                register={register}
                error={errors.startedAt}
              />
              <Field
                id="completedAt"
                label="Data de conclusão"
                type="date"
                register={register}
                error={errors.completedAt}
              />
              <div className="sm:col-span-2">
                <Field
                  id="evidenceReference"
                  label="Referência do documento comprobatório"
                  register={register}
                  error={errors.evidenceReference}
                />
              </div>
              <label className="block sm:col-span-2" htmlFor="education-notes">
                Observações <span className="text-sm text-slate-400">(opcional)</span>
                <textarea
                  id="education-notes"
                  className="field min-h-28"
                  aria-invalid={Boolean(errors.notes)}
                  aria-describedby={errors.notes ? 'education-notes-error' : undefined}
                  {...register('notes')}
                />
                {errors.notes && (
                  <span id="education-notes-error" className="mt-1 block text-sm text-rose-200">
                    {errors.notes.message}
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <Button type="submit">
                  {editing ? 'Salvar alterações' : 'Adicionar formação'}
                </Button>
                {(editing || education.length > 0) && (
                  <Button type="button" variant="outline" onClick={closeForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </fieldset>
          </form>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined);
        }}
        title="Excluir formação?"
        description={`O registro “${deleting?.title ?? ''}” será removido deste projeto.`}
        busy={disabled}
        onConfirm={() => {
          if (!deleting) return;
          onSave(education.filter((item) => item.id !== deleting.id));
          setDeleting(undefined);
        }}
      />
    </div>
  );
}
