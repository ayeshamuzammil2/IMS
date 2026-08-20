import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { FormModal } from '../../components/forms/FormModal';
import { SelectField } from '../../components/forms/SelectField';
import { DataTable, type DataTableColumn } from '../../components/data/DataTable';
import { AuthImage } from '../../components/media/AuthImage';
import { attendanceApi, type TeamAttendanceRowDto } from '../../api/resources/attendance.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

const statusTone: Record<string, 'muted' | 'success' | 'warning' | 'error'> = {
  NotMarked: 'muted',
  Present: 'success',
  Late: 'warning',
  Absent: 'error',
  Leave: 'muted',
  Holiday: 'muted',
};

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function TeamAttendanceScreen() {
  const s = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['attendance', 'team-today', departmentId],
    queryFn: () => attendanceApi.teamToday(departmentId ?? undefined),
  });

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['departments', 'lookup'],
    queryFn: departmentsApi.lookup,
    enabled: isAdmin,
  });
  const deptSelectOptions = useMemo(() => departmentOptions.map((d) => ({ value: d.id, label: d.name })), [departmentOptions]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const openPreview = (fileId: string | null, title: string) => {
    if (!fileId) return;
    setPreviewFileId(fileId);
    setPreviewTitle(title);
  };

  const columns: DataTableColumn<TeamAttendanceRowDto>[] = [
    { key: 'name', label: 'Name', width: 160, render: (r) => <Text variant="bodyStrong">{r.internFullName}</Text> },
    { key: 'code', label: 'Intern Code', width: 150, render: (r) => <Text variant="body">{r.internCode}</Text> },
    {
      key: 'arrivalPhoto',
      label: 'Arrival',
      width: 56,
      render: (r) =>
        r.arrivalSelfieFileId ? (
          <AuthImage fileId={r.arrivalSelfieFileId} size={40} onPress={() => openPreview(r.arrivalSelfieFileId, `${r.internFullName} - Arrival`)} />
        ) : (
          <Text variant="caption" tone="muted">
            -
          </Text>
        ),
    },
    {
      key: 'arrivalInfo',
      label: 'Arrival Time',
      width: 150,
      render: (r) => (
        <View>
          <Text variant="body">
            {formatTime(r.arrivalAtUtc)}
            {r.arrivalIsLate ? ' (Late)' : ''}
          </Text>
          {r.arrivalDistanceM !== null ? (
            <Text variant="caption" tone="muted">
              {r.arrivalDistanceM.toFixed(0)} m - {r.arrivalGeofenceState}
            </Text>
          ) : null}
        </View>
      ),
    },
    {
      key: 'departurePhoto',
      label: 'Departure',
      width: 56,
      render: (r) =>
        r.departureSelfieFileId ? (
          <AuthImage fileId={r.departureSelfieFileId} size={40} onPress={() => openPreview(r.departureSelfieFileId, `${r.internFullName} - Departure`)} />
        ) : (
          <Text variant="caption" tone="muted">
            -
          </Text>
        ),
    },
    {
      key: 'departureInfo',
      label: 'Departure Time',
      width: 150,
      render: (r) => (
        <View>
          <Text variant="body">
            {formatTime(r.departureAtUtc)}
            {r.departureIsEarly ? ' (Early)' : ''}
          </Text>
          {r.departureDistanceM !== null ? (
            <Text variant="caption" tone="muted">
              {r.departureDistanceM.toFixed(0)} m - {r.departureGeofenceState}
            </Text>
          ) : null}
        </View>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: 100,
      render: (r) => (
        <Text variant="caption" tone={statusTone[r.status] ?? 'muted'}>
          {r.status}
        </Text>
      ),
    },
  ];

  return (
    <Screen scroll={false}>
      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {rows.length} intern{rows.length === 1 ? '' : 's'} today
        </Text>
        {isAdmin ? (
          <View style={s.filter}>
            <SelectField placeholder="All departments" value={departmentId} options={deptSelectOptions} onChange={setDepartmentId} />
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <DataTable columns={columns} rows={rows} keyExtractor={(r) => String(r.internProfileId)} emptyLabel="No interns to show." />
      )}

      <FormModal visible={previewFileId !== null} title={previewTitle} onClose={() => setPreviewFileId(null)}>
        {previewFileId ? <AuthImage fileId={previewFileId} size={280} style={s.previewImage} /> : null}
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
    gap: t.spacing.md,
  },
  filter: { width: 180 },
  previewImage: { alignSelf: 'center' as const, borderRadius: t.radii.md },
});
