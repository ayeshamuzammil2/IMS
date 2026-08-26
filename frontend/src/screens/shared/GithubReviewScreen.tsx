import React, { useCallback, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { GitBranch, ChevronRight, Check, X, RotateCcw } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { FormModal } from '../../components/forms/FormModal';
import { githubApi, type GithubReviewQueueItemDto } from '../../api/resources/github.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

type ReasonAction = 'Rejected' | 'ResubmitRequested';

export function GithubReviewScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [reasonModal, setReasonModal] = useState<{ item: GithubReviewQueueItemDto; action: ReasonAction } | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['github', 'review', 'queue'],
    queryFn: githubApi.review.getQueue,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['github', 'review', 'queue'] });

  const handleApprove = async (item: GithubReviewQueueItemDto) => {
    setBusyId(item.submissionId);
    try {
      await githubApi.review.decide(item.submissionId, 'Approved');
      Toast.show({ type: 'success', text1: 'Repository approved' });
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not approve', text2: error?.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmReason = async () => {
    if (!reasonModal) return;
    setBusyId(reasonModal.item.submissionId);
    try {
      await githubApi.review.decide(reasonModal.item.submissionId, reasonModal.action, reason.trim());
      Toast.show({ type: 'success', text1: reasonModal.action === 'Rejected' ? 'Repository rejected' : 'Resubmission requested' });
      setReasonModal(null);
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not submit decision', text2: error?.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen scroll>
      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {queue.length} submission{queue.length === 1 ? '' : 's'} awaiting review
        </Text>
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : queue.length === 0 ? (
        <View style={s.emptyContainer}>
          <GitBranch size={32} color={theme.colors.textMuted} />
          <Text variant="body" tone="muted">
            Nothing to review right now.
          </Text>
        </View>
      ) : (
        queue.map((item) => (
          <View key={item.submissionId} style={s.card}>
            <View style={s.cardMain}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" style={s.nameText}>
                  {item.internFullName}
                </Text>
                <Text variant="caption" tone="muted">
                  {item.internCode} · v{item.version}
                </Text>
                <Text variant="body" tone="brand" numberOfLines={1} style={{ marginTop: theme.spacing.xs }}>
                  {item.repositoryUrl}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textMuted} />
            </View>

            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: theme.colors.warningBg }]}>
                <Text variant="caption" tone="warning">
                  Pending Review
                </Text>
              </View>
            </View>

            <View style={s.divider} />

            <View style={s.iconActionRow}>
              <Pressable
                onPress={() => {
                  setReason('');
                  setReasonModal({ item, action: 'Rejected' });
                }}
                disabled={busyId === item.submissionId}
                style={s.iconBtn}
              >
                <X size={20} color={theme.colors.error} />
              </Pressable>

              <Pressable
                onPress={() => {
                  setReason('');
                  setReasonModal({ item, action: 'ResubmitRequested' });
                }}
                disabled={busyId === item.submissionId}
                style={s.iconBtn}
              >
                <RotateCcw size={18} color={theme.colors.textSecondary} />
              </Pressable>

              <Pressable onPress={() => handleApprove(item)} disabled={busyId === item.submissionId} style={s.iconBtn}>
                <Check size={20} color={theme.colors.primary} />
              </Pressable>
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={reasonModal !== null}
        title={reasonModal?.action === 'Rejected' ? 'Reject Repository' : 'Request Resubmission'}
        onClose={() => setReasonModal(null)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setReasonModal(null)} />
            <Button label="Confirm" variant="danger" onPress={handleConfirmReason} loading={busyId === reasonModal?.item.submissionId} />
          </>
        }
      >
        <Text variant="body" tone="secondary" style={{ marginBottom: theme.spacing.md }}>
          Let {reasonModal?.item.internFullName} know why.
        </Text>
        <Input label="Reason" value={reason} onChangeText={setReason} multiline required />
      </FormModal>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.md,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    padding: t.spacing.xl,
    gap: t.spacing.sm,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
    ...t.shadows.sm,
  },
  cardMain: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  nameText: { fontSize: 16, fontWeight: '600' as const },
  badgeRow: {
    flexDirection: 'row' as const,
    marginTop: t.spacing.sm,
  },
  badge: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 3,
    borderRadius: t.radii.full,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginTop: t.spacing.md,
    marginBottom: t.spacing.sm,
  },
  iconActionRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: t.spacing.lg,
  },
  iconBtn: { padding: 4 },
});