import React, { useCallback, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Calendar, CheckCircle2, Clock, FolderKanban, Download, FileText } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { projectsApi, type ProjectAssignmentDto } from '../../api/resources/projects.api';
import { apiBaseUrl } from '../../api/client';
import { downloadAndShare } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

export function InternshipTaskScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['projects', 'mine'],
    queryFn: projectsApi.getMine,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleViewFile = async (assignment: ProjectAssignmentDto) => {
    if (!assignment.fileId) return;
    setDownloadingId(assignment.id);
    try {
      await downloadAndShare(`${apiBaseUrl}/api/files/${assignment.fileId}`, `project-${assignment.id}`);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not open file', text2: error?.message });
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={s.centerLoading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="caption" style={s.loadingText}>Loading Project tasks...</Text>
        </View>
      </Screen>
    );
  }

  if (assignments.length === 0) {
    return (
      <Screen scroll style={s.container}>
        {/* Compact Empty Card */}
        <View style={s.emptyCard}>
          <View style={s.emptyIconWrapper}>
            <FolderKanban size={22} color={theme.colors.textMuted} />
          </View>
          <Text variant="h2" style={s.emptyTitle}>
            No Projects Assigned
          </Text>
          <Text variant="caption" style={s.emptyText}>
            You don't have any active project assignments at the moment.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll style={s.container}>
      {assignments.map((a) => {
        const isCompleted = a.status?.toLowerCase() === 'completed';
        const activeColor = isCompleted ? theme.colors.success : theme.colors.warning;

        return (
          <View key={a.id} style={s.card}>
            {/* Header / Title Row */}
            <View style={s.cardHeader}>
              <View style={s.headerTitleGroup}>
                <FolderKanban size={16} color={theme.colors.primary} />
                <Text variant="overline" style={s.cardTitle}>
                  ASSIGNED TASK
                </Text>
              </View>
              <StatusBadge status={a.status} />
            </View>

            <Text variant="body" style={s.taskTitle} numberOfLines={2}>
              {a.title}
            </Text>

            {a.description ? (
              <Text variant="caption" style={s.description}>
                {a.description}
              </Text>
            ) : null}

            <View style={s.detailsGroup}>
              <View style={s.rowDivider} />

              {a.dueDate ? (
                <View style={s.detailRow}>
                  <View style={s.labelWithIcon}>
                    <Calendar size={14} color={theme.colors.textSecondary} />
                    <Text variant="caption" style={s.detailLabel}>Due Date</Text>
                  </View>
                  <Text variant="body" style={s.detailValue}>
                    {new Date(a.dueDate).toLocaleDateString()}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Actions Group */}
            {a.fileId ? (
              <View style={s.actionsGroup}>
                <Button
                  label={downloadingId === a.id ? 'Opening Attachment...' : 'View Attachment'}
                  variant="outline"
                  loading={downloadingId === a.id}
                  onPress={() => handleViewFile(a)}
                  fullWidth
                  style={s.actionButton}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();

  const isCompleted = status?.toLowerCase() === 'completed';

  const config = isCompleted
    ? {
        bg: `${theme.colors.success}15`,
        color: theme.colors.success,
        icon: <CheckCircle2 size={12} color={theme.colors.success} />,
        label: 'Completed',
      }
    : {
        bg: `${theme.colors.warning}15`,
        color: theme.colors.warning,
        icon: <Clock size={12} color={theme.colors.warning} />,
        label: status || 'In Progress',
      };

  return (
    <View style={[s.badge, { backgroundColor: config.bg }]}>
      {config.icon}
      <Text variant="caption" style={[s.badgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: t.spacing.xl,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
  },
  loadingText: {
    color: t.colors.textSecondary,
  },
  emptyCard: {
    alignItems: 'center' as const,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.sm,
    marginBottom: t.spacing.sm,
    shadowColor: t.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: t.colors.textPrimary,
    textAlign: 'center' as const,
    marginTop: 2,
    marginBottom: 2,
  },
  emptyText: {
    color: t.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center' as const,
    paddingHorizontal: t.spacing.xs,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: t.spacing.sm,
  },
  headerTitleGroup: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  cardTitle: {
    color: t.colors.textSecondary,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    fontSize: 11,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: t.colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  description: {
    color: t.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: t.spacing.xs,
  },
  detailsGroup: {
    gap: 4,
  },
  rowDivider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginVertical: 6,
  },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 2,
  },
  labelWithIcon: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  detailLabel: {
    color: t.colors.textSecondary,
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: t.colors.textPrimary,
  },
  actionsGroup: {
    marginTop: t.spacing.md,
  },
  actionButton: {
    marginTop: 0,
  },
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: t.radii.full,
  },
  badgeText: {
    fontWeight: '700' as const,
    fontSize: 11,
  },
});