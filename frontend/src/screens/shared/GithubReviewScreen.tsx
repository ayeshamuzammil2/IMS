import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { GitBranch } from 'lucide-react-native';
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

  const openReasonModal = (item: GithubReviewQueueItemDto, action: ReasonAction) => {
    setReason('');
    setReasonModal({ item, action });
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
      <Text variant="body" tone="secondary" style={s.headerCount}>
        {queue.length} submission{queue.length === 1 ? '' : 's'} awaiting review
      </Text>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : queue.length === 0 ? (
        <View style={s.emptyContainer}>
          <GitBranch size={32} color={theme.colors.textMuted} />
          <Text variant="body" tone="muted" style={s.emptyText}>
            Nothing to review right now.
          </Text>
        </View>
      ) : (
        queue.map((item) => (
          <View key={item.submissionId} style={s.card}>
            <Text variant="bodyStrong">{item.internFullName}</Text>
            <Text variant="caption" tone="muted">
              {item.internCode} - v{item.version}
            </Text>
            <Text variant="body" tone="brand" numberOfLines={1}>
              {item.repositoryUrl}
            </Text>
            <Text variant="caption" tone="muted">
              {new Date(item.submittedAtUtc).toLocaleString()}
            </Text>
            <View style={s.actionsRow}>
              <Button label="Reject" variant="danger" size="sm" onPress={() => openReasonModal(item, 'Rejected')} disabled={busyId === item.submissionId} style={s.actionButton} />
              <Button label="Resubmit" variant="outline" size="sm" onPress={() => openReasonModal(item, 'ResubmitRequested')} disabled={busyId === item.submissionId} style={s.actionButton} />
              <Button label="Approve" variant="primary" size="sm" onPress={() => handleApprove(item)} loading={busyId === item.submissionId} style={s.actionButton} />
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={reasonModal !== null}
        title={reasonModal?.action === 'Rejected' ? 'Reject repository' : 'Request resubmission'}
        onClose={() => setReasonModal(null)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" size="sm" onPress={() => setReasonModal(null)} />
            <Button label="Confirm" variant="danger" size="sm" onPress={handleConfirmReason} loading={busyId === reasonModal?.item.submissionId} />
          </>
        }
      >
        <Text variant="body" tone="secondary" style={s.modalHint}>
          Let {reasonModal?.item.internFullName} know why.
        </Text>
        <Input label="Reason" value={reason} onChangeText={setReason} multiline required />
      </FormModal>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  headerCount: { marginBottom: t.spacing.md },
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
  actionsRow: { flexDirection: 'row' as const, gap: t.spacing.sm, marginTop: t.spacing.sm },
  actionButton: { flex: 1 },
  modalHint: { marginBottom: t.spacing.md },
});
