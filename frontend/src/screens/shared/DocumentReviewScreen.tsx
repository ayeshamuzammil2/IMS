import React, { useCallback, useMemo, useState } from 'react';
import { View, Pressable, Linking, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ExternalLink, FileText, Search, X, FileCheck } from 'lucide-react-native';
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
  if (['ProfilePhoto', 'CnicFront', 'CnicBack'].includes(item.documentType)) {
    return true;
  }
  return Boolean(item.contentType?.toLowerCase().startsWith('image/'));
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

  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);
  const [internFilter, setInternFilter] = useState<number | null>(null);

  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['documents', 'review', 'queue'],
    queryFn: documentsApi.review.getQueue,
  });

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['departments', 'lookup'],
    queryFn: departmentsApi.lookup,
    enabled: isAdmin,
  });

  const departmentSelectOptions = useMemo(
    () => departmentOptions.map((d) => ({ value: d.id, label: d.name })),
    [departmentOptions],
  );

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

  const toggleSearch = () => {
    if (showSearch) {
      setSearch('');
    }
    setShowSearch((prev) => !prev);
  };

  const handleDepartmentChange = (value: number | null) => {
    setDepartmentFilter(value);
    setInternFilter(null);
  };

  useFocusEffect(
    useCallback(() => {
      refetch();
      return () => {
        // Jab bhi user is screen se baahar jayega, sabhi filters, search, aur modals reset ho jayenge
        setShowSearch(false);
        setSearch('');
        setDepartmentFilter(null);
        setInternFilter(null);
        setPreviewItem(null);
        setRejectTarget(null);
        setRemarks('');
      };
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

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="caption" tone="muted" style={s.loadingText}>
            Loading review queue...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll style={s.screenContainer}>
      <View style={s.headerContainer}>
        <View style={s.headerRow}>
          <View style={s.headerTitleContainer}>
            <View style={s.titleIndicator} />
            <Text variant="overline" tone="muted" style={s.headerLabel}>
              {filteredQueue.length} {filteredQueue.length === 1 ? 'DOCUMENT' : 'DOCUMENTS'} AWAITING
            </Text>
          </View>

          <Pressable onPress={toggleSearch} style={[s.iconButton, showSearch && s.iconButtonActive]} hitSlop={8}>
            {showSearch ? <X size={18} color={theme.colors.primary} /> : <Search size={18} color={theme.colors.textMuted} />}
          </Pressable>
        </View>

        {showSearch ? (
          <View style={s.searchContainer}>
            <Input
              placeholder="Search by intern name or code..."
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        ) : null}

        <View style={s.filterWrapper}>
          <FilterBar
            departmentOptions={isAdmin ? departmentSelectOptions : undefined}
            departmentValue={departmentFilter}
            onDepartmentChange={isAdmin ? handleDepartmentChange : undefined}
            internOptions={internSelectOptions}
            internValue={internFilter}
            onInternChange={setInternFilter}
          />
        </View>
      </View>

      {filteredQueue.length === 0 ? (
        <View style={s.emptyBox}>
          <Text variant="body" tone="muted">
            {queue.length === 0 ? 'Nothing to review right now.' : 'No documents match these filters.'}
          </Text>
        </View>
      ) : (
        <View style={s.listContainer}>
          {filteredQueue.map((item) => {
            const isImg = isImage(item);

            return (
              <View key={item.documentId} style={s.card}>
                <View style={s.cardHeader}>
                  <Pressable
                    onPress={() => handleThumbnailPress(item)}
                    style={[s.avatarBadge, !item.externalLinkUrl && !isImg && s.pdfAvatarBadge]}
                  >
                    {item.externalLinkUrl ? (
                      <ExternalLink size={20} color={theme.colors.primary} />
                    ) : isImg && item.fileId ? (
                      <AuthImage fileId={item.fileId} size={44} style={s.avatarImage} />
                    ) : item.fileId ? (
                      <FileCheck size={20} color={theme.colors.primary} />
                    ) : (
                      <FileText size={20} color={theme.colors.textMuted} />
                    )}
                  </Pressable>

                  <View style={s.cardHeaderText}>
                    <Text variant="bodyStrong" style={s.cardTitle} numberOfLines={1}>
                      {item.internFullName}
                    </Text>
                    <Text variant="caption" tone="muted" style={s.subText} numberOfLines={1}>
                      {item.internCode} · {TYPE_LABELS[item.documentType] ?? item.documentType} (v{item.version})
                    </Text>
                  </View>
                </View>

                <View style={s.statusRow}>
                  <View style={s.metaLeftGroup}>
                    {isAdmin && item.departmentName ? (
                      <Text variant="caption" tone="muted" style={s.deptText} numberOfLines={1}>
                        Dept: {item.departmentName}
                      </Text>
                    ) : (
                      <Text variant="caption" tone="muted" style={s.deptText} numberOfLines={1}>
                        Status
                      </Text>
                    )}
                  </View>

                  <View style={[s.badge, { backgroundColor: theme.colors.warningBg || '#FFFBEB' }]}>
                    <Text variant="caption" style={[s.badgeText, { color: theme.colors.warning || '#D97706' }]}>
                      Pending Review
                    </Text>
                  </View>
                </View>

                <View style={s.divider} />

                <View style={s.actionRow}>
                  <Button
                    label="Reject"
                    size="sm"
                    variant="danger"
                    onPress={() => {
                      setRemarks('');
                      setRejectTarget(item);
                    }}
                    disabled={busyId === item.documentId}
                    style={s.actionBtn}
                  />
                  <Button
                    label="Approve"
                    size="sm"
                    variant="primary"
                    onPress={() => handleApprove(item)}
                    loading={busyId === item.documentId}
                    style={s.actionBtn}
                  />
                </View>
              </View>
            );
          })}
        </View>
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

export default DocumentReviewScreen;

const makeStyles = (t: AppTheme) => ({
  screenContainer: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.lg,
  },
  headerContainer: {
    marginBottom: t.spacing.md,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.xs,
  },
  headerTitleContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  titleIndicator: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: t.colors.primary,
  },
  headerLabel: {
    letterSpacing: 1,
  },
  filterWrapper: {
    marginTop: t.spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconButtonActive: {
    borderColor: t.colors.primary,
    backgroundColor: `${t.colors.primary}10`,
  },
  searchContainer: {
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.xs,
  },
  emptyBox: {
    paddingVertical: t.spacing.xl * 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  listContainer: {
    gap: t.spacing.md,
    paddingBottom: t.spacing.xl * 1.5,
  },
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
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
  },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  },
  pdfAvatarBadge: {
    backgroundColor: `${t.colors.primary}12`,
    borderWidth: 1,
    borderColor: `${t.colors.primary}30`,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    flexShrink: 1,
  },
  subText: {
    marginTop: 3,
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 12,
    paddingLeft: 2,
  },
  metaLeftGroup: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flex: 1,
  },
  deptText: {
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginTop: t.spacing.md,
    marginBottom: t.spacing.md,
  },
  actionRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: t.spacing.sm,
  },
  actionBtn: {
    minWidth: 90,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: t.spacing.lg,
  },
  previewImage: {
    alignSelf: 'center' as const,
    width: '100%' as const,
    height: 250,
    borderRadius: 12,
    marginTop: t.spacing.sm,
    backgroundColor: t.colors.surface,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: t.spacing.sm,
  },
  loadingText: {
    marginTop: t.spacing.xs,
  },
});