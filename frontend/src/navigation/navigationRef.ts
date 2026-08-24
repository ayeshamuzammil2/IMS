import { createNavigationContainerRef } from '@react-navigation/native';

/** Lets code outside the React tree (a push-notification tap, which can happen before any screen
 * is mounted) navigate the same way NotificationsScreen.tsx already does for in-app taps. */
export const navigationRef = createNavigationContainerRef();

export function navigateFromNotification(routeName: string): void {
  if (!navigationRef.isReady()) return;
  try {
    (navigationRef.navigate as (name: string) => void)(routeName);
  } catch {
    // Destination screen doesn't exist for this role/phase - stay put, same as the in-app list.
  }
}
