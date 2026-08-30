import React, { useCallback, useMemo, useState } from 'react';
import { View, Pressable, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ExternalLink, FileText, ChevronRight, Check, X } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { FormModal } from '../../components/forms/FormModal';
import { AuthImage } from '../../components/media/AuthImage';
import { FilterBar } from '../../components/filters/FilterBar';
import { documentsApi, type DocumentReviewQueueItemDto } from '../../api/resources/documents.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { downloadAndShare } from '../../lib/downloadAndShare';
import { apiBaseUrl } from '../../api/client';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

const TYPE_LABELS: Record<string, string> = {
  ProfilePhoto: 'Profile Photo',
  Cnic: 'CNIC',
  CnicFront: 'CNIC (Front)',
  CnicBack: 'CNIC (Back)',
  Resume: 'Resume',
  ReferenceLetter: 'Reference Letter',
  ExtraDocument: 'Extra Document',
};

function isImage(item: DocumentReviewQueueItemDto): boolean {
  return !!item.contentType?.startsWith('image/');
}

export function DocumentReviewScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<DocumentReviewQueueItemDto | null>(null);
  const [remarks, setRemarks] = useState('');
  const [previewItem, setPreviewItem] = useState<DocumentReviewQueueItemDto | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);
  const [internFilter, setInternFilter] = useState<number | null>(null);

  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['documents', 'review', 'queue'],
    queryFn: documentsApi.review.getQueue,
  });

  // Only Admin gets a department filter - a Mentor's queue is already scoped by the backend
  // to their own department's interns, so showing them a department picker adds nothing.
  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['departments', 'lookup'],
    queryFn: departmentsApi.lookup,
    enabled: isAdmin,
  });
  const departmentSelectOptions = useMemo(() => departmentOptions.map((d) => ({ value: d.id, label: d.name })), [departmentOptions]);

  const departmentScopedQueue = useMemo(
    () => (isAdmin && departmentFilter ? queue.filter((q) => q.departmentId === departmentFilter) : queue),
    [queue, isAdmin, departmentFilter],
  );

  const internSelectOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const q of departmentScopedQueue) {
      if (!seen.has(q.internProfileId)) seen.set(q.internProfileId, `${q.internFullName} (${q.internCode})`);
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [departmentScopedQueue]);

  const filteredQueue = useMemo(() => {
    const term = search.trim().toLowerCase();
    return departmentScopedQueue.filter((q) => {
      if (internFilter && q.internProfileId !== internFilter) return false;
      if (!term) return true;
      return q.internFullName.toLowerCase().includes(term) || q.internCode.toLowerCase().includes(term);
    });
  }, [departmentScopedQueue, internFilter, search]);

  const handleDepartmentChange = (value: number | null) => {
    setDepartmentFilter(value);
    setInternFilter(null);
  };

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

  const handleThumbnailPress = (item: DocumentReviewQueueItemDto) => {
    if (item.externalLinkUrl) {
      Linking.openURL(item.externalLinkUrl);
    } else if (isImage(item)) {
      setPreviewItem(item);
    } else if (item.fileId) {
      downloadAndShare(`${apiBaseUrl}/api/files/${item.fileId}`, `${TYPE_LABELS[item.documentType] ?? item.documentType}-v${item.version}`);
    }
  };

  return (
    <Screen scroll>
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by intern name or code"
        departmentOptions={isAdmin ? departmentSelectOptions : undefined}
        departmentValue={departmentFilter}
        onDepartmentChange={isAdmin ? handleDepartmentChange : undefined}
        internOptions={internSelectOptions}
        internValue={internFilter}
        onInternChange={setInternFilter}
      />

      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {filteredQueue.length} document{filteredQueue.length === 1 ? '' : 's'} awaiting review
        </Text>
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : filteredQueue.length === 0 ? (
        <View style={s.emptyContainer}>
          <Text variant="body" tone="muted">
            {queue.length === 0 ? 'Nothing to review right now.' : 'No documents match these filters.'}
          </Text>
        </View>
      ) : (
        filteredQueue.map((item) => (
          <View key={item.documentId} style={s.card}>
            <View style={s.cardHeader}>
              {item.externalLinkUrl ? (
                <Pressable onPress={() => handleThumbnailPress(item)} style={[s.thumbIcon, { backgroundColor: theme.colors.surfaceSunken }]}>
                  <ExternalLink size={24} color={theme.colors.primary} />
                </Pressable>
              ) : isImage(item) && item.fileId ? (
                <AuthImage fileId={item.fileId} size={48} onPress={() => handleThumbnailPress(item)} />
              ) : (
                <Pressable onPress={() => handleThumbnailPress(item)} style={[s.thumbIcon, { backgroundColor: theme.colors.surfaceSunken }]}>
                  <FileText size={24} color={theme.colors.textSecondary} />
                </Pressable>
              )}
              <View style={s.cardHeaderText}>
                <Text variant="bodyStrong" style={s.nameText} numberOfLines={1}>
                  {item.internFullName}
                </Text>
                <Text variant="caption" tone="muted">
                  {item.internCode} · {TYPE_LABELS[item.documentType] ?? item.documentType} (v{item.version})
                </Text>
                {isAdmin && item.departmentName ? (
                  <Text variant="caption" tone="secondary">
                    {item.departmentName}
                  </Text>
                ) : null}
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
                  setRemarks('');
                  setRejectTarget(item);
                }}
                disabled={busyId === item.documentId}
                style={s.iconBtn}
              >
                <X size={20} color={theme.colors.error} />
              </Pressable>
              <Pressable onPress={() => handleApprove(item)} disabled={busyId === item.documentId} style={s.iconBtn}>
                <Check size={20} color={theme.colors.primary} />
              </Pressable>
            </View>
          </View>
        ))
      )}

      <FormModal
        visible={rejectTarget !== null}
        title="Reject Document"
        onClose={() => setRejectTarget(null)}
        footer={
          <>
            <Button label="Cancel" variant="ghost" onPress={() => setRejectTarget(null)} />
            <Button label="Reject" variant="danger" onPress={handleConfirmReject} loading={busyId === rejectTarget?.documentId} />
          </>
        }
      >
        <Text variant="body" tone="secondary" style={{ marginBottom: theme.spacing.md }}>
          Let {rejectTarget?.internFullName} know why this document was rejected.
        </Text>
        <Input label="Remarks (Optional)" value={remarks} onChangeText={setRemarks} multiline placeholder="e.g. Please upload a clearer scan." />
      </FormModal>

      <FormModal visible={previewItem !== null} title="Document Preview" onClose={() => setPreviewItem(null)}>
        {previewItem?.fileId ? <AuthImage fileId={previewItem.fileId} style={s.previewImage} contentFit="contain" /> : null}
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
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
  },
  cardHeaderText: { flex: 1 },
  nameText: { fontSize: 16, fontWeight: '600' as const },
  thumbIcon: {
    width: 48,
    height: 48,
    borderRadius: t.radii.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
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
  previewImage: {
    alignSelf: 'center' as const,
    width: '100%' as const,
    height: 220,
    borderRadius: t.radii.md,
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.md,
    backgroundColor: t.colors.surface,
  },
});