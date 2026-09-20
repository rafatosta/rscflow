import { jsPDF } from "jspdf";

import {
  boldFontBase64,
  regularFontBase64,
} from "@/lib/pdf/rscflow-sans-fonts";
import type { LocalProject, MemorialSection } from "@/lib/projects";

const POINTS_PER_CENTIMETER = 72 / 2.54;
const MARGIN = {
  top: 3 * POINTS_PER_CENTIMETER,
  right: 2 * POINTS_PER_CENTIMETER,
  bottom: 2 * POINTS_PER_CENTIMETER,
  left: 3 * POINTS_PER_CENTIMETER,
};
const BODY_FONT_SIZE = 12;
const LINE_HEIGHT = BODY_FONT_SIZE * 1.5;
const FIRST_LINE_INDENT = 1.25 * POINTS_PER_CENTIMETER;
const FONT_NAME = "RSCFlowSans";

const SECTION_LABELS: Record<string, string> = {
  cover: "Apresentação",
  introduction: "Introdução",
  career: "Trajetória profissional",
  teaching: "Atuação docente",
  outreach: "Extensão e pesquisa",
  management: "Gestão e contribuição institucional",
  conclusion: "Conclusão",
};

type SummaryEntry = {
  page: number;
};

type MemorialBuild = {
  document: jsPDF;
  sectionPages: number[];
  firstContentPage?: number;
};

function installMemorialFonts(document: jsPDF) {
  document.addFileToVFS("RSCFlowSans-Regular.ttf", regularFontBase64);
  document.addFont("RSCFlowSans-Regular.ttf", FONT_NAME, "normal");
  document.addFileToVFS("RSCFlowSans-Bold.ttf", boldFontBase64);
  document.addFont("RSCFlowSans-Bold.ttf", FONT_NAME, "bold");
  document.setFont(FONT_NAME, "normal");
}

