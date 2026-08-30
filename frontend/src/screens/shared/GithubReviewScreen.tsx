import React, { useCallback, useMemo, useState } from 'react';
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
import { FilterBar } from '../../components/filters/FilterBar';
import { githubApi, type GithubReviewQueueItemDto } from '../../api/resources/github.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

type ReasonAction = 'Rejected' | 'ResubmitRequested';

export function GithubReviewScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();
  const [reasonModal, setReasonModal] = useState<{ item: GithubReviewQueueItemDto; action: ReasonAction } | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);
  const [internFilter, setInternFilter] = useState<number | null>(null);

  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['github', 'review', 'queue'],
    queryFn: githubApi.review.getQueue,
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
      return (
        q.internFullName.toLowerCase().includes(term) ||
        q.internCode.toLowerCase().includes(term) ||
        q.repositoryUrl.toLowerCase().includes(term)
      );
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
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by intern name, code, or repo URL"
        departmentOptions={isAdmin ? departmentSelectOptions : undefined}
        departmentValue={departmentFilter}
        onDepartmentChange={isAdmin ? handleDepartmentChange : undefined}
        internOptions={internSelectOptions}
        internValue={internFilter}
        onInternChange={setInternFilter}
      />

      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {filteredQueue.length} submission{filteredQueue.length === 1 ? '' : 's'} awaiting review
        </Text>
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : filteredQueue.length === 0 ? (
        <View style={s.emptyContainer}>
          <GitBranch size={32} color={theme.colors.textMuted} />
          <Text variant="body" tone="muted">
            {queue.length === 0 ? 'Nothing to review right now.' : 'No submissions match these filters.'}
          </Text>
        </View>
      ) : (
        filteredQueue.map((item) => (
          <View key={item.submissionId} style={s.card}>
            <View style={s.cardMain}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" style={s.nameText}>
                  {item.internFullName}
                </Text>
                <Text variant="caption" tone="muted">
                  {item.internCode} · v{item.version}
                </Text>
                {isAdmin && item.departmentName ? (
                  <Text variant="caption" tone="secondary">
                    {item.departmentName}
                  </Text>
                ) : null}
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