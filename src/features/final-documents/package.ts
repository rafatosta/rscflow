import type { TypedProjectExport } from '@/domain/project';
import type { ProcessGenerationResult } from './generate-all';
import { createStoredZip } from '@/utils/stored-zip';
import {
  evidenceBundlePdfFilename,
  finalPackageFilename,
  memorialPdfFilename,
  normativeFormsPdfFilename,
} from '@/pdf/file-name';

export type FinalPackage = {
  bytes: Uint8Array;
  filename: string;
  entries: { artifact: 'memorial' | 'forms' | 'evidence'; filename: string; size: number }[];
};

function isPdf(bytes: Uint8Array) {
  return bytes.length >= 5 && new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-';
}

/** Empacota somente o resultado completo, sem executar qualquer gerador. */
export function createFinalPackage(
  project: TypedProjectExport,
  generation: ProcessGenerationResult,
): FinalPackage {
  if (generation.status !== 'success')
    throw new Error('A geração conjunta está incompleta; o pacote final não pode ser criado.');
  const files = [
    {
      artifact: 'memorial' as const,
      name: memorialPdfFilename(project),
      bytes: generation.artifacts.memorial,
    },
    {
      artifact: 'forms' as const,
      name: normativeFormsPdfFilename(project),
      bytes: generation.artifacts.forms,
    },
    {
      artifact: 'evidence' as const,
      name: evidenceBundlePdfFilename(project),
      bytes: generation.artifacts.evidence,
    },
  ];
  if (files.some((file) => !isPdf(file.bytes)))
    throw new Error('Um ou mais documentos obrigatórios não são PDFs válidos.');
  return {
    bytes: createStoredZip(files),
    filename: finalPackageFilename(project),
    entries: files.map((file) => ({
      artifact: file.artifact,
      filename: file.name,
      size: file.bytes.length,
    })),
  };
}
