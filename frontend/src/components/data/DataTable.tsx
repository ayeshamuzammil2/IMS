import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from '../primitives/Text';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AppTheme } from '../../theme/types';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  width?: number;
  render: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  onRowPress?: (row: T) => void;
  emptyLabel?: string;
}

/** Generic, horizontally-scrolling table - wide content scrolls in its own lane instead of squeezing every column. */
export function DataTable<T>({ columns, rows, keyExtractor, onRowPress, emptyLabel = 'No records found.' }: Props<T>) {
  const s = useThemedStyles(makeStyles);

  if (rows.length === 0) {
    return (
      <View style={s.emptyContainer}>
        <Text variant="body" tone="muted">
          {emptyLabel}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View style={s.headerRow}>
          {columns.map((col) => (
            <View key={col.key} style={[s.cell, col.width ? { width: col.width } : s.flexCell]}>
              <Text variant="overline" tone="muted">
                {col.label}
              </Text>
            </View>
          ))}
        </View>
        {rows.map((row) => (
          <Pressable key={keyExtractor(row)} style={s.row} onPress={onRowPress ? () => onRowPress(row) : undefined}>
            {columns.map((col) => (
              <View key={col.key} style={[s.cell, col.width ? { width: col.width } : s.flexCell]}>
                {col.render(row)}
              </View>
            ))}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: AppTheme) => ({
  headerRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    paddingBottom: t.spacing.sm,
    marginBottom: t.spacing.xs,
  },
  row: {
    flexDirection: 'row' as const,
    paddingVertical: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    alignItems: 'center' as const,
  },
  cell: { paddingHorizontal: t.spacing.sm, justifyContent: 'center' as const },
  flexCell: { minWidth: 130 },
  emptyContainer: { padding: t.spacing.xl, alignItems: 'center' as const },
});
