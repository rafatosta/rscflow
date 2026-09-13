import type { OccurrenceProjectExport, StoredFile } from '@/domain/criterion-entry';
import type {
  EvidenceFilePageRange,
  EvidencePageEntry,
  EvidencePageLink,
  EvidencePageMap,
} from '@/domain/evidence-page-map';
import type { FileResolver } from '@/domain/local-files';
import type { RscLevel } from '@/domain/regulation';
import { PDFDocument } from 'pdf-lib';

export type EvidenceBundleItem = {
  evidenceId: string;
  files: StoredFile[];
  links: EvidencePageLink[];
};

export type EvidenceBundleIssue = {
  code: 'missing-file' | 'invalid-file' | 'unsupported-file';
  evidenceId: string;
  fileId?: string;
  message: string;
};

export type EvidenceBundleResult =
  | { status: 'success'; bytes: Uint8Array; pageMap: EvidencePageMap }
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

function compareLink(left: EvidencePageLink, right: EvidencePageLink) {
  return (
    levelOrder[left.level] - levelOrder[right.level] ||
    compareNatural(left.criterionId, right.criterionId) ||
    compareNatural(left.occurrenceId, right.occurrenceId)
  );
}

function orderedLinks(project: OccurrenceProjectExport) {
  return project.userData.criterionEntries
    .flatMap((entry) => {
      if (!entry.selectedLevel) return [];
      return entry.occurrences.flatMap((occurrence) =>
        occurrence.evidenceIds.map((evidenceId) => ({
          evidenceId,
          link: {
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
        levelOrder[left.link.level] - levelOrder[right.link.level] ||
        compareNatural(left.link.criterionId, right.link.criterionId) ||
        left.occurrenceOrder - right.occurrenceOrder ||
        compareNatural(left.link.occurrenceId, right.link.occurrenceId),
    );
}

/** Define uma única sequência para a concatenação e para o mapa de páginas derivado. */
export function createEvidenceBundlePlan(project: OccurrenceProjectExport): EvidenceBundleItem[] {
  const evidence = new Map(project.userData.evidence.map((item) => [item.id, item] as const));
  const files = new Map(project.userData.storedFiles.map((item) => [item.id, item] as const));
  const plan = new Map<string, EvidenceBundleItem>();
  for (const item of orderedLinks(project)) {
    const existing = plan.get(item.evidenceId);
    if (existing) {
      if (!existing.links.some((link) => compareLink(link, item.link) === 0))
        existing.links.push(item.link);
      continue;
    }
    const proof = evidence.get(item.evidenceId);
    if (!proof) continue;
    plan.set(item.evidenceId, {
      evidenceId: item.evidenceId,
      files: proof.fileIds.flatMap((fileId) => (files.has(fileId) ? [files.get(fileId)!] : [])),
      links: [item.link],
    });
  }
  return [...plan.values()];
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

function fileBytes(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      reader.result instanceof ArrayBuffer
        ? resolve(reader.result)
        : reject(new Error('Não foi possível ler os bytes do arquivo.'));
    reader.onerror = () => reject(reader.error ?? new Error('Não foi possível ler o arquivo.'));
    reader.readAsArrayBuffer(file);
  });
}

/** Consolida PDFs vinculados sem consultar armazenamento nem alterar o projeto. */
export async function createEvidenceBundle(
  project: OccurrenceProjectExport,
  resolver: FileResolver,
): Promise<EvidenceBundleResult> {
  const plan = createEvidenceBundlePlan(project);
  const loaded = new Map<string, { descriptor: StoredFile; document: PDFDocument }[]>();
  const issues: EvidenceBundleIssue[] = [];
  for (const item of plan) {
    if (!item.files.length) {
      issues.push({
        code: 'missing-file',
        evidenceId: item.evidenceId,
        message: 'O comprovante não possui arquivo associado.',
      });
      continue;
    }
    for (const descriptor of item.files) {
      const fileId = descriptor.id;
      if (descriptor.mediaType.toLowerCase() !== 'application/pdf') {
        issues.push({
          code: 'unsupported-file',
          evidenceId: item.evidenceId,
          fileId,
          message: `O arquivo "${descriptor.name}" não é PDF.`,
        });
        continue;
      }
      try {
        const file = await resolver.getFile(fileId);
        const document = await PDFDocument.load(await fileBytes(file));
        if (document.getPageCount() === 0) throw new Error('O PDF não possui páginas.');
        const current = loaded.get(item.evidenceId) ?? [];
        current.push({ descriptor, document });
        loaded.set(item.evidenceId, current);
      } catch (error) {
        issues.push(issueFor(error, item.evidenceId, descriptor));
      }
    }
  }
  if (issues.length) return { status: 'error', issues };

  const output = await PDFDocument.create();
  const evidences: EvidencePageEntry[] = [];
  for (const item of plan) {
    const startPage = output.getPageCount() + 1;
    const fileRanges: EvidenceFilePageRange[] = [];
    for (const file of loaded.get(item.evidenceId) ?? []) {
      const fileStartPage = output.getPageCount() + 1;
      const pages = await output.copyPages(file.document, file.document.getPageIndices());
      pages.forEach((page) => output.addPage(page));
      fileRanges.push({
        fileId: file.descriptor.id,
        startPage: fileStartPage,
        endPage: output.getPageCount(),
      });
    }
    if (fileRanges.length)
      evidences.push({
        evidenceId: item.evidenceId,
        startPage,
        endPage: output.getPageCount(),
        files: fileRanges,
        links: item.links,
      });
  }
  return {
    status: 'success',
    bytes: await output.save(),
    pageMap: { totalPages: output.getPageCount(), evidences },
  };
}

/** Obtém o mapa exatamente da consolidação que valida e concatena os arquivos. */
export async function createEvidencePageMap(
  project: OccurrenceProjectExport,
  resolver: FileResolver,
): Promise<EvidencePageMap> {
  const result = await createEvidenceBundle(project, resolver);
  if (result.status === 'error')
    throw new Error(result.issues.map((issue) => issue.message).join(' '));
  return result.pageMap;
}
