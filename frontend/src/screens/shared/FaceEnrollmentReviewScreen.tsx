import React, { useCallback, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScanFace, ShieldCheck } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { FormModal } from '../../components/forms/FormModal';
import { AuthImage } from '../../components/media/AuthImage';
import {
  faceEnrollmentReviewApi,
  type FaceEnrollmentReviewQueueItemDto,
  type FaceEnrollmentReviewDetailDto,
} from '../../api/resources/faceEnrollmentReview.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

function scoreColor(score: number | null, theme: AppTheme): string {
  if (score === null) return theme.colors.textMuted;
  if (score >= 0.7) return theme.colors.success ?? '#16A34A';
  if (score >= 0.5) return theme.colors.warning ?? '#D97706';
  return theme.colors.error;
}

export function FaceEnrollmentReviewScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [detailTarget, setDetailTarget] = useState<FaceEnrollmentReviewQueueItemDto | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['faceEnrollment', 'review', 'queue'],
    queryFn: faceEnrollmentReviewApi.getQueue,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['faceEnrollment', 'review', 'detail', detailTarget?.internProfileId],
    queryFn: () => faceEnrollmentReviewApi.getDetail(detailTarget!.internProfileId),
    enabled: detailTarget !== null,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      return () => {
        setDetailTarget(null);
        setRejectMode(false);
        setReason('');
      };
    }, [refetch]),
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['faceEnrollment', 'review'] });
  };

  const closeModal = () => {
    setDetailTarget(null);
    setRejectMode(false);
    setReason('');
  };

  const handleApprove = async () => {
    if (!detailTarget) return;
    setBusy(true);
    try {
      await faceEnrollmentReviewApi.decide(detailTarget.internProfileId, true);
      Toast.show({ type: 'success', text1: `${detailTarget.internFullName}'s enrollment approved` });
      closeModal();
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not approve', text2: error?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!detailTarget) return;
    setBusy(true);
    try {
      await faceEnrollmentReviewApi.decide(detailTarget.internProfileId, false, reason.trim() || undefined);
      Toast.show({ type: 'success', text1: `${detailTarget.internFullName}'s enrollment rejected` });
      closeModal();
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not reject', text2: error?.message });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="caption" tone="muted" style={s.loadingText}>
            Loading enrollment review queue...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll style={s.screenContainer}>
      <View style={s.headerRow}>
        <View style={s.headerTitleContainer}>
          <View style={s.titleIndicator} />
          <Text variant="overline" tone="muted" style={s.headerLabel}>
            {queue.length} {queue.length === 1 ? 'ENROLLMENT' : 'ENROLLMENTS'} AWAITING REVIEW
          </Text>
        </View>
      </View>

      {queue.length === 0 ? (
        <View style={s.emptyBox}>
          <ScanFace size={40} color={theme.colors.textMuted} />
          <Text variant="body" tone="muted" style={{ marginTop: 8 }}>
            Nothing to review right now.
          </Text>
        </View>
      ) : (
        <View style={s.listContainer}>
          {queue.map((item) => (
            <View key={item.internProfileId} style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.avatarBadge}>
                  <ScanFace size={20} color={theme.colors.primary} />
                </View>
                <View style={s.cardHeaderText}>
                  <Text variant="bodyStrong" style={s.cardTitle} numberOfLines={1}>
                    {item.internFullName}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {item.internCode}
                    {item.departmentName ? ` · ${item.departmentName}` : ''} · v{item.version}
                  </Text>
                </View>
                <View style={[s.badge, { backgroundColor: `${theme.colors.warning ?? '#D97706'}18` }]}>
                  <Text variant="caption" style={[s.badgeText, { color: theme.colors.warning ?? '#D97706' }]}>
                    Pending
                  </Text>
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.actionRow}>
                <Button label="Review" size="sm" variant="primary" onPress={() => setDetailTarget(item)} style={s.actionBtn} />
              </View>
            </View>
          ))}
        </View>
      )}

      <FormModal
        visible={detailTarget !== null}
        title="Face Enrollment Review"
        onClose={closeModal}
        footer={
          rejectMode ? (
            <>
              <Button label="Back" variant="ghost" onPress={() => setRejectMode(false)} disabled={busy} />
              <Button label="Confirm Reject" variant="danger" onPress={handleConfirmReject} loading={busy} />
            </>
          ) : (
            <>
              <Button label="Reject" variant="danger" onPress={() => setRejectMode(true)} disabled={busy} />
              <Button label="Approve" variant="primary" onPress={handleApprove} loading={busy} />
            </>
          )
        }
      >
        {detailLoading || !detail ? (
          <View style={s.centerBox}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : rejectMode ? (
          <>
            <Text variant="body" tone="secondary" style={{ marginBottom: theme.spacing.md }}>
              Let {detail.internFullName} know why this enrollment was rejected - they'll be able to
              capture a fresh one right away.
            </Text>
            <Input
              label="Reason (Optional)"
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder="e.g. Photo doesn't clearly match your profile picture."
            />
          </>
        ) : (
          <View>
            <Text variant="bodyStrong" style={{ marginBottom: 4 }}>
              {detail.internFullName} ({detail.internCode})
            </Text>
            <Text variant="caption" tone="muted" style={{ marginBottom: theme.spacing.md }}>
              {detail.departmentName ?? 'No department'} · Enrollment v{detail.version} ·{' '}
              {detail.enrollmentReason}
            </Text>

            <View style={s.compareRow}>
              <View style={s.compareCol}>
                <Text variant="caption" tone="muted" style={s.compareLabel}>
                  APPROVED PROFILE PHOTO
                </Text>
                {detail.approvedPhotoFileId ? (
                  <AuthImage fileId={detail.approvedPhotoFileId} style={s.compareImage} contentFit="cover" />
                ) : (
                  <View style={[s.compareImage, s.compareImageMissing]}>
                    <Text variant="caption" tone="muted">No photo</Text>
                  </View>
                )}
              </View>
              <View style={s.compareCol}>
                <Text variant="caption" tone="muted" style={s.compareLabel}>
                  LIVE ENROLLMENT CAPTURE
                </Text>
                {detail.capturedImageFileId ? (
                  <AuthImage fileId={detail.capturedImageFileId} style={s.compareImage} contentFit="cover" />
                ) : (
                  <View style={[s.compareImage, s.compareImageMissing]}>
                    <Text variant="caption" tone="muted">No photo saved</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={s.scoresCard}>
              <View style={s.scoreRow}>
                <Text variant="caption" tone="muted">Cross-match with approved photo</Text>
                <Text variant="bodyStrong" style={{ color: scoreColor(detail.crossMatchScore, theme) }}>
                  {detail.crossMatchScore !== null ? `${Math.round(detail.crossMatchScore * 100)}%` : 'N/A'}
                </Text>
              </View>
              <View style={s.scoreRow}>
                <Text variant="caption" tone="muted">Capture quality</Text>
                <Text variant="bodyStrong" style={{ color: scoreColor(detail.qualityScore, theme) }}>
                  {detail.qualityScore !== null ? `${Math.round(detail.qualityScore * 100)}%` : 'N/A'}
                </Text>
              </View>
              {detail.intraSetMinScore !== null ? (
                <View style={s.scoreRow}>
                  <Text variant="caption" tone="muted">Frame consistency</Text>
                  <Text variant="bodyStrong" style={{ color: scoreColor(detail.intraSetMinScore, theme) }}>
                    {Math.round(detail.intraSetMinScore * 100)}%
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={s.hintRow}>
              <ShieldCheck size={14} color={theme.colors.textMuted} />
              <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                These scores already passed the system's automatic thresholds - this step is your
                visual confirmation that the two photos are genuinely the same person.
              </Text>
            </View>
          </View>
        )}
      </FormModal>
    </Screen>
  );
}

export default FaceEnrollmentReviewScreen;

const makeStyles = (t: AppTheme) => ({
  screenContainer: { paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.lg },
  headerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: t.spacing.md },
  headerTitleContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  titleIndicator: { width: 4, height: 14, borderRadius: 2, backgroundColor: t.colors.primary },
  headerLabel: { letterSpacing: 1 },
  emptyBox: { paddingVertical: t.spacing.xl * 2, alignItems: 'center' as const, justifyContent: 'center' as const },
  listContainer: { gap: t.spacing.md, paddingBottom: t.spacing.xl * 1.5 },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: t.spacing.md },
  avatarBadge: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: `${t.colors.primary}12`,
    borderWidth: 1, borderColor: `${t.colors.primary}30`,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, flexShrink: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  badgeText: { fontSize: 10, fontWeight: '600' as const },
  divider: { height: 1, backgroundColor: t.colors.border, marginTop: t.spacing.md, marginBottom: t.spacing.md },
  actionRow: { flexDirection: 'row' as const, justifyContent: 'flex-end' as const, gap: t.spacing.sm },
  actionBtn: { minWidth: 100 },
  centerBox: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: t.spacing.sm, paddingVertical: t.spacing.xl },
  loadingText: { marginTop: t.spacing.xs },
  compareRow: { flexDirection: 'row' as const, gap: t.spacing.md, marginBottom: t.spacing.md },
  compareCol: { flex: 1 },
  compareLabel: { marginBottom: 6, fontSize: 10, letterSpacing: 0.5 },
  compareImage: { width: '100%' as const, aspectRatio: 1, borderRadius: 12, backgroundColor: t.colors.surfaceSunken },
  compareImageMissing: { alignItems: 'center' as const, justifyContent: 'center' as const },
  scoresCard: {
    backgroundColor: t.colors.surfaceSunken,
    borderRadius: 12,
    padding: t.spacing.md,
    gap: t.spacing.xs,
    marginBottom: t.spacing.sm,
  },
  scoreRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  hintRow: { flexDirection: 'row' as const, gap: 6, alignItems: 'flex-start' as const },
});
