import React, { useMemo, useState } from 'react';
import { View, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ChevronRight, Clock, Calendar, Search, X } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
import { Button } from '../../components/primitives/Button';
import { DateField } from '../../components/forms/DateField';
import { SelectField } from '../../components/forms/SelectField';
import { attendanceApi, type AttendanceHistoryRowDto } from '../../api/resources/attendance.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { toCsv } from '../../lib/csv';
import { writeTextAndShare } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const STATUS_BG: Record<string, 'successBg' | 'warningBg' | 'errorBg' | 'surfaceSunken'> = {
  Present: 'successBg',
  Late: 'warningBg',
  Absent: 'errorBg',
  Leave: 'surfaceSunken',
  Holiday: 'surfaceSunken',
};

const STATUS_TONE: Record<string, 'success' | 'warning' | 'error' | 'muted'> = {
  Present: 'success',
  Late: 'warning',
  Absent: 'error',
  Leave: 'muted',
  Holiday: 'muted',
};

export function AttendanceHistoryScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [startDate, setStartDate] = useState<string>(isoDaysAgo(6));
  const [endDate, setEndDate] = useState<string>(isoDaysAgo(0));
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  // Search State
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['departments', 'lookup'],
    queryFn: departmentsApi.lookup,
    enabled: isAdmin,
  });
  const deptSelectOptions = useMemo(() => departmentOptions.map((d) => ({ value: d.id, label: d.name })), [departmentOptions]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['attendance', 'history', startDate, endDate, departmentId],
    queryFn: () => attendanceApi.history(startDate, endDate, departmentId ?? undefined),
    enabled: !!startDate && !!endDate,
  });

  // Client-side Filter Logic for Search Query
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      return (
        r.internFullName.toLowerCase().includes(term) ||
        r.internCode.toLowerCase().includes(term) ||
        (r.departmentName && r.departmentName.toLowerCase().includes(term)) ||
        r.status.toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  const toggleSearch = () => {
    if (showSearch) {
      setSearch('');
    }
    setShowSearch((prev) => !prev);
  };

  const handleExport = async () => {
    if (filteredRows.length === 0) return;
    setExporting(true);
    try {
      const csv = toCsv(filteredRows, [
        { header: 'Intern Name', value: (r) => r.internFullName },
        { header: 'Intern Code', value: (r) => r.internCode },
        { header: 'Department', value: (r) => r.departmentName },
        { header: 'Work Date', value: (r) => r.workDate },
        { header: 'Status', value: (r) => r.status },
        { header: 'Arrival Time', value: (r) => (r.arrivalAtUtc ? new Date(r.arrivalAtUtc).toLocaleTimeString() : '') },
        { header: 'Departure Time', value: (r) => (r.departureAtUtc ? new Date(r.departureAtUtc).toLocaleTimeString() : '') },
      ]);
      await writeTextAndShare(csv, `attendance-${startDate}-to-${endDate}.csv`, 'text/csv');
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not export CSV', text2: error?.message });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen scroll>
      {/* Enhanced Clean White Wrapper for Filters */}
      <View style={s.filterWrapper}>
        <View style={s.filterRow}>
          <View style={s.dateField}>
            <DateField label="From" value={startDate} onChange={(v) => v && setStartDate(v)} />
          </View>
          <View style={s.dateField}>
            <DateField label="To" value={endDate} onChange={(v) => v && setEndDate(v)} />
          </View>
          {isAdmin ? (
            <View style={s.deptField}>
              <SelectField label="Department" placeholder="All" value={departmentId} options={deptSelectOptions} onChange={setDepartmentId} />
            </View>
          ) : null}
        </View>
      </View>

      {/* Search Icon Trigger & Expandable Input Bar */}
      <View style={s.searchSection}>
        <View style={s.searchIconRow}>
          <Pressable onPress={toggleSearch} style={s.iconButton} hitSlop={8}>
            {showSearch ? (
              <X size={20} color={theme.colors.textSecondary} />
            ) : (
              <Search size={20} color={theme.colors.textSecondary} />
            )}
          </Pressable>
        </View>

        {showSearch && (
          <View style={s.searchContainer}>
            <Input
              placeholder="Search by intern name, code or dept"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        )}
      </View>

      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {filteredRows.length} record{filteredRows.length === 1 ? '' : 's'}
        </Text>
        <Button label="Export CSV" size="sm" variant="outline" onPress={handleExport} loading={exporting} disabled={filteredRows.length === 0} />
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : filteredRows.length === 0 ? (
        <View style={s.emptyContainer}>
          <Text variant="body" tone="muted">
            {rows.length === 0 ? 'No attendance records in this range.' : 'No matching records found.'}
          </Text>
        </View>
      ) : (
        filteredRows.map((row) => (
          <View key={`${row.internProfileId}-${row.workDate}`} style={s.card}>
            <View style={s.cardMain}>
              <View style={s.cardInfo}>
                <Text variant="bodyStrong" style={s.nameText}>
                  {row.internFullName}
                </Text>
                <Text variant="caption" tone="muted">
                  {row.internCode}
                </Text>
                <Text variant="caption" tone="secondary" style={s.deptText}>
                  {row.departmentName}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textMuted} />
            </View>

            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: theme.colors[STATUS_BG[row.status] ?? 'surfaceSunken'] }]}>
                <Text variant="caption" tone={STATUS_TONE[row.status] ?? 'muted'}>
                  {row.status}
                </Text>
              </View>
              {row.arrivalIsLate ? (
                <View style={[s.badge, { backgroundColor: theme.colors.warningBg }]}>
                  <Text variant="caption" tone="warning">
                    Late Arrival
                  </Text>
                </View>
              ) : null}
              {row.departureIsEarly ? (
                <View style={[s.badge, { backgroundColor: theme.colors.warningBg }]}>
                  <Text variant="caption" tone="warning">
                    Early Departure
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={s.divider} />

            <View style={s.cardFooter}>
              <View style={s.footerItem}>
                <Calendar size={14} color={theme.colors.textMuted} />
                <Text variant="caption" tone="muted">
                  {new Date(row.workDate).toLocaleDateString()}
                </Text>
              </View>
              <View style={s.footerItem}>
                <Clock size={14} color={theme.colors.textMuted} />
                <Text variant="caption" tone="muted">
                  In: {row.arrivalAtUtc ? new Date(row.arrivalAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </Text>
              </View>
              <View style={s.footerItem}>
                <Clock size={14} color={theme.colors.textMuted} />
                <Text variant="caption" tone="muted">
                  Out: {row.departureAtUtc ? new Date(row.departureAtUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  filterWrapper: {
    backgroundColor: t.colors.surface, // Pure clean white surface
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    marginBottom: t.spacing.sm,
    ...t.shadows.sm,
  },
  filterRow: {
    flexDirection: 'row' as const,
    gap: t.spacing.sm,
    flexWrap: 'wrap' as const,
  },
  dateField: { flex: 1, minWidth: 130 },
  deptField: { flex: 1, minWidth: 150 },
  searchSection: {
    marginTop: t.spacing.xs,
    marginBottom: t.spacing.sm,
  },
  searchIconRow: {
    alignItems: 'flex-end' as const,
  },
  iconButton: {
    padding: 8,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  searchContainer: {
    marginTop: t.spacing.xs,
  },
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
  cardMain: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
  },
  cardInfo: { flex: 1 },
  nameText: { fontSize: 16, fontWeight: '600' as const },
  deptText: { marginTop: 2 },
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
    marginVertical: t.spacing.md,
  },
  cardFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  footerItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
});