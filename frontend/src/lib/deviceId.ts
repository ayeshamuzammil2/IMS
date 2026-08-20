import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pia/deviceId';

function generateUuid(): string {
  // Not cryptographically secure - fine for a locally-persisted installation identifier used only
  // to correlate attendance sessions, not as a security boundary.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cached: string | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  if (cached) return cached;
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    cached = stored;
    return stored;
  }
  const id = generateUuid();
  await AsyncStorage.setItem(STORAGE_KEY, id);
  cached = id;
  return id;
}
