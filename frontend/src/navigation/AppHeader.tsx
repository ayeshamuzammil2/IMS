import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { Menu, ChevronLeft, Bell } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../providers/ThemeProvider';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAuth } from '../providers/AuthProvider';
import { Text } from '../components/primitives/Text';
import { RoleAvatar } from '../components/media/RoleAvatar';
import { notificationsApi } from '../api/resources/notifications.api';
import type { AppTheme } from '../theme/types';

/**
 * Rendered by every drawer-child stack (headerShown:false on the drawer itself), so the bell +
 * avatar appear on EVERY screen including pushed detail screens - unlike v1 where only the two
 * dashboard screens rendered a header at all.
 */
export function AppHeader({ navigation, route, options, back }: NativeStackHeaderProps) {
  const theme = useTheme();
  const s = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });

  const title = options.title ?? route.name;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.row}>
        <Pressable
          hitSlop={12}
          onPress={() => (back ? navigation.goBack() : navigation.dispatch(DrawerActions.toggleDrawer()))}
          style={s.iconButton}
          accessibilityRole="button"
          accessibilityLabel={back ? 'Go back' : 'Open navigation menu'}
        >
          {back ? <ChevronLeft size={24} color={theme.colors.textOnDark} /> : <Menu size={24} color={theme.colors.textOnDark} />}
        </Pressable>

        <Text variant="h3" tone="inverse" numberOfLines={1} style={s.title} accessibilityRole="header">
          {title}
        </Text>

        <Pressable
          hitSlop={12}
          onPress={() => navigateToShared(navigation, 'Notifications')}
          style={s.iconButton}
          accessibilityRole="button"
          accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell size={22} color={theme.colors.textOnDark} />
          {unreadCount > 0 ? (
            <View style={s.badge}>
              <Text variant="overline" style={s.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          hitSlop={12}
          onPress={() => navigateToShared(navigation, 'Profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile"
        >
          <RoleAvatar name={user?.fullName ?? '?'} imageUrl={user?.profileImageUrl} size={32} />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * The bell/avatar targets live in the sibling 'Shared' stack under the Drawer, not in whichever
 * section stack is currently active - so jump to the parent (Drawer) navigator and route into
 * it. Falls back to a same-stack navigate when AppHeader is already rendering inside that stack
 * (e.g. Profile's own header linking to Notifications).
 */
function navigateToShared(navigation: NativeStackHeaderProps['navigation'], screen: 'Notifications' | 'Profile') {
  const parent = navigation.getParent();
  if (parent) {
    (parent.navigate as (name: string, params?: object) => void)('Shared', { screen });
  } else {
    (navigation.navigate as (name: string) => void)(screen);
  }
}

const makeStyles = (t: AppTheme) => ({
  container: {
    backgroundColor: t.colors.headerBg,
    ...(t.mode === 'light' ? t.shadows.sm : {}),
  },
  row: {
    height: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: t.spacing.sm,
    gap: t.spacing.sm,
    borderBottomWidth: t.mode === 'dark' ? 1 : 0,
    borderBottomColor: t.colors.border,
  },
  iconButton: { padding: t.spacing.sm },
  title: { flex: 1 },
  badge: {
    position: 'absolute' as const,
    top: 4,
    right: 2,
    backgroundColor: t.colors.error,
    borderRadius: t.radii.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 3,
  },
  badgeText: { color: t.colors.textOnDark, fontSize: 10, lineHeight: 12 },
});