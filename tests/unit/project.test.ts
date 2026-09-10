import { describe, expect, it } from 'vitest';
import { projectExportSchema } from '@/domain/project';

describe('project export contract', () => {
  it('accepts the initial versioned envelope', () => {
    expect(
      projectExportSchema.parse({
        schemaVersion: '1.0',
        applicationVersion: '0.1.0',
        regulation: { id: 'ifba-189-2026', version: '1.0' },
        userData: {},
      }),
    ).toMatchObject({ schemaVersion: '1.0' });
  });
});
