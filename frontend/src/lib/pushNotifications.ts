import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getOrCreateDeviceId } from './deviceId';
import { notificationsApi } from '../api/resources/notifications.api';

/**
 * Registers this device for the async workflow-event catalog (document approved, certificate
 * issued, attendance locked, etc. - see NotificationTemplates.cs) delivered as real system push
 * notifications, per the resolved scope: push replaces DB-only delivery for those events, it does
 * NOT replace in-app toasts used for synchronous action feedback.
 *
 * Requires an EAS projectId to call getExpoPushTokenAsync outside Expo Go - this repo has no EAS
 * account configured yet (see README), so this fails soft: no projectId or any error here just
 * means push registration is skipped for this session, never a crash of the login flow.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== 'granted') {
      const result = await Notifications.requestPermissionsAsync();
      status = result.status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return;

    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    const deviceId = await getOrCreateDeviceId();
    await notificationsApi.registerPushToken(expoPushToken, deviceId);
  } catch {
    // Best-effort only - the in-app notification list/badge already works without push.
  }
}
