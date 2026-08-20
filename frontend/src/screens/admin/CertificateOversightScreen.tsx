import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { CheckSquare, Square } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { SelectField } from '../../components/forms/SelectField';
import { certificatesApi, type CertificateDto } from '../../api/resources/certificates.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

const STATUS_TONE: Record<string, 'muted' | 'success' | 'warning' | 'error'> = {
  Locked: 'muted',
  PendingApproval: 'warning',
  Approved: 'warning',
  Issued: 'success',
  Rejected: 'error',
};

export function CertificateOversightScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const { data: departmentOptions = [] } = useQuery({ queryKey: ['departments', 'lookup'], queryFn: departmentsApi.lookup });
  const deptSelectOptions = useMemo(() => departmentOptions.map((d) => ({ value: d.id, label: d.name })), [departmentOptions]);

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['certificates', 'list', departmentId],
    queryFn: () => certificatesApi.list(departmentId ?? undefined),
  });

  const grouped = useMemo(() => {
    const byDept = new Map<string, CertificateDto[]>();
    for (const c of certificates) {
      const key = c.departmentName ?? 'Unassigned';
      if (!byDept.has(key)) byDept.set(key, []);
      byDept.get(key)!.push(c);
    }
    return Array.from(byDept.entries());
  }, [certificates]);

  const approvedSelectedCount = certificates.filter((c) => selected.has(c.internProfileId) && c.status === 'Approved').length;

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
    setBusy(true);
    try {
      await certificatesApi.approve(internProfileId);
      Toast.show({ type: 'success', text1: 'Approved' });
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not approve', text2: error?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleIssue = async (internProfileId: number) => {
    setBusy(true);
    try {
      await certificatesApi.issue(internProfileId);
      Toast.show({ type: 'success', text1: 'Issued' });
      invalidate();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not issue', text2: error?.message });
    } finally {
      setBusy(false);
    }
  };

  const handleBulkIssue = async () => {
    const targets = certificates.filter((c) => selected.has(c.internProfileId) && c.status === 'Approved');
    if (targets.length === 0) return;
    setBusy(true);
    let succeeded = 0;
    for (const t of targets) {
      try {
        await certificatesApi.issue(t.internProfileId);
        succeeded++;
      } catch {
        // continue issuing the rest; failures are surfaced in the summary toast below
      }
    }
    Toast.show({ type: succeeded === targets.length ? 'success' : 'warning', text1: `Issued ${succeeded} of ${targets.length}` });
    setSelected(new Set());
    setBusy(false);
    invalidate();
  };

  return (
    <Screen scroll>
      <View style={s.filterRow}>
        <SelectField label="Department" placeholder="All departments" value={departmentId} options={deptSelectOptions} onChange={setDepartmentId} />
      </View>

      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {certificates.length} certificate{certificates.length === 1 ? '' : 's'}
        </Text>
        <Button
          label={`Bulk Issue (${approvedSelectedCount})`}
          size="sm"
          onPress={handleBulkIssue}
          loading={busy}
          disabled={approvedSelectedCount === 0}
        />
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : grouped.length === 0 ? (
        <Text variant="body" tone="muted">
          No certificates generated yet.
        </Text>
      ) : (
        grouped.map(([deptName, items]) => (
          <View key={deptName} style={s.deptSection}>
            <Text variant="overline" tone="muted" style={s.deptLabel}>
              {deptName.toUpperCase()}
            </Text>
            {items.map((c) => (
              <View key={c.internProfileId} style={s.card}>
                <View style={s.cardRow}>
                  <Pressable onPress={() => toggleSelect(c.internProfileId)} hitSlop={8} disabled={c.status !== 'Approved'}>
                    {selected.has(c.internProfileId) ? (
                      <CheckSquare size={20} color={theme.colors.primary} />
                    ) : (
                      <Square size={20} color={c.status === 'Approved' ? theme.colors.textMuted : theme.colors.border} />
                    )}
                  </Pressable>
                  <View style={s.infoCol}>
                    <Text variant="bodyStrong">{c.internFullName}</Text>
                    <Text variant="caption" tone="muted">
                      {c.internCode} - {c.certificateNumber}
                    </Text>
                  </View>
                  <Text variant="caption" tone={STATUS_TONE[c.status]}>
                    {c.status}
                  </Text>
                </View>
                <View style={s.actionsRow}>
                  {c.status === 'PendingApproval' ? (
                    <Button label="Approve" size="sm" onPress={() => handleApprove(c.internProfileId)} loading={busy} fullWidth />
                  ) : null}
                  {c.status === 'Approved' ? (
                    <Button label="Issue" size="sm" variant="outline" onPress={() => handleIssue(c.internProfileId)} loading={busy} fullWidth />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  filterRow: { marginBottom: t.spacing.sm },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: t.spacing.md },
  deptSection: { marginBottom: t.spacing.md },
  deptLabel: { marginBottom: t.spacing.xs, marginLeft: t.spacing.xs },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    marginBottom: t.spacing.sm,
    gap: t.spacing.sm,
  },
  cardRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: t.spacing.sm },
  infoCol: { flex: 1, gap: 2 },
  actionsRow: { flexDirection: 'row' as const, gap: t.spacing.sm },
});
