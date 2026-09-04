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
import { idCardsApi, type IdCardDto } from '../../api/resources/idcards.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';
import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

const statusTone: Record<string, 'muted' | 'success' | 'warning' | 'error'> = {
  Draft: 'muted',
  PendingApproval: 'warning',
  Approved: 'warning',
  Issued: 'success',
  Rejected: 'error',
};

const statusBgKey: Record<string, 'surfaceSunken' | 'warningBg' | 'successBg' | 'errorBg'> = {
  Draft: 'surfaceSunken',
  PendingApproval: 'warningBg',
  Approved: 'warningBg',
  Issued: 'successBg',
  Rejected: 'errorBg',
};

export function IdCardOversightScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [internProfileId, setInternProfileId] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      return () => {
        // Jab bhi user is screen se baahar jayega, search reset ho jayegi
        setShowSearch(false);
        setSearch('');
      };
    }, [])
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);

  // Departments Query
  const { data: departmentOptions = [] } = useQuery({ 
    queryKey: ['departments', 'lookup'], 
    queryFn: departmentsApi.lookup 
  });

  const deptSelectOptions = useMemo(() => {
    const list = departmentOptions.map((d) => ({ value: String(d.id), label: d.name }));
    return [{ value: 'all', label: 'All Departments' }, ...list];
  }, [departmentOptions]);

  // All Cards Query
  const { data: allCards = [], isLoading } = useQuery({
    queryKey: ['idcards', 'list', departmentId],
    queryFn: () => idCardsApi.list(departmentId ?? undefined),
  });

  // Intern Options built dynamically from current cards/department list
  const internSelectOptions = useMemo(() => {
    const list = allCards.map((c) => ({
      value: String(c.internProfileId),
      label: `${c.internFullName} (${c.internCode})`,
    }));
    return [{ value: 'all', label: 'All Interns' }, ...list];
  }, [allCards]);

  // Filtering Logic (Department, Intern Dropdown & Search Bar)
  const cards = useMemo(() => {
    let result = allCards;

    if (internProfileId) {
      result = result.filter((c) => c.internProfileId === internProfileId);
    }

    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (c) =>
          (c.internFullName ?? '').toLowerCase().includes(term) ||
          (c.internCode ?? '').toLowerCase().includes(term)
      );
    }

    return result;
  }, [allCards, internProfileId, search]);

  const approvedSelectedCount = cards.filter(
    (c) => selected.has(c.internProfileId) && c.status === 'Approved'
  ).length;

  const toggleSearch = () => {
    if (showSearch) {
      setSearch('');
    }
    setShowSearch((prev) => !prev);
  };

  const toggleSelect = (profileId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  const handleDepartmentChange = (val: string) => {
    setDepartmentId(val === 'all' ? null : Number(val));
    setInternProfileId(null); // Reset intern selection on department change
  };

  const handleInternChange = (val: string) => {
    setInternProfileId(val === 'all' ? null : Number(val));
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['idcards', 'list'] });

  const handleApprove = async (profileId: number) => {
    setBusyId(profileId);
    try {
      await idCardsApi.approve(profileId);
      Toast.show({ type: 'success', text1: 'Approved' });
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not approve', text2: error?.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleIssue = async (profileId: number) => {
    setBusyId(profileId);
    try {
      await idCardsApi.issue(profileId);
      Toast.show({ type: 'success', text1: 'Issued' });
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not issue', text2: error?.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleBulkIssue = async () => {
    const targets = cards.filter((c) => selected.has(c.internProfileId) && c.status === 'Approved');
    if (targets.length === 0) return;
    setBusyId(-1);
    let succeeded = 0;
    for (const t of targets) {
      try {
        await idCardsApi.issue(t.internProfileId);
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

  const renderCard = ({ item: c }: { item: IdCardDto }) => {
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
            <Text variant="bodyStrong" style={s.cardTitle} numberOfLines={1}>
              {c.internFullName}
            </Text>
            <Text variant="caption" tone="muted" style={s.subText} numberOfLines={1}>
              {c.internCode}
            </Text>
          </View>
        </View>

        <View style={s.statusRow}>
          <View style={s.metaLeftGroup}>
            <Text variant="caption" tone="muted" style={s.countText} numberOfLines={1}>
              {c.departmentName ?? 'Unassigned'}
            </Text>
          </View>

          <View
            style={[
              s.badge,
              { backgroundColor: theme.colors[statusBgKey[c.status] ?? 'surfaceSunken'] },
            ]}
          >
            <Text variant="caption" tone={statusTone[c.status] ?? 'muted'} style={s.badgeText}>
              {c.status}
            </Text>
          </View>
        </View>

        {(c.status === 'PendingApproval' || c.status === 'Approved') && (
          <>
            <View style={s.divider} />
            <View style={s.actionsRow}>
              {c.status === 'PendingApproval' && (
                <Pressable hitSlop={8} style={s.actionIconBtn} onPress={() => handleApprove(c.internProfileId)}>
                  {isBusy ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <CheckCircle2 size={18} color={theme.colors.primary} />
                  )}
                </Pressable>
              )}
              {c.status === 'Approved' && (
                <Pressable hitSlop={8} style={s.actionIconBtn} onPress={() => handleIssue(c.internProfileId)}>
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
      {/* 1. Header Row (COUNT TEXT & BULK ISSUE) */}
      <View style={s.headerRow}>
        <View style={s.headerTitleContainer}>
          <View style={s.titleIndicator} />
          <Text variant="overline" tone="muted" style={s.headerLabel}>
            {cards.length} {cards.length === 1 ? 'ID CARD' : 'ID CARDS'} FOUND
          </Text>
        </View>

        <Button
          label={`Bulk Issue (${approvedSelectedCount})`}
          size="sm"
          onPress={handleBulkIssue}
          loading={busyId === -1}
          disabled={approvedSelectedCount === 0}
        />
      </View>

      {/* 2. Department Filter Dropdown (Count text ke niche) */}
      <View style={s.filterContainer}>
        <SelectField
          label="Department"
          placeholder="Select Department"
          value={departmentId ? String(departmentId) : 'all'}
          options={deptSelectOptions}
          onChange={handleDepartmentChange}
        />
      </View>

      {/* 3. Intern Filter Dropdown (Department filter ke niche) */}
      <View style={s.filterContainer}>
        <SelectField
          label="Intern"
          placeholder="Select Intern"
          value={internProfileId ? String(internProfileId) : 'all'}
          options={internSelectOptions}
          onChange={handleInternChange}
        />
      </View>

      {/* 4. Search Bar Section */}
      <View style={s.searchBarSection}>
        <View style={s.searchIconRow}>
          <Pressable onPress={toggleSearch} style={[s.iconButton, showSearch && s.iconButtonActive]} hitSlop={8}>
            {showSearch ? (
              <X size={18} color={theme.colors.primary} />
            ) : (
              <Search size={18} color={theme.colors.textMuted} />
            )}
          </Pressable>
        </View>

        {showSearch && (
          <View style={s.searchContainer}>
            <Input
              placeholder="Search by intern name or code..."
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        )}
      </View>

      {/* 5. Main Cards List */}
      {isLoading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="caption" tone="muted" style={{ marginTop: 12 }}>
            Loading ID cards...
          </Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(c) => String(c.internProfileId)}
          renderItem={renderCard}
          style={s.list}
          contentContainerStyle={cards.length === 0 ? s.emptyListContent : s.listContent}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text variant="body" tone="muted">
                {allCards.length === 0 ? 'No ID cards generated yet.' : 'No ID cards match your search.'}
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.sm,
    marginTop: t.spacing.xs,
  },
  headerTitleContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  titleIndicator: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: t.colors.primary,
  },
  headerLabel: {
    letterSpacing: 0.8,
  },
  filterContainer: {
    marginBottom: t.spacing.xs,
  },
  searchBarSection: {
    marginBottom: t.spacing.sm,
    marginTop: t.spacing.xs,
  },
  searchIconRow: {
    alignItems: 'flex-end' as const,
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
    backgroundColor: t.colors.surfaceSunken,
  },
  searchContainer: {
    marginTop: t.spacing.xs,
  },
  list: { flex: 1 },
  listContent: {
    gap: t.spacing.sm,
    paddingBottom: t.spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
  },
  checkboxContainer: {
    marginRight: 2,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    flexShrink: 1,
  },
  subText: {
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 10,
  },
  metaLeftGroup: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flex: 1,
  },
  countText: {
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row' as const,
    gap: t.spacing.md,
    justifyContent: 'flex-end' as const,
  },
  actionIconBtn: {
    padding: 4,
  },
  emptyBox: {
    paddingVertical: t.spacing.xl,
    alignItems: 'center' as const,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});

export default IdCardOversightScreen;