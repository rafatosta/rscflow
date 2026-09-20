import { jsPDF } from "jspdf";

import {
  boldFontBase64,
  regularFontBase64,
} from "@/lib/pdf/rscflow-sans-fonts";
import type { LocalProject, StoredAttachment } from "@/lib/projects";

const POINTS_PER_CENTIMETER = 72 / 2.54;
const MARGIN = {
  top: 3 * POINTS_PER_CENTIMETER,
  right: 2 * POINTS_PER_CENTIMETER,
  bottom: 2 * POINTS_PER_CENTIMETER,
  left: 3 * POINTS_PER_CENTIMETER,
};
const FONT_NAME = "RSCFlowSans";
const BODY_FONT_SIZE = 12;
const LINE_HEIGHT = BODY_FONT_SIZE * 1.5;
const ENTRY_GAP = LINE_HEIGHT / 2;
const CODE_COLUMN_WIDTH = 58;

type EvidenceEntry = {
  code: string;
  description: string;
};

function installEvidenceIndexFonts(document: jsPDF) {
  document.addFileToVFS("RSCFlowSans-Regular.ttf", regularFontBase64);
  document.addFont("RSCFlowSans-Regular.ttf", FONT_NAME, "normal");
  document.addFileToVFS("RSCFlowSans-Bold.ttf", boldFontBase64);
  document.addFont("RSCFlowSans-Bold.ttf", FONT_NAME, "bold");
  document.setFont(FONT_NAME, "normal");
}

function createEvidenceIndexDocument() {
  const document = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });

  installEvidenceIndexFonts(document);
  document.setProperties({
    title: "Índice de comprovantes",
    subject: "Índice dos comprovantes do processo de RSC",
    creator: "RSCFlow",
  });
  document.setTextColor(0);
  document.setFontSize(BODY_FONT_SIZE);
  return document;
}

function pageWidth(document: jsPDF) {
  return document.internal.pageSize.getWidth();
}

function pageHeight(document: jsPDF) {
  return document.internal.pageSize.getHeight();
}

function contentWidth(document: jsPDF) {
  return pageWidth(document) - MARGIN.left - MARGIN.right;
}

function renderCenteredLines(
  document: jsPDF,
  value: string,
  y: number,
  style: "normal" | "bold" = "normal",
) {
  document.setFont(FONT_NAME, style);
  document.setFontSize(BODY_FONT_SIZE);
  const lines = document.splitTextToSize(value, contentWidth(document)) as string[];

  lines.forEach((line, index) => {
    document.text(line, pageWidth(document) / 2, y + index * LINE_HEIGHT, {
      align: "center",
    });
  });
}

function renderEvidenceIndexCover(document: jsPDF, project: LocalProject) {
  const identification = project.identification;
  const year = Number.isNaN(Date.parse(project.updatedAt))
    ? new Date().getFullYear()
    : new Date(project.updatedAt).getUTCFullYear();

  renderCenteredLines(
    document,
    (identification?.institution ?? "Instituto Federal da Bahia").toUpperCase(),
    112,
    "bold",
  );
  renderCenteredLines(document, identification?.name ?? project.name, 238);
  renderCenteredLines(document, "ÍNDICE DE COMPROVANTES", 390, "bold");
  renderCenteredLines(document, project.rscLevel, 430, "bold");
  renderCenteredLines(
    document,
    identification?.campus ?? "Campus não informado",
    706,
  );
  renderCenteredLines(document, String(year), 742);
}

function addEvidenceIndexContentPage(document: jsPDF) {
  document.addPage();
  document.setFont(FONT_NAME, "normal");
  document.setFontSize(BODY_FONT_SIZE);
  document.setTextColor(0);
  return MARGIN.top + BODY_FONT_SIZE;
}

function ensureEvidenceIndexSpace(
  document: jsPDF,
  y: number,
  requiredHeight = LINE_HEIGHT,
) {
  if (y + requiredHeight <= pageHeight(document) - MARGIN.bottom) return y;
  return addEvidenceIndexContentPage(document);
}