function createMemorialDocument() {
  const document = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true,
  });

  installMemorialFonts(document);
  document.setProperties({
    title: "Memorial descritivo",
    subject: "Memorial descritivo para processo de RSC",
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

function renderMemorialCover(document: jsPDF, project: LocalProject) {
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
  renderCenteredLines(
    document,
    identification?.name ?? project.name,
    238,
  );
  renderCenteredLines(document, "MEMORIAL DESCRITIVO", 390, "bold");
  renderCenteredLines(document, project.rscLevel, 430, "bold");
  renderCenteredLines(
    document,
    identification?.campus ?? "Campus não informado",
    706,
  );
  renderCenteredLines(document, String(year), 742);
}

function renderMemorialSummary(
  document: jsPDF,
  sections: MemorialSection[],
  entries: SummaryEntry[],
) {
  document.addPage();
  document.setFont(FONT_NAME, "bold");
  document.setFontSize(BODY_FONT_SIZE);
  document.text("SUMÁRIO", pageWidth(document) / 2, MARGIN.top + BODY_FONT_SIZE, {
    align: "center",
  });

  document.setFont(FONT_NAME, "normal");
  let y = MARGIN.top + BODY_FONT_SIZE + LINE_HEIGHT * 2;

  if (!sections.length) {
    document.text("Nenhuma seção preenchida.", MARGIN.left, y);
    return;
  }

  sections.forEach((section, index) => {
    const page = entries[index]?.page ?? 1;
    const prefix = `${index + 1} ${(SECTION_LABELS[section.id] ?? "Seção do memorial").toUpperCase()}`;
    const pageLabel = String(page);
    const available =
      contentWidth(document) -
      document.getTextWidth(prefix) -
      document.getTextWidth(pageLabel) -
      document.getTextWidth("  ");
    const dotWidth = Math.max(document.getTextWidth("."), 1);
    const dots = ".".repeat(Math.max(3, Math.floor(available / dotWidth)));

    document.text(prefix, MARGIN.left, y);
    document.text(dots, MARGIN.left + document.getTextWidth(prefix) + document.getTextWidth(" "), y);
    document.text(pageLabel, pageWidth(document) - MARGIN.right, y, {
      align: "right",
    });
    y += LINE_HEIGHT;
  });
}

function addMemorialContentPage(document: jsPDF) {
  document.addPage();
  document.setFont(FONT_NAME, "normal");
  document.setFontSize(BODY_FONT_SIZE);
  document.setTextColor(0);
  return MARGIN.top + BODY_FONT_SIZE;
}

function ensureMemorialPageSpace(document: jsPDF, y: number) {
  if (y <= pageHeight(document) - MARGIN.bottom) return y;
  return addMemorialContentPage(document);
}

function splitParagraphLines(document: jsPDF, paragraph: string) {
  const words = paragraph.trim().split(/\s+/).filter(Boolean);
  const lines: { words: string[]; first: boolean }[] = [];
  let current: string[] = [];
  let first = true;

  const availableWidth = () =>
    contentWidth(document) - (first ? FIRST_LINE_INDENT : 0);

  for (const word of words) {
    const candidate = [...current, word].join(" ");
    if (document.getTextWidth(candidate) <= availableWidth()) {
      current.push(word);
      continue;
    }

    if (current.length) {
      lines.push({ words: current, first });
      current = [];
      first = false;
    }

    if (document.getTextWidth(word) <= availableWidth()) {
      current = [word];
      continue;
    }

    const fragments = document.splitTextToSize(word, availableWidth()) as string[];
    fragments.slice(0, -1).forEach((fragment) => {
      lines.push({ words: [fragment], first: false });
    });
    current = fragments.length ? [fragments.at(-1)!] : [word];
  }

  if (current.length) lines.push({ words: current, first });
  return lines;
}

function renderJustifiedLine(
  document: jsPDF,
  words: string[],
  y: number,
  first: boolean,
  justify: boolean,
) {
  const x = MARGIN.left + (first ? FIRST_LINE_INDENT : 0);
  const width = contentWidth(document) - (first ? FIRST_LINE_INDENT : 0);

  if (!justify || words.length < 2) {
    document.text(words.join(" "), x, y);
    return;
  }

  const wordsWidth = words.reduce(
    (total, word) => total + document.getTextWidth(word),
    0,
  );
  const gap = (width - wordsWidth) / (words.length - 1);
  if (gap > document.getTextWidth(" ") * 3) {
    document.text(words.join(" "), x, y);
    return;
  }
  let cursor = x;

  words.forEach((word, index) => {
    document.text(word, cursor, y);
    cursor += document.getTextWidth(word);
    if (index < words.length - 1) cursor += gap;
  });
}

function renderJustifiedParagraph(
  document: jsPDF,
  paragraph: string,
  initialY: number,
) {
  const lines = splitParagraphLines(document, paragraph);
  let y = initialY;

  lines.forEach((line, index) => {
    y = ensureMemorialPageSpace(document, y);
    renderJustifiedLine(
      document,
      line.words,
      y,
      line.first,
      index < lines.length - 1,
    );
    y += LINE_HEIGHT;
  });

  return y;
}

function renderMemorialSection(
  document: jsPDF,
  section: MemorialSection,
  index: number,
) {
  let y = addMemorialContentPage(document);
  const title = `${index + 1} ${(SECTION_LABELS[section.id] ?? "Seção do memorial").toUpperCase()}`;

  document.setFont(FONT_NAME, "bold");
  document.text(title, MARGIN.left, y);
  document.setFont(FONT_NAME, "normal");
  y += LINE_HEIGHT * 2;

  const paragraphs = section.content
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  paragraphs.forEach((paragraph) => {
    y = renderJustifiedParagraph(document, paragraph, y);
  });
}

function renderMemorialPageNumbers(document: jsPDF, firstContentPage?: number) {
  if (!firstContentPage) return;

  for (
    let physicalPage = firstContentPage;
    physicalPage <= document.getNumberOfPages();
    physicalPage += 1
  ) {
    document.setPage(physicalPage);
    document.setFont(FONT_NAME, "normal");
    document.setFontSize(10);
    document.text(
      String(physicalPage - firstContentPage + 1),
      pageWidth(document) - MARGIN.right,
      MARGIN.top / 2,
      { align: "right" },
    );
  }
}

function buildMemorial(
  project: LocalProject,
  sections: MemorialSection[],
  summaryEntries: SummaryEntry[],
): MemorialBuild {
  const document = createMemorialDocument();
  renderMemorialCover(document, project);
  renderMemorialSummary(document, sections, summaryEntries);

  const sectionPages: number[] = [];
  sections.forEach((section, index) => {
    const sectionStartPage = document.getNumberOfPages() + 1;
    renderMemorialSection(document, section, index);
    sectionPages.push(sectionStartPage);
  });

  const firstContentPage = sectionPages[0];
  renderMemorialPageNumbers(document, firstContentPage);
  return { document, sectionPages, firstContentPage };
}

export function generateMemorialPdf(project: LocalProject) {
  const sections = (project.memorialSections ?? []).filter((section) =>
    section.content.trim(),
  );
  const firstPass = buildMemorial(project, sections, []);
  const entries = sections.map((_, index) => ({
    page: firstPass.firstContentPage
      ? firstPass.sectionPages[index] - firstPass.firstContentPage + 1
      : 1,
  }));
  const final = buildMemorial(project, sections, entries);
  return new Uint8Array(final.document.output("arraybuffer"));
}
