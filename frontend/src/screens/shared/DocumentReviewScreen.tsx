import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { FormModal } from '../../components/forms/FormModal';
import { AuthImage } from '../../components/media/AuthImage';
import { documentsApi, type DocumentReviewQueueItemDto } from '../../api/resources/documents.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AppTheme } from '../../theme/types';

const TYPE_LABELS: Record<string, string> = {
  ProfilePhoto: 'Profile Photo',
  Cnic: 'CNIC',
  Resume: 'Resume',
  ReferenceLetter: 'Reference Letter',
};

export function DocumentReviewScreen() {
  const s = useThemedStyles(makeStyles);
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<DocumentReviewQueueItemDto | null>(null);
  const [remarks, setRemarks] = useState('');
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['documents', 'review', 'queue'],
    queryFn: documentsApi.review.getQueue,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['documents', 'review', 'queue'] });

  const handleApprove = async (item: DocumentReviewQueueItemDto) => {
    setBusyId(item.documentId);
    try {
      await documentsApi.review.decide(item.documentId, true);
      Toast.show({ type: 'success', text1: `${TYPE_LABELS[item.documentType] ?? item.documentType} approved` });
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not approve', text2: error?.message });
    } finally {
      setBusyId(null);
    }
  };

  const openReject = (item: DocumentReviewQueueItemDto) => {
    setRemarks('');
    setRejectTarget(item);
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.documentId);
    try {
      await documentsApi.review.decide(rejectTarget.documentId, false, remarks.trim() || undefined);
      Toast.show({ type: 'success', text1: `${TYPE_LABELS[rejectTarget.documentType] ?? rejectTarget.documentType} rejected` });
      setRejectTarget(null);
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not reject', text2: error?.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen scroll>
      <Text variant="body" tone="secondary" style={s.headerCount}>
        {queue.length} document{queue.length === 1 ? '' : 's'} awaiting review
      </Text>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : queue.length === 0 ? (
        <View style={s.emptyContainer}>
          <Text variant="body" tone="muted">
            Nothing to review right now.
          </Text>
        </View>
      ) : (
        queue.map((item) => (
          <View key={item.documentId} style={s.card}>
            <View style={s.row}>
              <AuthImage fileId={item.fileId} size={56} onPress={() => setPreviewFileId(item.fileId)} />
              <View style={s.infoCol}>
                <Text variant="bodyStrong">{item.internFullName}</Text>
                <Text variant="caption" tone="muted">
                  {item.internCode} - {TYPE_LABELS[item.documentType] ?? item.documentType} (v{item.version})
                </Text>
                <Text variant="caption" tone="muted">
                  {new Date(item.uploadedAtUtc).toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={s.actionsRow}>
              <Button label="Reject" variant="danger" size="sm" onPress={() => openReject(item)} disabled={busyId === item.documentId} style={s.actionButton} />
              <Button label="Approve" variant="primary" size="sm" onPress={() => handleApprove(item)} loading={busyId === item.documentId} style={s.actionButton} />
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={rejectTarget !== null}
        title="Reject document"
        onClose={() => setRejectTarget(null)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" size="sm" onPress={() => setRejectTarget(null)} />
            <Button label="Confirm Reject" variant="danger" size="sm" onPress={handleConfirmReject} loading={busyId === rejectTarget?.documentId} />
          </>
        }
      >
        <Text variant="body" tone="secondary" style={s.modalHint}>
          Let {rejectTarget?.internFullName} know why this document was rejected.
        </Text>
        <Input label="Remarks" value={remarks} onChangeText={setRemarks} multiline placeholder="e.g. Please upload a clearer scan." />
      </FormModal>

      <FormModal visible={previewFileId !== null} title="Document preview" onClose={() => setPreviewFileId(null)}>
        {previewFileId ? <AuthImage fileId={previewFileId} size={280} style={s.previewImage} /> : null}
      </FormModal>
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  headerCount: { marginBottom: t.spacing.md },
  emptyContainer: { padding: t.spacing.xl, alignItems: 'center' as const },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
    gap: t.spacing.md,
  },
  row: { flexDirection: 'row' as const, gap: t.spacing.md, alignItems: 'center' as const },
  infoCol: { flex: 1, gap: 2 },
  actionsRow: { flexDirection: 'row' as const, gap: t.spacing.sm, justifyContent: 'flex-end' as const },
  actionButton: { flex: 1 },
  modalHint: { marginBottom: t.spacing.md },
  previewImage: { alignSelf: 'center' as const, borderRadius: t.radii.md },
});
