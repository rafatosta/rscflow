import type { OccurrenceProjectExport } from '@/domain/criterion-entry';
import type { FileResolver } from '@/domain/local-files';
import type { EvidenceBundleResult } from '@/pdf/evidence-bundle';

export type EvidencePreparation =
  EvidenceBundleResult | { status: 'empty' | 'unavailable'; message: string };

/** Prepara os mesmos bytes e mapa para todos os artefatos, sem duplicar a consolidação. */
export async function prepareEvidenceArtifacts(
  project?: OccurrenceProjectExport,
  resolver?: FileResolver,
): Promise<EvidencePreparation> {
  if (!project)
    return { status: 'unavailable', message: 'Os comprovantes locais não estão disponíveis.' };
  const { createEvidenceBundle, createEvidenceBundlePlan } = await import('@/pdf/evidence-bundle');
  if (!createEvidenceBundlePlan(project).length)
    return { status: 'empty', message: 'Nenhum comprovante vinculado a lançamentos enquadrados.' };
  if (!resolver)
    return { status: 'unavailable', message: 'Os comprovantes locais não estão disponíveis.' };
  return createEvidenceBundle(project, resolver);
}

export function evidencePreparationMessage(result: EvidencePreparation): string {
  if (result.status === 'success')
    return `${result.pageMap.totalPages} página(s) de comprovantes prontas para geração.`;
  if (result.status === 'error') return result.issues.map((issue) => issue.message).join(' ');
  return result.message;
}
