import React, { useState } from 'react';
import { View, Pressable, FlatList } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { Text } from '../primitives/Text';
import { FormModal } from './FormModal';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import type { AppTheme } from '../../theme/types';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  label?: string;
  placeholder?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  required?: boolean;
}

export function SelectField<T extends string | number>({
  label,
  placeholder = 'Select...',
  value,
  options,
  onChange,
  error,
  required,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const s = useThemedStyles(makeStyles);
  const theme = useTheme();
  const selected = options.find((o) => o.value === value);

  return (
    <View style={s.container}>
      {label ? (
        <Text variant="caption" tone="secondary" style={s.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}
      <Pressable
        style={[s.field, error && s.fieldError]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityValue={{ text: selected?.label ?? placeholder }}
      >
        <Text variant="body" tone={selected ? 'primary' : 'muted'} numberOfLines={1} style={s.valueText}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={theme.colors.textMuted} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="error" style={s.helperText}>
          {error}
        </Text>
      ) : null}

      <FormModal visible={open} title={label ?? 'Select'} onClose={() => setOpen(false)} scrollable={false}>
        <FlatList
          data={options}
          keyExtractor={(o) => String(o.value)}
          renderItem={({ item }) => (
            <Pressable
              style={s.optionRow}
              onPress={() => {
                onChange(item.value);
                setOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: item.value === value }}
            >
              <Text variant="body">{item.label}</Text>
              {item.value === value ? <Check size={18} color={theme.colors.primary} /> : null}
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListEmptyComponent={
            <Text variant="body" tone="muted" style={s.empty}>
              No options available.
            </Text>
          }
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
    backgroundColor: t.colors.surfaceSunken,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.md,
  },
  fieldError: { borderColor: t.colors.error },
  valueText: { flex: 1, marginRight: t.spacing.sm },
  helperText: { marginTop: t.spacing.xs },
  optionRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.sm,
  },
  separator: { height: 1, backgroundColor: t.colors.border },
  empty: { padding: t.spacing.lg, textAlign: 'center' as const },
});