function renderIdentityLine(
  document: jsPDF,
  label: string,
  value: string,
  initialY: number,
) {
  const labelText = `${label}:`;
  document.setFont(FONT_NAME, "bold");
  const labelWidth = document.getTextWidth(`${labelText} `);
  document.setFont(FONT_NAME, "normal");
  const valueLines = document.splitTextToSize(
    value,
    contentWidth(document) - labelWidth,
  ) as string[];
  let y = ensureEvidenceIndexSpace(
    document,
    initialY,
    Math.max(1, valueLines.length) * LINE_HEIGHT,
  );

  document.setFont(FONT_NAME, "bold");
  document.text(labelText, MARGIN.left, y);
  document.setFont(FONT_NAME, "normal");
  valueLines.forEach((line, index) => {
    document.text(
      line,
      MARGIN.left + labelWidth,
      y + index * LINE_HEIGHT,
    );
  });

  return y + Math.max(1, valueLines.length) * LINE_HEIGHT;
}

function renderEvidenceEntry(
  document: jsPDF,
  entry: EvidenceEntry,
  initialY: number,
) {
  const descriptionWidth = contentWidth(document) - CODE_COLUMN_WIDTH;
  const lines = document.splitTextToSize(
    entry.description,
    descriptionWidth,
  ) as string[];
  const entryHeight = Math.max(1, lines.length) * LINE_HEIGHT + ENTRY_GAP;
  const maximumEntryHeight =
    pageHeight(document) - MARGIN.top - MARGIN.bottom - BODY_FONT_SIZE;
  let y =
    entryHeight <= maximumEntryHeight
      ? ensureEvidenceIndexSpace(document, initialY, entryHeight)
      : initialY;

  lines.forEach((line, index) => {
    y = ensureEvidenceIndexSpace(document, y);
    if (index === 0) {
      document.setFont(FONT_NAME, "bold");
      document.text(entry.code, MARGIN.left, y);
    }
    document.setFont(FONT_NAME, "normal");
    document.text(line, MARGIN.left + CODE_COLUMN_WIDTH, y);
    y += LINE_HEIGHT;
  });

  return y + ENTRY_GAP;
}

function renderEvidenceIndexContent(
  document: jsPDF,
  project: LocalProject,
  entries: EvidenceEntry[],
) {
  let y = addEvidenceIndexContentPage(document);
  document.setFont(FONT_NAME, "bold");
  document.text("SUMÁRIO DE COMPROVANTES", MARGIN.left, y);
  document.setFont(FONT_NAME, "normal");
  y += LINE_HEIGHT * 2;

  const identification = project.identification;
  y = renderIdentityLine(
    document,
    "Docente",
    identification?.name ?? "Não informado",
    y,
  );
  y = renderIdentityLine(
    document,
    "SIAPE",
    identification?.siape ?? "Não informado",
    y,
  );
  y = renderIdentityLine(
    document,
    "Cargo",
    identification?.position ?? "Não informado",
    y,
  );
  y = renderIdentityLine(
    document,
    "Instituição/campus",
    identification
      ? `${identification.institution} - ${identification.campus}`
      : "Não informado",
    y,
  );
  y = renderIdentityLine(document, "Nível solicitado", project.rscLevel, y);
  y += LINE_HEIGHT;

  if (!entries.length) {
    y = ensureEvidenceIndexSpace(document, y);
    document.text(
      "Nenhum anexo binário está disponível neste navegador.",
      MARGIN.left,
      y,
    );
    return;
  }

  entries.forEach((entry) => {
    y = renderEvidenceEntry(document, entry, y);
  });
}

function renderEvidenceIndexPageNumbers(document: jsPDF) {
  for (
    let physicalPage = 2;
    physicalPage <= document.getNumberOfPages();
    physicalPage += 1
  ) {
    document.setPage(physicalPage);
    document.setFont(FONT_NAME, "normal");
    document.setFontSize(10);
    document.text(
      String(physicalPage - 1),
      pageWidth(document) - MARGIN.right,
      MARGIN.top / 2,
      { align: "right" },
    );
  }
}

function buildEvidenceEntries(
  project: LocalProject,
  attachments: StoredAttachment[],
) {
  const occurrences = project.requirementOccurrences ?? [];

  return attachments.map((attachment, index) => {
    const occurrence = occurrences.find(
      (item) => item.id === attachment.occurrenceId,
    );
    return {
      code: `C-${String(index + 1).padStart(3, "0")}`,
      description: occurrence
        ? `${attachment.name} - ${occurrence.description}`
        : attachment.name,
    };
  });
}

export function generateEvidenceIndexPdf(
  project: LocalProject,
  attachments: StoredAttachment[],
) {
  const document = createEvidenceIndexDocument();
  renderEvidenceIndexCover(document, project);
  renderEvidenceIndexContent(
    document,
    project,
    buildEvidenceEntries(project, attachments),
  );
  renderEvidenceIndexPageNumbers(document);
  return new Uint8Array(document.output("arraybuffer"));
}
