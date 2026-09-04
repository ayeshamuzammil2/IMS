import React, { useMemo, useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { Clock, Check } from 'lucide-react-native';
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
  stepMinutes?: number;
}

function formatDisplay(value: string): string {
  const [hStr, mStr] = value.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

function buildSlots(stepMinutes: number): string[] {
  const slots: string[] = [];
  for (let mins = 0; mins < 24 * 60; mins += stepMinutes) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`);
  }
  return slots;
}

export function TimeField({ label, value, onChange, error, required, stepMinutes = 30 }: Props) {
  const [open, setOpen] = useState(false);
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const slots = useMemo(() => buildSlots(stepMinutes), [stepMinutes]);

  return (
    <View style={s.container}>
      {label ? (
        <Text variant="caption" tone="secondary" style={s.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}
      <Pressable style={[s.field, error && s.fieldError]} onPress={() => setOpen(true)}>
        <Text variant="body" tone={value ? 'primary' : 'muted'}>
          {value ? formatDisplay(value) : 'Select time'}
        </Text>
        <Clock size={18} color={theme.colors.textMuted} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="error" style={s.helperText}>
          {error}
        </Text>
      ) : null}

      <FormModal visible={open} title={label ?? 'Select time'} onClose={() => setOpen(false)} scrollable={false}>
        <FlatList
          data={slots}
          keyExtractor={(slot) => slot}
          initialNumToRender={20}
          renderItem={({ item }) => (
            <Pressable
              style={s.optionRow}
              onPress={() => {
                onChange(item);
                setOpen(false);
              }}
            >
              <Text variant="body" tone="primary">{formatDisplay(item)}</Text>
              {item === value ? <Check size={18} color={theme.colors.primary} /> : null}
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      </FormModal>
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: { marginBottom: t.spacing.md },
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
    paddingVertical: t.spacing.md,
  },
  fieldError: { borderColor: t.colors.error },
  helperText: { marginTop: t.spacing.xs },
  optionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.sm,
  },
  separator: { height: 1, backgroundColor: t.colors.border },
});