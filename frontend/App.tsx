import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import { AppProviders } from './src/providers/AppProviders';
import { RootNavigator } from './src/navigation/RootNavigator';
import { OfflineBanner } from './src/components/feedback/OfflineBanner';
import { toastConfig } from './src/theme/toastConfig';
import { navigateFromNotification } from './src/navigation/navigationRef';

export default function App() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string') navigateFromNotification(route);
    });
    return () => subscription.remove();
  }, []);

  return (
    <AppProviders>
      <StatusBar style="light" />
      <RootNavigator />
      <OfflineBanner />
      <Toast config={toastConfig} />
    </AppProviders>
  );
}
