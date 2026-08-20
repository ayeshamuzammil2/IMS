import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Button } from '../../components/primitives/Button';
import { DateField } from '../../components/forms/DateField';
import { SelectField } from '../../components/forms/SelectField';
import { DataTable, type DataTableColumn } from '../../components/data/DataTable';
import { attendanceApi, type AttendanceHistoryRowDto } from '../../api/resources/attendance.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { toCsv } from '../../lib/csv';
import { writeTextAndShare } from '../../lib/downloadAndShare';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const STATUS_TONE: Record<string, 'muted' | 'success' | 'warning' | 'error'> = {
  Present: 'success',
  Late: 'warning',
  Absent: 'error',
  Leave: 'muted',
  Holiday: 'muted',
};

export function AttendanceHistoryScreen() {
  const s = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [startDate, setStartDate] = useState<string>(isoDaysAgo(6));
  const [endDate, setEndDate] = useState<string>(isoDaysAgo(0));
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    if (rows.length === 0) return;
    setExporting(true);
    try {
      const csv = toCsv(rows, [
        { header: 'Intern Name', value: (r) => r.internFullName },
        { header: 'Intern Code', value: (r) => r.internCode },
        { header: 'Department', value: (r) => r.departmentName },
        { header: 'Work Date', value: (r) => r.workDate },
        { header: 'Status', value: (r) => r.status },
        { header: 'Arrival Time', value: (r) => (r.arrivalAtUtc ? new Date(r.arrivalAtUtc).toLocaleTimeString() : '') },
        { header: 'Arrival Late', value: (r) => (r.arrivalIsLate ? 'Yes' : 'No') },
        { header: 'Arrival Source', value: (r) => r.arrivalSource ?? '' },
        { header: 'Departure Time', value: (r) => (r.departureAtUtc ? new Date(r.departureAtUtc).toLocaleTimeString() : '') },
        { header: 'Departure Early', value: (r) => (r.departureIsEarly ? 'Yes' : 'No') },
        { header: 'Departure Source', value: (r) => r.departureSource ?? '' },
      ]);
      await writeTextAndShare(csv, `attendance-${startDate}-to-${endDate}.csv`, 'text/csv');
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Could not export CSV', text2: error?.message });
    } finally {
      setExporting(false);
    }
  };

  const columns: DataTableColumn<AttendanceHistoryRowDto>[] = [
    { key: 'name', label: 'Name', width: 160, render: (r) => <Text variant="bodyStrong">{r.internFullName}</Text> },
    { key: 'code', label: 'Code', width: 140, render: (r) => <Text variant="body">{r.internCode}</Text> },
    { key: 'department', label: 'Department', width: 130, render: (r) => <Text variant="body">{r.departmentName}</Text> },
    { key: 'date', label: 'Date', width: 100, render: (r) => <Text variant="body">{new Date(r.workDate).toLocaleDateString()}</Text> },
    {
      key: 'status',
      label: 'Status',
      width: 90,
      render: (r) => (
        <Text variant="caption" tone={STATUS_TONE[r.status] ?? 'muted'}>
          {r.status}
        </Text>
      ),
    },
    {
      key: 'arrival',
      label: 'Arrival',
      width: 150,
      render: (r) => (
        <View>
          <Text variant="body">{r.arrivalAtUtc ? new Date(r.arrivalAtUtc).toLocaleTimeString() : '-'}</Text>
          {r.arrivalSource ? (
            <Text variant="caption" tone="muted">
              {r.arrivalSource}
            </Text>
          ) : null}
        </View>
      ),
    },
    {
      key: 'departure',
      label: 'Departure',
      width: 150,
      render: (r) => (
        <View>
          <Text variant="body">{r.departureAtUtc ? new Date(r.departureAtUtc).toLocaleTimeString() : '-'}</Text>
          {r.departureSource ? (
            <Text variant="caption" tone="muted">
              {r.departureSource}
            </Text>
          ) : null}
        </View>
      ),
    },
  ];

  return (
    <Screen scroll={false}>
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

      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {rows.length} record{rows.length === 1 ? '' : 's'}
        </Text>
        <Button label="Export CSV" size="sm" variant="outline" onPress={handleExport} loading={exporting} disabled={rows.length === 0} />
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <DataTable columns={columns} rows={rows} keyExtractor={(r) => `${r.internProfileId}-${r.workDate}`} emptyLabel="No attendance records in this range." />
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  filterRow: { flexDirection: 'row' as const, gap: t.spacing.sm, marginBottom: t.spacing.sm, flexWrap: 'wrap' as const },
  dateField: { flex: 1, minWidth: 130 },
  deptField: { flex: 1, minWidth: 150 },
  headerRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: t.spacing.md },
});
