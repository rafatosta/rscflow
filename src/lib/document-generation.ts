import type { Regulation } from "@/domain/regulation";
import type { LocalProject, StoredAttachment } from "@/lib/projects";
import { generateEvidenceIndexPdf } from "@/lib/pdf/evidence-index-generator";
import { generateMemorialPdf } from "@/lib/pdf/memorial-generator";
import { generateNormativeFormsPdf } from "@/lib/pdf/normative-forms-generator";
import { buildNormativeProcessDocument } from "@/lib/pdf/normative-model";

type PdfPage = {
  title: string;
  lines: string[];
  eyebrow?: string;
  cover?: boolean;
  content?: string;
};

const encoder = new TextEncoder();

function latin1(value: string) {
  const winAnsi: Record<number, number> = {
    0x2013: 0x96,
    0x2014: 0x97,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201c: 0x93,
    0x201d: 0x94,
    0x2022: 0x95,
    0x2026: 0x85,
    0x20ac: 0x80,
  };
  const normalized = value.normalize("NFC");
  const bytes = new Uint8Array(normalized.length);
  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index);
    bytes[index] = code <= 255 ? code : (winAnsi[code] ?? 0x20);
  }
  return bytes;
}

function joinBytes(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function wrap(text: string, width = 88) {
  return text.split(/\n+/).flatMap((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && next.length > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  });
}

function pdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/** Produz um PDF A4 com a mesma hierarquia editorial da prévia do processo. */
export function createPdf(pages: PdfPage[]) {
  const renderedPages = pages.flatMap((page) => {
    if (page.content) return [page];
    if (page.cover) return [page];
    const lines = page.lines.flatMap((line) => wrap(line, 82));
    return Array.from(
      { length: Math.max(1, Math.ceil(lines.length / 43)) },
      (_, index) => ({
        ...page,
        title: index ? `${page.title} (continuação)` : page.title,
        lines: lines.slice(index * 43, (index + 1) * 43),
      }),
    );
  });
  const pageContents = renderedPages.map((page, pageIndex) => {
    const body = page.lines.flatMap((line) => wrap(line, 82));
    const footer = `${page.eyebrow ?? "DOCUMENTO RSC"} - página ${pageIndex + 1} de ${renderedPages.length}`;
    const commands = page.content
      ? [page.content]
      : page.cover
        ? [
            "BT",
            "/F2 12 Tf",
            "0.2 g",
            "175 700 Td",
            "(INSTITUTO FEDERAL DA BAHIA) Tj",
            "/F2 24 Tf",
            "0 -92 Td",
            `(${pdfText(page.title.toUpperCase())}) Tj`,
            "/F1 13 Tf",
            "0 -42 Td",
            ...body.flatMap((line) => ["0 -20 Td", `(${pdfText(line)}) Tj`]),
            "ET",
          ]
        : [
            "BT",
            "/F2 8 Tf",
            "0.45 g",
            "50 800 Td",
            `(${pdfText((page.eyebrow ?? "DOCUMENTO RSC").toUpperCase())}) Tj`,
            "/F2 18 Tf",
            "0 g",
            "0 -34 Td",
            `(${pdfText(page.title)}) Tj`,
            "/F1 11 Tf",
            "0 -38 Td",
            ...body.flatMap((line) => ["0 -15 Td", `(${pdfText(line)}) Tj`]),
            "ET",
            "BT",
            "0.45 g",
            "/F1 8 Tf",
            "50 32 Td",
            `(${pdfText(footer)}) Tj`,
            "ET",
          ];
    return latin1(commands.join("\n"));
  });
  const objectCount = 4 + pageContents.length * 2;
  const objects: Uint8Array[] = [];
  const pageObjectIds = pageContents.map((_, index) => 5 + index * 2);
  objects.push(encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.push(
    encoder.encode(
      `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageContents.length} >>`,
    ),
  );
  objects.push(
    encoder.encode(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    ),
  );
  objects.push(
    encoder.encode(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ),
  );
  pageContents.forEach((content, index) => {
    const pageId = pageObjectIds[index];
    objects[pageId - 1] = encoder.encode(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`,
    );
    objects[pageId] = joinBytes([
      encoder.encode(`<< /Length ${content.length} >>\nstream\n`),
      content,
      encoder.encode("\nendstream"),
    ]);
  });
  const header = encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const chunks: Uint8Array[] = [header];
  const offsets = [0];
  let position = header.length;
  objects.forEach((object, index) => {
    offsets.push(position);
    const wrapped = joinBytes([
      encoder.encode(`${index + 1} 0 obj\n`),
      object,
      encoder.encode("\nendobj\n"),
    ]);
    chunks.push(wrapped);
    position += wrapped.length;
  });
  const xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${position}\n%%EOF`;
  chunks.push(encoder.encode(xref));
  return new Blob([joinBytes(chunks)], { type: "application/pdf" });
}

export function createMemorialPdf(project: LocalProject) {
  const bytes = generateMemorialPdf(project);
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function createFormsPdf(
  project: LocalProject,
  catalog?: Regulation,
  firstEvidencePages: Record<string, number> = {},
) {
  if (!catalog)
    return createPdf([
      {
        title: "Formulários normativos",
        lines: [
          "Dataset normativo indisponível para preencher os formulários de pontuação.",
        ],
        eyebrow: "Formulários normativos",
      },
    ]);
  const bytes = generateNormativeFormsPdf(
    buildNormativeProcessDocument(project, catalog, firstEvidencePages),
  );
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function createEvidenceIndexPdf(
  project: LocalProject,
  attachments: StoredAttachment[],
) {
  const bytes = generateEvidenceIndexPdf(project, attachments);
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function u16(value: number) {
  return Uint8Array.of(value & 255, (value >>> 8) & 255);
}
function u32(value: number) {
  return Uint8Array.of(
    value & 255,
    (value >>> 8) & 255,
    (value >>> 16) & 255,
    (value >>> 24) & 255,
  );
}

/** Cria um ZIP sem compressão, preservando os anexos binários armazenados no IndexedDB. */
export function createZip(files: { name: string; data: Uint8Array }[]) {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = joinBytes([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      name,
      file.data,
    ]);
    chunks.push(local);
    central.push(
      joinBytes([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(file.data.length),
        u32(file.data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name,
      ]),
    );
    offset += local.length;
  }
  const centralData = joinBytes(central);
  return new Blob(
    [
      joinBytes([
        ...chunks,
        centralData,
        u32(0x06054b50),
        u16(0),
        u16(0),
        u16(files.length),
        u16(files.length),
        u32(centralData.length),
        u32(offset),
        u16(0),
      ]),
    ],
    { type: "application/zip" },
  );
}

export function downloadFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
