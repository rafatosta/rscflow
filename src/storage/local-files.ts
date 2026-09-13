import type { StoredFile } from '@/domain/criterion-entry';
export async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
export async function verifiedFile(descriptor: StoredFile | undefined, blob: Blob | undefined) {
  if (!descriptor || !blob)
    throw new Error('Arquivo ausente neste navegador. Anexe o documento novamente no lançamento.');
  if (!descriptor.sha256)
    throw new Error('Integridade não verificável. Anexe o documento novamente.');
  if (blob.size !== descriptor.size || (await sha256(blob)) !== descriptor.sha256)
    throw new Error('O arquivo foi alterado. Anexe o documento original novamente.');
  return new File([blob], descriptor.name, { type: descriptor.mediaType });
}
