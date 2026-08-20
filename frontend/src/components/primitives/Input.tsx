import React, { useState } from 'react';
import { TextInput, View, Pressable, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { Text } from './Text';
import type { AppTheme } from '../../theme/types';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  secureToggle?: boolean;
}

export function Input({ label, error, helper, required, secureToggle, secureTextEntry, style, ...rest }: Props) {
  const theme = useTheme();
  const s = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={s.container}>
      {label ? (
        <Text variant="caption" tone="secondary" style={s.label}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}
      <View style={[s.inputRow, focused && s.inputRowFocused, error && s.inputRowError]}>
        <TextInput
          style={[s.input, style]}
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            style={s.iconButton}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            {hidden ? <EyeOff size={20} color={theme.colors.textMuted} /> : <Eye size={20} color={theme.colors.textMuted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="error" style={s.helperText}>
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" tone="muted" style={s.helperText}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (t: AppTheme) => ({
  container: { marginBottom: t.spacing.md },
  label: { marginBottom: t.spacing.xs },
  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surfaceSunken,
    paddingHorizontal: t.spacing.md,
  },
  inputRowFocused: { borderColor: t.colors.borderStrong },
  inputRowError: { borderColor: t.colors.error },
  input: {
    flex: 1,
    paddingVertical: t.spacing.md,
    fontSize: t.typography.body.fontSize,
    color: t.colors.textPrimary,
  },
  iconButton: { padding: t.spacing.xs },
  helperText: { marginTop: t.spacing.xs },
});
