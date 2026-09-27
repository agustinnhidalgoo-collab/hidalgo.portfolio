/** URL pública de un archivo: las referencias de Vercel Blob ya son URLs completas. */
export function mediaUrl(file: string): string {
  return /^https?:\/\//.test(file) ? file : `/media/${file}`;
}
