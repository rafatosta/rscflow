import type { OccurrenceProjectExport, StoredFile } from '@/domain/criterion-entry';
import type { FileResolver } from '@/domain/local-files';
import type { RscLevel } from '@/domain/regulation';
import { PDFDocument } from 'pdf-lib';

export type EvidenceAssociation = {
  level: RscLevel;
  criterionId: string;
  occurrenceId: string;
};

export type EvidenceFilePageRange = {
  fileId: string;
  startPage: number;
  endPage: number;
};

export type EvidencePageRange = {
  evidenceId: string;
  startPage: number;
  endPage: number;
  files: EvidenceFilePageRange[];
  associations: EvidenceAssociation[];
};

export type EvidenceBundleIssue = {
  code: 'missing-file' | 'invalid-file' | 'unsupported-file';
  evidenceId: string;
  fileId?: string;
  message: string;
};

export type EvidenceBundleResult =
  | { status: 'success'; bytes: Uint8Array; pageMap: EvidencePageRange[] }
  | { status: 'error'; issues: EvidenceBundleIssue[] };

const levelOrder: Record<RscLevel, number> = { 'rsc-i': 0, 'rsc-ii': 1, 'rsc-iii': 2 };

function compareNatural(left: string, right: string) {
  const parts = (value: string) => value.match(/\d+|\D+/g) ?? [];
  const leftParts = parts(left);
  const rightParts = parts(right);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const a = leftParts[index];
    const b = rightParts[index];
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    if (a === b) continue;
    if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
      const normalizedA = a.replace(/^0+(?=\d)/, '');
      const normalizedB = b.replace(/^0+(?=\d)/, '');
      if (normalizedA.length !== normalizedB.length) return normalizedA.length - normalizedB.length;
      if (normalizedA !== normalizedB) return normalizedA < normalizedB ? -1 : 1;
      return a.length - b.length;
    }
    return a < b ? -1 : 1;
  }
  return 0;
}

function compareAssociation(left: EvidenceAssociation, right: EvidenceAssociation) {
  return (
    levelOrder[left.level] - levelOrder[right.level] ||
    compareNatural(left.criterionId, right.criterionId) ||
    compareNatural(left.occurrenceId, right.occurrenceId)
  );
}

function orderedAssociations(project: OccurrenceProjectExport) {
  return project.userData.criterionEntries
    .flatMap((entry) => {
      if (!entry.selectedLevel) return [];
      return entry.occurrences.flatMap((occurrence) =>
        occurrence.evidenceIds.map((evidenceId) => ({
          evidenceId,
          association: {
            level: entry.selectedLevel!,
            criterionId: entry.criterionId,
            occurrenceId: occurrence.id,
          },
          occurrenceOrder: occurrence.order,
        })),
      );
    })
    .sort(
      (left, right) =>
        levelOrder[left.association.level] - levelOrder[right.association.level] ||
        compareNatural(left.association.criterionId, right.association.criterionId) ||
        left.occurrenceOrder - right.occurrenceOrder ||
        compareNatural(left.association.occurrenceId, right.association.occurrenceId),
    );
}

function issueFor(error: unknown, evidenceId: string, descriptor: StoredFile): EvidenceBundleIssue {
  const message = error instanceof Error ? error.message : 'Não foi possível ler o arquivo.';
  const missing = /ausente|not found|não encontr/i.test(message);
  return {
    code: missing ? 'missing-file' : 'invalid-file',
    evidenceId,
    fileId: descriptor.id,
    message,
  };
}

/** Consolida PDFs vinculados sem consultar armazenamento nem alterar o projeto. */
export async function createEvidenceBundle(
  project: OccurrenceProjectExport,
  resolver: FileResolver,
): Promise<EvidenceBundleResult> {
  const evidence = new Map(project.userData.evidence.map((item) => [item.id, item] as const));
  const files = new Map(project.userData.storedFiles.map((item) => [item.id, item] as const));
  const associations = orderedAssociations(project);
  const grouped = new Map<string, EvidenceAssociation[]>();
  for (const item of associations) {
    const current = grouped.get(item.evidenceId) ?? [];
    if (!current.some((association) => compareAssociation(association, item.association) === 0))
      current.push(item.association);
    grouped.set(item.evidenceId, current);
  }

  const loaded: { evidenceId: string; descriptor: StoredFile; document: PDFDocument }[] = [];
  const issues: EvidenceBundleIssue[] = [];
  for (const evidenceId of grouped.keys()) {
    const proof = evidence.get(evidenceId)!;
    if (!proof.fileIds.length) {
      issues.push({
        code: 'missing-file',
        evidenceId,
        message: 'O comprovante não possui arquivo associado.',
      });
      continue;
    }
    for (const fileId of proof.fileIds) {
      const descriptor = files.get(fileId)!;
      if (descriptor.mediaType.toLowerCase() !== 'application/pdf') {
        issues.push({
          code: 'unsupported-file',
          evidenceId,
          fileId,
          message: `O arquivo "${descriptor.name}" não é PDF.`,
        });
        continue;
      }
      try {
        const file = await resolver.getFile(fileId);
        const document = await PDFDocument.load(await file.arrayBuffer());
        if (document.getPageCount() === 0) throw new Error('O PDF não possui páginas.');
        loaded.push({
          evidenceId,
          descriptor,
          document,
        });
      } catch (error) {
        issues.push(issueFor(error, evidenceId, descriptor));
      }
    }
  }
  if (issues.length) return { status: 'error', issues };

  const output = await PDFDocument.create();
  const pageMap: EvidencePageRange[] = [];
  for (const [evidenceId, proofAssociations] of grouped) {
    const startPage = output.getPageCount() + 1;
    const fileRanges: EvidenceFilePageRange[] = [];
    for (const item of loaded.filter((file) => file.evidenceId === evidenceId)) {
      const fileStartPage = output.getPageCount() + 1;
      const pages = await output.copyPages(item.document, item.document.getPageIndices());
      pages.forEach((page) => output.addPage(page));
      fileRanges.push({
        fileId: item.descriptor.id,
        startPage: fileStartPage,
        endPage: output.getPageCount(),
      });
    }
    if (fileRanges.length)
      pageMap.push({
        evidenceId,
        startPage,
        endPage: output.getPageCount(),
        files: fileRanges,
        associations: proofAssociations,
      });
  }
  return { status: 'success', bytes: await output.save(), pageMap };
}
