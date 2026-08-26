import React, { useMemo, useState } from 'react';
import { View, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { CheckSquare, Square, CheckCircle2, Send } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { SelectField } from '../../components/forms/SelectField';
import { idCardsApi, type IdCardDto } from '../../api/resources/idcards.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

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
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data: departmentOptions = [] } = useQuery({ queryKey: ['departments', 'lookup'], queryFn: departmentsApi.lookup });
  const deptSelectOptions = useMemo(() => departmentOptions.map((d) => ({ value: d.id, label: d.name })), [departmentOptions]);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['idcards', 'list', departmentId],
    queryFn: () => idCardsApi.list(departmentId ?? undefined),
  });

  const approvedSelectedCount = cards.filter((c) => selected.has(c.internProfileId) && c.status === 'Approved').length;

  const toggleSelect = (internProfileId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(internProfileId)) next.delete(internProfileId);
      else next.add(internProfileId);
      return next;
    });
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['idcards', 'list'] });

  const handleApprove = async (internProfileId: number) => {
    setBusyId(internProfileId);
    try {
      await idCardsApi.approve(internProfileId);
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
      await idCardsApi.issue(internProfileId);
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
    Toast.show({ type: succeeded === targets.length ? 'success' : 'warning', text1: `Issued ${succeeded} of ${targets.length}` });
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
              <Square size={20} color={c.status === 'Approved' ? theme.colors.textMuted : theme.colors.border} />
            )}
          </Pressable>
          <View style={s.cardHeaderText}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {c.internFullName}
            </Text>
            <Text variant="caption" tone="muted">
              {c.internCode} · {c.cardNumber}
            </Text>
          </View>
        </View>

        <Text variant="caption" tone="secondary" numberOfLines={1} style={s.cardSubline}>
          {c.departmentName ?? 'Unassigned'}
        </Text>

        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: theme.colors[statusBgKey[c.status] ?? 'surfaceSunken'] }]}>
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
                  {isBusy ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <CheckCircle2 size={18} color={theme.colors.primary} />}
                </Pressable>
              )}
              {c.status === 'Approved' && (
                <Pressable hitSlop={8} style={s.actionIcon} onPress={() => handleIssue(c.internProfileId)}>
                  {isBusy ? <ActivityIndicator size="small" color={theme.colors.success} /> : <Send size={18} color={theme.colors.success} />}
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
      <View style={s.filterRow}>
        <SelectField label="Department" placeholder="All departments" value={departmentId} options={deptSelectOptions} onChange={setDepartmentId} />
      </View>

      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {cards.length} ID card{cards.length === 1 ? '' : 's'}
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
          data={cards}
          keyExtractor={(c) => String(c.internProfileId)}
          renderItem={renderCard}
          style={s.list}
          contentContainerStyle={cards.length === 0 ? s.emptyListContent : s.listContent}
          ListEmptyComponent={
            <Text variant="body" tone="muted">
              No ID cards generated yet.
            </Text>
          }
        />
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  filterRow: { marginBottom: t.spacing.sm },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.md,
  },
  list: { flex: 1 },
  listContent: { gap: t.spacing.sm, paddingBottom: t.spacing.lg },
  emptyListContent: { flexGrow: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    ...t.shadows.sm,
  },
  cardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: t.spacing.sm },
  checkboxContainer: { marginRight: 2 },
  cardHeaderText: { flex: 1 },
  cardSubline: { marginTop: 2 },
  badgeRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: t.spacing.xs, marginTop: t.spacing.sm },
  badge: { paddingHorizontal: t.spacing.sm, paddingVertical: 3, borderRadius: t.radii.full },
  divider: { height: 1, backgroundColor: t.colors.border, marginTop: t.spacing.md, marginBottom: t.spacing.sm },
  actionsRow: { flexDirection: 'row' as const, gap: t.spacing.lg, justifyContent: 'flex-end' as const },
  actionIcon: { padding: t.spacing.xs },
});