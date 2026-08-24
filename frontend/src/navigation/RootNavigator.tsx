import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../providers/ThemeProvider';
import { toNavigationTheme } from '../theme/navigationTheme';
import { AuthNavigator } from './AuthNavigator';
import { ForceResetNavigator } from './ForceResetNavigator';
import { AdminNavigator } from './AdminNavigator';
import { MentorNavigator } from './MentorNavigator';
import { InternNavigator } from './InternNavigator';
import { navigationRef } from './navigationRef';

export function RootNavigator() {
  const { status, user } = useAuth();
  const theme = useTheme();

  return (
    <NavigationContainer ref={navigationRef} theme={toNavigationTheme(theme)}>
      {status === 'bootstrapping' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : status === 'signedOut' ? (
        <AuthNavigator />
      ) : status === 'mustReset' ? (
        <ForceResetNavigator />
      ) : user?.role === 'Admin' ? (
        <AdminNavigator />
      ) : user?.role === 'Mentor' ? (
        <MentorNavigator />
      ) : (
        <InternNavigator />
      )}
    </NavigationContainer>
  );
}
