import React, { useCallback, useMemo, useState } from 'react';
import { View, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { GitBranch, ChevronRight, Check, X, RotateCcw, Search } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { Input } from '../../components/primitives/Input';
import { FormModal } from '../../components/forms/FormModal';
import { SelectField } from '../../components/forms/SelectField';
import { githubApi, type GithubReviewQueueItemDto } from '../../api/resources/github.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

type ReasonAction = 'Rejected' | 'ResubmitRequested';

const GithubReviewCard = ({ item, isAdmin, theme, s, setReasonModal, handleApprove, busyId }: any) => {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.avatarBadge}>
          <GitBranch size={20} color={theme.colors.primary} />
        </View>
        <View style={s.cardHeaderText}>
          <Text variant="bodyStrong" style={s.cardTitle} numberOfLines={1}>
            {item.internFullName}
          </Text>
          <Text variant="caption" tone="muted" style={s.emailText} numberOfLines={1}>
            Code: {item.internCode} · v{item.version}
          </Text>
        </View>
        <ChevronRight size={18} color={theme.colors.textMuted} />
      </View>

      <View style={s.statusRow}>
        <View style={s.metaLeftGroup}>
          <Text variant="caption" tone="brand" numberOfLines={1} style={s.mentorText}>
            {item.repositoryUrl}
          </Text>
        </View>
        <View style={[s.badge, { backgroundColor: theme.colors.warningBg || '#FFFBEB' }]}>
          <Text variant="caption" style={[s.badgeText, { color: theme.colors.warning || '#D97706' }]}>
            Pending Review
          </Text>
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.actionsRowContainer}>
        {isAdmin && item.departmentName ? (
          <Text variant="caption" tone="muted" style={{ paddingLeft: 4 }}>
            Dept: {item.departmentName}
          </Text>
        ) : (
          <Text variant="caption" tone="muted" style={{ paddingLeft: 4 }}>
            Review action
          </Text>
        )}

        <View style={s.actionsRow}>
          <Pressable
            hitSlop={8}
            style={[s.actionIcon, { backgroundColor: '#FEF2F2' }]}
            onPress={() => setReasonModal({ item, action: 'Rejected' })}
            disabled={busyId === item.submissionId}
          >
            <X size={16} color={theme.colors.error} />
          </Pressable>

          <Pressable
            hitSlop={8}
            style={s.actionIcon}
            onPress={() => setReasonModal({ item, action: 'ResubmitRequested' })}
            disabled={busyId === item.submissionId}
          >
            <RotateCcw size={16} color={theme.colors.textSecondary} />
          </Pressable>

          <Pressable
            hitSlop={8}
            style={s.actionIcon}
            onPress={() => handleApprove(item)}
            disabled={busyId === item.submissionId}
          >
            {busyId === item.submissionId ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Check size={16} color={theme.colors.primary} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export function GithubReviewScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const queryClient = useQueryClient();

  const [reasonModal, setReasonModal] = useState<{ item: GithubReviewQueueItemDto; action: ReasonAction } | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<number | null>(null);
  const [internFilter, setInternFilter] = useState<number | null>(null);

  const { data: queue = [], isLoading, refetch } = useQuery({
    queryKey: ['github', 'review', 'queue'],
    queryFn: githubApi.review.getQueue,
  });

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['departments', 'lookup'],
    queryFn: departmentsApi.lookup,
    enabled: isAdmin,
  });

  const departmentSelectOptions = useMemo(() => {
    const list = departmentOptions.map((d) => ({ value: String(d.id), label: d.name }));
    return [{ value: 'all', label: 'All Departments' }, ...list];
  }, [departmentOptions]);

  const departmentScopedQueue = useMemo(
    () => (isAdmin && departmentFilter ? queue.filter((q) => q.departmentId === departmentFilter) : queue),
    [queue, isAdmin, departmentFilter],
  );

  const internSelectOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const q of departmentScopedQueue) {
      if (!seen.has(q.internProfileId)) seen.set(q.internProfileId, `${q.internFullName} (${q.internCode})`);
    }
    const list = Array.from(seen.entries())
      .map(([value, label]) => ({ value: String(value), label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: 'all', label: 'All Interns' }, ...list];
  }, [departmentScopedQueue]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (text.trim() && internFilter) {
      setInternFilter(null);
    }
  };

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

  const handleDepartmentChange = (value: string) => {
    setDepartmentFilter(value === 'all' ? null : Number(value));
    setInternFilter(null);
  };

  const toggleSearch = () => {
    if (showSearch) setSearch('');
    setShowSearch((prev) => !prev);
  };

  useFocusEffect(
    useCallback(() => {
      refetch();
      return () => {
        setShowSearch(false);
        setSearch('');
        setDepartmentFilter(null);
        setInternFilter(null);
        setReasonModal(null);
        setReason('');
      };
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
    <Screen scroll={false} style={s.screenContainer}>
      <View style={s.headerContainer}>
        {/* Header Label Row */}
        <View style={s.headerRow}>
          <View style={s.headerTitleContainer}>
            <View style={s.titleIndicator} />
            <Text variant="overline" tone="muted" style={s.headerLabel}>
              {filteredQueue.length} {filteredQueue.length === 1 ? 'SUBMISSION' : 'SUBMISSIONS'} AWAITING
            </Text>
          </View>

          <Pressable onPress={toggleSearch} style={[s.iconButton, showSearch && s.iconButtonActive]} hitSlop={8}>
            {showSearch ? <X size={18} color={theme.colors.primary} /> : <Search size={18} color={theme.colors.textMuted} />}
          </Pressable>
        </View>

        {/* Expandable Search Input */}
        {showSearch && (
          <View style={s.searchContainer}>
            <Input
              placeholder="Search by intern name, code, or repo URL..."
              value={search}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        )}

        {/* Filters */}
        {isAdmin && (
          <View style={s.filterSpacing}>
            <SelectField
              label="Department"
              placeholder="Select Department"
              value={departmentFilter ? String(departmentFilter) : 'all'}
              options={departmentSelectOptions}
              onChange={handleDepartmentChange}
            />
          </View>
        )}

        <View style={s.filterSpacing}>
          <SelectField
            label="Intern"
            placeholder="Select Intern"
            value={internFilter ? String(internFilter) : 'all'}
            options={internSelectOptions}
            onChange={(val) => {
              setInternFilter(val === 'all' ? null : Number(val));
              if (val !== 'all') setSearch('');
            }}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="caption" tone="muted" style={{ marginTop: 12 }}>
            Loading submissions...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredQueue}
          keyExtractor={(item) => item.submissionId.toString()}
          renderItem={({ item }) => (
            <GithubReviewCard
              item={item}
              isAdmin={isAdmin}
              theme={theme}
              s={s}
              setReasonModal={setReasonModal}
              handleApprove={handleApprove}
              busyId={busyId}
            />
          )}
          style={s.list}
          contentContainerStyle={filteredQueue.length === 0 ? s.emptyListContent : s.listContent}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <GitBranch size={32} color={theme.colors.textMuted} />
              <Text variant="body" tone="muted" style={{ marginTop: 8 }}>
                {queue.length === 0 ? 'Nothing to review right now.' : 'No submissions match these filters.'}
              </Text>
            </View>
          }
        />
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
  screenContainer: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: 8,
  },
  headerContainer: {
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.md,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.sm,
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
  filterSpacing: {
    marginTop: t.spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  iconButtonActive: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.surfaceSunken,
  },
  searchContainer: {
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.xs,
  },
  list: { flex: 1 },
  listContent: {
    gap: t.spacing.md,
    paddingBottom: t.spacing.xl * 1.5,
  },
  emptyListContent: {
    flexGrow: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    flexShrink: 1,
  },
  emailText: {
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
  mentorText: {
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
    marginBottom: t.spacing.sm,
  },
  actionsRowContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  actionsRow: {
    flexDirection: 'row' as const,
    gap: t.spacing.md,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    paddingTop: 4,
    marginLeft: 'auto',
  },
  actionIcon: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: t.colors.surfaceSunken,
  },
  emptyBox: {
    paddingVertical: t.spacing.xl * 2,
    alignItems: 'center' as const,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});