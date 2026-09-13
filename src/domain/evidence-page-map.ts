import type { RscLevel } from './regulation';

export type EvidencePageLink = {
  level: RscLevel;
  criterionId: string;
  occurrenceId: string;
};

export type PageRange = {
  startPage: number;
  endPage: number;
};

export type EvidenceFilePageRange = PageRange & {
  fileId: string;
};

export type EvidencePageEntry = PageRange & {
  evidenceId: string;
  files: EvidenceFilePageRange[];
  links: EvidencePageLink[];
};

/** Projeção derivada do PDF de comprovantes; não integra o projeto persistido. */
export type EvidencePageMap = {
  totalPages: number;
  evidences: EvidencePageEntry[];
};
