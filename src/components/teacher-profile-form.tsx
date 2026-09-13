import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type FieldError, type UseFormRegister } from 'react-hook-form';
import type { TypedProjectExport } from '@/domain/project';
import {
  applyTeacherProfile,
  teacherProfileDraftSchema,
  teacherProfileFormSchema,
  teacherProfileValues,
  type TeacherProfileForm as ProfileValues,
} from '@/features/teacher-profile/profile';

type Props = {
  project: TypedProjectExport;
  disabled: boolean;
  onSave: (userData: TypedProjectExport['userData']) => void;
};

function Field({
  id,
  label,
  required = false,
  error,
  register,
  type = 'text',
  inputMode,
  autoComplete,
}: {
  id: keyof ProfileValues;
  label: string;
  required?: boolean;
  error?: FieldError;
  register: UseFormRegister<ProfileValues>;
  type?: 'text' | 'email' | 'tel' | 'date';
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  autoComplete?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <label className="block" htmlFor={id}>
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
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="field"
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

export function TeacherProfileForm({ project, disabled, onSave }: Props) {
  const defaults = teacherProfileValues(project);
  const lastValid = useRef(JSON.stringify(defaults));
  const {
    register,
    control,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(teacherProfileFormSchema),
    defaultValues: defaults,
    mode: 'onChange',
  });
  const values = useWatch({ control });

  useEffect(() => {
    const parsed = teacherProfileDraftSchema.safeParse(values);
    if (!parsed.success) return;
    const serialized = JSON.stringify(parsed.data);
    if (serialized === lastValid.current) return;
    lastValid.current = serialized;
    onSave(applyTeacherProfile(project, parsed.data));
  }, [onSave, project, values]);

  return (
    <section className="panel space-y-6">
      <div>
        <h2 className="section-title">Dados pessoais e funcionais</h2>
        <p id="required-fields" className="mt-2 text-sm leading-6 text-slate-300">
          Campos com <span aria-hidden="true">*</span> são obrigatórios para concluir esta seção.
          Alterações válidas são salvas automaticamente.
        </p>
      </div>
      <form aria-describedby="required-fields" noValidate>
        <fieldset disabled={disabled} className="grid gap-5 sm:grid-cols-2">
          <legend className="sr-only">Campos do docente</legend>
          <div className="sm:col-span-2">
            <Field
              id="title"
              label="Título do projeto"
              required
              error={errors.title}
              register={register}
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              id="name"
              label="Nome completo"
              required
              error={errors.name}
              register={register}
              autoComplete="name"
            />
          </div>
          <Field
            id="cpf"
            label="CPF"
            required
            error={errors.cpf}
            register={register}
            inputMode="numeric"
            autoComplete="off"
          />
          <Field
            id="siape"
            label="SIAPE"
            required
            error={errors.siape}
            register={register}
            inputMode="numeric"
            autoComplete="off"
          />
          <Field id="role" label="Cargo" error={errors.role} register={register} />
          <div className="sm:col-span-2">
            <h3 className="subsection-title">Instituição de vínculo</h3>
          </div>
          <Field
            id="institution"
            label="Instituição"
            error={errors.institution}
            register={register}
          />
          <Field
            id="campus"
            label="Campus de lotação"
            required
            error={errors.campus}
            register={register}
          />
          <Field
            id="email"
            label="E-mail"
            error={errors.email}
            register={register}
            type="email"
            inputMode="email"
            autoComplete="email"
          />
          <Field
            id="phone"
            label="Telefone"
            error={errors.phone}
            register={register}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
          <Field
            id="currentRsc"
            label="RT/RSC atual"
            error={errors.currentRsc}
            register={register}
          />
          <div className="sm:col-span-2">
            <h3 className="subsection-title">Requerimento</h3>
          </div>
          <Field
            id="employmentStatus"
            label="Situação funcional"
            error={errors.employmentStatus}
            register={register}
          />
          <Field id="schooling" label="Escolaridade" error={errors.schooling} register={register} />
          <Field
            id="admissionDate"
            label="Data de ingresso"
            error={errors.admissionDate}
            register={register}
            type="date"
          />
          <Field
            id="effectiveDate"
            label="Data de vigência"
            error={errors.effectiveDate}
            register={register}
            type="date"
          />
          <label className="block sm:col-span-2" htmlFor="level">
            RSC pretendido{' '}
            <span className="text-cyan-200">
              <span aria-hidden="true">*</span>
              <span className="sr-only">(obrigatório)</span>
            </span>
            <select
              id="level"
              className="field"
              aria-invalid={Boolean(errors.level)}
              aria-describedby={errors.level ? 'level-error' : undefined}
              {...register('level')}
            >
              <option value="" disabled>
                Selecione
              </option>
              <option value="rsc-i">RSC I</option>
              <option value="rsc-ii">RSC II</option>
              <option value="rsc-iii">RSC III</option>
            </select>
            {errors.level && (
              <span id="level-error" className="mt-1 block text-sm text-rose-200">
                {errors.level.message}
              </span>
            )}
          </label>
        </fieldset>
      </form>
    </section>
  );
}
