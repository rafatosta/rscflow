import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import type { Regulation, RscLevel } from '@/domain/regulation';
import {
  findCriterion,
  searchCriteria,
  type CriterionContext,
} from '@/features/criteria/criteria-explorer';
import { levelLabel } from '@/features/project-shell/project-view';
import { Button } from './ui/button';

function optionLabel(context: CriterionContext): string {
  return `${levelLabel(context.level)} · ${context.criterion.code} — ${context.criterion.description}`;
}

export function CriterionCombobox({
  dataset,
  value,
  disabled = false,
  required = false,
  error,
  onSelect,
}: {
  dataset?: Regulation;
  value: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  onSelect: (criterionId: string, level?: RscLevel) => void;
}) {
  const id = useId();
  const selected = findCriterion(dataset, value);
  const selectedLabel = selected ? optionLabel(selected) : value;
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const canSelect = Boolean(
    dataset?.metadata.status === 'validated' &&
    dataset.levels.some((level) => level.criteria.length),
  );
  const matches = dataset && canSelect ? searchCriteria(dataset, query).slice(0, 50) : [];
  const invalid = Boolean(value && dataset && !selected);
  const describedBy =
    [
      error ? `${id}-error` : undefined,
      invalid ? `${id}-invalid` : undefined,
      !canSelect ? `${id}-unavailable` : undefined,
      selected ? `${id}-context` : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  useEffect(() => setQuery(selectedLabel), [selectedLabel]);

  const choose = (context: CriterionContext) => {
    onSelect(context.criterion.id, context.level);
    setQuery(optionLabel(context));
    setOpen(false);
  };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setQuery(selectedLabel);
      return;
    }
    if (!matches.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + step + matches.length) % matches.length);
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault();
      choose(matches[activeIndex] ?? matches[0]);
    }
  };

  return (
    <div className="relative sm:col-span-2">
      <label className="block" htmlFor={`${id}-input`}>
        Critério RSC{' '}
        {required ? (
          <span className="text-cyan-200">
            <span aria-hidden="true">*</span>
            <span className="sr-only">(obrigatório)</span>
          </span>
        ) : (
          <span className="text-sm text-slate-400">(opcional)</span>
        )}
      </label>
      <div className="flex items-start gap-2">
        <input
          id={`${id}-input`}
          className="field"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={
            open && matches[activeIndex] ? `${id}-option-${activeIndex}` : undefined
          }
          aria-invalid={Boolean(error || invalid)}
          aria-describedby={describedBy}
          autoComplete="off"
          disabled={disabled || !canSelect}
          value={query}
          onFocus={() => {
            setActiveIndex(0);
            setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
            setQuery(selectedLabel);
          }}
          onKeyDown={keyDown}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
        />
        {value && canSelect && (
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onSelect('', undefined)}
          >
            Limpar
          </Button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-rose-200">
          {error}
        </p>
      )}
      {invalid && (
        <p id={`${id}-invalid`} className="mt-1 text-sm text-rose-200">
          A referência salva não existe no dataset vinculado.
        </p>
      )}
      {!canSelect && (
        <p id={`${id}-unavailable`} className="mt-1 text-sm text-amber-200">
          A seleção exige um catálogo vinculado e validado. A referência existente será preservada.
        </p>
      )}
      {selected && (
        <p id={`${id}-context`} className="mt-2 text-sm text-slate-300">
          Diretriz: {selected.directive.code} — {selected.directive.title} · Unidade:{' '}
          {selected.criterion.unit} · Fator: {selected.criterion.factor} · Quantidade máxima:{' '}
          {selected.criterion.maxQuantity} · Peso: {selected.criterion.weight}
        </p>
      )}
      {open && canSelect && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          aria-label="Resultados de critérios"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-500 bg-slate-950 p-1 shadow-xl"
        >
          {matches.length ? (
            matches.map((context, index) => (
              <div
                key={context.criterion.id}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={context.criterion.id === value}
                className={`cursor-pointer rounded p-3 ${index === activeIndex ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(context)}
              >
                <span className="block font-medium">{optionLabel(context)}</span>
                <span className="mt-1 block text-sm text-slate-300">
                  {context.directive.code} — {context.directive.title} · unidade:{' '}
                  {context.criterion.unit}
                </span>
              </div>
            ))
          ) : (
            <p className="p-3 text-sm text-slate-300">Nenhum critério encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
