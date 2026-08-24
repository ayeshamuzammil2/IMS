import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppHeader } from '../AppHeader';
import { NotificationsScreen } from '../../screens/shared/NotificationsScreen';
import { ProfileScreen } from '../../screens/shared/ProfileScreen';
import { ChangePasswordScreen } from '../../screens/shared/ChangePasswordScreen';
import { FaceEnrollmentScreen } from '../../screens/intern/FaceEnrollmentScreen';
import type { SharedStackParamList } from '../types';

const Stack = createNativeStackNavigator<SharedStackParamList>();

/** Registered as a hidden drawer screen (display:'none') in every role drawer - reachable from the header, absent from the drawer list. */
export function SharedModalStack() {
  return (
    <Stack.Navigator screenOptions={{ header: (props) => <AppHeader {...props} /> }}>
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
      <Stack.Screen name="FaceEnrollment" component={FaceEnrollmentScreen} options={{ title: 'Face Enrollment' }} />
    </Stack.Navigator>
  );
}
