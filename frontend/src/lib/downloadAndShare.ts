import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { getAccessToken } from '../api/client';

/**
 * Opens a locally-stored file directly. On Android this launches the file straight in the
 * user's default viewer/handler - no "share via..." app chooser - which behaves like a direct
 * open/download. iOS has no equivalent direct-open primitive for arbitrary files, so it falls
 * back to the native share sheet, from which "Save to Files" downloads it locally.
 */
export async function openFileDirect(uri: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'android') {
    const contentUri = await FileSystemLegacy.getContentUriAsync(uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1,
      type: mimeType,
    });
    return;
  }

  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, { mimeType });
  }
}

export async function downloadAndShare(url: string, fileName: string, mimeType = 'application/pdf'): Promise<void> {
  const token = getAccessToken();
  const destination = new File(Paths.cache, fileName);
  const file = await File.downloadFileAsync(url, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    idempotent: true,
  });

  await openFileDirect(file.uri, mimeType);
}

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