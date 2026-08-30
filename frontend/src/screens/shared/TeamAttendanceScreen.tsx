import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { Input } from '../../components/primitives/Input';
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
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['attendance', 'team-today', departmentId],
    queryFn: () => attendanceApi.teamToday(departmentId ?? undefined),
  });

  const { data: departmentOptions = [] } = useQuery({
    queryKey: ['departments', 'lookup'],
    queryFn: departmentsApi.lookup,
    enabled: isAdmin,
  });

  const deptSelectOptions = useMemo(
    () => departmentOptions.map((d) => ({ value: d.id, label: d.name })),
    [departmentOptions],
  );

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase().trim();
    return rows.filter(
      (r) =>
        r.internFullName?.toLowerCase().includes(q) ||
        r.internCode?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const toggleSearch = () => {
    if (showSearch) {
      setSearch('');
    }
    setShowSearch((prev) => !prev);
  };

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
          <View
            style={[
              s.badge,
              { backgroundColor: theme.colors[statusBgKey[r.status] ?? 'surfaceSunken'] },
            ]}
          >
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
    <Screen scroll={false} style={s.container}>
      <View style={s.headerContainer}>
        {/* Main Header Row */}
        <View style={s.headerRow}>
          <Text variant="body" tone="secondary">
            {filteredRows.length} intern{filteredRows.length === 1 ? '' : 's'} today
          </Text>

          {isAdmin && (
            <View style={s.filter}>
              <SelectField
                placeholder="All departments"
                value={departmentId}
                options={deptSelectOptions}
                onChange={setDepartmentId}
              />
            </View>
          )}
        </View>

        {/* Search Icon Trigger placed below the Department Filter */}
        <View style={s.searchIconRow}>
          <Pressable onPress={toggleSearch} style={s.iconButton} hitSlop={8}>
            {showSearch ? (
              <X size={20} color={theme.colors.textSecondary} />
            ) : (
              <Search size={20} color={theme.colors.textSecondary} />
            )}
          </Pressable>
        </View>

        {/* Expandable Search Input */}
        {showSearch && (
          <View style={s.searchContainer}>
            <Input
              placeholder="Search by name or intern code..."
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoFocus
            />
          </View>
        )}
      </View>

      {isLoading ? (
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(r) => String(r.internProfileId)}
          renderItem={renderCard}
          style={s.list}
          contentContainerStyle={
            filteredRows.length === 0 ? s.emptyListContent : s.listContent
          }
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
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerContainer: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  filter: { width: 160 },
  searchIconRow: {
    alignItems: 'flex-end' as const,
    marginTop: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  searchContainer: {
    marginTop: 8,
  },
  list: { flex: 1 },
  listContent: { gap: 12, paddingBottom: 16 },
  emptyListContent: {
    flexGrow: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
  },
  cardHeaderText: { flex: 1 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  attendanceGrid: {
    flexDirection: 'row' as const,
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  attendanceBlock: { flex: 1 },
  blockLabel: { marginBottom: 2 },
});