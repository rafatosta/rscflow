import { describe, expect, it, vi } from 'vitest';
import type { OccurrenceProjectExport } from '@/domain/criterion-entry';
import type { TypedProjectExport } from '@/domain/project';
import type { Regulation } from '@/domain/regulation';
import type { CalculationResult } from '@/domain/scoring';
import {
  generateProcessArtifacts,
  type ProcessGenerationDependencies,
} from '@/features/final-documents/generate-all';

const project = { userData: { id: 'p', teacher: { name: 'Inicial' } } } as TypedProjectExport;
const evidenceProject = { userData: { id: 'p' } } as OccurrenceProjectExport;
const regulation = { metadata: { regulation: { id: 'r' } } } as Regulation;
const scoring = { status: 'unavailable', issues: [] } as CalculationResult;
const resolver = { getFile: vi.fn() };
const pageMap = { totalPages: 3, evidences: [] };
const evidenceBytes = new Uint8Array([1]);

function dependencies(events: string[]): ProcessGenerationDependencies {
  return {
    evidence: vi.fn(async () => {
      events.push('evidence');
      return { status: 'success' as const, bytes: evidenceBytes, pageMap };
    }),
    memorial: vi.fn(async (_project, map) => {
      events.push('memorial');
      expect(map).toBe(pageMap);
      return new Uint8Array([2]);
    }),
    model: vi.fn((_project, _regulation, _scoring, map) => {
      events.push('model');
      expect(map).toBe(pageMap);
      return {} as never;
    }),
    forms: vi.fn(async () => {
      events.push('forms');
      return new Uint8Array([3]);
    }),
  };
}

describe('geração conjunta dos documentos', () => {
  it('consolida primeiro e compartilha o mesmo mapa com os documentos dependentes', async () => {
    const events: string[] = [];
    const deps = dependencies(events);
    const result = await generateProcessArtifacts(
      { project, evidenceProject, regulation, scoring, resolver },
      deps,
    );
    expect(result.status).toBe('success');
    expect(events[0]).toBe('evidence');
    expect(events.slice(1).sort()).toEqual(['forms', 'memorial', 'model'].sort());
    expect(result.status === 'success' && result.artifacts.pageMap).toBe(pageMap);
    expect(result.statuses).toEqual([
      { artifact: 'evidence', status: 'produced' },
      { artifact: 'memorial', status: 'produced' },
      { artifact: 'forms', status: 'produced' },
    ]);
  });

  it('não executa dependentes quando a consolidação falha', async () => {
    const events: string[] = [];
    const deps = dependencies(events);
    vi.mocked(deps.evidence).mockResolvedValueOnce({
      status: 'error',
      issues: [{ code: 'missing-file', evidenceId: 'e', message: 'Arquivo ausente.' }],
    });
    const result = await generateProcessArtifacts(
      { project, evidenceProject, regulation, scoring, resolver },
      deps,
    );
    expect(deps.memorial).not.toHaveBeenCalled();
    expect(deps.model).not.toHaveBeenCalled();
    expect(deps.forms).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'error',
      statuses: [
        { artifact: 'evidence', status: 'failed', message: 'Arquivo ausente.' },
        {
          artifact: 'memorial',
          status: 'skipped',
          message: 'Depende do mapa de páginas dos comprovantes.',
        },
        {
          artifact: 'forms',
          status: 'skipped',
          message: 'Depende do mapa de páginas dos comprovantes.',
        },
      ],
    });
  });

  it('não retorna conjunto parcial quando um gerador dependente falha', async () => {
    const deps = dependencies([]);
    vi.mocked(deps.forms).mockRejectedValueOnce(new Error('Template inválido.'));
    const result = await generateProcessArtifacts(
      { project, evidenceProject, regulation, scoring, resolver },
      deps,
    );
    expect(result.status).toBe('error');
    expect('artifacts' in result).toBe(false);
    expect(result.statuses).toContainEqual({ artifact: 'memorial', status: 'produced' });
    expect(result.statuses).toContainEqual({
      artifact: 'forms',
      status: 'failed',
      message: 'Template inválido.',
    });
  });

  it('usa uma fotografia imutável do projeto em todos os geradores', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const seen: string[] = [];
    const deps = dependencies([]);
    vi.mocked(deps.evidence).mockImplementationOnce(async (snapshot) => {
      seen.push(snapshot.userData.id);
      await gate;
      return { status: 'success', bytes: evidenceBytes, pageMap };
    });
    vi.mocked(deps.memorial).mockImplementationOnce(async (snapshot) => {
      seen.push(snapshot.userData.teacher.name);
      return new Uint8Array([2]);
    });
    vi.mocked(deps.model).mockImplementationOnce((snapshot) => {
      seen.push(snapshot.userData.teacher.name);
      return {} as never;
    });
    const mutable = structuredClone(project);
    const operation = generateProcessArtifacts(
      { project: mutable, evidenceProject, regulation, scoring, resolver },
      deps,
    );
    mutable.userData.teacher.name = 'Alterado durante a geração';
    release();
    await operation;
    expect(seen).toEqual(['p', 'Inicial', 'Inicial']);
  });
});
