import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { FileText } from 'lucide-react-native';
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
        <View style={s.emptyContainer}>
          <FileText size={32} color={theme.colors.textMuted} />
          <Text variant="body" tone="muted" style={s.emptyText}>
            No projects assigned yet.
          </Text>
        </View>
      ) : (
        assignments.map((a) => (
          <View key={a.id} style={s.card}>
            <View style={s.headerRow}>
              <Text variant="bodyStrong" style={s.title}>
                {a.title}
              </Text>
              <Text variant="caption" tone={a.status === 'Completed' ? 'success' : 'muted'}>
                {a.status}
              </Text>
            </View>
            {a.description ? (
              <Text variant="body" tone="secondary">
                {a.description}
              </Text>
            ) : null}
            {a.dueDate ? (
              <Text variant="caption" tone="muted">
                Due: {new Date(a.dueDate).toLocaleDateString()}
              </Text>
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
        ))
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  emptyContainer: { alignItems: 'center' as const, padding: t.spacing.xl, gap: t.spacing.sm },
  emptyText: {},
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
    gap: t.spacing.xs,
  },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  title: { flex: 1 },
  fileButton: { alignSelf: 'flex-start' as const, marginTop: t.spacing.xs },
});
