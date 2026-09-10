import { describe, expect, it } from 'vitest';
import { projectExportSchema } from '@/domain/project';
import { projectFixture } from '../fixtures/project';

describe('project export contract', () => {
  it('accepts the initial versioned envelope', () => {
    expect(projectExportSchema.parse(projectFixture)).toEqual(projectFixture);
  });

  it.each(['schemaVersion', 'applicationVersion', 'regulation', 'userData'])(
    'rejects missing required field %s',
    (field) => {
      const value: Record<string, unknown> = { ...projectFixture };
      delete value[field];
      expect(projectExportSchema.safeParse(value).success).toBe(false);
    },
  );

  it('ignores extra envelope fields and preserves opaque user data without mutating input', () => {
    const value = {
      ...projectFixture,
      extra: 'not part of the contract',
      regulation: { ...projectFixture.regulation, extra: true },
    };
    const original = structuredClone(value);
    expect(projectExportSchema.parse(value)).toEqual(projectFixture);
    expect(value).toEqual(original);
  });
});
