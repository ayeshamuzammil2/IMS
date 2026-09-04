import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Text } from '../primitives/Text';
import { FormModal } from './FormModal';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

interface Props {
  label?: string;
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function parseIsoDate(value: string): { y: number; m: number; d: number } {
  const [y, m, d] = value.split('-').map(Number);
  return { y, m: m - 1, d };
}

function formatIsoDate(y: number, m: number, d: number): string {
  return `${y.toString().padStart(4, '0')}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
}

function formatDisplay(value: string): string {
  const { y, m, d } = parseIsoDate(value);
  return `${d} ${MONTH_NAMES[m].slice(0, 3)} ${y}`;
}

export function DateField({ label, value, onChange, error, required, minDate, maxDate }: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => (value ? parseIsoDate(value).y : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (value ? parseIsoDate(value).m : new Date().getMonth()));
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();

  const openPicker = () => {
    const today = new Date();
    const cur = value ? parseIsoDate(value) : { y: today.getFullYear(), m: today.getMonth() };
    setViewYear(cur.y);
    setViewMonth(cur.m);
    setOpen(true);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isDisabled = (day: number) => {
    const iso = formatIsoDate(viewYear, viewMonth, day);
    if (minDate && iso < minDate) return true;
    if (maxDate && iso > maxDate) return true;
    return false;
  };

  return (
    <View style={s.container}>
      {label ? (
        <Text variant="caption" tone="secondary" style={s.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}
      <Pressable style={[s.field, error && s.fieldError]} onPress={openPicker}>
        <Text variant="body" tone={value ? 'primary' : 'muted'}>
          {value ? formatDisplay(value) : 'Select date'}
        </Text>
        <CalendarIcon size={18} color={theme.colors.textMuted} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="error" style={s.helperText}>
          {error}
        </Text>
      ) : null}

      <FormModal visible={open} title={label ?? 'Select date'} onClose={() => setOpen(false)}>
        <View style={s.monthHeader}>
          <Pressable onPress={goPrevMonth} hitSlop={8}>
            <ChevronLeft size={20} color={theme.colors.textPrimary} />
          </Pressable>
          <Text variant="bodyStrong">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <Pressable onPress={goNextMonth} hitSlop={8}>
            <ChevronRight size={20} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
        <View style={s.weekdayRow}>
          {WEEKDAY_LABELS.map((w, i) => (
            <Text key={i} variant="caption" tone="muted" style={s.weekdayCell}>
              {w}
            </Text>
          ))}
        </View>
        <View style={s.grid}>
          {cells.map((day, i) => {
            if (day === null) return <View key={i} style={s.dayCell} />;
            const iso = formatIsoDate(viewYear, viewMonth, day);
            const selected = iso === value;
            const disabled = isDisabled(day);
            return (
              <Pressable
                key={i}
                style={[s.dayCell, selected && s.dayCellSelected]}
                disabled={disabled}
                onPress={() => {
                  onChange(iso);
                  setOpen(false);
                }}
              >
                <Text
                  variant="body"
                  style={
                    disabled
                      ? { color: theme.colors.textMuted }
                      : selected
                      ? { color: theme.colors.surface }
                      : { color: theme.colors.textPrimary }
                  }
                >
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </FormModal>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: { marginBottom: 0 },
  label: { marginBottom: t.spacing.xs },
  field: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surface,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    height: 44,
  },
  fieldError: { borderColor: t.colors.error },
  helperText: { marginTop: t.spacing.xs },
  monthHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.md,
  },
  weekdayRow: { flexDirection: 'row' as const, marginBottom: t.spacing.xs },
  weekdayCell: { width: '14.2857%' as const, textAlign: 'center' as const },
  grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const },
  dayCell: {
    width: '14.2857%' as const,
    aspectRatio: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: t.radii.full,
  },
  dayCellSelected: { backgroundColor: t.colors.primary },
});