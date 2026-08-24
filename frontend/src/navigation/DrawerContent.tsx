import React, { useState } from 'react';
import { View, Image, Pressable, Alert } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { Power } from 'lucide-react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAuth } from '../providers/AuthProvider';
import { Text } from '../components/primitives/Text';
import { RoleAvatar } from '../components/media/RoleAvatar';
import type { AppTheme } from '../theme/types';

export function DrawerContent(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const s = useThemedStyles(makeStyles);
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
        },
      },
    ]);
  };

  return (
    <View style={s.flex}>
      <View style={s.brandBlock}>
        <Image source={require('../../assets/pia-logo.png')} style={s.logo} resizeMode="contain" />
        <Text variant="bodyStrong" tone="brand">
          PIA Wings
        </Text>
      </View>

      <Pressable
        style={s.userCard}
        onPress={() => (props.navigation as any).navigate('Shared', { screen: 'Profile' })}
        accessibilityRole="button"
        accessibilityLabel={`${user?.fullName ?? 'Profile'}, ${user?.role ?? ''}`}
      >
        <RoleAvatar name={user?.fullName ?? '?'} imageUrl={user?.profileImageUrl} size={44} />
        <View style={s.userInfo}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {user?.fullName}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {user?.role}
          </Text>
        </View>
      </Pressable>

      <DrawerContentScrollView {...props} contentContainerStyle={s.scrollContent}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <Pressable
        style={s.signOutRow}
        onPress={handleSignOut}
        disabled={signingOut}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Power size={20} color={theme.colors.error} />
        <Text variant="bodyStrong" tone="error" style={s.signOutLabel}>
          Sign Out
        </Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  flex: { flex: 1, backgroundColor: t.colors.drawerBg },
  brandBlock: {
    padding: t.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
  },
  logo: { width: 100, height: 100 },
  userCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  userInfo: { flex: 1 },
  scrollContent: { paddingTop: t.spacing.sm },
  signOutRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    padding: t.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  signOutLabel: {},
});
