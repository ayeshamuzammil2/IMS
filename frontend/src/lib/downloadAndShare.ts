import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { getAccessToken } from '../api/client';

export async function downloadAndShare(url: string, fileName: string, mimeType = 'application/pdf'): Promise<void> {
  const token = getAccessToken();
  const destination = new File(Paths.cache, fileName);
  const file = await File.downloadFileAsync(url, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    idempotent: true,
  });

  if (Platform.OS === 'android') {
    const contentUri = await FileSystemLegacy.getContentUriAsync(file.uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1,
      type: mimeType,
    });
    return;
  }

  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(file.uri, { mimeType });
  }
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