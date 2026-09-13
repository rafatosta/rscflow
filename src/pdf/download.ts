/** Download local de bytes já preparados pelo gerador responsável. */
export function downloadPdfBytes(bytes: Uint8Array, filename: string): void {
  downloadBytes(bytes, filename, 'application/pdf');
}

export function downloadBytes(bytes: Uint8Array, filename: string, mediaType: string): void {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mediaType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
