import { jsPDF } from "jspdf";

import {
  boldFontBase64,
  regularFontBase64,
} from "@/lib/pdf/rscflow-sans-fonts";
import type { EvidencePagePlanEntry } from "@/lib/pdf/evidence-plan";
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

function addAttachmentPage(
  document: jsPDF,
  entry: EvidencePagePlanEntry,
  sourcePage: number,
) {
  document.addPage("a4", "portrait");
  document.setFont(FONT_NAME, "bold");
  document.setFontSize(9);
  document.setTextColor(0);
  document.text(
    `${entry.code} · ${entry.attachment.name}${entry.pageCount > 1 ? ` · folha ${sourcePage} de ${entry.pageCount}` : ""}`,
    MARGIN.left,
    32,
    { maxWidth: contentWidth(document) - 36 },
  );
}

function renderAttachmentPlaceholder(
  document: jsPDF,
  entry: EvidencePagePlanEntry,
  sourcePage: number,
  message: string,
) {
  addAttachmentPage(document, entry, sourcePage);
  document.setFont(FONT_NAME, "normal");
  document.setFontSize(BODY_FONT_SIZE);
  document.text(message, MARGIN.left, 110, {
    maxWidth: contentWidth(document),
  });
}

function addCanvasToCurrentPage(document: jsPDF, canvas: HTMLCanvasElement) {
  const availableWidth = contentWidth(document);
  const availableHeight = pageHeight(document) - 90;
  const scale = Math.min(
    availableWidth / canvas.width,
    availableHeight / canvas.height,
  );
  const width = canvas.width * scale;
  const height = canvas.height * scale;
  document.addImage(
    canvas,
    "JPEG",
    MARGIN.left + (availableWidth - width) / 2,
    48 + (availableHeight - height) / 2,
    width,
    height,
    undefined,
    "FAST",
  );
}

async function createImageCanvas(file: File) {
  const bitmap =
    typeof createImageBitmap === "function"
      ? await createImageBitmap(file)
      : await new Promise<HTMLImageElement>((resolve, reject) => {
          const url = URL.createObjectURL(file);
          const image = new Image();
          image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
          };
          image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Não foi possível abrir a imagem."));
          };
          image.src = url;
        });
  const maximumDimension = 2200;
  const scale = Math.min(1, maximumDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = globalThis.document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível para processar a imagem.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if ("close" in bitmap) bitmap.close();
  return canvas;
}

async function appendPdfAttachment(
  document: jsPDF,
  entry: EvidencePagePlanEntry,
) {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await entry.attachment.file.arrayBuffer()),
  });

  try {
    const source = await task.promise;
    const pages: Array<{ canvas: HTMLCanvasElement; pageNumber: number }> = [];
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      const page = await source.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.7 });
      const canvas = globalThis.document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas indisponível para processar o PDF.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      pages.push({ canvas, pageNumber });
      page.cleanup();
    }
    for (const page of pages) {
      addAttachmentPage(document, entry, page.pageNumber);
      addCanvasToCurrentPage(document, page.canvas);
    }
    source.cleanup();
  } finally {
    await task.destroy();
  }
}

async function appendEvidenceAttachment(
  document: jsPDF,
  entry: EvidencePagePlanEntry,
) {
  try {
    if (
      entry.attachment.file.type === "application/pdf" ||
      entry.attachment.name.toLowerCase().endsWith(".pdf")
    ) {
      await appendPdfAttachment(document, entry);
      return;
    }

    if (entry.attachment.file.type.startsWith("image/")) {
      const canvas = await createImageCanvas(entry.attachment.file);
      addAttachmentPage(document, entry, 1);
      addCanvasToCurrentPage(document, canvas);
      return;
    }

    renderAttachmentPlaceholder(
      document,
      entry,
      1,
      "O formato deste comprovante não pode ser exibido no PDF. Consulte o arquivo original.",
    );
  } catch {
    for (let pageNumber = 1; pageNumber <= entry.pageCount; pageNumber += 1) {
      renderAttachmentPlaceholder(
        document,
        entry,
        pageNumber,
        "Não foi possível renderizar este comprovante. Verifique o arquivo original armazenado no projeto.",
      );
    }
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

export function countEvidenceIndexPages(
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
  return document.getNumberOfPages();
}

export async function generateEvidenceIndexPdf(
  project: LocalProject,
  entries: EvidencePagePlanEntry[],
) {
  const document = createEvidenceIndexDocument();
  renderEvidenceIndexCover(document, project);
  renderEvidenceIndexContent(
    document,
    project,
    buildEvidenceEntries(
      project,
      entries.map((entry) => entry.attachment),
    ),
  );
  for (const entry of entries) await appendEvidenceAttachment(document, entry);
  renderEvidenceIndexPageNumbers(document);
  return new Uint8Array(document.output("arraybuffer"));
}
