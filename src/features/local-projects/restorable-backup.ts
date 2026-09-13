import { z } from 'zod';
import type { FileResolver, LocalFile } from '@/domain/local-files';
import { portableProject } from '@/domain/portable-project';
import type { ProjectExport } from '@/domain/project';
import { createStoredZip } from '@/utils/stored-zip';

const manifestSchema = z
  .object({
    format: z.literal('rscflow-backup'),
    formatVersion: z.literal('1.0'),
    projectPath: z.literal('project.json'),
    projectSha256: z.string().regex(/^[a-f0-9]{64}$/),
    files: z.array(
      z
        .object({
          id: z.string().min(1),
          path: z.string().regex(/^files\/\d+\.bin$/),
          name: z.string().min(1),
          mediaType: z.string().min(1),
          size: z.number().int().nonnegative(),
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .strict(),
    ),
  })
  .strict();

export type RestorableBackup = { project: ProjectExport; files: LocalFile[] };
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

async function digest(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function blobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function')
    return blob.arrayBuffer().then((value) => new Uint8Array(value));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      reader.result instanceof ArrayBuffer
        ? resolve(new Uint8Array(reader.result))
        : reject(new Error('Não foi possível ler o arquivo.'));
    reader.onerror = () => reject(reader.error ?? new Error('Não foi possível ler o arquivo.'));
    reader.readAsArrayBuffer(blob);
  });
}

export async function createRestorableBackup(projectInput: ProjectExport, resolver?: FileResolver) {
  const project = portableProject(structuredClone(projectInput));
  const descriptors = project.schemaVersion === '3.0' ? project.userData.storedFiles : [];
  if (descriptors.length && !resolver)
    throw new Error('Os arquivos locais não estão disponíveis para o backup.');
  const files: { name: string; bytes: Uint8Array }[] = [];
  const manifestFiles = [];
  for (const [index, descriptor] of descriptors.entries()) {
    const file = await resolver!.getFile(descriptor.id);
    const bytes = await blobBytes(file);
    const sha256 = await digest(bytes);
    if (bytes.length !== descriptor.size || !descriptor.sha256 || sha256 !== descriptor.sha256)
      throw new Error(`Falha de integridade no arquivo "${descriptor.name}".`);
    const path = `files/${index}.bin`;
    files.push({ name: path, bytes });
    manifestFiles.push({
      id: descriptor.id,
      path,
      name: descriptor.name,
      mediaType: descriptor.mediaType,
      size: descriptor.size,
      sha256,
    });
  }
  const projectBytes = encoder.encode(JSON.stringify(project));
  const manifest = {
    format: 'rscflow-backup',
    formatVersion: '1.0',
    projectPath: 'project.json',
    projectSha256: await digest(projectBytes),
    files: manifestFiles,
  } as const;
  return createStoredZip([
    { name: 'manifest.json', bytes: encoder.encode(JSON.stringify(manifest)) },
    { name: 'project.json', bytes: projectBytes },
    ...files,
  ]);
}

function readZip(bytes: Uint8Array) {
  if (bytes.length > 250_000_000) throw new Error('O backup excede o tamanho permitido.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = new Map<string, Uint8Array>();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    if (view.getUint16(offset + 8, true) !== 0)
      throw new Error('O backup usa uma compactação incompatível.');
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const dataOffset = offset + 30 + nameLength + extraLength;
    if (dataOffset + size > bytes.length || entries.size >= 1000)
      throw new Error('Estrutura ZIP inválida.');
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    if (!name || name.includes('..') || name.startsWith('/') || entries.has(name))
      throw new Error('Caminho inválido ou duplicado no backup.');
    entries.set(name, bytes.slice(dataOffset, dataOffset + size));
    offset = dataOffset + size;
  }
  if (!entries.size) throw new Error('O arquivo não contém um backup RSCFlow válido.');
  return entries;
}

export async function restoreRestorableBackup(
  file: Pick<File, 'arrayBuffer'>,
): Promise<RestorableBackup> {
  let entries: Map<string, Uint8Array>;
  try {
    entries = readZip(await blobBytes(file as Blob));
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Não foi possível ler o backup.');
  }
  const manifestBytes = entries.get('manifest.json');
  const projectBytes = entries.get('project.json');
  if (!manifestBytes || !projectBytes) throw new Error('Manifesto ou projeto ausente no backup.');
  let manifest: z.infer<typeof manifestSchema>;
  let project: ProjectExport;
  try {
    manifest = manifestSchema.parse(JSON.parse(decoder.decode(manifestBytes)));
    project = portableProject(JSON.parse(decoder.decode(projectBytes)));
  } catch {
    throw new Error('Manifesto ou dados do projeto inválidos.');
  }
  if ((await digest(projectBytes)) !== manifest.projectSha256)
    throw new Error('Falha de integridade nos dados do projeto.');
  if (project.schemaVersion !== '3.0' && manifest.files.length)
    throw new Error('Arquivos binários não correspondem ao schema do projeto.');
  const descriptors = project.schemaVersion === '3.0' ? project.userData.storedFiles : [];
  if (manifest.files.length !== descriptors.length || entries.size !== manifest.files.length + 2)
    throw new Error('Conteúdo do backup incompleto ou inesperado.');
  const files: LocalFile[] = [];
  for (const item of manifest.files) {
    const descriptor = descriptors.find((value) => value.id === item.id);
    const bytes = entries.get(item.path);
    if (
      !descriptor ||
      !bytes ||
      descriptor.name !== item.name ||
      descriptor.mediaType !== item.mediaType ||
      descriptor.size !== item.size ||
      descriptor.sha256 !== item.sha256 ||
      bytes.length !== item.size ||
      (await digest(bytes)) !== item.sha256
    )
      throw new Error(`Falha de integridade no arquivo "${item.name}".`);
    files.push({
      id: item.id,
      blob: new File(
        [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer],
        item.name,
        { type: item.mediaType },
      ),
    });
  }
  return { project, files };
}
