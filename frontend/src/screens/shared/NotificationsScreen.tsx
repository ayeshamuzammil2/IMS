import React from 'react';
import { View, Pressable, RefreshControl, FlatList } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { notificationsApi, type NotificationDto } from '../../api/resources/notifications.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: invalidateAll,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: invalidateAll,
  });

  const items = data?.items ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  const onPressItem = (item: NotificationDto) => {
    if (!item.isRead) markReadMutation.mutate(item.id);
    if (item.actionRoute) {
      // Action routes are server-declared per notification template; screens not yet built in
      // this phase simply fall through and the intern stays on this list.
      try {
        (navigation as any).navigate(item.actionRoute);
      } catch {
        // no-op: destination screen doesn't exist yet in this phase
      }
    }
  };

  return (
    <Screen scroll={false}>
      <View style={s.headerRow}>
        <Text variant="h2">Notifications</Text>
        {hasUnread ? (
          <Button label="Mark all read" size="sm" variant="ghost" onPress={() => markAllReadMutation.mutate()} loading={markAllReadMutation.isPending} />
        ) : null}
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListEmptyComponent={
            <Text variant="body" tone="secondary" style={s.empty}>
              No notifications yet.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable style={[s.row, !item.isRead && s.rowUnread]} onPress={() => onPressItem(item)}>
              {!item.isRead ? <View style={[s.dot, { backgroundColor: theme.colors[typeToneKey(item.type)] }]} /> : <View style={s.dotSpacer} />}
              <View style={s.rowContent}>
                <Text variant="bodyStrong">{item.title}</Text>
                <Text variant="body" tone="secondary" style={s.body}>
                  {item.body}
                </Text>
                <Text variant="caption" tone="muted">
                  {timeAgo(item.createdAtUtc)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

function typeToneKey(type: string): 'success' | 'warning' | 'error' | 'info' {
  switch (type) {
    case 'Success':
      return 'success';
    case 'Warning':
      return 'warning';
    case 'Error':
      return 'error';
    default:
      return 'info';
  }
}

const makeStyles = (t: AppTheme) => ({
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.md,
  },
  separator: { height: 1, backgroundColor: t.colors.border },
  row: { flexDirection: 'row' as const, paddingVertical: t.spacing.md, gap: t.spacing.sm },
  rowUnread: { backgroundColor: t.colors.surfaceSunken },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  dotSpacer: { width: 8 },
  rowContent: { flex: 1, gap: 2 },
  body: { marginTop: 2 },
  empty: { textAlign: 'center' as const, marginTop: t.spacing.xl },
});
