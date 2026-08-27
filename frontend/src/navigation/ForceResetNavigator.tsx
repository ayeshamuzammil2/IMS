import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { SetNewPasswordScreen } from '../screens/auth/SetNewPasswordScreen';
import { Text } from '../components/primitives/Text';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';

const Stack = createNativeStackNavigator();

function LeftAlignedHeader({ title }: { title: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.colors.headerBg, paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <Pressable
          hitSlop={12}
          onPress={signOut}
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

export function ForceResetNavigator() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: true, 
        gestureEnabled: false,
        header: () => <LeftAlignedHeader title="Set New Password" />
      }}
    >
      <Stack.Screen name="SetNewPassword" component={SetNewPasswordScreen} />
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
    textAlign: 'left', // Title explicitly aligned to the left
    fontSize: 18,
    fontWeight: '600',
  },
});