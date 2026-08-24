import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LockedAccountScreen } from '../screens/auth/LockedAccountScreen';

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  LockedAccount: { message: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="LockedAccount" component={LockedAccountScreen} options={{ gestureEnabled: false }} />
    </Stack.Navigator>
  );
}
