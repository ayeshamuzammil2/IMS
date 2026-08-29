import React from 'react';
import { View, Pressable, RefreshControl, FlatList } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Bell, CheckCircle2, AlertTriangle, AlertCircle, Info, CheckCheck } from 'lucide-react-native';
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
      try {
        (navigation as any).navigate(item.actionRoute);
      } catch {
        // no-op
      }
    }
  };

  return (
    <Screen scroll={false}>
      {hasUnread ? (
        <View style={s.headerRow}>
         <Button
  label="Mark all as read"
  size="sm"
  variant="ghost"
  onPress={() => markAllReadMutation.mutate()}
  loading={markAllReadMutation.isPending}
/>
        </View>
      ) : null}

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.listContainer}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <View style={s.emptyIconBox}>
                <Bell size={28} color={theme.colors.textMuted} />
              </View>
              <Text variant="bodyStrong" style={s.emptyTitle}>
                No notifications yet
              </Text>
              <Text variant="caption" tone="muted" style={s.emptyText}>
                We'll notify you when something important arrives.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const tone = typeToneKey(item.type);
            const IconComponent = getNotificationIcon(item.type);

            return (
              <Pressable
                style={[s.card, !item.isRead && s.cardUnread]}
                onPress={() => onPressItem(item)}
              >
                <View style={[s.iconBox, { backgroundColor: theme.colors[`${tone}Bg` as keyof typeof theme.colors] }]}>
                  <IconComponent size={18} color={theme.colors[tone]} />
                </View>

                <View style={s.rowContent}>
                  <View style={s.titleRow}>
                    <Text variant="bodyStrong" numberOfLines={1} style={s.title}>
                      {item.title}
                    </Text>
                    {!item.isRead && <View style={[s.dot, { backgroundColor: theme.colors[tone] }]} />}
                  </View>

                  <Text variant="body" tone="secondary" style={s.body}>
                    {item.body}
                  </Text>

                  <Text variant="caption" tone="muted" style={s.time}>
                    {timeAgo(item.createdAtUtc)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
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

function getNotificationIcon(type: string) {
  switch (type) {
    case 'Success':
      return CheckCircle2;
    case 'Warning':
      return AlertTriangle;
    case 'Error':
      return AlertCircle;
    default:
      return Info;
  }
}

const makeStyles = (t: AppTheme) => ({
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.sm,
  },
  listContainer: {
    paddingBottom: t.spacing.lg,
    gap: t.spacing.sm,
  },
  card: {
    flexDirection: 'row' as const,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    padding: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    gap: t.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardUnread: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.surface,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: t.radii.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 2,
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: t.radii.full,
    marginLeft: t.spacing.xs,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  time: {
    marginTop: 4,
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: t.spacing.xl * 2,
    gap: t.spacing.xs,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: t.spacing.xs,
  },
  emptyTitle: {
    fontSize: 15,
  },
  emptyText: {
    textAlign: 'center' as const,
  },
});