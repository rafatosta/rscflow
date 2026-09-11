import { describe, expect, it } from 'vitest';
import { loadIfbaRegulation, parseRegulation } from '@/data/regulations/load';
import {
  criterionContexts,
  criterionStatusLabel,
  findCriterion,
  searchCriteria,
} from '@/features/criteria/criteria-explorer';
import fixture from '../fixtures/criteria-regulation.json';

const dataset = parseRegulation(fixture);

describe('exploração de critérios', () => {
  it('mantém hierarquia e filtra por nível', () => {
    expect(criterionContexts(dataset)).toHaveLength(7);
    expect(criterionContexts(dataset, 'rsc-ii').map(({ criterion }) => criterion.code)).toEqual([
      'b.1',
      'b.2',
    ]);
    expect(criterionContexts(dataset, 'rsc-ii')[0].directive.title).toBe('Gestão e difusão');
  });

  it.each([
    ['TCC', 'rsc-i-a-1'],
    ['comissao', 'rsc-i-a-2'],
    ['coordenação curso', 'rsc-ii-b-1'],
    ['palestra', 'rsc-ii-b-2'],
    ['artigo', 'rsc-iii-c-1'],
    ['projeto pesquisa', 'rsc-iii-c-2'],
    ['estagio', 'rsc-iii-c-3'],
  ])('busca %s sem exigir código', (query, id) => {
    expect(searchCriteria(dataset, query).map(({ criterion }) => criterion.id)).toContain(id);
  });

  it('combina busca textual e filtro por nível', () => {
    expect(searchCriteria(dataset, 'coordenação', 'rsc-i')).toEqual([]);
    expect(searchCriteria(dataset, 'coordenação', 'rsc-ii')[0].criterion.id).toBe('rsc-ii-b-1');
  });

  it('localiza referência válida, rejeita item ausente e traduz status', () => {
    expect(findCriterion(dataset, 'rsc-iii-c-1')?.level).toBe('rsc-iii');
    expect(findCriterion(dataset, 'inexistente')).toBeUndefined();
    expect(criterionStatusLabel('validated')).toBe('Validado');
    expect(criterionStatusLabel('pending-official-validation')).toBe(
      'Pendente de validação oficial',
    );
  });

  it('não inventa resultados para o catálogo de produção pendente e vazio', () => {
    const production = loadIfbaRegulation();
    expect(criterionContexts(production)).toEqual([]);
    expect(searchCriteria(production, 'TCC')).toEqual([]);
  });
});
