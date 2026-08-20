import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAccessToken } from '../api/client';

/** Downloads an authenticated API file (PDF, etc.) to cache, then opens the OS share sheet. */
export async function downloadAndShare(url: string, fileName: string): Promise<void> {
  const token = getAccessToken();
  const destination = new File(Paths.cache, fileName);
  const file = await File.downloadFileAsync(url, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    idempotent: true,
  });

  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(file.uri);
  }
}

/** Writes text content (e.g. a CSV export) to cache, then opens the OS share sheet - no network
 * fetch involved, unlike downloadAndShare above. */
export async function writeTextAndShare(content: string, fileName: string, mimeType?: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);

  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(file.uri, mimeType ? { mimeType } : undefined);
  }
}
