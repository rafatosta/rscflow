import { describe, expect, it } from 'vitest';
import type { TypedProjectExport } from '@/domain/project';
import type { ProcessGenerationResult } from '@/features/final-documents/generate-all';
import { createFinalPackage } from '@/features/final-documents/package';

const pdf = (marker: number) => new Uint8Array([37, 80, 68, 70, 45, marker]);
const project = {
  userData: { teacher: { name: 'Lívia da Conceição' }, title: 'Processo' },
} as TypedProjectExport;

function successful(): ProcessGenerationResult {
  return {
    status: 'success',
    statuses: [
      { artifact: 'evidence', status: 'produced' },
      { artifact: 'memorial', status: 'produced' },
      { artifact: 'forms', status: 'produced' },
    ],
    artifacts: {
      memorial: pdf(1),
      forms: pdf(2),
      evidence: pdf(3),
      pageMap: { totalPages: 1, evidences: [] },
    },
  };
}

function localEntries(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const decoder = new TextDecoder();
  const entries: { name: string; bytes: Uint8Array }[] = [];
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const dataOffset = offset + 30 + nameLength + extraLength;
    entries.push({
      name: decoder.decode(zip.subarray(offset + 30, offset + 30 + nameLength)),
      bytes: zip.slice(dataOffset, dataOffset + size),
    });
    offset = dataOffset + size;
  }
  return entries;
}

describe('pacote final do processo', () => {
  it('mantém os três PDFs independentes com nomes estáveis e conteúdo original', () => {
    const generation = successful();
    if (generation.status !== 'success') throw new Error('Fixture inválida.');
    const result = createFinalPackage(project, generation);
    expect(result.filename).toBe('pacote-final-rsc-livia-da-conceicao.zip');
    expect(result.entries).toEqual([
      { artifact: 'memorial', filename: 'memorial-rsc-livia-da-conceicao.pdf', size: 6 },
      { artifact: 'forms', filename: 'formularios-anexos-rsc-livia-da-conceicao.pdf', size: 6 },
      { artifact: 'evidence', filename: 'comprovantes-rsc-livia-da-conceicao.pdf', size: 6 },
    ]);
    const entries = localEntries(result.bytes);
    expect(entries.map((entry) => entry.name)).toEqual(
      result.entries.map((entry) => entry.filename),
    );
    expect(entries.map((entry) => [...entry.bytes])).toEqual([
      [...generation.artifacts.memorial],
      [...generation.artifacts.forms],
      [...generation.artifacts.evidence],
    ]);
  });

  it('é determinístico para a mesma fotografia e os mesmos resultados', () => {
    expect(createFinalPackage(project, successful()).bytes).toEqual(
      createFinalPackage(project, successful()).bytes,
    );
  });

  it('recusa geração incompleta ou artefato obrigatório inválido', () => {
    expect(() =>
      createFinalPackage(project, {
        status: 'error',
        statuses: [{ artifact: 'evidence', status: 'failed' }],
      }),
    ).toThrow(/incompleta/);
    const generation = successful();
    if (generation.status !== 'success') throw new Error('Fixture inválida.');
    generation.artifacts.forms = new Uint8Array();
    expect(() => createFinalPackage(project, generation)).toThrow(/PDFs válidos/);
  });
});
