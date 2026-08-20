import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let permissionRequested = false;

/** Fires an immediate local notification - not push, no server round-trip. Used for the
 * "Arrival marked at 10:04 AM (PKT)" confirmation the moment the server accepts a mark. */
export async function notifyNow(title: string, body: string): Promise<void> {
  if (!permissionRequested) {
    await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
    permissionRequested = true;
  }
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
