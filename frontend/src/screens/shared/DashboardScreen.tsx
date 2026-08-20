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
      <Screen>
        <Text variant="body" tone="muted">
          Loading...
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={s.heroCard}>
        <Text variant="caption" tone="muted">
          {isAdmin ? 'TOTAL INTERNS (ORG-WIDE)' : 'MY INTERNS'}
        </Text>
        <Text variant="h1" style={s.heroNumber}>
          {data.totalInterns}
        </Text>
      </View>

      <View style={s.tileRow}>
        <KpiTile label="Present Today" value={data.presentTodayCount} tone="success" />
        <KpiTile label="Late Today" value={data.lateTodayCount} tone="warning" />
        <KpiTile label="Absent Today" value={data.absentTodayCount} tone="error" />
        <KpiTile label="On Leave" value={data.onLeaveTodayCount} tone="muted" />
      </View>

      {isAdmin ? (
        <View style={s.tileRow}>
          <KpiTile label="Mentors" value={data.totalMentors} tone="primary" />
          <KpiTile label="Departments" value={data.totalDepartments} tone="primary" />
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
              yAxisColor={theme.charts.axis}
              xAxisColor={theme.charts.axis}
              rulesColor={theme.charts.gridline}
              yAxisTextStyle={{ color: theme.colors.textMuted }}
              xAxisLabelTextStyle={{ color: theme.colors.textMuted }}
              curved
              thickness={2}
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
                }))}
                horizontal
                height={Math.max(120, data.internsByDepartment.length * 36)}
                barWidth={22}
                yAxisTextStyle={{ color: theme.colors.textMuted }}
                xAxisColor={theme.charts.axis}
                yAxisColor={theme.charts.axis}
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
                }))}
                donut
                radius={70}
                innerRadius={45}
                innerCircleColor={theme.colors.surface}
              />
              <View style={s.legendCol}>
                {data.verificationBreakdown.map((v, i) => (
                  <View key={v.status} style={s.legendRow}>
                    <View style={[s.legendDot, { backgroundColor: theme.charts.categorical[i % theme.charts.categorical.length] }]} />
                    <Text variant="caption">{v.status}</Text>
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

function KpiTile({ label, value, tone }: { label: string; value: number; tone: 'success' | 'warning' | 'error' | 'muted' | 'primary' }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.tile}>
      <Text variant="h3" tone={tone === 'primary' ? 'brand' : tone}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
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
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text variant="overline" tone="muted">
          {title}
        </Text>
        <Pressable onPress={() => setShowTable((v) => !v)} hitSlop={8}>
          <Table size={16} color={showTable ? theme.colors.primary : theme.colors.textMuted} />
        </Pressable>
      </View>
      {children(showTable)}
    </View>
  );
}

function EmptyChartNote() {
  return (
    <Text variant="body" tone="muted">
      No data yet.
    </Text>
  );
}

function TrendTable({ data }: { data: DashboardSummaryDto['sevenDayTrend'] }) {
  const s = useThemedStyles(makeStyles);
  if (data.length === 0) return <EmptyChartNote />;
  return (
    <View>
      {data.map((p) => (
        <View key={p.date} style={s.tableRow}>
          <Text variant="caption" style={s.tableCell}>
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
    <View>
      {data.map((d) => (
        <View key={d.departmentName} style={s.tableRow}>
          <Text variant="caption" style={s.tableCellWide}>
            {d.departmentName}
          </Text>
          <Text variant="caption">{d.count}</Text>
        </View>
      ))}
    </View>
  );
}

function VerificationTable({ data }: { data: DashboardSummaryDto['verificationBreakdown'] }) {
  const s = useThemedStyles(makeStyles);
  if (data.length === 0) return <EmptyChartNote />;
  return (
    <View>
      {data.map((v) => (
        <View key={v.status} style={s.tableRow}>
          <Text variant="caption" style={s.tableCellWide}>
            {v.status}
          </Text>
          <Text variant="caption">{v.count}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  heroCard: {
    backgroundColor: t.colors.primaryContainer,
    borderRadius: t.radii.lg,
    padding: t.spacing.lg,
    alignItems: 'center' as const,
    marginBottom: t.spacing.md,
  },
  heroNumber: { color: t.colors.onPrimaryContainer },
  tileRow: { flexDirection: 'row' as const, gap: t.spacing.sm, marginBottom: t.spacing.md },
  tile: {
    flex: 1,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.md,
    alignItems: 'center' as const,
  },
  section: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
  },
  sectionHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: t.spacing.md },
  donutRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: t.spacing.lg },
  legendCol: { gap: t.spacing.xs },
  legendRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: t.spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  tableRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: t.spacing.xs, borderBottomWidth: 1, borderBottomColor: t.colors.border },
  tableCell: { minWidth: 60 },
  tableCellWide: { flex: 1 },
});
