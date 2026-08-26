import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { SelectField } from '../../components/forms/SelectField';
import { attendanceApi, type TeamAttendanceRowDto } from '../../api/resources/attendance.api';
import { departmentsApi } from '../../api/resources/departments.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
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

const statusBgKey: Record<string, 'surfaceSunken' | 'warningBg' | 'successBg' | 'errorBg'> = {
  NotMarked: 'surfaceSunken',
  Present: 'successBg',
  Late: 'warningBg',
  Absent: 'errorBg',
  Leave: 'surfaceSunken',
  Holiday: 'surfaceSunken',
};

function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function TeamAttendanceScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [departmentId, setDepartmentId] = useState<number | null>(null);

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

  const renderCard = ({ item: r }: { item: TeamAttendanceRowDto }) => {
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderText}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {r.internFullName}
            </Text>
            <Text variant="caption" tone="muted">
              {r.internCode}
            </Text>
          </View>
          <View style={[s.badge, { backgroundColor: theme.colors[statusBgKey[r.status] ?? 'surfaceSunken'] }]}>
            <Text variant="caption" tone={statusTone[r.status] ?? 'muted'}>
              {r.status}
            </Text>
          </View>
        </View>

        <View style={s.attendanceGrid}>
          {/* Arrival Info */}
          <View style={s.attendanceBlock}>
            <Text variant="caption" tone="muted" style={s.blockLabel}>
              Arrival
            </Text>
            <Text variant="body">
              {formatTime(r.arrivalAtUtc)}
              {r.arrivalIsLate ? ' (Late)' : ''}
            </Text>
            {r.arrivalDistanceM !== null && (
              <Text variant="caption" tone="muted">
                {r.arrivalDistanceM.toFixed(0)}m · {r.arrivalGeofenceState}
              </Text>
            )}
          </View>

          {/* Departure Info */}
          <View style={s.attendanceBlock}>
            <Text variant="caption" tone="muted" style={s.blockLabel}>
              Departure
            </Text>
            <Text variant="body">
              {formatTime(r.departureAtUtc)}
              {r.departureIsEarly ? ' (Early)' : ''}
            </Text>
            {r.departureDistanceM !== null && (
              <Text variant="caption" tone="muted">
                {r.departureDistanceM.toFixed(0)}m · {r.departureGeofenceState}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen scroll={false}>
      <View style={s.headerRow}>
        <Text variant="body" tone="secondary">
          {rows.length} intern{rows.length === 1 ? '' : 's'} today
        </Text>
        {isAdmin && (
          <View style={s.filter}>
            <SelectField placeholder="All departments" value={departmentId} options={deptSelectOptions} onChange={setDepartmentId} />
          </View>
        )}
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.internProfileId)}
          renderItem={renderCard}
          style={s.list}
          contentContainerStyle={rows.length === 0 ? s.emptyListContent : s.listContent}
          ListEmptyComponent={
            <Text variant="body" tone="muted">
              No interns to show.
            </Text>
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
    marginBottom: t.spacing.md,
    gap: t.spacing.md,
  },
  filter: { width: 180 },
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
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: t.spacing.sm,
  },
  cardHeaderText: { flex: 1 },
  badge: { paddingHorizontal: t.spacing.sm, paddingVertical: 3, borderRadius: t.radii.full },
  attendanceGrid: {
    flexDirection: 'row' as const,
    gap: t.spacing.md,
    marginTop: t.spacing.md,
    paddingTop: t.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  attendanceBlock: { flex: 1 },
  blockLabel: { marginBottom: 2 },
});