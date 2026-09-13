import type { TypedProjectExport } from '@/domain/project';
import type { ProcessGenerationResult } from './generate-all';
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

const encoder = new TextEncoder();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function concat(parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function zip(files: { name: string; bytes: Uint8Array }[]) {
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.bytes);
    const header = concat([
      uint32(0x04034b50),
      uint16(20),
      uint16(0x0800),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(file.bytes.length),
      uint32(file.bytes.length),
      uint16(name.length),
      uint16(0),
      name,
    ]);
    local.push(header, file.bytes);
    central.push(
      concat([
        uint32(0x02014b50),
        uint16(20),
        uint16(20),
        uint16(0x0800),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(crc),
        uint32(file.bytes.length),
        uint32(file.bytes.length),
        uint16(name.length),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(offset),
        name,
      ]),
    );
    offset += header.length + file.bytes.length;
  }
  const directory = concat(central);
  return concat([
    ...local,
    directory,
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(directory.length),
    uint32(offset),
    uint16(0),
  ]);
}

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
    bytes: zip(files),
    filename: finalPackageFilename(project),
    entries: files.map((file) => ({
      artifact: file.artifact,
      filename: file.name,
      size: file.bytes.length,
    })),
  };
}
