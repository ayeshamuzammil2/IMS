import React from 'react';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { AppProviders } from './src/providers/AppProviders';
import { RootNavigator } from './src/navigation/RootNavigator';
import { OfflineBanner } from './src/components/feedback/OfflineBanner';

export default function App() {
  return (
    <AppProviders>
      <StatusBar style="light" />
      <RootNavigator />
      <OfflineBanner />
      <Toast />
    </AppProviders>
  );
}
