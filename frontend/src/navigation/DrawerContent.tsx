import React, { useState, useRef, useEffect } from 'react';
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

  // ScrollView ka ref top par reset karne ke liye
  const scrollRef = useRef<any>(null);

  // Jab bhi drawer navigation ki state badle (close/reopen ho), top par scroll reset kar do
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [props.state]);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            setSigningOut(true);
            await signOut();
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={s.flex}>
      {/* Brand Block: Pure Left-Aligned Logo Only */}
      <View style={s.brandBlock}>
        <Image source={require('../../assets/pia-logo.png')} style={s.logo} resizeMode="contain" />
      </View>

      {/* User Card */}
      <Pressable
        style={({ pressed }) => [s.userCard, pressed && s.pressed]}
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

      <DrawerContentScrollView
        {...props}
        ref={scrollRef}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Raised Sign Out Button (Raised from bottom) */}
      <View style={s.footer}>
        <Pressable
          style={({ pressed }) => [s.signOutRow, pressed && s.signOutPressed]}
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
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  flex: { flex: 1, backgroundColor: t.colors.drawerBg },
  brandBlock: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.xl,
    paddingBottom: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    alignItems: 'flex-start' as const,
  },
  logo: { 
    width: 120, 
    height: 120,
    alignSelf: 'center' as const,
  },
  userCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  pressed: {
    opacity: 0.75,
  },
  userInfo: { flex: 1 },
  scrollContent: { paddingTop: t.spacing.sm },
  footer: {
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  signOutRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.md,
    borderRadius: 8,
  },
  signOutPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  signOutLabel: {},
});