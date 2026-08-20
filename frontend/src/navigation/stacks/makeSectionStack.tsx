import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppHeader } from '../AppHeader';

const Stack = createNativeStackNavigator();

/**
 * Every drawer item is its own thin stack wrapping a single screen, all sharing AppHeader via
 * screenOptions. This is what makes the bell + avatar appear on every screen (including any
 * detail screen later pushed onto this stack), not just two dashboards as in v1.
 */
export function makeSectionStack(routeName: string, title: string, Component: React.ComponentType) {
  return function SectionStack() {
    return (
      <Stack.Navigator screenOptions={{ header: (props) => <AppHeader {...props} /> }}>
        <Stack.Screen name={routeName} component={Component} options={{ title }} />
      </Stack.Navigator>
    );
  };
}
