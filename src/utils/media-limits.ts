/**
 * Mirrors backend/src/utils/media-types.ts so an unsuitable file is rejected before it is
 * uploaded. The server stays the authority; keep both lists in step.
 */
export type UploadMediaKind = 'image' | 'video' | 'audio' | 'document';

export const MEDIA_MAX_MB: Record<UploadMediaKind, number> = {
  image: 5,
  video: 16,
  audio: 16,
  document: 50,
};

/** Value for an <input type="file" accept="…">. */
export const MEDIA_ACCEPT =
  'image/jpeg,image/png,image/webp,video/mp4,video/3gpp,video/quicktime,audio/*,' +
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

const EXTENSION_KIND: Record<string, UploadMediaKind> = {
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image',
  mp4: 'video', '3gp': 'video', mov: 'video', webm: 'video',
  aac: 'audio', m4a: 'audio', mp3: 'audio', amr: 'audio', ogg: 'audio',
  pdf: 'document', doc: 'document', docx: 'document', xls: 'document', xlsx: 'document',
  ppt: 'document', pptx: 'document', txt: 'document', csv: 'document',
};

export function uploadKindOf(file: { name: string; type: string }): UploadMediaKind | null {
  const mime = file.type.split(';')[0].trim().toLowerCase();
  if (/^image\/(jpeg|png|webp)$/.test(mime)) return 'image';
  if (/^video\/(mp4|3gpp|quicktime|webm)$/.test(mime)) return 'video';
  if (/^audio\/(aac|mp4|mpeg|amr|ogg|webm)$/.test(mime)) return 'audio';
  if (/^application\/(pdf|msword|vnd\.)/.test(mime) || /^text\/(plain|csv)$/.test(mime)) return 'document';
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_KIND[extension] ?? null;
}

/** Returns a user-facing problem with the file, or null when it can be uploaded. */
export function validateMediaFile(file: { name: string; type: string; size: number }): string | null {
  const kind = uploadKindOf(file);
  if (!kind) {
    return 'This file type is not supported. Send an image (JPG, PNG, WebP), video (MP4), audio (MP3, M4A, OGG) or a document (PDF, Office, TXT, CSV).';
  }
  const limitMb = MEDIA_MAX_MB[kind];
  if (file.size > limitMb * 1024 * 1024) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `This ${kind} is too large (${sizeMb} MB). The limit for ${kind}s is ${limitMb} MB.`;
  }
  return null;
}
