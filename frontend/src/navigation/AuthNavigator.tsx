import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LockedAccountScreen } from '../screens/auth/LockedAccountScreen';
import { Text } from '../components/primitives/Text';
import { useTheme } from '../providers/ThemeProvider';

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  LockedAccount: { message: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

// Custom Left-Aligned Header
function LeftAlignedAuthHeader({ title, navigation }: { title: string; navigation: any }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.colors.headerBg, paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={theme.colors.textOnDark} />
        </Pressable>

        <Text variant="h3" tone="inverse" numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
      </View>
    </View>
  );
}

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen} 
        options={({ navigation }) => ({
          headerShown: true,
          header: () => <LeftAlignedAuthHeader title="Forgot Password" navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="LockedAccount"
        component={LockedAccountScreen}
        options={({ navigation }) => ({
          gestureEnabled: false,
          headerShown: true,
          header: () => <LeftAlignedAuthHeader title="Account Locked" navigation={navigation} />,
        })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    elevation: 2,
  },
  headerRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'left', // Title explicitly left-aligned
    fontSize: 18,
    fontWeight: '600',
  },
});