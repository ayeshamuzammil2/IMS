import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './ThemeProvider';
import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { AppAlertHost } from '../lib/appAlert';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <ThemeProvider>
            <AuthProvider>
              {children}
              {/* Renders the centered, white, OK/Cancel-style dialog used by appAlert.alert() -
               * mounted once here so it can be triggered from any screen without a boilerplate
               * import per file, and always sits above whatever screen is currently active. */}
              <AppAlertHost />
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
