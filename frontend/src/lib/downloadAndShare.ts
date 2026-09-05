import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { getAccessToken } from '../api/client';

let isIntentLaunching = false;

export async function openFileDirect(uri: string, mimeType: string): Promise<void> {
  if (isIntentLaunching) return;

  if (Platform.OS === 'android') {
    try {
      isIntentLaunching = true;
      const contentUri = await FileSystemLegacy.getContentUriAsync(uri);
      
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: mimeType,
      });
    } catch (error) {
      console.warn('IntentLauncher failed:', error);
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, { mimeType });
      }
    } finally {
      setTimeout(() => {
        isIntentLaunching = false;
      }, 500);
    }
    return;
  }

  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, { mimeType });
  }
}

export async function downloadAndShare(url: string, fileName: string, mimeType = 'application/pdf'): Promise<void> {
  try {
    const token = getAccessToken();
    const destination = new File(Paths.cache, fileName);
    const file = await File.downloadFileAsync(url, destination, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      idempotent: true,
    });

    await openFileDirect(file.uri, mimeType);
  } catch (error) {
    console.warn('Download error:', error);
  }
}

export async function writeTextAndShare(content: string, fileName: string, mimeType = 'text/csv'): Promise<void> {
  try {
    const file = new File(Paths.cache, fileName);
    if (file.exists) file.delete();
    file.create();
    file.write(content);

    await openFileDirect(file.uri, mimeType);
  } catch (error) {
    console.warn('Write error:', error);
  }
}

/**
 * File ko phone storage mein direct save karta hai.
 * Android par StorageAccessFramework use karke Downloads folder mein save karega.
 */
export async function writeTextToDownloads(content: string, fileName: string, mimeType = 'text/csv'): Promise<void> {
  if (Platform.OS === 'android') {
    const permissions = await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      const uri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileName,
        mimeType
      );
      await FileSystemLegacy.writeAsStringAsync(uri, content, {
        encoding: FileSystemLegacy.EncodingType.UTF8,
      });
      return;
    }
  }

  // iOS ya fallback ke liye direct document directory mein write
  const fileUri = `${FileSystemLegacy.documentDirectory}${fileName}`;
  await FileSystemLegacy.writeAsStringAsync(fileUri, content, {
    encoding: FileSystemLegacy.EncodingType.UTF8,
  });
}