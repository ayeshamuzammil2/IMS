import { client } from '../client';
import { endpoints } from '../endpoints';

export interface StoredFileMeta {
  id: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  category: string;
  createdAtUtc: string;
}

export const filesApi = {
  meta: (fileId: string) => client.get<StoredFileMeta>(endpoints.files.meta(fileId)).then((r) => r.data),
};

/** application/...-extension pairs actually used by this app's uploads - not an exhaustive MIME
 * list, just the types PIA.Infrastructure/Services/Files/LocalFileStorage.cs will hand back. */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

/** Picks the right file extension for a stored file so a downloaded certificate/document opens
 * with the correct viewer instead of being saved as a mismatched extension (e.g. a .docx saved
 * as "file.pdf", which most viewers refuse to open). Falls back to the server's own file name. */
export function extensionForContentType(contentType: string): string {
  return EXTENSION_BY_CONTENT_TYPE[contentType] ?? '';
}
