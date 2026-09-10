import { describe, expect, it } from 'vitest';
import { loadIfbaRegulation, parseRegulation } from '@/data/regulations/load';
import { regulationLevelSchema } from '@/domain/regulation';

// Dados exclusivamente sintéticos, sem significado normativo.
const provenance = { status: 'pending-official-validation', sourceReference: 'fixture sintética' };
const level = () => ({
  schemaVersion: '1.0',
  regulationId: 'teste',
  section: 'rsc-i',
  status: 'pending-official-validation',
  directives: [{ id: 'i-a', code: 'a', title: 'Teste', maxScore: 10, weight: 1, provenance }],
  criteria: [
    {
      id: 'i-a-1',
      code: 'a.1',
      description: 'Teste',
      unit: 'teste',
      factor: 1,
      maxQuantity: 10,
      weight: 1,
      directiveId: 'i-a',
      provenance,
    },
  ],
});
describe('datasets normativos', () => {
  it('carrega os três níveis pendentes sem atribuir versão normativa', () => {
    const data = loadIfbaRegulation();
    expect(data.levels.map((item) => item.section)).toEqual(['rsc-i', 'rsc-ii', 'rsc-iii']);
    expect(data.metadata.version).toBeNull();
    expect(data.levels.every((item) => item.status === 'pending-official-validation')).toBe(true);
  });
  it('aceita edição de valores sem alterar lógica', () => {
    const data = level();
    data.criteria[0].factor = 2.75;
    expect(regulationLevelSchema.parse(data).criteria[0].factor).toBe(2.75);
  });
  it.each(['id', 'code'] as const)('rejeita %s duplicado em critérios e diretrizes', (key) => {
    for (const collection of ['criteria', 'directives'] as const) {
      const data = level();
      const row = {
        ...data[collection][0],
        id: 'outro',
        code: collection === 'criteria' ? 'a.2' : 'b',
      };
      row[key] = data[collection][0][key];
      const candidate = { ...data, [collection]: [...data[collection], row] };
      expect(regulationLevelSchema.safeParse(candidate).success).toBe(false);
    }
  });
  it.each(['factor', 'maxQuantity', 'weight'])('rejeita %s negativo', (key) => {
    const data = level();
    Object.assign(data.criteria[0], { [key]: -1 });
    expect(regulationLevelSchema.safeParse(data).success).toBe(false);
  });
  it.each([
    { code: 'a.0' },
    { code: 'b.1' },
    { directiveId: 'ausente' },
    { factor: Infinity },
    { unit: '' },
  ])('rejeita critério inválido %j', (patch) => {
    const data = level();
    Object.assign(data.criteria[0], patch);
    expect(regulationLevelSchema.safeParse(data).success).toBe(false);
  });
  it.each([{ maxScore: -1 }, { weight: -1 }, { code: '1' }])(
    'rejeita diretriz inválida %j',
    (patch) => {
      const data = level();
      Object.assign(data.directives[0], patch);
      expect(regulationLevelSchema.safeParse(data).success).toBe(false);
    },
  );
  it('rejeita níveis repetidos, referências incompatíveis e validação incompleta', () => {
    const data = loadIfbaRegulation();
    expect(() =>
      parseRegulation({ ...data, levels: [data.levels[0], data.levels[0], data.levels[2]] }),
    ).toThrow();
    data.levels[0].regulationId = 'outro';
    expect(() => parseRegulation(data)).toThrow();
    const pending = loadIfbaRegulation();
    pending.metadata.status = 'validated';
    expect(() => parseRegulation(pending)).toThrow();
  });
  it('rejeita IDs globais repetidos e nível falsamente validado', () => {
    const data = loadIfbaRegulation();
    const first = regulationLevelSchema.parse(level());
    first.regulationId = data.metadata.regulation.id;
    data.levels[0] = first;
    data.levels[1] = { ...first, section: 'rsc-ii' };
    expect(() => parseRegulation(data)).toThrow();
    expect(regulationLevelSchema.safeParse({ ...level(), status: 'validated' }).success).toBe(
      false,
    );
  });
});
