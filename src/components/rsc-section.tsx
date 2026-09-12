import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Activity, Evidence } from '@/domain/models';
import type { Regulation, RscLevel } from '@/domain/regulation';
import type { CalculationResult } from '@/domain/scoring';
import { searchCriteria } from '@/features/criteria/criteria-explorer';
import {
  activityCategories,
  activityFormSchema,
  activityFormValues,
  createActivity,
  updateActivity,
  type ActivityFormValues,
} from '@/features/trajectory/trajectory';
import { Button } from './ui/button';
import { ConfirmDialog } from './ui/confirm-dialog';

export function RscSection({
  level,
  dataset,
  scoring,
  activities,
  evidences,
  disabled,
  onSave,
}: {
  level: RscLevel;
  dataset?: Regulation;
  scoring: CalculationResult;
  activities: Activity[];
  evidences: Evidence[];
  disabled: boolean;
  onSave: (activities: Activity[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ criterionId: string; activity?: Activity }>();
  const [deleting, setDeleting] = useState<Activity>();
  const trigger = useRef<HTMLElement | null>(null);
  const validated = dataset?.metadata.status === 'validated';
  const results = dataset ? searchCriteria(dataset, query, level) : [];
  const directives = dataset?.levels.find((item) => item.section === level)?.directives ?? [];
  const close = () => {
    setEditing(undefined);
    trigger.current?.focus();
  };
  return (
    <div className="space-y-5">
      <p className="text-slate-300">
        Localize uma descrição e registre seus lançamentos. Quantidades, períodos e comprovantes
        alimentarão os documentos do processo.
      </p>
      <label className="block">
        Buscar critérios neste nível
        <input
          className="field"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {!validated && (
        <p role="status" className="panel text-amber-200">
          Catálogo normativo pendente ou indisponível. Não é possível selecionar critérios para
          novos lançamentos. As referências já cadastradas estão preservadas na trajetória.
        </p>
      )}
      {validated && scoring.status === 'unavailable' && (
        <p role="status" className="panel text-amber-200">
          Pontuação indisponível: {scoring.issues.map((issue) => issue.message).join(' ')}
        </p>
      )}
      {validated && !results.length && (
        <p role="status">Nenhum critério corresponde à busca neste nível.</p>
      )}
      {validated &&
        directives.map((directive) => {
          const criteria = results.filter((item) => item.directive.id === directive.id);
          if (!criteria.length) return null;
          const score =
            scoring.status === 'unavailable'
              ? undefined
              : scoring.directives.find((item) => item.directiveId === directive.id);
          return (
            <section key={directive.id} className="panel space-y-5" aria-label={directive.title}>
              <h2 className="text-xl font-semibold break-words">{directive.title}</h2>
              <p className="text-cyan-200 font-semibold">
                {score?.score.toLocaleString('pt-BR') ?? '—'} /{' '}
                {directive.maxScore.toLocaleString('pt-BR')} pontos
              </p>
              {score && (
                <progress
                  className="w-full accent-cyan-400"
                  aria-label={`Pontuação de ${directive.title}`}
                  max={directive.maxScore || 1}
                  value={score.score}
                />
              )}
              {score?.maximumReached && <p>Pontuação máxima da diretriz atingida.</p>}
              {criteria.map(({ criterion }) => {
                const entries = activities.filter(
                  (item) => item.criterionId === criterion.id && item.selectedLevel === level,
                );
                return (
                  <article
                    key={criterion.id}
                    className="rounded border border-slate-600 p-4 space-y-3"
                    aria-label={criterion.description}
                  >
                    <h3 className="font-semibold text-lg break-words">{criterion.description}</h3>
                    <p className="text-sm text-slate-300">Referência: {criterion.code}</p>
                    <p>
                      Fator: {criterion.factor} · Unidade: {criterion.unit} · Peso:{' '}
                      {criterion.weight} · Quantidade máxima: {criterion.maxQuantity}
                    </p>
                    <p className="text-sm text-slate-300">
                      Fonte: {criterion.provenance.sourceReference}
                    </p>
                    {!entries.length && <p>Nenhum lançamento neste critério.</p>}
                    <ul className="space-y-3">
                      {entries.map((item) => (
                        <li key={item.id} className="rounded bg-slate-800 p-3 break-words">
                          <p className="font-semibold">
                            {item.startDate?.slice(0, 4) ??
                              item.endDate?.slice(0, 4) ??
                              'Sem período'}{' '}
                            · {item.title}
                          </p>
                          <p>Quantidade: {item.quantity}</p>
                          {item.description && (
                            <p className="whitespace-pre-wrap">{item.description}</p>
                          )}
                          <p>
                            Comprovantes:{' '}
                            {item.evidenceIds
                              .map((id) => evidences.find((e) => e.id === id)?.title)
                              .filter(Boolean)
                              .join(' · ') || 'Nenhum associado'}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Button
                              variant="outline"
                              disabled={disabled}
                              onClick={(event) => {
                                trigger.current = event.currentTarget;
                                setEditing({ criterionId: criterion.id, activity: item });
                              }}
                            >
                              Editar lançamento {item.title}
                            </Button>
                            <Button
                              variant="outline"
                              disabled={disabled}
                              onClick={() => setDeleting(item)}
                            >
                              Excluir lançamento {item.title}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Button
                      disabled={disabled}
                      onClick={(event) => {
                        trigger.current = event.currentTarget;
                        setEditing({ criterionId: criterion.id });
                      }}
                    >
                      Adicionar lançamento
                    </Button>
                  </article>
                );
              })}
            </section>
          );
        })}
      {editing && (
        <EntryEditor
          key={editing.activity?.id ?? editing.criterionId}
          level={level}
          criterionId={editing.criterionId}
          activity={editing.activity}
          evidences={evidences}
          disabled={disabled}
          onCancel={close}
          onSave={(item) => {
            onSave(
              editing.activity
                ? activities.map((old) => (old.id === item.id ? item : old))
                : [...activities, item],
            );
            close();
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(undefined);
        }}
        title="Excluir lançamento?"
        description={`O lançamento “${deleting?.title ?? ''}” será removido. Os comprovantes compartilhados serão preservados.`}
        busy={disabled}
        onConfirm={() => {
          onSave(activities.filter((item) => item.id !== deleting?.id));
          setDeleting(undefined);
        }}
      />
    </div>
  );
}

function EntryEditor({
  level,
  criterionId,
  activity,
  evidences,
  disabled,
  onSave,
  onCancel,
}: {
  level: RscLevel;
  criterionId: string;
  activity?: Activity;
  evidences: Evidence[];
  disabled: boolean;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
}) {
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema(true)),
    defaultValues: { ...activityFormValues(activity), criterionId, selectedLevel: level },
  });
  useEffect(() => {
    form.setFocus('title');
  }, [form]);
  const fields = [
    ['title', 'Título do lançamento', 'text'],
    ['quantity', 'Quantidade declarada', 'number'],
    ['startDate', 'Data inicial', 'date'],
    ['endDate', 'Data final', 'date'],
    ['institution', 'Instituição', 'text'],
    ['role', 'Papel ou função', 'text'],
  ] as const;
  return (
    <section className="panel" aria-label="Editar lançamento">
      <h2 className="text-xl font-semibold">
        {activity ? 'Editar lançamento' : 'Novo lançamento'}
      </h2>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) =>
          onSave(activity ? updateActivity(activity, values, true) : createActivity(values, true)),
        )}
      >
        <fieldset disabled={disabled} className="grid sm:grid-cols-2 gap-4 mt-4">
          <legend className="sr-only">Dados do lançamento</legend>
          {fields.map(([name, label, type]) => (
            <label key={name}>
              {label}
              {name === 'title' || name === 'quantity' ? ' (obrigatório)' : ' (opcional)'}
              <input
                className="field"
                type={type}
                step={type === 'number' ? 'any' : undefined}
                min={type === 'number' ? 0 : undefined}
                aria-invalid={Boolean(form.formState.errors[name])}
                aria-describedby={form.formState.errors[name] ? `entry-${name}-error` : undefined}
                {...form.register(name, type === 'number' ? { valueAsNumber: true } : undefined)}
              />
              {form.formState.errors[name] && (
                <span id={`entry-${name}-error`} role="alert">
                  {form.formState.errors[name]?.message}
                </span>
              )}
            </label>
          ))}
          <label>
            Categoria editorial (obrigatório)
            <select
              className="field"
              aria-invalid={Boolean(form.formState.errors.category)}
              {...form.register('category')}
            >
              <option value="">Selecione</option>
              {activityCategories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            {form.formState.errors.category && (
              <span role="alert">{form.formState.errors.category.message}</span>
            )}
          </label>
          <label className="sm:col-span-2">
            Descrição (opcional)
            <textarea className="field" {...form.register('description')} />
            {form.formState.errors.description && (
              <span role="alert">{form.formState.errors.description.message}</span>
            )}
          </label>
          <fieldset className="sm:col-span-2 space-y-2">
            <legend>Comprovantes associados</legend>
            {!evidences.length && (
              <p>Cadastre referências na seção Comprovantes para associá-las ao lançamento.</p>
            )}
            {evidences.map((item) => (
              <label className="block" key={item.id}>
                <input type="checkbox" value={item.id} {...form.register('evidenceIds')} />{' '}
                {item.title}
              </label>
            ))}
          </fieldset>
          <Button type="submit">Salvar lançamento</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </fieldset>
      </form>
    </section>
  );
}
