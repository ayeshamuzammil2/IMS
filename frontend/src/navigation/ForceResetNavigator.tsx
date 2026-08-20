import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SetNewPasswordScreen } from '../screens/auth/SetNewPasswordScreen';

const Stack = createNativeStackNavigator();

/** No drawer, no back button - a must-reset user cannot leave this screen except by completing it. */
export function ForceResetNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name="SetNewPassword" component={SetNewPasswordScreen} />
    </Stack.Navigator>
  );
}
