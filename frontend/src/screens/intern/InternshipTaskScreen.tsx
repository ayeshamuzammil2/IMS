import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { FileText, Calendar, CheckCircle2, Clock, FolderKanban, Download } from 'lucide-react-native';
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

  return (
    <Screen scroll>
      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : assignments.length === 0 ? (
        <View style={s.emptyCard}>
          <View style={s.emptyIconWrapper}>
            <FolderKanban size={36} color={theme.colors.textMuted} />
          </View>
          <Text variant="bodyStrong" style={s.emptyTitle}>
            No Projects Assigned
          </Text>
          <Text variant="caption" tone="muted" style={s.emptyText}>
            You don't have any active project assignments at the moment.
          </Text>
        </View>
      ) : (
        assignments.map((a) => (
          <View key={a.id} style={s.card}>
            <View style={s.headerRow}>
              <Text variant="bodyStrong" style={s.title} numberOfLines={2}>
                {a.title}
              </Text>
              <StatusBadge status={a.status} />
            </View>

            {a.description ? (
              <Text variant="body" tone="secondary" style={s.description}>
                {a.description}
              </Text>
            ) : null}

            <View style={s.footerContainer}>
              {a.dueDate ? (
                <View style={s.dateRow}>
                  <Calendar size={14} color={theme.colors.textMuted} />
                  <Text variant="caption" tone="muted">
                    Due: {new Date(a.dueDate).toLocaleDateString()}
                  </Text>
                </View>
              ) : null}

              {a.fileId ? (
                <Button
                  label="View Attachment"
                  variant="outline"
                  size="sm"
                  loading={downloadingId === a.id}
                  onPress={() => handleViewFile(a)}
                  style={s.fileButton}
                />
              ) : null}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();

  const isCompleted = status?.toLowerCase() === 'completed';

  const config = isCompleted
    ? {
        bg: theme.colors.successBg,
        tone: 'success' as const,
        icon: <CheckCircle2 size={13} color={theme.colors.success} />,
        label: 'Completed',
      }
    : {
        bg: theme.colors.warningBg,
        tone: 'warning' as const,
        icon: <Clock size={13} color={theme.colors.warning} />,
        label: status || 'In Progress',
      };

  return (
    <View style={[s.badge, { backgroundColor: config.bg }]}>
      {config.icon}
      <Text variant="caption" tone={config.tone} style={s.badgeText}>
        {config.label}
      </Text>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  // Empty State Styling
  emptyCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.xl,
    alignItems: 'center' as const,
    marginTop: t.spacing.md,
    gap: t.spacing.xs,
  },
  emptyIconWrapper: {
    padding: t.spacing.md,
    borderRadius: 50,
    backgroundColor: t.colors.surfaceSunken,
    marginBottom: t.spacing.xs,
  },
  emptyTitle: {
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center' as const,
  },

  // Project Task Card
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
    gap: t.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    gap: t.spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  description: {
    lineHeight: 20,
  },
  
  // Footer & Actions
  footerContainer: {
    gap: t.spacing.xs,
    marginTop: t.spacing.xs,
  },
  dateRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  fileButton: {
    alignSelf: 'flex-start' as const,
    marginTop: t.spacing.xs,
  },

  // Badge Styling
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 4,
    borderRadius: t.radii.full,
  },
  badgeText: {
    fontWeight: '600' as const,
  },
});