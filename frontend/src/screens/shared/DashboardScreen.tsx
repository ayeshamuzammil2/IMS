import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { Table } from 'lucide-react-native';
import { Screen } from '../../components/layout/Screen';
import { Text } from '../../components/primitives/Text';
import { dashboardApi, type DashboardSummaryDto } from '../../api/resources/dashboard.api';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import type { AppTheme } from '../../theme/types';

export function DashboardScreen() {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardApi.getSummary(),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (isLoading || !data) {
    return (
      <Screen scroll={false}>
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scroll style={s.container}>
      <View style={s.heroCard}>
        <View style={s.heroContent}>
          <Text variant="overline" tone="muted" style={s.heroLabel}>
            {isAdmin ? 'TOTAL INTERNS (ORG-WIDE)' : 'MY INTERNS'}
          </Text>
          <Text variant="h1" style={s.heroNumber}>
            {data.totalInterns}
          </Text>
        </View>
        <View style={s.heroAccentBadge}>
          <View style={s.heroPulseDot} />
          <Text variant="caption" style={s.heroBadgeText}>Live</Text>
        </View>
      </View>

      <View style={s.tileGrid}>
        <KpiTile label="Present Today" value={data.presentTodayCount} color={theme.colors.success} />
        <KpiTile label="Late Today" value={data.lateTodayCount} color={theme.colors.warning} />
        <KpiTile label="Absent Today" value={data.absentTodayCount} color={theme.colors.error} />
        <KpiTile label="On Leave" value={data.onLeaveTodayCount} color={theme.colors.textMuted} />
      </View>

      {isAdmin ? (
        <View style={s.tileGrid}>
          <KpiTile label="Mentors" value={data.totalMentors} color={theme.colors.primary} />
          <KpiTile label="Departments" value={data.totalDepartments} color={theme.colors.primary} />
        </View>
      ) : null}

      <ChartSection title="7-DAY ATTENDANCE TREND">
        {(showTable) =>
          showTable ? (
            <TrendTable data={data.sevenDayTrend} />
          ) : data.sevenDayTrend.length === 0 ? (
            <EmptyChartNote />
          ) : (
            <LineChart
              height={180}
              dataSet={[
                { data: data.sevenDayTrend.map((p) => ({ value: p.presentCount, label: shortDate(p.date) })), color: theme.colors.success },
                { data: data.sevenDayTrend.map((p) => ({ value: p.lateCount, label: shortDate(p.date) })), color: theme.colors.warning },
                { data: data.sevenDayTrend.map((p) => ({ value: p.absentCount, label: shortDate(p.date) })), color: theme.colors.error },
              ]}
              yAxisColor="transparent"
              xAxisColor={theme.colors.border}
              rulesColor={theme.colors.border}
              rulesType="dashed"
              yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
              curved
              thickness={2.5}
              noOfSections={4}
            />
          )
        }
      </ChartSection>

      {isAdmin ? (
        <ChartSection title="INTERNS BY DEPARTMENT">
          {(showTable) =>
            showTable ? (
              <DepartmentTable data={data.internsByDepartment} />
            ) : data.internsByDepartment.length === 0 ? (
              <EmptyChartNote />
            ) : (
              <BarChart
                data={data.internsByDepartment.map((d, i) => ({
                  value: d.count,
                  label: d.departmentName,
                  frontColor: theme.charts.categorical[i % theme.charts.categorical.length],
                  labelTextStyle: { color: theme.colors.textSecondary, fontSize: 10 },
                }))}
                horizontal
                height={Math.max(120, data.internsByDepartment.length * 36)}
                barWidth={18}
                barBorderRadius={4}
                yAxisTextStyle={{ color: theme.colors.textSecondary, fontSize: 10 }}
                xAxisColor={theme.colors.border}
                yAxisColor="transparent"
              />
            )
          }
        </ChartSection>
      ) : null}

      <ChartSection title="VERIFICATION STATUS">
        {(showTable) =>
          showTable ? (
            <VerificationTable data={data.verificationBreakdown} />
          ) : data.verificationBreakdown.length === 0 ? (
            <EmptyChartNote />
          ) : (
            <View style={s.donutRow}>
              <PieChart
                data={data.verificationBreakdown.map((v, i) => ({
                  value: v.count,
                  color: theme.charts.categorical[i % theme.charts.categorical.length],
                  text: String(v.count),
                  textColor: theme.colors.textPrimary,
                }))}
                donut
                radius={60}
                innerRadius={42}
                innerCircleColor={theme.colors.surface}
              />
              <View style={s.legendCol}>
                {data.verificationBreakdown.map((v, i) => (
                  <View key={v.status} style={s.legendRow}>
                    <View style={[s.legendDot, { backgroundColor: theme.charts.categorical[i % theme.charts.categorical.length] }]} />
                    <Text variant="caption" style={s.legendText} numberOfLines={1}>
                      {v.status}
                    </Text>
                    <Text variant="caption" style={s.legendCount}>
                      {v.count}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )
        }
      </ChartSection>
    </Screen>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function KpiTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const s = useThemedStyles(makeStyles);

  return (
    <View style={s.tile}>
      <View style={s.tileIconBadge}>
        <Text variant="h3" style={{ color }}>
          {value}
        </Text>
      </View>
      <Text variant="caption" tone="muted" style={s.tileLabel}>
        {label}
      </Text>
    </View>
  );
}

function ChartSection({ title, children }: { title: string; children: (showTable: boolean) => React.ReactNode }) {
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const [showTable, setShowTable] = useState(false);
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardTitleContainer}>
          <View style={s.cardTitleIndicator} />
          <Text variant="overline" tone="muted" style={s.cardTitle}>
            {title}
          </Text>
        </View>
        <Pressable onPress={() => setShowTable((v) => !v)} hitSlop={8} style={s.actionIcon}>
          <Table size={15} color={showTable ? theme.colors.primary : theme.colors.textMuted} />
        </Pressable>
      </View>
      {children(showTable)}
    </View>
  );
}

function EmptyChartNote() {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.emptyBox}>
      <Text variant="body" tone="muted">
        No data yet.
      </Text>
    </View>
  );
}

function TrendTable({ data }: { data: DashboardSummaryDto['sevenDayTrend'] }) {
  const s = useThemedStyles(makeStyles);
  if (data.length === 0) return <EmptyChartNote />;
  return (
    <View style={s.tableContainer}>
      {data.map((p) => (
        <View key={p.date} style={s.tableRow}>
          <Text variant="caption" style={s.tableCellMain}>
            {new Date(p.date).toLocaleDateString()}
          </Text>
          <Text variant="caption" tone="success" style={s.tableCell}>
            P:{p.presentCount}
          </Text>
          <Text variant="caption" tone="warning" style={s.tableCell}>
            L:{p.lateCount}
          </Text>
          <Text variant="caption" tone="error" style={s.tableCell}>
            A:{p.absentCount}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DepartmentTable({ data }: { data: DashboardSummaryDto['internsByDepartment'] }) {
  const s = useThemedStyles(makeStyles);
  if (data.length === 0) return <EmptyChartNote />;
  return (
    <View style={s.tableContainer}>
      {data.map((d) => (
        <View key={d.departmentName} style={s.tableRow}>
          <Text variant="caption" style={s.tableCellWide} numberOfLines={1}>
            {d.departmentName}
          </Text>
          <Text variant="bodyStrong" style={s.tableCellNumber}>
            {d.count}
          </Text>
        </View>
      ))}
    </View>
  );
}

function VerificationTable({ data }: { data: DashboardSummaryDto['verificationBreakdown'] }) {
  const s = useThemedStyles(makeStyles);
  if (data.length === 0) return <EmptyChartNote />;
  return (
    <View style={s.tableContainer}>
      {data.map((v) => (
        <View key={v.status} style={s.tableRow}>
          <Text variant="caption" style={s.tableCellWide} numberOfLines={1}>
            {v.status}
          </Text>
          <Text variant="bodyStrong" style={s.tableCellNumber}>
            {v.count}
          </Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: {
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.sm,
  },
  heroCard: {
    backgroundColor: t.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingVertical: t.spacing.lg,
    paddingHorizontal: t.spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: t.spacing.md,
    elevation: 2,
  },
  heroContent: {
    flex: 1,
  },
  heroLabel: {
    letterSpacing: 1,
    marginBottom: 2,
    color: t.colors.textSecondary,
  },
  heroNumber: {
    color: t.colors.primary,
  },
  heroAccentBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: t.colors.surfaceSunken,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  heroPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: t.colors.success,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: t.colors.textSecondary,
  },
  tileGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: t.spacing.sm,
    marginBottom: t.spacing.md,
  },
  tile: {
    flexBasis: '47%' as const,
    flexGrow: 1,
    backgroundColor: t.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    elevation: 1,
  },
  tileIconBadge: {
    minWidth: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: t.colors.surfaceSunken,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 4,
  },
  tileLabel: {
    flex: 1,
    flexWrap: 'wrap' as const,
    color: t.colors.textSecondary,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.md,
  },
  cardTitleContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  cardTitleIndicator: {
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: t.colors.primary,
  },
  cardTitle: {
    letterSpacing: 0.8,
    color: t.colors.textSecondary,
  },
  actionIcon: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: t.colors.surfaceSunken,
  },
  emptyBox: {
    paddingVertical: t.spacing.md,
    alignItems: 'center' as const,
  },
  donutRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
    gap: t.spacing.md,
  },
  legendCol: {
    gap: t.spacing.xs,
    flexShrink: 1,
    minWidth: 120,
  },
  legendRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    flex: 1,
    color: t.colors.textPrimary,
  },
  legendCount: {
    fontWeight: '600' as const,
    color: t.colors.textSecondary,
  },
  tableContainer: {
    marginTop: t.spacing.xs,
  },
  tableRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: t.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    gap: t.spacing.sm,
  },
  tableCellMain: {
    minWidth: 80,
    color: t.colors.textPrimary,
  },
  tableCell: {
    minWidth: 50,
  },
  tableCellWide: {
    flex: 1,
    color: t.colors.textPrimary,
  },
  tableCellNumber: {
    minWidth: 28,
    textAlign: 'right' as const,
    color: t.colors.textPrimary,
  },
});