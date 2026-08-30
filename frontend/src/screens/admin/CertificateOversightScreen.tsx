import React, { useMemo, useState } from 'react';
import { View, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { CheckSquare, Square, CheckCircle2, Send, Search, X } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { SelectField } from '../../components/forms/SelectField';
import { certificatesApi, type CertificateDto } from '../../api/resources/certificates.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

const statusTone: Record<string, 'muted' | 'success' | 'warning' | 'error'> = {
  Locked: 'muted',
  PendingApproval: 'warning',
  Approved: 'warning',
  Issued: 'success',
  Rejected: 'error',
};

const statusBgKey: Record<string, 'surfaceSunken' | 'warningBg' | 'successBg' | 'errorBg'> = {
  Locked: 'surfaceSunken',
  PendingApproval: 'warningBg',
  Approved: 'warningBg',
  Issued: 'successBg',
  Rejected: 'errorBg',
};

export function CertificateOversightScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['departments', 'lookup'],
    queryFn: departmentsApi.lookup,
  });

  const deptSelectOptions = useMemo(() => {
    const list = departmentOptions.map((d) => ({ value: String(d.id), label: d.name }));
    return [{ value: 'all', label: 'All Departments' }, ...list];
  }, [departmentOptions]);

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['certificates', 'list', departmentId],
    queryFn: () => certificatesApi.list(departmentId ?? undefined),
  });

  const filteredCertificates = useMemo(() => {
    if (!search.trim()) return certificates;
    const q = search.toLowerCase().trim();
    return certificates.filter((c) => {
      const nameMatch = c.internFullName?.toLowerCase().includes(q);
      const codeMatch = c.internCode?.toLowerCase().includes(q);
      const certMatch = c.certificateNumber?.toLowerCase().includes(q);
      return nameMatch || codeMatch || certMatch;
    });
  }, [certificates, search]);

  const approvedSelectedCount = certificates.filter(
    (c) => selected.has(c.internProfileId) && c.status === 'Approved',
  ).length;

  const toggleSearch = () => {
    if (showSearch) {
      setSearch('');
    }
    setShowSearch((prev) => !prev);
  };

  const toggleSelect = (internProfileId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(internProfileId)) next.delete(internProfileId);
      else next.add(internProfileId);
      return next;
    });
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['certificates', 'list'] });

  const handleApprove = async (internProfileId: number) => {
    setBusyId(internProfileId);
    try {
      await certificatesApi.approve(internProfileId);
      Toast.show({ type: 'success', text1: 'Approved' });
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not approve', text2: error?.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleIssue = async (internProfileId: number) => {
    setBusyId(internProfileId);
    try {
      await certificatesApi.issue(internProfileId);
      Toast.show({ type: 'success', text1: 'Issued' });
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not issue', text2: error?.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkIssue = async () => {
    const targets = certificates.filter(
      (c) => selected.has(c.internProfileId) && c.status === 'Approved',
    );
    if (targets.length === 0) return;
    setBusyId(-1);
    let succeeded = 0;
    for (const t of targets) {
      try {
        await certificatesApi.issue(t.internProfileId);
        succeeded++;
      } catch {
        // continue
      }
    }
    Toast.show({
      type: succeeded === targets.length ? 'success' : 'warning',
      text1: `Issued ${succeeded} of ${targets.length}`,
    });
    setSelected(new Set());
    setBusyId(null);
    invalidate();
  };

  const renderCard = ({ item: c }: { item: CertificateDto }) => {
    const isBusy = busyId === c.internProfileId;
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Pressable
            onPress={() => toggleSelect(c.internProfileId)}
            hitSlop={8}
            disabled={c.status !== 'Approved'}
            style={s.checkboxContainer}
          >
            {selected.has(c.internProfileId) ? (
              <CheckSquare size={20} color={theme.colors.primary} />
            ) : (
              <Square
                size={20}
                color={c.status === 'Approved' ? theme.colors.textMuted : theme.colors.border}
              />
            )}
          </Pressable>
          <View style={s.cardHeaderText}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {c.internFullName}
            </Text>
            <Text variant="caption" tone="muted">
              {c.internCode} · {c.certificateNumber}
            </Text>
          </View>
        </View>

        <Text variant="caption" tone="secondary" numberOfLines={1} style={s.cardSubline}>
          {c.departmentName ?? 'Unassigned'}
        </Text>

        <View style={s.badgeRow}>
          <View
            style={[
              s.badge,
              { backgroundColor: theme.colors[statusBgKey[c.status] ?? 'surfaceSunken'] },
            ]}
          >
            <Text variant="caption" tone={statusTone[c.status] ?? 'muted'}>
              {c.status}
            </Text>
          </View>
        </View>

        {(c.status === 'PendingApproval' || c.status === 'Approved') && (
          <>
            <View style={s.divider} />
            <View style={s.actionsRow}>
              {c.status === 'PendingApproval' && (
                <Pressable hitSlop={8} style={s.actionIcon} onPress={() => handleApprove(c.internProfileId)}>
                  {isBusy ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <CheckCircle2 size={18} color={theme.colors.primary} />
                  )}
                </Pressable>
              )}
              {c.status === 'Approved' && (
                <Pressable hitSlop={8} style={s.actionIcon} onPress={() => handleIssue(c.internProfileId)}>
                  {isBusy ? (
                    <ActivityIndicator size="small" color={theme.colors.success} />
                  ) : (
                    <Send size={18} color={theme.colors.success} />
                  )}
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <Screen scroll={false}>
      {/* 1. Department Filter Dropdown */}
      <SelectField
        label="Department"
        placeholder="Select Department"
        value={departmentId ? String(departmentId) : 'all'}
        options={deptSelectOptions}
        onChange={(val) => setDepartmentId(val === 'all' ? null : Number(val))}
      />

      {/* 2. Search Icon directly BELOW Department Dropdown */}
      <View style={s.searchIconRow}>
        <Pressable onPress={toggleSearch} style={s.iconButton} hitSlop={8}>
          {showSearch ? (
            <X size={20} color={theme.colors.textSecondary} />
          ) : (
            <Search size={20} color={theme.colors.textSecondary} />
          )}
        </Pressable>
      </View>

      {/* 3. Expandable Search Input field below icon */}
      {showSearch && (
        <View style={s.searchContainer}>
          <Input
            placeholder="Search by name, code, or cert #..."
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoFocus
          />
        </View>
      )}

      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {filteredCertificates.length} certificate{filteredCertificates.length === 1 ? '' : 's'}
        </Text>
        <Button
          label={`Bulk Issue (${approvedSelectedCount})`}
          size="sm"
          onPress={handleBulkIssue}
          loading={busyId === -1}
          disabled={approvedSelectedCount === 0}
        />
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <FlatList
          data={filteredCertificates}
          keyExtractor={(c) => String(c.internProfileId)}
          renderItem={renderCard}
          style={s.list}
          contentContainerStyle={
            filteredCertificates.length === 0 ? s.emptyListContent : s.listContent
          }
          ListEmptyComponent={
            <Text variant="body" tone="muted">
              No certificates found.
            </Text>
          }
        />
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  searchIconRow: {
    alignItems: 'flex-end' as const,
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.xs,
  },
  iconButton: {
    padding: 10,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  searchContainer: {
    marginBottom: t.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.md,
    marginTop: t.spacing.xs,
  },
  list: { flex: 1 },
  listContent: { gap: t.spacing.sm, paddingBottom: t.spacing.lg },
  emptyListContent: {
    flexGrow: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    ...t.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
  },
  checkboxContainer: { marginRight: 2 },
  cardHeaderText: { flex: 1 },
  cardSubline: { marginTop: 2 },
  badgeRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: t.spacing.xs,
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
  actionsRow: {
    flexDirection: 'row' as const,
    gap: t.spacing.lg,
    justify: 'flex-end' as const,
  },
  actionIcon: { padding: t.spacing.xs },
});