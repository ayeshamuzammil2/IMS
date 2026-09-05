import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Users, MapPin, Clock } from 'lucide-react-native';
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

  useFocusEffect(
    useCallback(() => {
      refetch();
      return () => {
        // Screen chhorne par Department Filter + Search state teeno reset ho jayenge
        setDepartmentId(null);
        setShowSearch(false);
        setSearch('');
      };
    }, [refetch])
  );

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

  const toggleSearch = () => {
    if (showSearch) {
      setSearch('');
    }
    setShowSearch((prev) => !prev);
  };

  const renderCard = ({ item: r }: { item: TeamAttendanceRowDto }) => {
    const statusToneType = statusTone[r.status] || 'muted';
    let statusBg = theme.colors.surfaceSunken;
    if (r.status === 'Present') statusBg = theme.colors.successBg || '#F0FDF4';
    if (r.status === 'Late') statusBg = theme.colors.warningBg || '#FFFBEB';
    if (r.status === 'Absent') statusBg = theme.colors.errorBg || '#FEF2F2';

    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.avatarBadge}>
            <Text variant="bodyStrong" style={s.avatarText}>
              {r.internFullName?.charAt(0).toUpperCase() || 'I'}
            </Text>
          </View>
          <View style={s.cardHeaderText}>
            <Text variant="bodyStrong" style={s.cardTitle} numberOfLines={1}>
              {r.internFullName}
            </Text>
            <Text variant="caption" tone="muted" style={s.emailText} numberOfLines={1}>
              {r.internCode}
            </Text>
          </View>
        </View>

        <View style={s.statusRow}>
          <View style={s.metaLeftGroup}>
            <View style={s.mentorBadge}>
              <Users size={12} color={theme.colors.textMuted} />
              <Text variant="caption" tone="muted" style={s.mentorText} numberOfLines={1}>
                Today's Log
              </Text>
            </View>
          </View>

          <View style={[s.badge, { backgroundColor: statusBg }]}>
            <Text variant="caption" tone={statusToneType} style={s.badgeText}>
              {r.status}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.attendanceGrid}>
          <View style={s.attendanceBlock}>
            <View style={s.blockHeaderRow}>
              <Clock size={12} color={theme.colors.textMuted} />
              <Text variant="caption" tone="muted" style={s.blockLabel}>
                Arrival
              </Text>
            </View>
            <Text variant="bodyStrong" style={s.timeText}>
              {formatTime(r.arrivalAtUtc)}
              {r.arrivalIsLate ? ' (Late)' : ''}
            </Text>
            {r.arrivalDistanceM !== null ? (
              <View style={s.distanceRow}>
                <MapPin size={10} color={theme.colors.textMuted} />
                <Text variant="caption" tone="muted" style={s.distanceText}>
                  {r.arrivalDistanceM.toFixed(0)}m · {r.arrivalGeofenceState}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={s.attendanceBlock}>
            <View style={s.blockHeaderRow}>
              <Clock size={12} color={theme.colors.textMuted} />
              <Text variant="caption" tone="muted" style={s.blockLabel}>
                Departure
              </Text>
            </View>
            <Text variant="bodyStrong" style={s.timeText}>
              {formatTime(r.departureAtUtc)}
              {r.departureIsEarly ? ' (Early)' : ''}
            </Text>
            {r.departureDistanceM !== null ? (
              <View style={s.distanceRow}>
                <MapPin size={10} color={theme.colors.textMuted} />
                <Text variant="caption" tone="muted" style={s.distanceText}>
                  {r.departureDistanceM.toFixed(0)}m · {r.departureGeofenceState}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen scroll={false} style={s.screenContainer}>
      <View style={s.headerContainer}>
        {/* Header Label Row */}
        <View style={s.headerRow}>
          <View style={s.headerTitleContainer}>
            <View style={s.titleIndicator} />
            <Text variant="overline" tone="muted" style={s.headerLabel}>
              {filteredRows.length} {filteredRows.length === 1 ? 'INTERN' : 'INTERNS'} TODAY
            </Text>
          </View>
        </View>

        {/* Admin Department Filter */}
        {isAdmin && (
          <View style={s.filterWrapper}>
            <SelectField
              placeholder="All departments"
              value={departmentId}
              options={deptSelectOptions}
              onChange={setDepartmentId}
            />
          </View>
        )}

        {/* Search Icon Row */}
        <View style={s.searchIconRow}>
          <Pressable onPress={toggleSearch} style={[s.iconButton, showSearch && s.iconButtonActive]} hitSlop={8}>
            {showSearch ? (
              <X size={18} color={theme.colors.primary} />
            ) : (
              <Search size={18} color={theme.colors.textMuted} />
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
        <View style={s.centerBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="caption" tone="muted" style={{ marginTop: 12 }}>
            Loading attendance records...
          </Text>
        </View>
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
            <View style={s.emptyBox}>
              <Text variant="body" tone="muted">
                {search.trim() ? 'No records found matching your search.' : 'No interns to show today.'}
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const makeStyles = (t: AppTheme) => ({
  screenContainer: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.lg,
  },
  headerContainer: {
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.lg,
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
  filterWrapper: {
    marginTop: t.spacing.xs,
  },
  searchIconRow: {
    alignItems: 'flex-end' as const,
    marginTop: t.spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
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
    marginTop: t.spacing.sm,
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
  avatarText: {
    color: t.colors.primary,
    fontSize: 16,
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
  mentorBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    flexShrink: 1,
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
    marginBottom: t.spacing.md,
  },
  attendanceGrid: {
    flexDirection: 'row' as const,
    gap: t.spacing.md,
  },
  attendanceBlock: {
    flex: 1,
    backgroundColor: t.colors.surfaceSunken,
    borderRadius: 12,
    padding: t.spacing.sm,
  },
  blockHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginBottom: 4,
  },
  blockLabel: {
    fontSize: 11,
  },
  timeText: {
    fontSize: 13,
  },
  distanceRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
    marginTop: 4,
  },
  distanceText: {
    fontSize: 10,
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