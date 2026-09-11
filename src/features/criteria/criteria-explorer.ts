import type { Criterion, Directive, Regulation, RscLevel } from '@/domain/regulation';

export type CriterionContext = {
  level: RscLevel;
  criterion: Criterion;
  directive: Directive;
};

function searchable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

export function criterionContexts(dataset: Regulation, level?: RscLevel): CriterionContext[] {
  return dataset.levels
    .filter((entry) => !level || entry.section === level)
    .flatMap((entry) =>
      entry.criteria.flatMap((criterion) => {
        const directive = entry.directives.find((item) => item.id === criterion.directiveId);
        return directive ? [{ level: entry.section, criterion, directive }] : [];
      }),
    );
}

export function searchCriteria(
  dataset: Regulation,
  query: string,
  level?: RscLevel,
): CriterionContext[] {
  const words = searchable(query).split(/\s+/).filter(Boolean);
  return criterionContexts(dataset, level).filter(({ criterion, directive }) => {
    const haystack = searchable(
      [criterion.code, criterion.description, criterion.unit, directive.code, directive.title].join(
        ' ',
      ),
    );
    return words.every((word) => haystack.includes(word));
  });
}

export function findCriterion(
  dataset: Regulation | undefined,
  criterionId: string,
): CriterionContext | undefined {
  return dataset
    ? criterionContexts(dataset).find(({ criterion }) => criterion.id === criterionId)
    : undefined;
}

export function criterionStatusLabel(status: 'pending-official-validation' | 'validated'): string {
  return status === 'validated' ? 'Validado' : 'Pendente de validação oficial';
}
